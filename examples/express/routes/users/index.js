const mockQuery = () => new Promise((resolve) => resolve([{
  id: 1,
  name: 'Tim',
}, {
  id: 2,
  name: 'Cosmo'
}]))

module.exports.get = async (req, res) => {
  const users = await mockQuery()
  res.send({
    users,
  })
}
