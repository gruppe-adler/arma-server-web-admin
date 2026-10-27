var $ = require('jquery')

var hideAfter = 10000
var alertTypes = {
  error: 'danger',
  info: 'info',
  success: 'success',
  warning: 'warning'
}

var $container = null

function container () {
  if (!$container) {
    $container = $('<div class="notifications" aria-live="polite"></div>').appendTo('body')
  }

  return $container
}

function show (notification) {
  var $toast = $('<div class="alert alert-dismissible" role="alert"></div>')
    .addClass('alert-' + (alertTypes[notification.type] || 'info'))
  var timeout = null

  function remove () {
    clearTimeout(timeout)
    $toast.fadeOut(200, function () {
      $toast.remove()
    })
  }

  function startTimer () {
    timeout = setTimeout(remove, hideAfter)
  }

  $('<button type="button" class="close" aria-label="Close"><span aria-hidden="true">&times;</span></button>')
    .on('click', remove)
    .appendTo($toast)

  if (notification.title) {
    $('<strong></strong>').text(notification.title).appendTo($toast)
  }

  if (notification.message) {
    $('<div></div>').text(notification.message).appendTo($toast)
  }

  // Keep the notification while it is being read
  $toast.on('mouseenter', function () {
    clearTimeout(timeout)
  })
  $toast.on('mouseleave', startTimer)

  container().append($toast)
  startTimer()
}

function error (title, message) {
  show({
    type: 'error',
    title: title,
    message: message
  })
}

function requestError (title, xhr) {
  error(title, xhr.responseText || xhr.statusText)
}

module.exports = {
  error: error,
  requestError: requestError,
  show: show
}
