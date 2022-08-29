import { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { ReadableStreamGenericReader } from 'node:stream/web'
import { resolve } from 'node:path'

export interface RouteDefinition {

}

export default async function walkRoutes(dirpath = './routes') {
  const baseDir = await readdir(dirpath, { withFileTypes: true })
  return await walkDirectory(baseDir, baseDir)
}

async function walkDirectory(baseDir: Dirent[], currentDir: Dirent[]) {
  const subdirReads: ReadableStreamGenericReader[] = []
  const handlers: RouteDefinition[] = []

  for (let i = 0; i < currentDir.length; i++) {
    const dirent = currentDir[i]
    
    if (dirent.isDirectory()) {
      if (dirent.name.slice(0, 1) !== '.') {
        console.log(dirent.name)
      }
      continue
    }
  }
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
