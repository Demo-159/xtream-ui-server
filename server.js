const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Configuración
const CONFIG = {
  auth: {
    username: process.env.XTREAM_USER || 'usuario',
    password: process.env.XTREAM_PASS || 'password123'
  },
  github: {
    token: process.env.GITHUB_TOKEN || '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',
    owner: 'Demo-159',
    repo: 'Xtream',
    dataFile: 'data/content.json'
  },
  tmdb: {
    apiKey: '3fd2be6f0c70a2a598f084ddfb75487c'
  }
};

// Base de datos en memoria
let contentData = {
  movies: [],
  series: [],
  seriesEpisodes: {},
  categories: [{ category_id: "1", category_name: "Películas", parent_id: 0 }],
  seriesCategories: [{ category_id: "1", category_name: "Series", parent_id: 0 }]
};

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Función para cargar datos desde GitHub
async function loadDataFromGitHub() {
  try {
    console.log('📥 Cargando datos desde GitHub...');
    const url = `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${CONFIG.github.dataFile}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `token ${CONFIG.github.token}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 10000
    });
    
    const content = JSON.parse(Buffer.from(response.data.content, 'base64').toString());
    contentData = { ...contentData, ...content };
    console.log('✅ Datos cargados desde GitHub');
    console.log(`   - Películas: ${contentData.movies?.length || 0}`);
    console.log(`   - Series: ${contentData.series?.length || 0}`);
    return true;
  } catch (error) {
    console.log('⚠️  No se pudo cargar desde GitHub:', error.message);
    console.log('   Usando datos por defecto (vacío)');
    return false;
  }
}

// Middleware de autenticación
function authenticate(req, res, next) {
  const { username, password } = req.query;
  if (username === CONFIG.auth.username && password === CONFIG.auth.password) {
    next();
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
}

// ========== RUTAS PRINCIPALES ==========

// Página de inicio
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Xtream UI Server</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 600px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
          color: #667eea;
          margin-bottom: 10px;
          font-size: 32px;
        }
        .status {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          margin-bottom: 30px;
        }
        .info-box {
          background: #f3f4f6;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
        }
        .info-box h3 {
          color: #374151;
          margin-bottom: 15px;
          font-size: 18px;
        }
        .info-item {
          margin: 10px 0;
          display: flex;
          align-items: start;
        }
        .info-item strong {
          color: #667eea;
          min-width: 120px;
        }
        .info-item code {
          background: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 13px;
          word-break: break-all;
        }
        .btn {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          margin: 10px 10px 0 0;
          transition: background 0.3s;
        }
        .btn:hover {
          background: #5568d3;
        }
        .stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 20px 0;
        }
        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 10px;
          text-align: center;
        }
        .stat-number {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .stat-label {
          font-size: 14px;
          opacity: 0.9;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎬 Xtream UI Server</h1>
        <span class="status">✓ Online</span>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-number">${contentData.movies?.length || 0}</div>
            <div class="stat-label">Películas</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${contentData.series?.length || 0}</div>
            <div class="stat-label">Series</div>
          </div>
        </div>

        <div class="info-box">
          <h3>🔗 URLs de Conexión</h3>
          <div class="info-item">
            <strong>Servidor:</strong>
            <code>${req.protocol}://${req.get('host')}</code>
          </div>
          <div class="info-item">
            <strong>Usuario:</strong>
            <code>${CONFIG.auth.username}</code>
          </div>
          <div class="info-item">
            <strong>Contraseña:</strong>
            <code>${CONFIG.auth.password}</code>
          </div>
        </div>

        <div class="info-box">
          <h3>📺 Configurar TiviMate</h3>
          <div class="info-item">
            <strong>Playlist URL:</strong>
            <code>${req.protocol}://${req.get('host')}/get.php?username=${CONFIG.auth.username}&password=${CONFIG.auth.password}</code>
          </div>
        </div>

        <a href="/admin" class="btn">🎛️ Panel Administrativo</a>
        <a href="/player_api.php?username=${CONFIG.auth.username}&password=${CONFIG.auth.password}" class="btn">📡 API Info</a>
      </div>
    </body>
    </html>
  `);
});

// Panel administrativo
app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Panel Admin - Xtream UI</title>
      <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body>
      <div id="root"></div>
      <script type="text/babel">
        const { useState } = React;
        
        const AdminPanel = () => {
          const [tab, setTab] = useState('movies');
          const [query, setQuery] = useState('');
          const [results, setResults] = useState([]);
          const [loading, setLoading] = useState(false);
          const [message, setMessage] = useState('');
          
          const searchTMDB = async () => {
            if (!query.trim()) return;
            setLoading(true);
            setMessage('');
            
            try {
              const type = tab === 'movies' ? 'movie' : 'tv';
              const res = await fetch(\`https://api.themoviedb.org/3/search/\${type}?api_key=${CONFIG.tmdb.apiKey}&query=\${encodeURIComponent(query)}&language=es-ES\`);
              const data = await res.json();
              setResults(data.results?.slice(0, 10) || []);
              setMessage(data.results?.length > 0 ? \`\${data.results.length} resultados\` : 'Sin resultados');
            } catch (error) {
              setMessage('Error: ' + error.message);
            } finally {
              setLoading(false);
            }
          };
          
          const addContent = async (item, url) => {
            if (!url) {
              alert('Proporciona una URL');
              return;
            }
            
            setLoading(true);
            try {
              const res = await fetch('/api/add-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: tab, tmdbId: item.id, url })
              });
              
              const data = await res.json();
              if (data.success) {
                alert('✓ Contenido agregado correctamente');
                setResults([]);
                setQuery('');
              } else {
                alert('Error: ' + data.error);
              }
            } catch (error) {
              alert('Error: ' + error.message);
            } finally {
              setLoading(false);
            }
          };
          
          return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">Panel Administrativo</h1>
                  <p className="text-gray-600">Gestiona tu contenido con TMDB</p>
                </div>
                
                <div className="bg-white rounded-lg shadow-lg mb-6">
                  <div className="flex border-b">
                    <button onClick={() => setTab('movies')} className={\`flex-1 px-6 py-4 font-semibold \${tab === 'movies' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}\`}>
                      🎬 Películas
                    </button>
                    <button onClick={() => setTab('series')} className={\`flex-1 px-6 py-4 font-semibold \${tab === 'series' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}\`}>
                      📺 Series
                    </button>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder={\`Buscar \${tab === 'movies' ? 'película' : 'serie'}...\`}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchTMDB()}
                      className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button onClick={searchTMDB} disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      🔍 Buscar
                    </button>
                  </div>
                  {message && <p className="mt-3 text-gray-600">{message}</p>}
                </div>
                
                {loading && (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                )}
                
                <div className="space-y-4">
                  {results.map(item => (
                    <ResultCard key={item.id} item={item} tab={tab} addContent={addContent} />
                  ))}
                </div>
              </div>
            </div>
          );
        };
        
        const ResultCard = ({ item, tab, addContent }) => {
          const [url, setUrl] = useState('');
          const [show, setShow] = useState(false);
          const title = tab === 'movies' ? item.title : item.name;
          const poster = item.poster_path ? \`https://image.tmdb.org/t/p/w200\${item.poster_path}\` : 'https://via.placeholder.com/200x300?text=No+Image';
          
          return (
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex gap-4">
                <img src={poster} alt={title} className="w-24 h-36 object-cover rounded" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{title}</h3>
                  <p className="text-sm text-gray-600 mb-2">⭐ {item.vote_average?.toFixed(1) || 'N/A'}</p>
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{item.overview || 'Sin descripción'}</p>
                  
                  {show ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="URL del video"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full px-3 py-2 border rounded text-sm"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => addContent(item, url)} className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700">
                          💾 Guardar
                        </button>
                        <button onClick={() => setShow(false)} className="px-3 py-2 border rounded text-sm hover:bg-gray-100">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShow(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                      ➕ Agregar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        };
        
        ReactDOM.render(<AdminPanel />, document.getElementById('root'));
      </script>
    </body>
    </html>
  `);
});

