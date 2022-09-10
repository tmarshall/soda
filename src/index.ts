import type { IncomingMessage } from 'node:http'

import { program } from 'commander'

import serve from './serve'
import walkRoutes from './walkRoutes'
import walkMiddleware from './walkMiddleware'

export interface SodaRequest extends IncomingMessage {
  params: Record<string, string | number>
}

if (require.main === module) {
  program
    .command('serve [routes_directory] [middleware_directory]')
    .description('serve a directory of routes')
    .action(async (routes = './routes', middleware = './middleware') => {
      await serve(routes, middleware)
    })

  program
    .command('walk [directory]')
    .description('walk a directory of middleware, and print the results')
    .action(async (dirpath = './middleware') => {
      const results = await walkMiddleware(dirpath)
      console.log(results)
    })

  program.parse()
}

module.exports = {
  serve,
  walkRoutes,
}
