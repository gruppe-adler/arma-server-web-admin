var express = require('express')

var preset = require('../lib/preset')

// Public without login, players open the preset in the Arma 3 Launcher
module.exports = function (manager, mods) {
  var router = express.Router()

  router.get('/:server.html', function (req, res) {
    var server = manager.getServers().find(function (server) {
      return server.id === req.params.server
    })

    if (!server) {
      return res.status(404).send('Server not found')
    }

    var filename = server.id.replace(/[^A-Za-z0-9._-]/g, '_') + '.html'
    res.type('html')
    res.set('Content-Disposition', 'inline; filename="' + filename + '"')
    res.send(preset(server, mods))
  })

  return router
}
