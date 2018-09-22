require('should')

var ServerLogWriter = require('../../lib/server-log-writer')

describe('ServerLogWriter', function () {
  describe('prefixLines', function() {
    it('prefixes all newlines', function() {
      ServerLogWriter.prefixLines('X ', new Buffer('foo\nbar\n')).should.eql('X foo\nX bar\n')
    })
    it('works with buffers not terminated with newline', function() {
      ServerLogWriter.prefixLines('X ', new Buffer('foo\nbar')).should.eql('X foo\nX bar')
    })
    it('prefixes single lines with newline', function() {
        ServerLogWriter.prefixLines('X ', new Buffer('foo\n')).should.eql('X foo\n')
    })
    it('prefixes single lines without newline', function() {
        ServerLogWriter.prefixLines('X ', new Buffer('foo')).should.eql('X foo')
    })
  })
})