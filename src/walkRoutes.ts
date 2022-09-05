import { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

enum RouteVerb {
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

type RouteVerbKey = keyof typeof RouteVerb

const routeVerbExports = Object.keys(RouteVerb) as RouteVerbKey[]

export interface RouteDefinition {
  verb: RouteVerbKey,
  path: string | RegExp,
  func: Function,
}

export default async function walkRoutes(dirpath = './routes') {
  // reading in the base dir, and kicking of a recursive walk
  const baseDir = await readdir(dirpath, { withFileTypes: true })
  return await walkDirectory(baseDir, dirpath, dirpath)
}

async function walkDirectory(currentDir: Dirent[], currentDirPath: string, baseDirPath: string): Promise<RouteDefinition[]> {
  const pendingSubdirs: [string, Promise<Dirent[]>][] = []
  const pendingHandlers: Promise<RouteDefinition[]>[] = []

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
    if (filenameLowercased.slice(-3) !== '.js' || filenameLowercased.slice(0, 1) === '.') {
      continue
    }

    pendingHandlers.push(getRoutesFromFile(dirent.name, path.join(currentDirPath, './' + dirent.name), baseDirPath))
  }

  // walking sub-directories
  const pendingSubWalks: Promise<RouteDefinition[]>[] = []
  for (let i = 0; i < pendingSubdirs.length; i++) {
    const [subdirPath, subdirRead] = pendingSubdirs[i]
    const subdir = await subdirRead
    pendingSubWalks.push(walkDirectory(subdir, subdirPath, baseDirPath))
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
      handlers.push({
        verb: verbKey,
        path: determineRoutePathUsed(routePath),
        func: fileModule[verbKeyValue],
      })
    }
  }

  return handlers
}

const typedParamMutators = {
  string: () => {},
  number: () => {},
}
const typedParamChoices = Object.keys(typedParamMutators).join('|')
const pathParamCheck = new RegExp(`/\\[(?:(?<paramType>${typedParamChoices})\\:)?(?<paramName>[a-zA-Z_$][a-zA-Z0-9_$]*)\\](?:/|$)`, 'g')

// routes like `/users/me` will return the plain strings
// routes like `/users/[id]` will return a regex, to match `[id]`
// routes like `/users/[number:id]` will return a regex, to match typed params
function determineRoutePathUsed(routePath: string): string | RegExp {
  const paramMatches = [...routePath.matchAll(pathParamCheck)]

  if (!paramMatches.length) {
    return routePath
  }

  console.log('PARAM MATCHES', paramMatches)

  return routePath
}
