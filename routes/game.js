var express = require('express')

module.exports = function (gameInstaller, manager) {
  var router = express.Router()

  router.get('/', function (req, res) {
    res.json({
      path: gameInstaller.config.path,
      status: gameInstaller.status
    })
  })

  router.get('/branches', function (req, res) {
    gameInstaller.branches(function (err, branches) {
      if (err) {
        res.status(500).send(err.message)
      } else {
        res.json(branches)
      }
    })
  })

  router.post('/install', function (req, res) {
    if (gameInstaller.status.installing) {
      return res.status(409).send('Arma 3 is already being installed')
    }

    var runningServers = manager.getServers().filter(function (server) {
      return server.pid
    })
    if (runningServers.length > 0) {
      return res.status(409).send('Stop all servers before installing Arma 3')
    }

    gameInstaller.install({
      branch: req.body.branch,
      password: req.body.password
    }, function (err) {
      if (err) {
        res.status(400).send(err.message)
      } else {
        res.status(202).json(gameInstaller.status)
      }
    })
  })

  return router
}
