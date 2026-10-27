var express = require('express')
var bodyParser = require('body-parser')
var morgan = require('morgan')
var path = require('path')
var serveStatic = require('serve-static')
var webpack = require('webpack')
var webpackMiddleware = require('webpack-dev-middleware')
const { auth } = require('express-openid-connect')

var config = require('./config')
var webpackConfig = require('./webpack.config')
var GameInstaller = require('./lib/game_installer')
var Manager = require('./lib/manager')
var Missions = require('./lib/missions')
var SteamMods = require('./lib/steam_mods')
var Logs = require('./lib/logs')
var Settings = require('./lib/settings')
var socketAuth = require('./lib/socket_auth')
const requiresRole = require('./lib/auth')

var app = express()
var server = require('http').Server(app)
var io = require('socket.io')(server)

app.get('/favicon.ico', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'favicon.ico'))
})

app.use(auth({ ...config.ssoConfig, idpLogout: true }))
app.use(requiresRole(config.requiredRole))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

morgan.token('user', function (req) { return req.oidc?.user?.preferred_username ?? 'anon' })
app.use(morgan(config.logFormat || 'dev', { stream: config.logStream || process.stdout }))

app.use(serveStatic(path.join(__dirname, 'public')))

app.get('/api/user', function (req, res) {
  const user = req.oidc?.user
  const username = user?.preferred_username || user?.username || user?.name || req.auth?.user || 'Unknown User'

  const roles = req.appSession?.roles || []

  res.json({
    username,
    avatar: user?.picture,
    permissions: {
      installGame: !!config.gameInstallRole && roles.includes(config.gameInstallRole)
    }
  })
})

var logs = new Logs(config)

var missions = new Missions(config)
var mods = new SteamMods(config)
mods.updateMods()

var manager = new Manager(config, logs, mods)
manager.load()

var settings = new Settings(config)

var gameInstaller = new GameInstaller(config)

app.use('/api/logs', require('./routes/logs')(logs))
app.use('/api/missions', require('./routes/missions')(missions))
app.use('/api/mods', require('./routes/mods')(mods))
app.use('/api/game', requiresRole(config.gameInstallRole), require('./routes/game')(gameInstaller, manager))
app.use('/api/servers', require('./routes/servers')(manager, mods, gameInstaller))
app.use('/api/settings', require('./routes/settings')(settings))

// Live updates contain server passwords, without login redirects as socket.io cannot follow them
io.use(socketAuth(auth({ ...config.ssoConfig, idpLogout: true, authRequired: false }), config.requiredRole))

io.on('connection', function (socket) {
  socket.emit('missions', missions.missions)
  socket.emit('mods', mods.mods)
  socket.emit('servers', manager.getServers())
  socket.emit('settings', settings.getPublicSettings())
  socket.emit('gameInstall', gameInstaller.status)
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

function sendNotification (notification) {
  io.emit('notification', notification)
}

mods.on('notification', sendNotification)
manager.on('notification', sendNotification)
gameInstaller.on('notification', sendNotification)

gameInstaller.on('status', function (status) {
  io.emit('gameInstall', status)
})

if (require.main === module) {
  var webpackCompiler = webpack(webpackConfig)

  app.use(webpackMiddleware(webpackCompiler, {
    publicPath: webpackConfig.output.publicPath,
    stats: {
      colors: true,
      assets: false,
      chunks: false,
      modules: false,
      children: false
    }
  }))

  console.log(`\nListening on ${config.host}:${config.port}\n`)
  server.listen(config.port, config.host)
}

app.server = server

module.exports = app
