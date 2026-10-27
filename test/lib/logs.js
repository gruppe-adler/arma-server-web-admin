var fs = require('fs')
var os = require('os')
var path = require('path')
require('should')
var tk = require('timekeeper')

var Logs = require('../../lib/logs.js')
var logs = new Logs({
  path: '/tmp/',
  type: 'linux'
})

describe('Logs', function () {
  beforeEach(function () {
    tk.freeze(1445455712000) // 2015-10-21 19:28:32
  })

  afterEach(function () {
    tk.reset()
  })

  describe('generateLogFileName()', function () {
    it('should generate valid file name', function () {
      Logs.generateLogFileName('prefix', 'suffix').should.eql('prefix_2015-10-21_19-28-32_suffix.rpt')
    })
  })

  describe('generateLogFilePath()', function () {
    it('should generate valid file path', function () {
      logs.generateLogFilePath('prefix', 'suffix').should.eql(path.join('/tmp', 'logs', 'prefix_2015-10-21_19-28-32_suffix.rpt'))
    })
  })

  describe('tail()', function () {
    var gamePath
    var logFile
    var tailLogs

    beforeEach(function () {
      tk.reset()
      gamePath = fs.mkdtempSync(path.join(os.tmpdir(), 'arma-logs-test-'))
      tailLogs = new Logs({ path: gamePath, type: 'linux' })
      fs.mkdirSync(path.join(gamePath, 'logs'), { recursive: true })
      logFile = path.join(gamePath, 'logs', 'server.rpt')
      fs.writeFileSync(logFile, 'first\nsecond\n')
    })

    afterEach(function () {
      fs.rmSync(gamePath, { recursive: true, force: true })
    })

    it('should read small log completely', function (done) {
      tailLogs.tail('server.rpt', undefined, function (err, tail) {
        (err === null).should.be.true()
        tail.should.eql({ offset: 13, reset: false, size: 13, text: 'first\nsecond\n', truncated: false })
        done()
      })
    })

    it('should only read complete lines added after offset', function (done) {
      fs.appendFileSync(logFile, 'third\npartial')
      tailLogs.tail('server.rpt', 13, function (err, tail) {
        (err === null).should.be.true()
        tail.text.should.eql('third\n')
        tail.offset.should.eql(19)
        done()
      })
    })

    it('should start at a line boundary in large logs', function (done) {
      var line = 'x'.repeat(99) + '\n'
      fs.writeFileSync(logFile, line.repeat(5000)) // 500 KB
      tailLogs.tail('server.rpt', undefined, function (err, tail) {
        (err === null).should.be.true()
        tail.truncated.should.be.true()
        tail.offset.should.eql(500000)
        tail.text.length.should.be.belowOrEqual(256 * 1024)
        tail.text.split('\n').slice(0, -1).forEach(function (text) {
          text.should.eql('x'.repeat(99))
        })
        done()
      })
    })

    it('should start over when log was truncated', function (done) {
      tailLogs.tail('server.rpt', 1000, function (err, tail) {
        (err === null).should.be.true()
        tail.reset.should.be.true()
        tail.text.should.eql('first\nsecond\n')
        done()
      })
    })

    it('should not find unknown logs', function (done) {
      tailLogs.tail('../server.rpt', undefined, function (err, tail) {
        (err === null).should.be.true()
        ;(tail === null).should.be.true()
        done()
      })
    })
  })
})
