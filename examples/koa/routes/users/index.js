const mockQuery = () => new Promise((resolve) => resolve([{
  id: 1,
  name: 'Tim',
}, {
  id: 2,
  name: 'Cosmo'
}]))

module.exports.get = async (ctx, next) => {
  const users = await mockQuery()
  ctx.body = {
    users,
  }
}
