var express = require('express')
var http = require('http')

var hasRole = require('./auth').hasRole

var authorize = Symbol('authorize')

// socket.io handshakes bypass the express app, run the OIDC session middleware on them
// and require the role before any data is sent
module.exports = function (oidcMiddleware, role) {
  var app = express()
  app.use(oidcMiddleware)
  app.use(function (req, res) {
    req[authorize](hasRole(req, role))
  })

  return function (socket, next) {
    var req = socket.request
    var res = new http.ServerResponse(req)
    var done = false

    function finish (allowed) {
      if (!done) {
        done = true
        next(allowed ? null : new Error('Unauthorized'))
      }
    }

    req[authorize] = finish

    // A middleware answering the request, e.g. with a login redirect, rejects the connection
    res.end = function () {
      finish(false)
    }

    app.handle(req, res, function () {
      finish(false)
    })
  }
}
