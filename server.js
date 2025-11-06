const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Configuración
const CONFIG = {
  USERNAME: process.env.USERNAME || 'usuario',
  PASSWORD: process.env.PASSWORD || 'password123',
  GITHUB_USER: 'Demo-159',
  GITHUB_REPO: 'xtream-ui-server',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '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'
};

// Cache de datos
let cachedData = { movies: [], series: [], seriesEpisodes: {}, lastUpdate: null };

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Función para cargar datos desde GitHub
async function loadDataFromGithub() {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(
      `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/contents/data.json`,
      {
        headers: {
          'Authorization': `token ${CONFIG.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
      
      // Transformar datos
      cachedData.movies = content.movies || [];
      cachedData.series = content.series || [];
      cachedData.seriesEpisodes = transformSeriesToEpisodes(content.series || []);
      cachedData.lastUpdate = new Date();
      
      console.log('✅ Datos cargados desde GitHub');
      console.log(`📊 Películas: ${cachedData.movies.length}, Series: ${cachedData.series.length}`);
    }
  } catch (error) {
    console.error('❌ Error al cargar datos:', error);
  }
}

// Transformar estructura de series a formato Xtream
function transformSeriesToEpisodes(series) {
  const episodes = {};
  
  series.forEach(serie => {
    if (serie.seasons && serie.seasons.length > 0) {
      episodes[serie.series_id] = {
        seasons: serie.seasons.map(season => ({
          season_number: season.season_number,
          name: season.name,
          episode_count: season.episodes?.length || 0,
          cover: serie.cover,
          cover_big: serie.cover,
          air_date: season.air_date || serie.releaseDate
        })),
        episodes: {}
      };
      
      serie.seasons.forEach(season => {
        if (season.episodes && season.episodes.length > 0) {
          episodes[serie.series_id].episodes[season.season_number] = season.episodes.map(ep => ({
            id: ep.id,
            episode_num: ep.episode_num,
            title: ep.title,
            container_extension: ep.container_extension || 'mp4',
            info: {
              name: ep.title,
              season: season.season_number,
              episode_num: ep.episode_num,
              air_date: ep.air_date || serie.releaseDate,
              plot: ep.plot || serie.plot,
              duration_secs: ep.duration_secs || "2700",
              duration: ep.duration || "45:00",
              rating: ep.rating || serie.rating,
              cover_big: ep.cover_big || serie.cover
            },
            direct_source: ep.direct_source
          }));
        }
      });
    }
  });
  
  return episodes;
}

// Autenticación
function authenticate(req, res, next) {
  const { username, password } = req.query;
  if (username === CONFIG.USERNAME && password === CONFIG.PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
}

// RUTAS

// Panel de administración
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Endpoint M3U para TiviMate
app.get('/get.php', (req, res) => {
  const { username, password, type } = req.query;
  
  if (username !== CONFIG.USERNAME || password !== CONFIG.PASSWORD) {
    return res.status(401).send('#EXTM3U\n#EXTINF:-1,Error: Invalid credentials\nhttp://invalid');
  }
  
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  let m3uContent = '#EXTM3U x-tvg-url=""\n\n';
  
  // Series
  if (!type || type === 'series') {
    cachedData.series.forEach(serie => {
      const serieData = cachedData.seriesEpisodes[serie.series_id];
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
  
  // Películas
  if (!type || type === 'movie') {
    cachedData.movies.forEach(movie => {
      m3uContent += `#EXTINF:-1 tvg-id="${movie.stream_id}" tvg-name="${movie.name}" tvg-logo="${movie.stream_icon}" tvg-type="movie" group-title="🎬 Películas",${movie.name}\n`;
      m3uContent += `${baseUrl}/movie/${username}/${password}/${movie.stream_id}.${movie.container_extension}\n\n`;
    });
  }
  
  res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="playlist.m3u"');
  res.send(m3uContent);
});

