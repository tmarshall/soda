import type { IncomingMessage } from 'node:http'

import { program } from 'commander'

import serve from './serve'
import walkRoutes from './walkRoutes'
import withExpress from './withExpress'
import withKoaRouter from './withKoaRouter'

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

  program.parse()
}

module.exports = {
  serve,
  walkRoutes,
  withExpress,
  withKoaRouter,
}
