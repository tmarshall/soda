import { createServer } from 'node:http'

const server = createServer()

server.on('request', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    works: true,
  }))
})

server.listen(4000)
console.log('server listening on 4000')