// API para agregar contenido
app.post('/api/add-content', express.json(), async (req, res) => {
  try {
    const { type, tmdbId, url } = req.body;
    
    // Obtener detalles de TMDB
    const endpoint = type === 'movies' ? 'movie' : 'tv';
    const tmdbRes = await axios.get(
      `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${CONFIG.tmdb.apiKey}&language=es-ES&append_to_response=credits,videos`
    );
    const details = tmdbRes.data;
    
    // Leer datos actuales de GitHub
    let currentData = { ...contentData };
    let sha = null;
    
    try {
      const githubRes = await axios.get(
        `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${CONFIG.github.dataFile}`,
        {
          headers: {
            'Authorization': `token ${CONFIG.github.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      currentData = JSON.parse(Buffer.from(githubRes.data.content, 'base64').toString());
      sha = githubRes.data.sha;
    } catch (error) {
      console.log('Creando nuevo archivo en GitHub');
    }
    
    // Agregar nuevo contenido
    if (type === 'movies') {
      const newMovie = {
        stream_id: (currentData.movies?.length || 0) + 1,
        num: (currentData.movies?.length || 0) + 1,
        name: details.title,
        title: details.title,
        stream_type: "movie",
        stream_icon: `https://image.tmdb.org/t/p/w500${details.poster_path}`,
        rating: details.vote_average?.toString() || "0",
        rating_5based: (details.vote_average / 2) || 0,
        added: Math.floor(Date.now() / 1000).toString(),
        category_id: "1",
        container_extension: url.split('.').pop() || "mp4",
        custom_sid: "",
        direct_source: url,
        tmdb_id: details.id,
        overview: details.overview
      };
      
      if (!currentData.movies) currentData.movies = [];
      currentData.movies.push(newMovie);
    } else {
      // Agregar serie (simplificado)
      const seriesId = Object.keys(currentData.seriesEpisodes || {}).length + 1;
      
      const newSeries = {
        series_id: seriesId,
        name: details.name,
        title: details.name,
        cover: `https://image.tmdb.org/t/p/w500${details.poster_path}`,
        plot: details.overview || '',
        rating: details.vote_average?.toString() || "0",
        rating_5based: (details.vote_average / 2) || 0,
        category_id: "1",
        category_ids: [1],
        num: (currentData.series?.length || 0) + 1
      };
      
      if (!currentData.series) currentData.series = [];
      currentData.series.push(newSeries);
    }
    
    // Guardar en GitHub
    const payload = {
      message: `Add ${type}: ${details.title || details.name}`,
      content: Buffer.from(JSON.stringify(currentData, null, 2)).toString('base64'),
      ...(sha && { sha })
    };
    
    await axios.put(
      `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${CONFIG.github.dataFile}`,
      payload,
      {
        headers: {
          'Authorization': `token ${CONFIG.github.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    // Actualizar datos en memoria
    contentData = currentData;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding content:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Xtream Codes API
app.get('/player_api.php', authenticate, (req, res) => {
  const action = req.query.action;

  switch (action) {
    case 'get_vod_streams':
      res.json(contentData.movies || []);
      break;
    case 'get_vod_categories':
      res.json(contentData.categories || []);
      break;
    case 'get_series':
      res.json(contentData.series || []);
      break;
    case 'get_series_categories':
      res.json(contentData.seriesCategories || []);
      break;
    case 'get_series_info':
      const seriesId = req.query.series_id;
      const serieInfo = (contentData.series || []).find(s => s.series_id == seriesId);
      const serieEpisodes = contentData.seriesEpisodes?.[seriesId];
      
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
    default:
      res.json({
        user_info: {
          username: CONFIG.auth.username,
          password: CONFIG.auth.password,
          auth: 1,
          status: "Active",
          exp_date: "2099999999"
        },
        server_info: {
          url: req.protocol + '://' + req.get('host'),
          port: port,
          timestamp_now: Math.floor(Date.now() / 1000)
        }
      });
  }
});

// M3U Playlist
app.get('/get.php', (req, res) => {
  const { username, password } = req.query;
  
  if (username !== CONFIG.auth.username || password !== CONFIG.auth.password) {
    return res.status(401).send('#EXTM3U\n#EXTINF:-1,Error\nhttp://invalid');
  }
  
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  let m3u = '#EXTM3U\n\n';
  
  // Series
  (contentData.series || []).forEach(serie => {
    const episodes = contentData.seriesEpisodes?.[serie.series_id]?.episodes || {};
    Object.keys(episodes).forEach(season => {
      episodes[season].forEach(ep => {
        const name = `${serie.name} S${String(season).padStart(2,'0')}E${String(ep.episode_num).padStart(2,'0')} ${ep.title}`;
        m3u += `#EXTINF:-1 tvg-logo="${serie.cover}" group-title="📺 ${serie.name}",${name}\n`;
        m3u += `${baseUrl}/series/${username}/${password}/${ep.id}.${ep.container_extension}\n\n`;
      });
    });
  });
  
  // Movies
  (contentData.movies || []).forEach(movie => {
    m3u += `#EXTINF:-1 tvg-logo="${movie.stream_icon}" group-title="🎬 Películas",${movie.name}\n`;
    m3u += `${baseUrl}/movie/${username}/${password}/${movie.stream_id}.${movie.container_extension}\n\n`;
  });
  
  res.setHeader('Content-Type', 'audio/x-mpegurl');
  res.send(m3u);
});

