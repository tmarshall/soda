module.exports.get = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    userId: parseInt(req.params.id, 10),
  }))
}
