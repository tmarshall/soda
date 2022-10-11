const Koa = require('koa')
const soda = require('soda')
const app = new Koa()

async function startup() {
  app.use(await soda.withKoaRouter('./routes'))

  app.listen(5555)
  console.log('Server listening on :5555')
}
startup()
