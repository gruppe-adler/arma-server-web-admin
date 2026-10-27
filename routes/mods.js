var express = require('express')

var isWorkshopId = require('../lib/workshop_id')

function invalidId (res, id) {
  res.status(400).send('Invalid Steam Workshop ID: ' + id)
}

module.exports = function (modsManager) {
  var router = express.Router()

  router.get('/', function (req, res) {
    res.send(modsManager.mods)
  })

  router.post('/', function (req, res) {
    if (!isWorkshopId(req.body.id)) {
      return invalidId(res, req.body.id)
    }

    modsManager.download(req.body.id)
    res.status(204).send()
  })

  router.put('/:mod', function (req, res) {
    if (!isWorkshopId(req.params.mod)) {
      return invalidId(res, req.params.mod)
    }

    modsManager.download(req.params.mod)
    res.status(204).send()
  })

  router.delete('/:mod', function (req, res) {
    if (!isWorkshopId(req.params.mod)) {
      return invalidId(res, req.params.mod)
    }

    modsManager.delete(req.params.mod, function (err) {
      if (err) {
        res.status(500).send(err.message || String(err))
      } else {
        res.status(204).send()
      }
    })
  })

  router.post('/refresh', function (req, res) {
    modsManager.updateMods()
    res.status(204).send()
  })

  router.post('/search', function (req, res) {
    var query = req.body.query || ''
    modsManager.search(query, function (err, mods) {
      if (err || !mods) {
        res.status(500).send(err ? err.message || String(err) : 'No search results')
      } else {
        res.send(mods)
      }
    })
  })

  return router
}
