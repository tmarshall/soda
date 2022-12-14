import { readdir } from 'node:fs/promises'
import path from 'node:path'

export interface MiddlewareDefinition {
  enabled: string[]
  functions: Record<string, Function>
}

export default async function walkMiddleware(dirpath = './middleware'): Promise<MiddlewareDefinition> {
  // reading in the base dir, and kicking of a recursive walk
  let baseDir
  try {
    baseDir = await readdir(dirpath, { withFileTypes: true })
  } catch {
    return {
      enabled: [],
      functions: {},
    }
  }
  const result: MiddlewareDefinition = {
    enabled: [],
    functions: {},
  }
  
  for (let dirent of baseDir) {
    if (!dirent.isFile()) {
      continue
    }

    const filenameLowercased = dirent.name.toLowerCase()

    if (filenameLowercased === 'index.js' || filenameLowercased === 'index.ts') {
      const indexModule = await import(path.resolve(path.join(dirpath, './' + dirent.name)))
      result.enabled = indexModule.default
      continue
    }

    if (
      (
        filenameLowercased.slice(-3) !== '.js' &&
        filenameLowercased.slice(-3) !== '.ts'
      ) || filenameLowercased.slice(0, 1) === '.'
    ) {
      continue
    }

    const fileModule = await import(path.resolve(path.join(dirpath, './' + dirent.name)))
    const middlewareName = path.basename(dirent.name, path.extname(dirent.name))
    result.functions[middlewareName] = fileModule.default
  }

  return result
}
