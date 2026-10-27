const express = require('express')
const fs = require('fs')
const os = require('os')
const path = require('path')
const request = require('supertest')
require('should')

const Logs = require('../../lib/logs.js')
const logsRoute = require('../../routes/logs.js')

describe('logs route', function () {
  let gamePath
  let app

  before(function () {
    gamePath = fs.mkdtempSync(path.join(os.tmpdir(), 'arma-logs-route-test-'))
    const logs = new Logs({ path: gamePath, type: 'linux' })
    fs.mkdirSync(path.join(gamePath, 'logs'), { recursive: true })
    fs.writeFileSync(path.join(gamePath, 'logs', 'server.rpt'), 'first\nsecond\n')
    app = express()
    app.use('/api/logs', logsRoute(logs))
  })

  after(function () {
    fs.rmSync(gamePath, { recursive: true, force: true })
  })

  it('should tail log', function (done) {
    request(app)
      .get('/api/logs/server.rpt/tail')
      .expect(200, { offset: 13, reset: false, size: 13, text: 'first\nsecond\n', truncated: false })
      .end(done)
  })

  it('should tail log from offset', function (done) {
    request(app)
      .get('/api/logs/server.rpt/tail?offset=6')
      .expect(200, { offset: 13, reset: false, size: 13, text: 'second\n', truncated: false })
      .end(done)
  })

  it('should reject invalid offsets', function (done) {
    request(app)
      .get('/api/logs/server.rpt/tail?offset=-1')
      .expect(400, 'Invalid offset')
      .end(done)
  })

  it('should answer unknown logs with 404', function (done) {
    request(app)
      .get('/api/logs/unknown.rpt/tail')
      .expect(404)
      .end(done)
  })

  it('should still download logs', function (done) {
    request(app)
      .get('/api/logs/server.rpt/download')
      .expect('Content-Disposition', 'attachment; filename="server.rpt"')
      .expect(200)
      .end(done)
  })
})
