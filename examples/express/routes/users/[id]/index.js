module.exports.get = (req, res) => {
  res.send({
    userId: parseInt(req.params.id, 10),
  })
}
