// ============================================
// config/config.js - Configuración
// ============================================
module.exports = {
  port: 3000,
  auth: {
    username: process.env.XTREAM_USER || 'usuario',
    password: process.env.XTREAM_PASS || 'password123'
  },
  github: {
    token: process.env.GITHUB_TOKEN || '',
    owner: 'Demo-159',
    repo: 'Xtream',
    dataFile: 'data/content.json'
  },
  tmdb: {
    apiKey: process.env.TMDB_API_KEY || '3fd2be6f0c70a2a598f084ddfb75487c'
  }
};
