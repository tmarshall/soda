const express = require('express')
const soda = require('soda')

const app = express()

const startup = async () => {
  const routes = await soda.walkRoutes('./routes')

  routes.forEach(({ verb, path, func }) => {
    app[verb](path, func)
  })

  app.listen(5555)
  console.log('Server listening on :5555')
}
startup()
