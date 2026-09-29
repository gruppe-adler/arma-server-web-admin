const { decodeJwt } = require('jose')

const RECHECK_INTERVAL_MS = 5 * 60 * 1000

const inflight = new Map()
const refreshOnce = (accessToken, refreshToken) => {
  let p = inflight.get(refreshToken)
  if (!p) {
    p = accessToken.refresh().finally(() => inflight.delete(refreshToken))
    inflight.set(refreshToken, p)
  }
  return p
}

const rolesFrom = (jwt) => decodeJwt(jwt).realm_access?.roles ?? []

const reauth = (req, res) => {
  delete req.appSession.roles
  delete req.appSession.lastTokenCheck
  if (req.method === 'GET' && req.accepts(['html', 'json']) === 'html') {
    return res.oidc.login({ returnTo: req.originalUrl })
  }
  return res.status(401).json({ error: 'session_expired' })
}

const requiresRole = (role) => async (req, res, next) => {
  try {
    let accessToken = req.oidc?.accessToken
    if (!accessToken?.access_token) {
      return res.status(401).send('Not authenticated')
    }

    const session = req.appSession

    if (session.lastTokenCheck === undefined) session.lastTokenCheck = 0

    const expired = accessToken.isExpired()
    const stale = Date.now() - session.lastTokenCheck > RECHECK_INTERVAL_MS

    if ((expired || stale) && req.oidc.refreshToken) {
      try {
        accessToken = await refreshOnce(accessToken, req.oidc.refreshToken)
        session.lastTokenCheck = Date.now()
        session.roles = rolesFrom(accessToken.access_token)
      } catch {
        return reauth(req, res)
      }
    } else if (expired) {
      return reauth(req, res)
    }

    session.roles ??= rolesFrom(accessToken.access_token)

    if (!session.roles.includes(role)) {
      return res.status(403).send('Forbidden: missing required role')
    }
    next()
  } catch {
    return res.status(401).send('Not authenticated')
  }
}

module.exports = requiresRole