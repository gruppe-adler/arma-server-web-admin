var logger = require('./../logger').getLogger('server-started')

/**
 * @param server
 * @param instance server instance
 * @param line server log line
 */
module.exports = function (server, instance, line) {
  var matches = line.toString().match(/Connected to Steam servers/)
  if (!matches) {
    return
  }

  logger.info(
    {
      port: server.port,
      title: server.title
    },
    'Server started'
  )
}
