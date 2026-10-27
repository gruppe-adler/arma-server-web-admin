const oidc = require('express-openid-connect')
const request = require('supertest')

const config = require('../config')

function fakeJwt (payload) {
  const encode = (data) => Buffer.from(JSON.stringify(data)).toString('base64url')
  return encode({ alg: 'none' }) + '.' + encode(payload) + '.'
}

// Replace OIDC login with a logged in user that has the required role, avoids talking to Keycloak
oidc.auth = function () {
  return function (req, res, next) {
    req.appSession = {}
    req.oidc = {
      user: { preferred_username: 'test' },
      accessToken: {
        access_token: fakeJwt({ realm_access: { roles: [config.requiredRole] } }),
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
      .expect(200, { username: 'test' })
      .end(done)
  })
})
