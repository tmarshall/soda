import { env } from 'node:process'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createServer } from 'node:http'

import walkRoutes from './walkRoutes'
import type { SodaRequest } from '.'

const port = env.SODA_PORT || 4000

export default async function(dirpath?: string) {
  const routes = await walkRoutes(dirpath)
  console.log(dirpath, routes)

  const server = createServer()
  
  server.on('request', (req: IncomingMessage, res: ServerResponse) => {
    const sodaReq: SodaRequest = Object.assign({ params: {} }, req)
    console.log('INCOMING: ', req.url)
  })

  server.listen(port)
  console.log(`soda listening on :${port}`)
}

// const express = require('express')
// const soda = require('soda')

// const app = express()

// const port = env.SODA_PORT || 4000

// const startup = async () => {
//   const routes = await soda.walkRoutes('./routes')

//   routes.forEach(({ verb, path, func }) => {
//     app[verb](path, func)
//   })

//   app.listen(port)
//   console.log('Server listening on :5555')
// }
// startup()
