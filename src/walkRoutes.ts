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

type MutatorCollection = Record<string, (paramString: string) => string | number>

interface RouteDefinitionBase {
  verb: RouteVerbKey,
  func: Function
}
interface RouteDefinitionPlain {
  type: 'plain',
  path: string,
  paramMutators: {},
}
interface RouteDefinitionParams {
  type: 'params',
  path: RegExp,
  paramMutators: MutatorCollection,
}

export type RouteDefinition = RouteDefinitionBase & (
  RouteDefinitionPlain | RouteDefinitionParams
)

export default async function walkRoutes(dirpath = './routes', middleware: MiddlewareDefinition) {
  // reading in the base dir, and kicking of a recursive walk
  const baseDir = await readdir(dirpath, { withFileTypes: true })
  const rebuildCurrentMiddleware = (enabled: string[]) => buildMiddlewareArray(middleware.functions, enabled)
  const currentMiddlewareEnabled = [...middleware.enabled]
  const currentMiddleware = rebuildCurrentMiddleware(currentMiddlewareEnabled)

  return await walkDirectory({
    currentDir: baseDir,
    currentDirPath: dirpath,
    baseDirPath: dirpath,
    currentMiddlewareEnabled,
    currentMiddleware: currentMiddleware,
    rebuildCurrentMiddleware,
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

async function walkDirectory({
  currentDir,
  currentDirPath,
  baseDirPath,
  currentMiddlewareEnabled,
  currentMiddleware,
  rebuildCurrentMiddleware,
}: {
  currentDir: Dirent[],
  currentDirPath: string,
  baseDirPath: string
  currentMiddlewareEnabled: string[],
  currentMiddleware: Function[],
  rebuildCurrentMiddleware: (enabled: string[]) => Function[],
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

    if (filenameLowercased === '.middleware.js') {
      const middlewareMutatorPath = path.resolve(path.join(currentDirPath, './' + dirent.name))
      const middlewareMutator = (await import(middlewareMutatorPath)).deafult
      currentMiddlewareEnabled = middlewareMutator([...currentMiddlewareEnabled])
      currentMiddleware = rebuildCurrentMiddleware(currentMiddlewareEnabled)
      continue
    }

    if (filenameLowercased.slice(-3) !== '.js' || filenameLowercased.slice(0, 1) === '.') {
      continue
    }

    acceptedFilepaths.push(path.join(currentDirPath, './' + dirent.name))
  }

  pendingHandlers.push(...acceptedFilepaths.map((filepath: string) => {
    return getRoutesFromFile(path.basename(filepath), filepath, baseDirPath)
  }))

  // walking sub-directories
  const pendingSubWalks: Promise<RouteDefinition[]>[] = []
  for (let i = 0; i < pendingSubdirs.length; i++) {
    const [subdirPath, subdirRead] = pendingSubdirs[i]
    const subdir = await subdirRead
    pendingSubWalks.push(walkDirectory({
      currentDir: subdir,
      currentDirPath: subdirPath,
      baseDirPath,
      currentMiddlewareEnabled,
      currentMiddleware,
      rebuildCurrentMiddleware,
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

async function getRoutesFromFile(fileName: string, filePath: string, baseDirPath: string) {
  const handlers: RouteDefinition[] = []

  const fileModule = await import(path.resolve(filePath))

  const routePathInner = fileName.toLowerCase() === 'index.js' ?
    // `some/path` instead of `some/path/index.js`
    path.dirname(filePath) :
    // `some/path/endpoint` instead of `some/path/endpoint.js`
    filePath.slice(0, filePath.length - path.extname(filePath).length)
  const routePath = '/' + path.relative(baseDirPath, routePathInner)

  for (let verbKey of routeVerbExports) {
    const verbKeyValue = RouteVerb[verbKey]
    if (verbKeyValue in fileModule) {
      handlers.push(prepareRoutePath(verbKey, routePath, fileModule[verbKeyValue]))
    }
  }

  return handlers
}

enum ParamTypes {
  string,
  number
}
const typedParamAttributes = {
  [ParamTypes.string]: {
    regExpStr: (paramName: string) => `/(?<${paramName}>[^/]+)`,
    mutator: (paramString: string) => paramString,
  },
  [ParamTypes.number]: {
    regExpStr: (paramName: string) => `/(?<${paramName}>\\d+(?:\\.\\d+)?)`,
    mutator: (paramString: string) => Number(paramString)
  },
}
const typedParamChoices = Object.keys(ParamTypes).join('|')


function escapeRegex(input: string): string {
  return input.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// routes like `/users/me` will return the plain strings
// routes like `/users/[id]` will return a regex, to match `[id]`
// routes like `/users/[number:id]` will return a regex, to match typed params
function prepareRoutePath(verb: RouteVerbKey, routePath: string, func: Function): RouteDefinition {
  const pathParamCheck = new RegExp(`/\\[(?:(?<paramType>${typedParamChoices})\\:)?(?<paramName>[a-zA-Z_$][a-zA-Z0-9_$]*)\\](?=/|$)`, 'g')

  if (!pathParamCheck.test(routePath)) {
    return {
      type: 'plain',
      verb,
      path: routePath,
      paramMutators: {},
      func,
    }
  }

  const mutators: MutatorCollection = {}
  const parts = routePath.split(pathParamCheck)
  let resultRegExpString = '^'

  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      resultRegExpString += escapeRegex(parts[i])
      continue
    }

    const paramType = (parts[i] || 'string') as keyof typeof ParamTypes
    const paramName = parts[i + 1]
    i = i + 1

    const paramAttributes = typedParamAttributes[ParamTypes[paramType]]
    resultRegExpString += paramAttributes.regExpStr(paramName)
    mutators[paramName] = paramAttributes.mutator
  }
  resultRegExpString = resultRegExpString + '$'
  
  return {
    type: 'params',
    verb,
    path: new RegExp(resultRegExpString),
    paramMutators: mutators,
    func,
  }
}
