module.exports.get = (ctx, next) => {
  ctx.body = {
    userId: parseInt(ctx.params.id, 10),
  }
}
