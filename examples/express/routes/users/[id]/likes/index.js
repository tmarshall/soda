module.exports.get = (req, res) => {
  res.send({ userId: req.params.id, likes: ['a', 'b', 'c' ]})
}
