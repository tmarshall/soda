const mockQuery = () => new Promise((resolve) => resolve([{
  id: 1,
  name: 'Tim',
}, {
  id: 2,
  name: 'Cosmo'
}]))

module.exports.get = async (req, res) => {
  const users = await mockQuery()
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    users,
  }))
}
