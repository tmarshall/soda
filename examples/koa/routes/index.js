module.exports.get = (ctx, next) => {
  ctx.body = {
    success: true,
    page: 'root',
  }
}
