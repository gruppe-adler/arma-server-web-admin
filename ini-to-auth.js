var fs = require('fs')

function toBoolean (x) { return Boolean(x) }

function lineToUser(line) {
  var bits = (line || '').split('=');
  if (bits[0] && bits[1]) {
    return {username: bits[0].trim(), password: bits[1].trim()}
  }
}

/**
 * turn a simple ini file (multiple lines of "$key = $value")
 * into an array of {username, password}
 */
module.exports = function (iniFileName) {
  var iniFileString = fs.readFileSync(iniFileName).toString()

  return iniFileString.split('\n').map(lineToUser).filter(toBoolean)
}
