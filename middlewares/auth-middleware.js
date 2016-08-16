var auth = require('basic-auth');

const USER = 'GIZ';
const PASS = 'pass123';

module.exports = function authMiddleware(req, res, next) {
  var user = auth(req);
  if (!user || user.name !== USER || user.pass !== PASS) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="MyRealmName"');
    res.end('Unauthorized');
  } else {
    next();
  }
};
