module.exports.get = (ctx, next) => {
  ctx.body = { userId: ctx.params.id, likes: ['a', 'b', 'c' ] }
}
