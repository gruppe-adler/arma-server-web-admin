const { decodeJwt } = require('jose');

const RECHECK_INTERVAL_MS = 5 * 60 * 1000;

const requiresRole = (role) => {
  return async (req, res, next) => {
    try {
      let accessToken = req.oidc?.accessToken;
      if (!accessToken?.access_token) {
        return res.status(401).send("Not authenticated");
      }

      const expired = accessToken.isExpired();
      const stale =
        Date.now() - (req.appSession?.lastTokenCheck || 0) > RECHECK_INTERVAL_MS;

      if (expired || stale) {
        if (req.oidc.refreshToken) {
          accessToken = await accessToken.refresh();
          req.appSession.lastTokenCheck = Date.now();
        } else if (expired) {
          return res.status(401).send("Session expired");
        }
      }

      const decoded = decodeJwt(accessToken.access_token);
      const roles = decoded.realm_access?.roles ?? [];

      if (!roles.includes(role)) {
        return res.status(403).send("Forbidden: missing required role");
      }
      next();
    } catch (err) {
      return res.status(401).send("Not authenticated");
    }
  };
};

module.exports = requiresRole;