import { createServer } from 'node:http'
import { program } from 'commander'

import serve from './serve'
import walkRoutes from './walkRoutes'

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

// const server = createServer()

// server.on('request', (req, res) => {
//   res.writeHead(200, { 'Content-Type': 'application/json' })
//   res.end(JSON.stringify({
//     works: true,
//   }))
// })

// server.listen(4000)
// console.log('server listening on 4000')
