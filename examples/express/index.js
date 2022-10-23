const express = require('express')
const soda = require('soda-routes')

const app = express()

async function startup() {
  app.use(await soda.withExpress('./routes'))

  app.listen(5555)
  console.log('Server listening on :5555')
}
startup()