// Streaming
app.get('/movie/:username/:password/:streamId.:ext', (req, res) => {
  const { username, password, streamId } = req.params;
  
  if (username !== CONFIG.auth.username || password !== CONFIG.auth.password) {
    return res.status(401).send('Unauthorized');
  }
  
  const movie = (contentData.movies || []).find(m => m.stream_id == streamId);
  if (movie?.direct_source) {
    res.redirect(movie.direct_source);
  } else {
    res.status(404).send('Not found');
  }
});

app.get('/series/:username/:password/:episodeId.:ext', (req, res) => {
  const { username, password, episodeId } = req.params;
  
  if (username !== CONFIG.auth.username || password !== CONFIG.auth.password) {
    return res.status(401).send('Unauthorized');
  }
  
  let found = null;
  for (const sid in contentData.seriesEpisodes || {}) {
    const eps = contentData.seriesEpisodes[sid].episodes || {};
    for (const season in eps) {
      const ep = eps[season].find(e => e.id === episodeId);
      if (ep) {
        found = ep;
        break;
      }
    }
    if (found) break;
  }
  
  if (found?.direct_source) {
    res.redirect(found.direct_source);
  } else {
    res.status(404).send('Not found');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Iniciar servidor y cargar datos
loadDataFromGitHub().then(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('🚀 Xtream UI Server Started');
    console.log('='.repeat(50));
    console.log(`📍 Port: ${port}`);
    console.log(`👤 User: ${CONFIG.auth.username}`);
    console.log(`🔑 Pass: ${CONFIG.auth.password}`);
    console.log(`🎬 Movies: ${contentData.movies?.length || 0}`);
    console.log(`📺 Series: ${contentData.series?.length || 0}`);
    console.log('='.repeat(50));
  });
});

// Manejo de errores
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
