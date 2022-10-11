const Koa = require('koa')
const Router = require('@koa/router')
const app = new Koa()
const router = new Router()

router.get('/', (ctx, next) => {
  ctx.body = 'this should render'
})

app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(5555)

console.log('Server listening on :5555')
