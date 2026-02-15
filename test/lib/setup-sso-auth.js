var setupSsoAuth = require('../../lib/setup-sso-auth')

describe('SSO Auth', function () {
  it('should not add middleware when sso config is not set', function () {
    var useCalled = false
    var app = {
      use: function () { useCalled = true }
    }

    setupSsoAuth({}, app)
    useCalled.should.equal(false)
  })

  it('should add middleware when sso config is set', function () {
    var useCalled = false
    var app = {
      use: function () { useCalled = true }
    }

    setupSsoAuth({ sso: { url: 'https://sso.gruppe-adler.de' } }, app)
    useCalled.should.equal(true)
  })

  it('should return 401 when no cookie is present', function (done) {
    var middleware
    var app = {
      use: function (fn) { middleware = fn }
    }

    setupSsoAuth({ sso: { url: 'https://sso.gruppe-adler.de' } }, app)

    var req = { headers: {} }
    var statusCode
    var res = {
      status: function (code) { statusCode = code; return res },
      send: function () {
        statusCode.should.equal(401)
        done()
      }
    }

    middleware(req, res, function () {
      done(new Error('next should not have been called'))
    })
  })
})
