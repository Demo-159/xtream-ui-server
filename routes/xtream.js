// ============================================
// routes/xtream.js - API Xtream Codes
// ============================================
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const dataLoader = require('../utils/dataLoader');
const config = require('../config/config');

// Endpoint principal de Xtream Codes
router.get('/player_api.php', authenticate, (req, res) => {
  const action = req.query.action;
  const data = dataLoader.getData();

  switch (action) {
    case 'get_vod_streams':
      res.json(data.movies);
      break;
    
    case 'get_vod_categories':
      res.json(data.categories);
      break;
    
    case 'get_vod_info':
      const vodId = req.query.vod_id;
      const info = data.movieInfo[vodId];
      res.json(info || { error: "VOD not found" });
      break;
    
    case 'get_series':
      res.json(data.series);
      break;
    
    case 'get_series_categories':
      res.json(data.seriesCategories);
      break;
    
    case 'get_series_info':
      const seriesId = req.query.series_id;
      const serieInfo = data.series.find(s => s.series_id == seriesId);
      const serieEpisodes = data.seriesEpisodes[seriesId];
      
      if (serieInfo && serieEpisodes) {
        res.json({
          seasons: serieEpisodes.seasons,
          info: serieInfo,
          episodes: serieEpisodes.episodes
        });
      } else {
        res.json({ error: "Series not found" });
      }
      break;
    
    case 'get_live_streams':
      res.json([]);
      break;
    
    case 'get_live_categories':
      res.json([]);
      break;
    
    default:
      res.json({
        user_info: {
          username: config.auth.username,
          password: config.auth.password,
          message: "API activa",
          auth: 1,
          status: "Active",
          exp_date: "2099999999",
          is_trial: "0",
          active_cons: "0",
          created_at: "1699564800",
          max_connections: "5",
          allowed_output_formats: ["m3u8", "ts", "rtmp"]
        },
        server_info: {
          url: req.protocol + '://' + req.get('host'),
          port: config.port,
          https_port: "",
          server_protocol: "http",
          rtmp_port: "",
          timezone: "UTC",
          timestamp_now: Math.floor(Date.now() / 1000),
          time_now: new Date().toISOString()
        }
      });
  }
});

// Endpoint M3U para TiviMate
router.get('/get.php', (req, res) => {
  const { username, password, type } = req.query;
  
  if (username !== config.auth.username || password !== config.auth.password) {
    return res.status(401).send('#EXTM3U\n#EXTINF:-1,Error: Invalid credentials\nhttp://invalid');
  }
  
  const data = dataLoader.getData();
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  let m3uContent = '#EXTM3U x-tvg-url=""\n\n';
  
  if (!type || type === 'series') {
    data.series.forEach(serie => {
      const serieData = data.seriesEpisodes[serie.series_id];
      if (serieData && serieData.episodes) {
        Object.keys(serieData.episodes).forEach(seasonNum => {
          const episodes = serieData.episodes[seasonNum];
          episodes.forEach(episode => {
            const episodeName = `${serie.name} S${String(seasonNum).padStart(2, '0')}E${String(episode.episode_num).padStart(2, '0')} ${episode.title}`;
            m3uContent += `#EXTINF:-1 tvg-id="serie_${serie.series_id}_${seasonNum}_${episode.episode_num}" tvg-name="${episodeName}" tvg-logo="${serie.cover}" tvg-type="series" group-title="📺 ${serie.name}",${episodeName}\n`;
            m3uContent += `${baseUrl}/series/${username}/${password}/${episode.id}.${episode.container_extension}\n\n`;
          });
        });
      }
    });
  }
  
  if (!type || type === 'movie') {
    data.movies.forEach(movie => {
      m3uContent += `#EXTINF:-1 tvg-id="${movie.stream_id}" tvg-name="${movie.name}" tvg-logo="${movie.stream_icon}" tvg-type="movie" group-title="🎬 Películas",${movie.name}\n`;
      m3uContent += `${baseUrl}/movie/${username}/${password}/${movie.stream_id}.${movie.container_extension}\n\n`;
    });
  }
  
  res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="playlist.m3u"');
  res.send(m3uContent);
});

module.exports = router;
