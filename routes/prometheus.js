let express = require('express')
let promclient = require('prom-client');
let serverLogWriter = require('../lib/server-log-writer')

let connectedPlayers = new promclient.Gauge({
    name: 'arma3_players_connected',
    help: 'Number of connected players on an arma3 server',
    labelNames: ['game', 'title', 'hostname', 'port']
})

let configuredServers = new promclient.Gauge({
    name: 'arma3_servers_configured',
    help: 'Number of servers configured'
})

let runningServers = new promclient.Gauge({
    name: 'arma3_servers_running',
    help: 'Number of servers running'
})

let runningHCs = new promclient.Gauge({
    name: 'arma3_hcs_running',
    help: 'Number of headless clients running',
    labelNames: ['game', 'title', 'hostname', 'port']
})


let lineCounter = new promclient.Counter({
    name: 'arma3_log_lines',
    help: 'Number of log lines written',
    labelNames: ['game', 'title', 'hostname', 'port']
})

serverLogWriter.addRptAnalyzer(function (server, instance, line) {
    lineCounter.labels(server.game, server.title, server.hostname, server.port).inc()
})

module.exports = function (manager) { // server manager
    var router = express.Router()

    router.get('/', function (req, res) {
        connectedPlayers.reset()
        runningHCs.reset()
        manager.getServers().filter(function (server) {
            return !!server.instance
        }).forEach(function (server) {
            connectedPlayers.labels(server.game, server.title, server.hostname, server.port).set((server.players || []).length)
            runningHCs.labels(server.game, server.title, server.hostname, server.port).set(server.headlessClientInstances.length)
        })
        configuredServers.set(manager.getServers().length)
        runningServers.set(manager.getServers().filter(function (server) { return server.instance }).length)
        res.end(promclient.register.metrics());
    })

    return router
}
