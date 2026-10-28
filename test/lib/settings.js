require('should')

var Settings = require('../../lib/settings.js')

describe('Settings', function () {
  describe('workshopEnabled()', function () {
    it('should use Steam Workshop with steam config', function () {
      Settings.workshopEnabled({ steam: { path: '/steam' } }).should.be.true()
      Settings.workshopEnabled({ steam: { enabled: true } }).should.be.true()
    })

    it('should use local mods without steam config or when disabled', function () {
      Settings.workshopEnabled({}).should.be.false()
      Settings.workshopEnabled({ steam: { enabled: false, path: '/steam' } }).should.be.false()
    })
  })

  describe('getPublicSettings()', function () {
    it('should only include public settings and the mods mode', function () {
      new Settings({ game: 'arma3', path: '/arma3', type: 'linux', steam: { password: 'secret' } }).getPublicSettings().should.eql({
        game: 'arma3',
        path: '/arma3',
        type: 'linux',
        workshop: true
      })
    })
  })
})
