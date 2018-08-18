var express = require('express')
var streams = require('stream')
var bodyParser = require('body-parser')
var expressRequestLogger = require('./lib/express-request-logger')
var path = require('path')
var serveStatic = require('serve-static')
var webpack = require('webpack')
var webpackMiddleware = require('webpack-dev-middleware')

var config = require('./config')
var log = require('./lib/logger')
var webpackConfig = require('./webpack.config')
var setupBasicAuth = require('./lib/setup-basic-auth')
var Manager = require('./lib/manager')
var Missions = require('./lib/missions')
var Mods = require('./lib/mods')
var Logs = require('./lib/server-log-paths')
var Settings = require('./lib/settings')

var app = express()
var server = require('http').Server(app)
var io = require('socket.io')(server)

var webpackCompiler = webpack(webpackConfig)

app.use(webpackMiddleware(webpackCompiler, {
  publicPath: webpackConfig.output.publicPath
}))

setupBasicAuth(config, app)

app.set('json replacer', function (key, value) {
  if (value && value instanceof streams.Stream) {
    return 'STREAM'
  }
  return value
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use(expressRequestLogger)

app.use(serveStatic(path.join(__dirname, 'public')))

var logs = new Logs(config)

var manager = new Manager(config, logs)
manager.load()

var missions = new Missions(config)
var mods = new Mods(config)
mods.updateMods()

var settings = new Settings(config)

app.use('/api/logs', require('./routes/logs')(logs))
app.use('/api/missions', require('./routes/missions')(missions))
app.use('/api/mods', require('./routes/mods')(mods))
app.use('/api/servers', require('./routes/servers')(manager, mods))
app.use('/metrics', require('./routes/prometheus')(manager))
app.use('/api/settings', require('./routes/settings')(settings))

io.on('connection', function (socket) {
  socket.emit('missions', missions.missions)
  socket.emit('mods', mods.mods)
  socket.emit('servers', manager.getServers())
  socket.emit('settings', settings.getPublicSettings())
})

missions.on('missions', function (missions) {
  io.emit('missions', missions)
})

mods.on('mods', function (mods) {
  io.emit('mods', mods)
})

manager.on('servers', function () {
  io.emit('servers', manager.getServers())
})

server.listen(config.port, config.host)
