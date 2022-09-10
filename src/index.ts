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
    .command('serve [routes directory] [middleware directory]')
    .description('serve a directory of routes')
    .action(async (...args: string[]) => {
      await serve(...args)
    })

  program
    .command('walk [directory]')
    .description('walk a directory of middleware, and print the results')
    .action(async (...args: string[]) => {
      const results = await walkMiddleware(...args)
      console.log(results)
    })

  program.parse()
}

module.exports = {
  serve,
  walkRoutes,
}
