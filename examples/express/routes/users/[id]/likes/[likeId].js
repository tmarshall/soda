module.exports.get = (req, res) => {
  res.send({ userId: req.params.id, likeId: req.params.likeId })
}
