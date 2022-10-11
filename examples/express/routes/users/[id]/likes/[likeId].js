module.exports.get = (req, res) => {
  res.send({ userId: ctx.params.id, likeId: ctx.params.likeId })
}
