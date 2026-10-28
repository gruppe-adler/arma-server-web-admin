require('should')

var steamApi = require('../../lib/steam_api.js')

describe('steamApi', function () {
  var originalFetch = global.fetch
  var requests

  function respond (status, body) {
    requests = []
    global.fetch = function (url, options) {
      requests.push({ url: String(url), options: options })
      return Promise.resolve(new Response(JSON.stringify(body), { status: status }))
    }
  }

  afterEach(function () {
    global.fetch = originalFetch
  })

  describe('getPublishedFileDetails()', function () {
    it('should post indexed Workshop ids', function (done) {
      respond(200, { response: { publishedfiledetails: [{ publishedfileid: '1' }, { publishedfileid: '2' }] } })
      steamApi.getPublishedFileDetails(['1', '2'], function (err, files) {
        ;(err === null).should.be.true()
        files.length.should.eql(2)
        requests[0].options.method.should.eql('POST')
        requests[0].options.body.toString().should.eql('format=json&itemcount=2&publishedfileids%5B0%5D=1&publishedfileids%5B1%5D=2')
        done()
      })
    })

    it('should fail on HTTP errors', function (done) {
      respond(503, {})
      steamApi.getPublishedFileDetails(['1'], function (err) {
        err.message.should.eql('Steam API answered with HTTP 503')
        done()
      })
    })

    it('should fail without Workshop items', function (done) {
      respond(200, { response: {} })
      steamApi.getPublishedFileDetails(['1'], function (err) {
        err.message.should.eql('Steam API returned no Workshop items')
        done()
      })
    })
  })

  describe('queryFiles()', function () {
    it('should query with parameters', function (done) {
      respond(200, { response: { publishedfiledetails: [] } })
      steamApi.queryFiles({ appid: 107410, search_text: 'cba a3' }, function (err) {
        ;(err === null).should.be.true()
        requests[0].url.should.eql('https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/?appid=107410&search_text=cba+a3')
        done()
      })
    })
  })
})
