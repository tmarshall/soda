import type { MiddlewareDefinition } from './walkMiddleware'

import path from 'node:path'
import { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'

export enum RouteVerb {
  all = 'all',
  head = 'head',
  get = 'get',
  post = 'post',
  put = 'put',
  patch = 'patch',
  delete = 'del',
  options = 'options',
  trace = 'trace',
  connect = 'connect',
}

export type RouteVerbKey = keyof typeof RouteVerb

const routeVerbExports = Object.keys(RouteVerb) as RouteVerbKey[]

export type MutatorCollection = Record<string, (paramString: string) => string | number>

interface DefineRouteArgs {
  verb: RouteVerbKey
  routePath: string
  func: Function
}

export type DefineRoute<RouteDefinition> = (args: DefineRouteArgs) => RouteDefinition

export default async function walkRoutes<RouteDefinition>(
  dirpath = './routes',
  middleware: MiddlewareDefinition,
  defineRoute: DefineRoute<RouteDefinition>,
) {
  // reading in the base dir, and kicking of a recursive walk
  const baseDir = await readdir(dirpath, { withFileTypes: true })
  const rebuildCurrentMiddleware = (enabled: string[]) => buildMiddlewareArray(middleware.functions, enabled)
  const currentMiddlewareEnabled = [...middleware.enabled]
  const currentMiddleware = rebuildCurrentMiddleware(currentMiddlewareEnabled)

  return await walkDirectory<RouteDefinition>({
    currentDir: baseDir,
    currentDirPath: dirpath,
    baseDirPath: dirpath,
    currentMiddlewareEnabled,
    currentMiddleware: currentMiddleware,
    rebuildCurrentMiddleware,
    defineRoute,
  })
}

function buildMiddlewareArray(allMiddlewareFunctions: Record<string, Function>, enabled: string[]): Function[] {
  return enabled.map((enabledName: string) => {
    const func = allMiddlewareFunctions[enabledName]
    if (func === undefined) {
      throw new Error(`Expected middelware function named ${enabledName}, but it does not exist`)
    }
    return func
  })
}

type RebuildCurrentMiddleware = (enabled: string[]) => Function[]

async function walkDirectory<RouteDefinition>({
  currentDir,
  currentDirPath,
  baseDirPath,
  currentMiddlewareEnabled,
  currentMiddleware,
  rebuildCurrentMiddleware,
  defineRoute,
}: {
  currentDir: Dirent[],
  currentDirPath: string,
  baseDirPath: string
  currentMiddlewareEnabled: string[],
  currentMiddleware: Function[],
  rebuildCurrentMiddleware: RebuildCurrentMiddleware,
  defineRoute: DefineRoute<RouteDefinition>,
}): Promise<RouteDefinition[]> {
  const pendingSubdirs: [string, Promise<Dirent[]>][] = []
  const pendingHandlers: Promise<RouteDefinition[]>[] = []
  const acceptedFilepaths: string[] = []

  // walking the directory
  //   sub-directories will be read in, and stashed for a recursive walk
  //   javascript files will be processed immediately
  //   dot files are skipped
  for (let i = 0; i < currentDir.length; i++) {
    const dirent = currentDir[i]
    
    if (dirent.isDirectory()) {
      if (dirent.name.slice(0, 1) !== '.') {
        const subdirPath = path.join(currentDirPath, './' + dirent.name)
        pendingSubdirs.push([subdirPath, readdir(subdirPath, { withFileTypes: true })])
      }
      continue
    }

    if (!dirent.isFile()) {
      continue
    }
    const filenameLowercased = dirent.name.toLowerCase()

    if (filenameLowercased === '.middleware.js' || filenameLowercased === '.middleware.ts') {
      const middlewareMutatorPath = path.resolve(path.join(currentDirPath, './' + dirent.name))
      const middlewareMutator = (await import(middlewareMutatorPath)).default
      currentMiddlewareEnabled = middlewareMutator([...currentMiddlewareEnabled])
      currentMiddleware = rebuildCurrentMiddleware(currentMiddlewareEnabled)
      continue
    }

    if ((
      filenameLowercased.slice(-3) !== '.js' &&
      filenameLowercased.slice(-3) !== '.ts'
    ) || filenameLowercased.slice(0, 1) === '.') {
      continue
    }

    acceptedFilepaths.push(path.join(currentDirPath, './' + dirent.name))
  }

  pendingHandlers.push(...acceptedFilepaths.map((filepath: string) => {
    return getRoutesFromFile<RouteDefinition>({
      fileName: path.basename(filepath),
      filepath,
      baseDirPath,
      currentMiddlewareEnabled,
      currentMiddleware,
      rebuildCurrentMiddleware,
      defineRoute,
    })
  }))

  // walking sub-directories
  const pendingSubWalks: Promise<RouteDefinition[]>[] = []
  for (let i = 0; i < pendingSubdirs.length; i++) {
    const [subdirPath, subdirRead] = pendingSubdirs[i]
    const subdir = await subdirRead
    pendingSubWalks.push(walkDirectory<RouteDefinition>({
      currentDir: subdir,
      currentDirPath: subdirPath,
      baseDirPath,
      currentMiddlewareEnabled,
      currentMiddleware,
      rebuildCurrentMiddleware,
      defineRoute,
    }))
  }

  // waiting for all sub-directories and files to finish processing
  const [subwalks, handlers] = await Promise.all([
    Promise.all(pendingSubWalks),
    Promise.all(pendingHandlers),
  ])

  // return a flat list of RouteDefinition instances
  return [...handlers, ...subwalks].reduce((flattened: RouteDefinition[], subdirHandlers: RouteDefinition[]) => {
    flattened.push(...subdirHandlers)
    return flattened
  }, [])
}

async function getRoutesFromFile<RouteDefinition>({
  fileName,
  filepath,
  baseDirPath,
  currentMiddleware,
  currentMiddlewareEnabled,
  rebuildCurrentMiddleware,
  defineRoute,
}: {
  fileName: string,
  filepath: string,
  baseDirPath: string,
  currentMiddlewareEnabled: string[],
  currentMiddleware: Function[],
  rebuildCurrentMiddleware: RebuildCurrentMiddleware,
  defineRoute: DefineRoute<RouteDefinition>,
}) {
  const handlers: RouteDefinition[] = []

  const fileModule = await import(path.resolve(filepath))

  const routePathInner = (
    fileName.toLowerCase() === 'index.js' ||
    fileName.toLowerCase() === 'index.ts'
  ) ?
    // `some/path` instead of `some/path/index.js`
    path.dirname(filepath) :
    // `some/path/endpoint` instead of `some/path/endpoint.js`
    filepath.slice(0, filepath.length - path.extname(filepath).length)
  const routePath = '/' + path.relative(baseDirPath, routePathInner)

  if (fileModule.middleware) {
    const middlewareMutator = fileModule.middleware
    currentMiddlewareEnabled = middlewareMutator([...currentMiddlewareEnabled])
    currentMiddleware = rebuildCurrentMiddleware(currentMiddlewareEnabled)
  }

  for (let verbKey of routeVerbExports) {
    const verbKeyValue = RouteVerb[verbKey]
    if (verbKeyValue in fileModule) {
      handlers.push(prepareRoutePath<RouteDefinition>({
        verb: verbKey,
        routePath,
        func: fileModule[verbKeyValue],
        currentMiddleware,
        currentMiddlewareEnabled,
        rebuildCurrentMiddleware,
        defineRoute,
      }))
    }
  }

  return handlers
}

export enum ParamTypes {
  string,
  number
}

interface SodaRouteHandler extends Function {
  middleware?: (currentMiddleware: string[]) => string[]
}

// routes like `/users/me` will return the plain strings
// routes like `/users/[id]` will return a regex, to match `[id]`
// routes like `/users/[number:id]` will return a regex, to match typed params
function prepareRoutePath<RouteDefinition>({
  verb,
  routePath,
  func,
  currentMiddleware,
  currentMiddlewareEnabled,
  rebuildCurrentMiddleware,
  defineRoute,
}: {
  verb: RouteVerbKey,
  routePath: string,
  func: SodaRouteHandler,
  currentMiddleware: Function[],
  currentMiddlewareEnabled: string[],
  rebuildCurrentMiddleware: RebuildCurrentMiddleware,
  defineRoute: DefineRoute<RouteDefinition>,
}): RouteDefinition {
  if (func.middleware) {
    const middlewareMutator = func.middleware
    currentMiddlewareEnabled = middlewareMutator([...currentMiddlewareEnabled])
    currentMiddleware = rebuildCurrentMiddleware(currentMiddlewareEnabled)
  }

  let preparedFunc: Function
  if (currentMiddleware.length) {
    preparedFunc = (...args: unknown[]) => {
      for (let middleware of currentMiddleware) {
        middleware(...args)
      }
      func(...args)
    }
  } else {
    preparedFunc = func
  }

  return defineRoute({
    verb,
    routePath,
    func: preparedFunc
  })
}
