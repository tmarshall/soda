const Koa = require('koa')
const soda = require('soda-routes')
const app = new Koa()

async function startup() {
  const sodaRouter = await soda.withKoaRouter('./routes')
  app
    .use(sodaRouter.routes())
    .use(sodaRouter.allowedMethods())
  
  app.listen(5555)
  console.log('Server listening on :5555')
}
startup()
