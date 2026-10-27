var $ = require('jquery')
var _ = require('underscore')
var Marionette = require('marionette')

var tpl = require('tpl/logs/view.html')

var pollInterval = 2000
var maxLines = 5000 // Older lines are dropped to keep the page responsive

function lineClass (line) {
  if (/\b(error|exception|fatal)\b/i.test(line)) {
    return 'log-error'
  }

  if (/\bwarning\b/i.test(line)) {
    return 'log-warning'
  }

  return null
}

function formatSize (bytes) {
  if (bytes < 1024) {
    return bytes + ' B'
  }

  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB'
  }

  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

module.exports = Marionette.ItemView.extend({
  template: _.template(tpl),

  events: {
    'change #log-follow': 'followChanged',
    'change #log-wrap': 'wrapChanged'
  },

  templateHelpers: function () {
    return {
      name: this.options.name
    }
  },

  initialize: function () {
    this.offset = null
    this.stopped = false
    this.timeout = null
  },

  onRender: function () {
    this.output = this.$('#log-output').get(0)
    // Scroll events do not bubble, they cannot be delegated
    this.$('#log-output').on('scroll', this.scrolled.bind(this))
    this.update()
  },

  onDestroy: function () {
    this.stopped = true
    clearTimeout(this.timeout)
  },

  update: function () {
    var self = this
    var data = this.offset === null ? {} : { offset: this.offset }

    $.getJSON('/api/logs/' + encodeURIComponent(this.options.name) + '/tail', data)
      .done(function (tail) {
        if (self.stopped) {
          return
        }

        if (tail.reset) {
          self.output.textContent = ''
        }

        self.$('#log-truncated').toggle(tail.truncated || self.$('#log-truncated').is(':visible'))
        self.append(tail.text)
        self.offset = tail.offset
        self.setStatus('Live', 'success')
        self.$('#log-size').text(formatSize(tail.size))

        // Continue right away while more of a large log is waiting
        self.schedule(tail.text && tail.offset < tail.size ? 0 : pollInterval)
      })
      .fail(function (xhr) {
        if (self.stopped) {
          return
        }

        if (xhr.status === 404) {
          self.setStatus('Log not found', 'danger')
          return
        }

        self.setStatus('Reconnecting', 'warning')
        self.schedule(pollInterval * 2)
      })
  },

  schedule: function (delay) {
    if (!this.stopped) {
      this.timeout = setTimeout(this.update.bind(this), delay)
    }
  },

  append: function (text) {
    if (!text) {
      return
    }

    var placeholder = this.output.querySelector('.log-placeholder')
    if (placeholder) {
      placeholder.remove()
    }

    var lines = text.split('\n')
    if (lines[lines.length - 1] === '') {
      lines.pop()
    }

    var fragment = document.createDocumentFragment()
    lines.forEach(function (line) {
      line = line.replace(/\r$/, '')
      var element = document.createElement('div')
      element.className = 'log-line'
      var className = lineClass(line)
      if (className) {
        element.classList.add(className)
      }
      element.textContent = line || ' '
      fragment.appendChild(element)
    })
    this.output.appendChild(fragment)

    while (this.output.childNodes.length > maxLines) {
      this.output.removeChild(this.output.firstChild)
    }

    if (this.following()) {
      this.output.scrollTop = this.output.scrollHeight
    }
  },

  following: function () {
    return this.$('#log-follow').prop('checked')
  },

  // Scrolling up pauses following, scrolling to the end resumes it
  scrolled: function () {
    var atEnd = this.output.scrollHeight - this.output.scrollTop - this.output.clientHeight < 30
    this.$('#log-follow').prop('checked', atEnd)
  },

  followChanged: function () {
    if (this.following()) {
      this.output.scrollTop = this.output.scrollHeight
    }
  },

  wrapChanged: function () {
    this.$('#log-output').toggleClass('log-viewer-nowrap', !this.$('#log-wrap').prop('checked'))
  },

  setStatus: function (text, type) {
    this.$('#log-status')
      .attr('class', 'label label-' + type)
      .text(text)
  }
})
