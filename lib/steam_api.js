var DETAILS_URL = 'https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/'
var QUERY_FILES_URL = 'https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/'

function publishedFiles (response, cb) {
  response.then(function (res) {
    if (!res.ok) {
      throw new Error('Steam API answered with HTTP ' + res.status)
    }

    return res.json()
  }).then(function (data) {
    if (!data || !data.response || !data.response.publishedfiledetails) {
      throw new Error('Steam API returned no Workshop items')
    }

    return data.response.publishedfiledetails
  }).then(function (files) {
    cb(null, files)
  }, function (err) {
    cb(err)
  })
}

// Workshop item details, including title, update time and download url
module.exports.getPublishedFileDetails = function (ids, cb) {
  var form = new URLSearchParams({ format: 'json', itemcount: String(ids.length) })
  ids.forEach(function (id, index) {
    form.append('publishedfileids[' + index + ']', String(id))
  })

  publishedFiles(fetch(DETAILS_URL, { method: 'POST', body: form }), cb)
}

// Workshop search, requires a Steam Web API key
module.exports.queryFiles = function (query, cb) {
  var url = new URL(QUERY_FILES_URL)
  Object.keys(query).forEach(function (key) {
    url.searchParams.set(key, String(query[key]))
  })

  publishedFiles(fetch(url), cb)
}
