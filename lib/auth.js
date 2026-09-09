const jwt = require("jsonwebtoken"); // just for decoding — token is already verified by the library

var requiresRole = function (role, { clientRole } = {}) {
  return (req, res, next) => {
    const accessToken = req.oidc?.accessToken?.access_token;
    if (!accessToken) return res.status(401).send("Not authenticated");

    const decoded = jwt.decode(accessToken) || {};
    const roles = clientRole
      ? decoded.resource_access?.[clientRole]?.roles || []
      : decoded.realm_access?.roles || [];

    if (!roles.includes(role)) {
      return res.status(403).send("Forbidden: missing required role");
    }
    next();
  };
};

module.exports = requiresRole;
