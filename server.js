// ============================================
// server.js - Archivo principal
// ============================================
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const dataLoader = require('./utils/dataLoader');
const xtreamRoutes = require('./routes/xtream');
const streamRoutes = require('./routes/stream');
const adminRoutes = require('./routes/admin');

const app = express();

