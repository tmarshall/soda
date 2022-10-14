import type { IncomingMessage } from 'node:http'

import { program } from 'commander'

import libServe from './serve'
import libWithExpress from './withExpress'
import libWithKoaRouter from './withKoaRouter'

export interface SodaRequest extends IncomingMessage {
  params: Record<string, string | number>
}

if (require.main === module) {
  program
    .command('serve [routes_directory] [middleware_directory]')
    .description('serve a directory of routes')
    .action(async (routes = './routes', middleware = './middleware') => {
      await libServe(routes, middleware)
    })

  program.parse()
}


export const serve = libServe
export const withExpress = libWithExpress
export const withKoaRouter = libWithKoaRouter
