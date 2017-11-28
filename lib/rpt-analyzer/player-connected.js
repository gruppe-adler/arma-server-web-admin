var logger = require('./../logger').getLogger('player-connected')

/**
 *
 * @param server server configuration
 * @param instance server instance
 * @param line server log line
 */
module.exports = function (server, instance, line) {
  // 15:59:06 Player Panda connected (id=76561198140869600).
  var matches = line.toString().match(/Player (.*) connected \(id=(.*)\)/)
  if (!matches) {
    return
  }
  var playername = matches[1]
  var steamid = matches[2]

  logger.info(
    {
      port: server.port,
      server: server.title,
      playername: playername,
      steamid: steamid
    },
    'Player connected: ' + playername
  )
}
