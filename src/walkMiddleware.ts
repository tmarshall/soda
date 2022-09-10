import { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

export interface MiddlewareDefinition {
  func: Function,
  enabledByDefault: boolean
}

export default async function walkMiddleware(dirpath = './middleware') {
  // reading in the base dir, and kicking of a recursive walk
  let baseDir
  try {
    baseDir = await readdir(dirpath, { withFileTypes: true })
  } catch {
    return {}
  }
  const result: Record<string, MiddlewareDefinition> = {}
  
  for (let dirent of baseDir) {
    if (!dirent.isFile()) {
      continue
    }

    const filenameLowercased = dirent.name.toLowerCase()
    if (filenameLowercased.slice(-3) !== '.js' || filenameLowercased.slice(0, 1) === '.') {
      continue
    }

    const fileModule = await import(path.resolve(path.join(dirpath, './' + dirent.name)))
    const definition: MiddlewareDefinition = {
      func: fileModule.default,
      enabledByDefault: fileModule.enaled ?? false,
    }
    const middlewareName = path.basename(dirent.name, path.extname(dirent.name))
    result[middlewareName] = definition
  }

  return result
}
