import { createServer } from 'node:http'
import { program } from 'commander'

import walk from './walk'

if (require.main === module) {
  program
    .command('walk [directory]')
    .description('walk a directory of routes')
    .action(walk)

  program.parse()
}

module.exports = {
  walk,
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
