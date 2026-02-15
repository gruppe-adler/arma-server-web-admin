var https = require('https')

var CACHE_TTL = 10 * 60 * 1000 // 10 minutes

function validateToken (ssoUrl, token, cb) {
  var url = new URL('/api/v1/graphql', ssoUrl)
  var query = JSON.stringify({
    query: '{ currentUser { id username } }'
  })

  var options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(query),
      Authorization: 'Bearer ' + token
    }
  }

  var req = https.request(options, function (res) {
    var body = ''
    res.on('data', function (chunk) { body += chunk })
    res.on('end', function () {
      if (res.statusCode !== 200) {
        cb(new Error('SSO service returned status ' + res.statusCode))
        return
      }

      try {
        var data = JSON.parse(body)
        if (data.data && data.data.currentUser) {
          cb(null, data.data.currentUser)
        } else {
          cb(new Error('Unauthorized'))
        }
      } catch (e) {
        cb(new Error('Invalid SSO response'))
      }
    })
  })

  req.on('error', function (err) {
    cb(err)
  })

  req.write(query)
  req.end()
}

function parseCookies (cookieHeader) {
  var cookies = {}
  if (!cookieHeader) return cookies
  cookieHeader.split(';').forEach(function (cookie) {
    var parts = cookie.split('=')
    var name = parts.shift().trim()
    cookies[name] = parts.join('=').trim()
  })
  return cookies
}

module.exports = function (config, app) {
  if (!config.sso) {
    return
  }

  var cookieName = config.sso.cookieName || 'gruppe-adler-sso-token'
  var ssoUrl = config.sso.url || 'https://sso.gruppe-adler.de'

  var validUsers = {}

  app.use(function (req, res, next) {
    var cookies = parseCookies(req.headers.cookie)
    var token = cookies[cookieName]

    if (!token) {
      res.status(401).send('No SSO token found. Please authenticate at ' + ssoUrl)
      return
    }

    var cached = validUsers[token]
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      req.ssoUser = cached.user
      next()
      return
    }

    validateToken(ssoUrl, token, function (err, user) {
      if (err) {
        res.status(401).send('SSO authentication failed. Please authenticate at ' + ssoUrl)
        return
      }

      validUsers[token] = { user: user, timestamp: Date.now() }
      req.ssoUser = user
      next()
    })
  })
}
