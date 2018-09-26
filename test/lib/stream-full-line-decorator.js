require('should')

var EventEmitter = require('events').EventEmitter

var StreamFullLineDecorator = require('../../lib/stream-full-line-decorator')

describe('StreamFullLineDecorator', function() {
    it('will emit only complete lines', function () {
        var inStream = new EventEmitter()
        var emits = []

        var decorator = new StreamFullLineDecorator(inStream)
        decorator.on('data', function (data) {
            emits.push(data)
        })

        inStream.emit('data', 'foo\nbar\nbaz')

        emits.should.length(2)
        emits[0].should.equal('foo\n')
        emits[1].should.equal('bar\n')

        inStream.emit('close')

        emits.should.length(3)
        emits[2].should.equal('baz\n')
    })
})
