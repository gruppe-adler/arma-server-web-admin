const oidc = require('express-openid-connect')
const socketClient = require('socket.io-client')
const request = require('supertest')
require('should')

const config = require('../config')

config.gameInstallRole = 'game-admin'

function fakeJwt (payload) {
  const encode = (data) => Buffer.from(JSON.stringify(data)).toString('base64url')
  return encode({ alg: 'none' }) + '.' + encode(payload) + '.'
}

// Replace OIDC login with a logged in user that has the required role, avoids talking to Keycloak
oidc.auth = function (options) {
  return function (req, res, next) {
    const roles = req.get('X-Test-Roles') ? req.get('X-Test-Roles').split(',') : [config.requiredRole]
    req.appSession = {}

    if (req.get('X-Test-Anonymous')) {
      if (options.authRequired === false) {
        req.oidc = { isAuthenticated: () => false }
        return next()
      }
      return res.redirect('/login')
    }

    req.oidc = {
      isAuthenticated: () => true,
      user: { preferred_username: 'test' },
      accessToken: {
        access_token: fakeJwt({ realm_access: { roles } }),
        isExpired: () => false
      }
    }
    next()
  }
}

const app = require('../app')

function requestPath (path, contentType, done) {
  request(app)
    .get(path)
    .expect('Content-Type', contentType)
    .expect(200)
    .end(done)
}

describe('App', function () {
  it('should serve main page', function (done) {
    requestPath('/', /html/, done)
  })

  it('should serve logs', function (done) {
    requestPath('/api/logs', /json/, done)
  })

  it('should serve missions', function (done) {
    requestPath('/api/missions', /json/, done)
  })

  it('should serve mods', function (done) {
    requestPath('/api/mods', /json/, done)
  })

  it('should serve servers', function (done) {
    requestPath('/api/servers', /json/, done)
  })

  it('should serve settings', function (done) {
    requestPath('/api/settings', /json/, done)
  })

  it('should serve user', function (done) {
    request(app)
      .get('/api/user')
      .expect(200, { username: 'test', permissions: { installGame: false } })
      .end(done)
  })

  describe('path and id validation', function () {
    it('should not download files outside of missions folder', function (done) {
      request(app)
        .get('/api/missions/..%2F..%2Fpackage.json')
        .expect(400, 'Invalid mission name')
        .end(done)
    })

    it('should not delete files outside of missions folder', function (done) {
      request(app)
        .delete('/api/missions/..%2F..%2Fpackage.json')
        .expect(400, 'Invalid mission name')
        .end(done)
    })

    it('should not delete paths outside of Workshop folder', function (done) {
      request(app)
        .delete('/api/mods/..%2F..')
        .expect(400, 'Invalid Steam Workshop ID: ../..')
        .end(done)
    })

    it('should not download invalid Workshop ids', function (done) {
      request(app)
        .post('/api/mods')
        .send({ id: '1 +quit' })
        .expect(400, 'Invalid Steam Workshop ID: 1 +quit')
        .end(done)
    })
  })

  describe('live updates', function () {
    let url

    before(function (done) {
      app.server.listen(0, '127.0.0.1', function () {
        url = 'http://127.0.0.1:' + app.server.address().port
        done()
      })
    })

    after(function (done) {
      app.server.close(function () {
        done()
      })
    })

    function connect (headers) {
      return socketClient(url, { transports: ['polling'], extraHeaders: headers, reconnection: false, forceNew: true })
    }

    function expectRejected (headers, done) {
      const socket = connect(headers)
      socket.on('servers', function () {
        socket.close()
        done(new Error('servers were sent'))
      })
      socket.on('error', function (err) {
        socket.close()
        err.should.eql('Unauthorized')
        done()
      })
    }

    it('should reject anonymous connections', function (done) {
      expectRejected({ 'X-Test-Anonymous': '1' }, done)
    })

    it('should reject users without required role', function (done) {
      expectRejected({ 'X-Test-Roles': 'other' }, done)
    })

    it('should send servers to users with required role', function (done) {
      const socket = connect({})
      socket.on('servers', function (servers) {
        socket.close()
        servers.should.be.an.Array()
        done()
      })
      socket.on('error', function (err) {
        socket.close()
        done(new Error(err))
      })
    })
  })

  describe('game install', function () {
    const installRoles = [config.requiredRole, config.gameInstallRole].join(',')

    it('should deny users without install role', function (done) {
      request(app)
        .get('/api/game')
        .expect(403)
        .end(done)
    })

    it('should allow users with install role', function (done) {
      request(app)
        .get('/api/game')
        .set('X-Test-Roles', installRoles)
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(function (res) {
          res.body.should.have.property('path', config.path)
          res.body.status.should.have.property('installing', false)
        })
        .end(done)
    })

    it('should show install permission to users with install role', function (done) {
      request(app)
        .get('/api/user')
        .set('X-Test-Roles', installRoles)
        .expect(200, { username: 'test', permissions: { installGame: true } })
        .end(done)
    })

    it('should reject invalid branch', function (done) {
      request(app)
        .post('/api/game/install')
        .set('X-Test-Roles', installRoles)
        .send({ branch: 'public +quit' })
        .expect(400, 'Invalid branch name')
        .end(done)
    })
  })
})
