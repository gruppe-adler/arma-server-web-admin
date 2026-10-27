require('should')

const requiresRole = require('../../lib/auth.js')

function fakeJwt (payload) {
  const encode = (data) => Buffer.from(JSON.stringify(data)).toString('base64url')
  return encode({ alg: 'none' }) + '.' + encode(payload) + '.'
}

function fakeRequest (roles) {
  return {
    appSession: {},
    oidc: {
      accessToken: {
        access_token: fakeJwt({ realm_access: { roles } }),
        isExpired: () => false
      }
    }
  }
}

function fakeResponse (done) {
  return {
    status: function (code) {
      this.statusCode = code
      return this
    },
    send: function () {
      done(this.statusCode)
    }
  }
}

describe('requiresRole()', function () {
  it('should reject unauthenticated requests', function (done) {
    requiresRole('admin')({ appSession: {} }, fakeResponse(function (status) {
      status.should.eql(401)
      done()
    }), function () {
      done(new Error('next should not be called'))
    })
  })

  it('should reject users without role', function (done) {
    requiresRole('admin')(fakeRequest(['user']), fakeResponse(function (status) {
      status.should.eql(403)
      done()
    }), function () {
      done(new Error('next should not be called'))
    })
  })

  it('should accept users with role', function (done) {
    const req = fakeRequest(['user', 'admin'])
    requiresRole('admin')(req, fakeResponse(function (status) {
      done(new Error('unexpected status ' + status))
    }), function () {
      req.appSession.roles.should.eql(['user', 'admin'])
      done()
    })
  })
})
