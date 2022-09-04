import { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

enum RouteVerb {
  All = 'all',
  Head = 'head',
  Get = 'get',
  Post = 'post',
  Put = 'put',
  Patch = 'patch',
  Delete = 'delete',
  Options = 'options',
  Trace = 'trace',
  Connect = 'connect',
}

export interface RouteDefinition {
  verb: RouteVerb
}

export default async function walkRoutes(dirpath = './routes') {
  const baseDir = await readdir(dirpath, { withFileTypes: true })
  return await walkDirectory(baseDir, dirpath)
}

async function walkDirectory(currentDir: Dirent[], currentDirPath: string): Promise<RouteDefinition[]> {
  const subdirsPending: [string, Promise<Dirent[]>][] = []
  const handlers: RouteDefinition[] = []

  for (let i = 0; i < currentDir.length; i++) {
    const dirent = currentDir[i]
    
    if (dirent.isDirectory()) {
      if (dirent.name.slice(0, 1) !== '.') {
        const subdirPath = join(currentDirPath, dirent.name)
        subdirsPending.push([subdirPath, readdir(subdirPath, { withFileTypes: true })])
      }
      continue
    }

    if (!dirent.isFile()) {
      continue
    }
    const filename = dirent.name.slice(-3).toLowerCase()
    if (filename.slice(-3) !== '.js' && filename.slice(-3) !== '.ts') {
      continue
    }

    handlers.push(...getRoutesFromFile(join(currentDirPath, dirent.name)))
  }

  const pendingSubWalks: Promise<RouteDefinition[]>[] = []
  for (let i = 0; i < subdirsPending.length; i++) {
    const [subdirPath, subdirRead] = subdirsPending[i]
    const subdir = await subdirRead
    pendingSubWalks.push(walkDirectory(subdir, subdirPath))
  }
  const subwalks = await Promise.all(pendingSubWalks)
  
  return subwalks.reduce((flattened: RouteDefinition[], subdirHandlers: RouteDefinition[]) => {
    flattened.push(...subdirHandlers)
    return flattened
  }, handlers)
}

function getRoutesFromFile(filePath: string) {
  const handlers: RouteDefinition[] = []

  // todo: read file content

  return handlers
}

// // can return undefined
// function direntType(dirent: Dirent) {
//   if (dirent.isFile()) {
//     if (dirent.name.slice(-3).toLowerCase() === '.js') {
//       const verbMatch = dirent.name.match(preDotExpr)
//       if (verbMatch && validHandlerVerbs.includes(verbMatch[0].toLowerCase())) {
//         return 'handler'
//       }
//     }
//   } else if (dirent.isDirectory()) {
//     if (dirent.name === '.middleware') {
//       return 'middleware'
//     }
//     return 'dir'
//   }
// }
