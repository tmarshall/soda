import type { IncomingMessage } from 'node:http'
import { program } from 'commander'

import serve from './serve'
import walkRoutes from './walkRoutes'

export interface SodaRequest extends IncomingMessage {
  params: Record<string, string>
}

if (require.main === module) {
  program
    .command('serve [directory]')
    .description('serve a directory of routes')
    .action(async (...args) => {
      await serve(...args)
    })

  program
    .command('walk [directory]')
    .description('walk a directory of routes, and print the results')
    .action(async (...args) => {
      const results = await walkRoutes(...args)
      console.log(results)
    })

  program.parse()
}

module.exports = {
  serve,
  walkRoutes,
}
