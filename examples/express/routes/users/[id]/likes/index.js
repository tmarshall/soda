module.exports.get = (req, res) => {
  res.send({ userId: ctx.params.id, likes: ['a', 'b', 'c' ] })
}