// API Xtream Codes
app.get('/player_api.php', authenticate, (req, res) => {
  const action = req.query.action;

  switch (action) {
    case 'get_vod_streams':
      res.json(cachedData.movies);
      break;
    
    case 'get_vod_categories':
      res.json([{ category_id: "1", category_name: "Películas", parent_id: 0 }]);
      break;
    
    case 'get_vod_info':
      const vodId = req.query.vod_id;
      const movie = cachedData.movies.find(m => m.stream_id == vodId);
      if (movie) {
        res.json({
          info: movie,
          movie_data: {
            stream_id: movie.stream_id,
            name: movie.name,
            added: Math.floor(Date.now() / 1000).toString(),
            category_id: "1",
            container_extension: movie.container_extension,
            direct_source: movie.direct_source
          }
        });
      } else {
        res.json({ error: "VOD not found" });
      }
      break;
    
    case 'get_series':
      res.json(cachedData.series);
      break;
    
    case 'get_series_categories':
      res.json([{ category_id: "1", category_name: "Series", parent_id: 0 }]);
      break;
    
    case 'get_series_info':
      const seriesId = req.query.series_id;
      const serieInfo = cachedData.series.find(s => s.series_id == seriesId);
      const serieEpisodes = cachedData.seriesEpisodes[seriesId];
      
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
          username: CONFIG.USERNAME,
          password: CONFIG.PASSWORD,
          message: "API activa",
          auth: 1,
          status: "Active",
          exp_date: "2099999999",
          is_trial: "0",
          active_cons: "0",
          created_at: Math.floor(Date.now() / 1000).toString(),
          max_connections: "5",
          allowed_output_formats: ["m3u8", "ts", "rtmp"]
        },
        server_info: {
          url: req.protocol + '://' + req.get('host'),
          port: port,
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

// Streaming de películas
app.get('/movie/:username/:password/:streamId.:ext', (req, res) => {
  const { username, password, streamId } = req.params;
  
  if (username !== CONFIG.USERNAME || password !== CONFIG.PASSWORD) {
    return res.status(401).send('Unauthorized');
  }
  
  const movie = cachedData.movies.find(m => m.stream_id == streamId);
  if (movie && movie.direct_source) {
    res.redirect(movie.direct_source);
  } else {
    res.status(404).send('Movie not found');
  }
});

// Streaming de series
app.get('/series/:username/:password/:episodeId.:ext', (req, res) => {
  const { username, password, episodeId } = req.params;
  
  if (username !== CONFIG.USERNAME || password !== CONFIG.PASSWORD) {
    return res.status(401).send('Unauthorized');
  }
  
  let foundEpisode = null;
  
  for (const seriesId in cachedData.seriesEpisodes) {
    const serieData = cachedData.seriesEpisodes[seriesId];
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

// Endpoint para refrescar datos
app.get('/refresh', authenticate, async (req, res) => {
  await loadDataFromGithub();
  res.json({ 
    success: true, 
    message: 'Datos actualizados',
    stats: {
      movies: cachedData.movies.length,
      series: cachedData.series.length,
      lastUpdate: cachedData.lastUpdate
    }
  });
});

// Ruta de inicio
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Xtream API Server</title>
        <style>
          body { 
            font-family: system-ui; 
            max-width: 800px; 
            margin: 50px auto; 
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .card { 
            background: rgba(255,255,255,0.1); 
            backdrop-filter: blur(10px);
            padding: 30px; 
            border-radius: 15px; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          }
          h1 { margin-top: 0; font-size: 2.5em; }
          .info { 
            background: rgba(255,255,255,0.1); 
            padding: 15px; 
            border-radius: 8px; 
            margin: 10px 0;
            font-family: monospace;
          }
          a { 
            color: #fff; 
            text-decoration: none; 
            background: rgba(255,255,255,0.2);
            padding: 10px 20px;
            border-radius: 8px;
            display: inline-block;
            margin: 5px;
            transition: all 0.3s;
          }
          a:hover { background: rgba(255,255,255,0.3); }
          .stats { 
            display: flex; 
            gap: 20px; 
            margin: 20px 0;
          }
          .stat { 
            flex: 1; 
            background: rgba(255,255,255,0.15); 
            padding: 20px; 
            border-radius: 10px;
            text-align: center;
          }
          .stat-number { 
            font-size: 2.5em; 
            font-weight: bold;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🎬 Xtream API Server</h1>
          <p>Servidor activo y funcionando correctamente</p>
          
          <div class="stats">
            <div class="stat">
              <div>Películas</div>
              <div class="stat-number">${cachedData.movies.length}</div>
            </div>
            <div class="stat">
              <div>Series</div>
              <div class="stat-number">${cachedData.series.length}</div>
            </div>
          </div>
          
          <div class="info">
            <strong>URL del Servidor:</strong> ${req.protocol}://${req.get('host')}
          </div>
          <div class="info">
            <strong>Usuario:</strong> ${CONFIG.USERNAME}<br>
            <strong>Contraseña:</strong> ${CONFIG.PASSWORD}
          </div>
          
          <div style="margin-top: 20px;">
            <a href="/admin">📊 Panel de Administración</a>
            <a href="/get.php?username=${CONFIG.USERNAME}&password=${CONFIG.PASSWORD}">📡 M3U Playlist</a>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Iniciar servidor
app.listen(port, async () => {
  console.log('');
  console.log('🚀 ========================================');
  console.log(`✅ Xtream API Server ejecutándose en puerto ${port}`);
  console.log(`📡 URL: http://localhost:${port}`);
  console.log(`👤 Usuario: ${CONFIG.USERNAME}`);
  console.log(`🔑 Contraseña: ${CONFIG.PASSWORD}`);
  console.log('========================================');
  console.log('');
  
  // Cargar datos iniciales
  await loadDataFromGithub();
  
  // Refrescar datos cada 5 minutos
  setInterval(loadDataFromGithub, 5 * 60 * 1000);
});
