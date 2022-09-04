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
  path: string,
  func: Function,
}

export default async function walkRoutes(dirpath = './routes') {
  const baseDir = await readdir(dirpath, { withFileTypes: true })
  return await walkDirectory(baseDir, dirpath, dirpath)
}

async function walkDirectory(currentDir: Dirent[], currentDirPath: string, baseDirPath: string): Promise<RouteDefinition[]> {
  const pendingSubdirs: [string, Promise<Dirent[]>][] = []
  const pendingHandlers: Promise<RouteDefinition[]>[] = []

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
    const filename = dirent.name.slice(-3).toLowerCase()
    if (filename.slice(-3) !== '.js') {
      continue
    }

    pendingHandlers.push(getRoutesFromFile(dirent.name, path.join(currentDirPath, './' + dirent.name), baseDirPath))
  }

  const pendingSubWalks: Promise<RouteDefinition[]>[] = []
  for (let i = 0; i < pendingSubdirs.length; i++) {
    const [subdirPath, subdirRead] = pendingSubdirs[i]
    const subdir = await subdirRead
    pendingSubWalks.push(walkDirectory(subdir, subdirPath, baseDirPath))
  }

  const [subwalks, handlers] = await Promise.all([
    Promise.all(pendingSubWalks),
    Promise.all(pendingHandlers),
  ])
  
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
        path: routePath,
        func: fileModule[verbKeyValue],
      })
    }
  }

  return handlers
}
