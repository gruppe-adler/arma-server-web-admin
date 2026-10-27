// Steam Workshop ids end up in file paths and SteamCMD commands, only allow numeric ids
module.exports = function isWorkshopId (id) {
  return /^\d+$/.test(String(id))
}
