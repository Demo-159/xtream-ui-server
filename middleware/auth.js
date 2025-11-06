// ============================================
// middleware/auth.js - Autenticación
// ============================================
const config = require('../config/config');

function authenticate(req, res, next) {
  const { username, password } = req.query;
  
  if (username === config.auth.username && password === config.auth.password) {
    next();
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
}

module.exports = authenticate;
