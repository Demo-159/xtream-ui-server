// ============================================
// routes/stream.js - Endpoints de streaming
// ============================================
const express = require('express');
const router = express.Router();
const config = require('../config/config');
const dataLoader = require('../utils/dataLoader');

// Streaming de películas
router.get('/movie/:username/:password/:streamId.:ext', (req, res) => {
  const { username, password, streamId } = req.params;
  
  if (username !== config.auth.username || password !== config.auth.password) {
    return res.status(401).send('Unauthorized');
  }
  
  const data = dataLoader.getData();
  const movie = data.movies.find(m => m.stream_id == streamId);
  
  if (movie && movie.direct_source) {
    res.redirect(movie.direct_source);
  } else {
    res.status(404).send('Movie not found');
  }
});

// Streaming de series
router.get('/series/:username/:password/:episodeId.:ext', (req, res) => {
  const { username, password, episodeId } = req.params;
  
  if (username !== config.auth.username || password !== config.auth.password) {
    return res.status(401).send('Unauthorized');
  }
  
  const data = dataLoader.getData();
  let foundEpisode = null;
  
  for (const seriesId in data.seriesEpisodes) {
    const serieData = data.seriesEpisodes[seriesId];
    for (const seasonNum in serieData.episodes) {
      const episode = serieData.episodes[seasonNum].find(ep => ep.id === episodeId);
      if (episode) {
        foundEpisode = episode;
        break;
      }
    }
    if (foundEpisode) break;
  }
  
  if (foundEpisode && foundEpisode.direct_source) {
    res.redirect(foundEpisode.direct_source);
  } else {
    res.status(404).send('Episode not found');
  }
});

module.exports = router;
