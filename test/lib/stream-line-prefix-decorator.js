require('should')

var EventEmitter = require('events').EventEmitter

var StreamLinePrefixDecorator = require('../../lib/stream-line-prefix-decorator')

describe('StreamLinePrefixDecorator', function() {
    it('will prefix every line sent to it', function () {
        var inStream = new EventEmitter()
        var emits = []

        var decorator = new StreamLinePrefixDecorator(inStream, 'FOO ')
        decorator.on('data', function (data) {
            emits.push(data)
        })

        inStream.emit('data', 'foo\nbar\nbaz')

        emits.should.length(2)
        emits[0].should.equal('FOO foo\n')
        emits[1].should.equal('FOO bar\n')

        inStream.emit('close')

        emits.should.length(3)
        emits[2].should.equal('FOO baz\n')
    })
})
