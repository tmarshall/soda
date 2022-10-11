module.exports.get = (ctx, next) => {
  ctx.body = { userId: ctx.params.id, likeId: ctx.params.likeId }
}
