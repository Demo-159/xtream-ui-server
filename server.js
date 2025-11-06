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
    repo: 'xtream-ui-server',
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

// Panel administrativo mejorado
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
        const { useState, useEffect } = React;
        
        const AdminPanel = () => {
          const [tab, setTab] = useState('movies');
          const [view, setView] = useState('search'); // 'search' o 'library'
          const [query, setQuery] = useState('');
          const [results, setResults] = useState([]);
          const [loading, setLoading] = useState(false);
          const [message, setMessage] = useState('');
          const [editingItem, setEditingItem] = useState(null);
          const [library, setLibrary] = useState({ movies: [], series: [] });
          
          useEffect(() => {
            loadLibrary();
          }, []);
          
          const loadLibrary = async () => {
            try {
              const res = await fetch('/api/library');
              const data = await res.json();
              setLibrary(data);
            } catch (error) {
              console.error('Error loading library:', error);
            }
          };
          
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
          
          const fetchFullDetails = async (item) => {
            setLoading(true);
            try {
              const type = tab === 'movies' ? 'movie' : 'tv';
              const res = await fetch(\`https://api.themoviedb.org/3/\${type}/\${item.id}?api_key=${CONFIG.tmdb.apiKey}&language=es-ES&append_to_response=credits,videos\`);
              const details = await res.json();
              
              if (tab === 'movies') {
                setEditingItem({
                  type: 'movie',
                  tmdbId: details.id,
                  name: details.title,
                  title: details.title,
                  overview: details.overview || '',
                  poster: \`https://image.tmdb.org/t/p/w500\${details.poster_path}\`,
                  backdrop: details.backdrop_path ? \`https://image.tmdb.org/t/p/original\${details.backdrop_path}\` : '',
                  rating: details.vote_average || 0,
                  year: details.release_date?.split('-')[0] || '',
                  duration: details.runtime || 0,
                  genre: details.genres?.map(g => g.name).join(', ') || '',
                  director: details.credits?.crew?.find(c => c.job === 'Director')?.name || '',
                  cast: details.credits?.cast?.slice(0, 5).map(c => c.name).join(', ') || '',
                  trailer: details.videos?.results?.find(v => v.type === 'Trailer')?.key || '',
                  url: ''
                });
              } else {
                // Para series, obtener temporadas
                const seasons = [];
                for (let season of details.seasons || []) {
                  if (season.season_number === 0) continue; // Saltar especiales
                  
                  const seasonRes = await fetch(\`https://api.themoviedb.org/3/tv/\${item.id}/season/\${season.season_number}?api_key=${CONFIG.tmdb.apiKey}&language=es-ES\`);
                  const seasonData = await seasonRes.json();
                  
                  seasons.push({
                    season_number: season.season_number,
                    name: season.name,
                    episode_count: season.episode_count,
                    episodes: seasonData.episodes?.map(ep => ({
                      episode_num: ep.episode_number,
                      title: ep.name,
                      overview: ep.overview || '',
                      air_date: ep.air_date || '',
                      still_path: ep.still_path ? \`https://image.tmdb.org/t/p/w500\${ep.still_path}\` : '',
                      url: ''
                    })) || []
                  });
                }
                
                setEditingItem({
                  type: 'series',
                  tmdbId: details.id,
                  name: details.name,
                  title: details.name,
                  overview: details.overview || '',
                  poster: \`https://image.tmdb.org/t/p/w500\${details.poster_path}\`,
                  backdrop: details.backdrop_path ? \`https://image.tmdb.org/t/p/original\${details.backdrop_path}\` : '',
                  rating: details.vote_average || 0,
                  year: details.first_air_date?.split('-')[0] || '',
                  genre: details.genres?.map(g => g.name).join(', ') || '',
                  cast: details.credits?.cast?.slice(0, 5).map(c => c.name).join(', ') || '',
                  trailer: details.videos?.results?.find(v => v.type === 'Trailer')?.key || '',
                  seasons: seasons
                });
              }
            } catch (error) {
              alert('Error: ' + error.message);
            } finally {
              setLoading(false);
            }
          };
          
          const saveContent = async () => {
            if (!editingItem) return;
            
            setLoading(true);
            try {
              const res = await fetch('/api/save-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingItem)
              });
              
              const data = await res.json();
              if (data.success) {
                alert('✓ Contenido guardado correctamente');
                setEditingItem(null);
                setResults([]);
                setQuery('');
                loadLibrary();
              } else {
                alert('Error: ' + data.error);
              }
            } catch (error) {
              alert('Error: ' + error.message);
            } finally {
              setLoading(false);
            }
          };
          
          const editExisting = async (item) => {
            setLoading(true);
            try {
              const res = await fetch(\`/api/content/\${item.type}/\${item.id}\`);
              const data = await res.json();
              setEditingItem({ ...data, existingId: item.id });
              setView('search');
            } catch (error) {
              alert('Error: ' + error.message);
            } finally {
              setLoading(false);
            }
          };
          
          const deleteContent = async (item) => {
            if (!confirm(\`¿Eliminar "\${item.name}"?\`)) return;
            
            try {
              const res = await fetch(\`/api/content/\${item.type}/\${item.id}\`, {
                method: 'DELETE'
              });
              const data = await res.json();
              if (data.success) {
                alert('✓ Eliminado correctamente');
                loadLibrary();
              }
            } catch (error) {
              alert('Error: ' + error.message);
            }
          };
          
          return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
              <div className="max-w-6xl mx-auto">
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
                  <div className="flex border-b">
                    <button onClick={() => setView('search')} className={\`flex-1 px-4 py-3 text-sm font-medium \${view === 'search' ? 'bg-gray-100 text-blue-600' : 'text-gray-600'}\`}>
                      🔍 Buscar y Agregar
                    </button>
                    <button onClick={() => setView('library')} className={\`flex-1 px-4 py-3 text-sm font-medium \${view === 'library' ? 'bg-gray-100 text-blue-600' : 'text-gray-600'}\`}>
                      📚 Biblioteca ({tab === 'movies' ? library.movies.length : library.series.length})
                    </button>
                  </div>
                </div>
                
                {view === 'search' && !editingItem && (
                  <>
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
                    ))}
                  </div>
                  
                  {item.seasons[selectedSeason] && (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {item.seasons[selectedSeason].episodes.map((ep, epIdx) => (
                        <div key={epIdx} className="border rounded p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium mb-1">Episodio {ep.episode_num}</label>
                              <input type="text" value={ep.title} onChange={(e) => updateEpisode(selectedSeason, epIdx, 'title', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium mb-1">URL del Video</label>
                              <input type="text" value={ep.url} onChange={(e) => updateEpisode(selectedSeason, epIdx, 'url', e.target.value)} placeholder="https://..." className="w-full px-2 py-1 border rounded text-sm" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-3">
                <button onClick={onSave} className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold">
                  💾 Guardar {item.type === 'movie' ? 'Película' : 'Serie'}
                </button>
                <button onClick={onCancel} className="px-6 py-3 border rounded-lg hover:bg-gray-100">
                  Cancelar
                </button>
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

// API para obtener biblioteca
app.get('/api/library', (req, res) => {
  const movies = (contentData.movies || []).map(m => ({
    id: m.stream_id,
    type: 'movie',
    name: m.name,
    poster: m.stream_icon,
    rating: parseFloat(m.rating) || 0,
    year: m.year || '',
    overview: m.overview || ''
  }));
  
  const series = (contentData.series || []).map(s => ({
    id: s.series_id,
    type: 'series',
    name: s.name,
    poster: s.cover,
    rating: parseFloat(s.rating) || 0,
    year: s.year || '',
    overview: s.plot || ''
  }));
  
  res.json({ movies, series });
});

// API para obtener contenido específico
app.get('/api/content/:type/:id', (req, res) => {
  const { type, id } = req.params;
  
  if (type === 'movie') {
    const movie = (contentData.movies || []).find(m => m.stream_id == id);
    if (!movie) return res.status(404).json({ error: 'Not found' });
    
    res.json({
      type: 'movie',
      tmdbId: movie.tmdb_id,
      name: movie.name,
      title: movie.title,
      overview: movie.overview || '',
      poster: movie.stream_icon,
      backdrop: movie.backdrop_path || '',
      rating: parseFloat(movie.rating) || 0,
      year: movie.year || '',
      duration: movie.duration || 0,
      genre: movie.genre || '',
      director: movie.director || '',
      cast: movie.cast || '',
      trailer: movie.trailer || '',
      url: movie.direct_source || ''
    });
  } else {
    const series = (contentData.series || []).find(s => s.series_id == id);
    if (!series) return res.status(404).json({ error: 'Not found' });
    
    const episodes = contentData.seriesEpisodes?.[id];
    const seasons = [];
    
    if (episodes?.episodes) {
      for (const seasonNum in episodes.episodes) {
        seasons.push({
          season_number: parseInt(seasonNum),
          name: \`Temporada \${seasonNum}\`,
          episode_count: episodes.episodes[seasonNum].length,
          episodes: episodes.episodes[seasonNum].map(ep => ({
            episode_num: ep.episode_num,
            title: ep.title,
            overview: ep.info?.plot || '',
            air_date: ep.info?.releasedate || '',
            still_path: ep.info?.movie_image || '',
            url: ep.direct_source || ''
          }))
        });
      }
    }
    
    res.json({
      type: 'series',
      tmdbId: series.tmdb_id,
      name: series.name,
      title: series.title || series.name,
      overview: series.plot || '',
      poster: series.cover,
      backdrop: series.backdrop_path || '',
      rating: parseFloat(series.rating) || 0,
      year: series.year || '',
      genre: series.genre || '',
      cast: series.cast || '',
      trailer: series.trailer || '',
      seasons: seasons
    });
  }
});

// API para guardar contenido (nuevo o editado)
app.post('/api/save-content', express.json(), async (req, res) => {
  try {
    const data = req.body;
    
    // Leer datos actuales de GitHub
    let currentData = { ...contentData };
    let sha = null;
    
    try {
      const githubRes = await axios.get(
        \`https://api.github.com/repos/\${CONFIG.github.owner}/\${CONFIG.github.repo}/contents/\${CONFIG.github.dataFile}\`,
        {
          headers: {
            'Authorization': \`token \${CONFIG.github.token}\`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      currentData = JSON.parse(Buffer.from(githubRes.data.content, 'base64').toString());
      sha = githubRes.data.sha;
    } catch (error) {
      console.log('Creando nuevo archivo en GitHub');
    }
    
    if (!currentData.movies) currentData.movies = [];
    if (!currentData.series) currentData.series = [];
    if (!currentData.seriesEpisodes) currentData.seriesEpisodes = {};
    
    if (data.type === 'movie') {
      const movieId = data.existingId || (currentData.movies.length + 1);
      
      const movieData = {
        stream_id: movieId,
        num: movieId,
        name: data.name,
        title: data.title || data.name,
        stream_type: "movie",
        stream_icon: data.poster,
        backdrop_path: data.backdrop || '',
        rating: data.rating.toString(),
        rating_5based: data.rating / 2,
        added: Math.floor(Date.now() / 1000).toString(),
        category_id: "1",
        container_extension: data.url ? data.url.split('.').pop() : "mp4",
        custom_sid: "",
        direct_source: data.url,
        tmdb_id: data.tmdbId,
        overview: data.overview,
        year: data.year,
        duration: data.duration,
        genre: data.genre,
        director: data.director,
        cast: data.cast,
        trailer: data.trailer
      };
      
      if (data.existingId) {
        const idx = currentData.movies.findIndex(m => m.stream_id == data.existingId);
        if (idx !== -1) currentData.movies[idx] = movieData;
      } else {
        currentData.movies.push(movieData);
      }
    } else {
      const seriesId = data.existingId || (Object.keys(currentData.seriesEpisodes).length + 1);
      
      const seriesData = {
        series_id: seriesId,
        name: data.name,
        title: data.title || data.name,
        cover: data.poster,
        backdrop_path: data.backdrop || '',
        plot: data.overview,
        rating: data.rating.toString(),
        rating_5based: data.rating / 2,
        category_id: "1",
        category_ids: [1],
        num: seriesId,
        tmdb_id: data.tmdbId,
        year: data.year,
        genre: data.genre,
        cast: data.cast,
        trailer: data.trailer
      };
      
      if (data.existingId) {
        const idx = currentData.series.findIndex(s => s.series_id == data.existingId);
        if (idx !== -1) currentData.series[idx] = seriesData;
      } else {
        currentData.series.push(seriesData);
      }
      
      // Procesar temporadas y episodios
      const episodesData = {
        seasons: [],
        episodes: {}
      };
      
      let globalEpisodeId = 1;
      
      for (const season of data.seasons || []) {
        episodesData.seasons.push({
          season_number: season.season_number,
          name: season.name,
          episode_count: season.episodes.length,
          air_date: season.episodes[0]?.air_date || ''
        });
        
        episodesData.episodes[season.season_number] = season.episodes.map(ep => ({
          id: \`\${seriesId}_\${season.season_number}_\${ep.episode_num}\`,
          episode_num: ep.episode_num,
          title: ep.title,
          container_extension: ep.url ? ep.url.split('.').pop() : "mp4",
          direct_source: ep.url,
          info: {
            name: ep.title,
            plot: ep.overview,
            releasedate: ep.air_date,
            movie_image: ep.still_path,
            rating: data.rating.toString()
          },
          season: season.season_number
        }));
      }
      
      currentData.seriesEpisodes[seriesId] = episodesData;
    }
    
    // Guardar en GitHub
    const payload = {
      message: \`\${data.existingId ? 'Update' : 'Add'} \${data.type}: \${data.name}\`,
      content: Buffer.from(JSON.stringify(currentData, null, 2)).toString('base64'),
      ...(sha && { sha })
    };
    
    await axios.put(
      \`https://api.github.com/repos/\${CONFIG.github.owner}/\${CONFIG.github.repo}/contents/\${CONFIG.github.dataFile}\`,
      payload,
      {
        headers: {
          'Authorization': \`token \${CONFIG.github.token}\`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    // Actualizar datos en memoria
    contentData = currentData;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving content:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para eliminar contenido
app.delete('/api/content/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    
    // Leer datos actuales de GitHub
    let currentData = { ...contentData };
    let sha = null;
    
    const githubRes = await axios.get(
      \`https://api.github.com/repos/\${CONFIG.github.owner}/\${CONFIG.github.repo}/contents/\${CONFIG.github.dataFile}\`,
      {
        headers: {
          'Authorization': \`token \${CONFIG.github.token}\`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    currentData = JSON.parse(Buffer.from(githubRes.data.content, 'base64').toString());
    sha = githubRes.data.sha;
    
    if (type === 'movie') {
      currentData.movies = (currentData.movies || []).filter(m => m.stream_id != id);
    } else {
      currentData.series = (currentData.series || []).filter(s => s.series_id != id);
      delete currentData.seriesEpisodes[id];
    }
    
    // Guardar en GitHub
    const payload = {
      message: \`Delete \${type}: \${id}\`,
      content: Buffer.from(JSON.stringify(currentData, null, 2)).toString('base64'),
      sha
    };
    
    await axios.put(
      \`https://api.github.com/repos/\${CONFIG.github.owner}/\${CONFIG.github.repo}/contents/\${CONFIG.github.dataFile}\`,
      payload,
      {
        headers: {
          'Authorization': \`token \${CONFIG.github.token}\`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    // Actualizar datos en memoria
    contentData = currentData;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting content:', error.message);
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
  
  const baseUrl = \`\${req.protocol}://\${req.get('host')}\`;
  let m3u = '#EXTM3U\n\n';
  
  // Series
  (contentData.series || []).forEach(serie => {
    const episodes = contentData.seriesEpisodes?.[serie.series_id]?.episodes || {};
    Object.keys(episodes).forEach(season => {
      episodes[season].forEach(ep => {
        const name = \`\${serie.name} S\${String(season).padStart(2,'0')}E\${String(ep.episode_num).padStart(2,'0')} \${ep.title}\`;
        m3u += \`#EXTINF:-1 tvg-logo="\${serie.cover}" group-title="📺 \${serie.name}",\${name}\n\`;
        m3u += \`\${baseUrl}/series/\${username}/\${password}/\${ep.id}.\${ep.container_extension}\n\n\`;
      });
    });
  });
  
  // Movies
  (contentData.movies || []).forEach(movie => {
    m3u += \`#EXTINF:-1 tvg-logo="\${movie.stream_icon}" group-title="🎬 Películas",\${movie.name}\n\`;
    m3u += \`\${baseUrl}/movie/\${username}/\${password}/\${movie.stream_id}.\${movie.container_extension}\n\n\`;
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
    console.log(\`📍 Port: \${port}\`);
    console.log(\`👤 User: \${CONFIG.auth.username}\`);
    console.log(\`🔑 Pass: \${CONFIG.auth.password}\`);
    console.log(\`🎬 Movies: \${contentData.movies?.length || 0}\`);
    console.log(\`📺 Series: \${contentData.series?.length || 0}\`);
    console.log('='.repeat(50));
  });
});

// Manejo de errores
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});}
                    
                    <div className="space-y-4">
                      {results.map(item => (
                        <SearchResult key={item.id} item={item} tab={tab} onSelect={fetchFullDetails} />
                      ))}
                    </div>
                  </>
                )}
                
                {view === 'library' && (
                  <div className="space-y-4">
                    {(tab === 'movies' ? library.movies : library.series).map(item => (
                      <LibraryItem key={item.id} item={item} onEdit={editExisting} onDelete={deleteContent} />
                    ))}
                  </div>
                )}
                
                {editingItem && <ContentEditor item={editingItem} setItem={setEditingItem} onSave={saveContent} onCancel={() => setEditingItem(null)} />}
              </div>
            </div>
          );
        };
        
        const SearchResult = ({ item, tab, onSelect }) => {
          const title = tab === 'movies' ? item.title : item.name;
          const poster = item.poster_path ? \`https://image.tmdb.org/t/p/w200\${item.poster_path}\` : 'https://via.placeholder.com/200x300?text=No+Image';
          
          return (
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex gap-4">
                <img src={poster} alt={title} className="w-24 h-36 object-cover rounded" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{title}</h3>
                  <p className="text-sm text-gray-600 mb-2">⭐ {item.vote_average?.toFixed(1) || 'N/A'} • {tab === 'movies' ? item.release_date?.split('-')[0] : item.first_air_date?.split('-')[0]}</p>
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{item.overview || 'Sin descripción'}</p>
                  <button onClick={() => onSelect(item)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                    ✏️ Editar y Agregar
                  </button>
                </div>
              </div>
            </div>
          );
        };
        
        const LibraryItem = ({ item, onEdit, onDelete }) => {
          return (
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex gap-4">
                <img src={item.poster} alt={item.name} className="w-24 h-36 object-cover rounded" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">⭐ {item.rating?.toFixed(1)} • {item.year}</p>
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{item.overview}</p>
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(item)} className="bg-yellow-500 text-white px-4 py-2 rounded text-sm hover:bg-yellow-600">
                      ✏️ Editar
                    </button>
                    <button onClick={() => onDelete(item)} className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600">
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        };
        
        const ContentEditor = ({ item, setItem, onSave, onCancel }) => {
          const [selectedSeason, setSelectedSeason] = useState(0);
          
          const updateField = (field, value) => {
            setItem({ ...item, [field]: value });
          };
          
          const updateEpisode = (seasonIdx, epIdx, field, value) => {
            const newSeasons = [...item.seasons];
            newSeasons[seasonIdx].episodes[epIdx][field] = value;
            setItem({ ...item, seasons: newSeasons });
          };
          
          return (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">{item.existingId ? 'Editar' : 'Agregar'} {item.type === 'movie' ? 'Película' : 'Serie'}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Título</label>
                  <input type="text" value={item.name} onChange={(e) => updateField('name', e.target.value)} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Año</label>
                  <input type="text" value={item.year} onChange={(e) => updateField('year', e.target.value)} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Rating</label>
                  <input type="number" step="0.1" value={item.rating} onChange={(e) => updateField('rating', parseFloat(e.target.value))} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Género</label>
                  <input type="text" value={item.genre} onChange={(e) => updateField('genre', e.target.value)} className="w-full px-3 py-2 border rounded" />
                </div>
                {item.type === 'movie' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Duración (min)</label>
                      <input type="number" value={item.duration} onChange={(e) => updateField('duration', parseInt(e.target.value))} className="w-full px-3 py-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Director</label>
                      <input type="text" value={item.director} onChange={(e) => updateField('director', e.target.value)} className="w-full px-3 py-2 border rounded" />
                    </div>
                  </>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Reparto</label>
                  <input type="text" value={item.cast} onChange={(e) => updateField('cast', e.target.value)} className="w-full px-3 py-2 border rounded" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Sinopsis</label>
                  <textarea value={item.overview} onChange={(e) => updateField('overview', e.target.value)} rows="3" className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Poster URL</label>
                  <input type="text" value={item.poster} onChange={(e) => updateField('poster', e.target.value)} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Backdrop URL</label>
                  <input type="text" value={item.backdrop} onChange={(e) => updateField('backdrop', e.target.value)} className="w-full px-3 py-2 border rounded" />
                </div>
                {item.type === 'movie' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">URL del Video</label>
                    <input type="text" value={item.url} onChange={(e) => updateField('url', e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border rounded" />
                  </div>
                )}
              </div>
              
              {item.type === 'series' && item.seasons && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-4">Temporadas y Episodios</h3>
                  <div className="flex gap-2 mb-4 overflow-x-auto">
                    {item.seasons.map((season, idx) => (
                      <button key={idx} onClick={() => setSelectedSeason(idx)} className={\`px-4 py-2 rounded whitespace-nowrap \${selectedSeason === idx ? 'bg-blue-600 text-white' : 'bg-gray-200'}\`}>
                        Temporada {season.season_number} ({season.episodes.length} eps)
                      </button>
                    )
