module.exports.get = (req, res) => {
  res.send({
    userId: parseInt(ctx.params.id, 10),
  })
}
