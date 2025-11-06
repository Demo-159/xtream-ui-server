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
          const [view, setView] = useState('search'); // search, list, edit
          const [query, setQuery] = useState('');
          const [results, setResults] = useState([]);
          const [loading, setLoading] = useState(false);
          const [message, setMessage] = useState('');
          const [existingContent, setExistingContent] = useState([]);
          const [editingItem, setEditingItem] = useState(null);
          const [previewData, setPreviewData] = useState(null);
          
          useEffect(() => {
            loadExistingContent();
          }, [tab]);
          
          const loadExistingContent = async () => {
            try {
              const action = tab === 'movies' ? 'get_vod_streams' : 'get_series';
              const res = await fetch(\`/player_api.php?username=${CONFIG.auth.username}&password=${CONFIG.auth.password}&action=\${action}\`);
              const data = await res.json();
              setExistingContent(data);
            } catch (error) {
              console.error('Error loading content:', error);
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
          
          const fetchFullMetadata = async (tmdbId) => {
            setLoading(true);
            try {
              const endpoint = tab === 'movies' ? 'movie' : 'tv';
              
              // Datos principales
              const res = await fetch(\`https://api.themoviedb.org/3/\${endpoint}/\${tmdbId}?api_key=${CONFIG.tmdb.apiKey}&language=es-ES&append_to_response=credits,videos,keywords,external_ids\`);
              const details = await res.json();
              
              let metadata = null;
              
              if (tab === 'movies') {
                metadata = {
                  stream_id: Date.now(),
                  num: Date.now(),
                  name: details.title,
                  title: details.title,
                  stream_type: "movie",
                  stream_icon: \`https://image.tmdb.org/t/p/w500\${details.poster_path}\`,
                  rating: details.vote_average?.toFixed(1) || "0",
                  rating_5based: (details.vote_average / 2) || 0,
                  added: Math.floor(Date.now() / 1000).toString(),
                  category_id: "1",
                  container_extension: "mp4",
                  direct_source: "",
                  tmdb_id: details.id,
                  overview: details.overview || '',
                  backdrop_path: details.backdrop_path ? \`https://image.tmdb.org/t/p/original\${details.backdrop_path}\` : '',
                  release_date: details.release_date || '',
                  runtime: details.runtime || 0,
                  genres: details.genres?.map(g => g.name).join(', ') || '',
                  cast: details.credits?.cast?.slice(0, 10).map(c => c.name).join(', ') || '',
                  director: details.credits?.crew?.find(c => c.job === 'Director')?.name || '',
                  youtube_trailer: details.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer')?.key || '',
                  imdb_id: details.external_ids?.imdb_id || '',
                  budget: details.budget || 0,
                  revenue: details.revenue || 0
                };
              } else {
                // Para series, obtener temporadas
                const seasons = [];
                if (details.seasons) {
                  for (const season of details.seasons) {
                    if (season.season_number === 0) continue; // Skip specials
                    
                    const seasonRes = await fetch(\`https://api.themoviedb.org/3/tv/\${tmdbId}/season/\${season.season_number}?api_key=${CONFIG.tmdb.apiKey}&language=es-ES\`);
                    const seasonData = await seasonRes.json();
                    
                    seasons.push({
                      season_number: season.season_number,
                      name: season.name,
                      overview: season.overview || '',
                      air_date: season.air_date || '',
                      episode_count: season.episode_count,
                      episodes: seasonData.episodes?.map(ep => ({
                        episode_num: ep.episode_number,
                        title: ep.name,
                        overview: ep.overview || '',
                        air_date: ep.air_date || '',
                        runtime: ep.runtime || 0,
                        still_path: ep.still_path ? \`https://image.tmdb.org/t/p/w500\${ep.still_path}\` : '',
                        direct_source: ''
                      })) || []
                    });
                  }
                }
                
                metadata = {
                  series_id: Date.now(),
                  name: details.name,
                  title: details.name,
                  cover: \`https://image.tmdb.org/t/p/w500\${details.poster_path}\`,
                  backdrop_path: details.backdrop_path ? \`https://image.tmdb.org/t/p/original\${details.backdrop_path}\` : '',
                  plot: details.overview || '',
                  rating: details.vote_average?.toFixed(1) || "0",
                  rating_5based: (details.vote_average / 2) || 0,
                  category_id: "1",
                  category_ids: [1],
                  num: Date.now(),
                  tmdb_id: details.id,
                  first_air_date: details.first_air_date || '',
                  last_air_date: details.last_air_date || '',
                  number_of_seasons: details.number_of_seasons || 0,
                  number_of_episodes: details.number_of_episodes || 0,
                  status: details.status || '',
                  genres: details.genres?.map(g => g.name).join(', ') || '',
                  cast: details.credits?.cast?.slice(0, 10).map(c => c.name).join(', ') || '',
                  youtube_trailer: details.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer')?.key || '',
                  imdb_id: details.external_ids?.imdb_id || '',
                  seasons: seasons
                };
              }
              
              setPreviewData(metadata);
              setView('edit');
            } catch (error) {
              alert('Error: ' + error.message);
            } finally {
              setLoading(false);
            }
          };
          
          const editExisting = (item) => {
            if (tab === 'movies') {
              setPreviewData(item);
            } else {
              // Para series, cargar episodios
              fetch(\`/player_api.php?username=${CONFIG.auth.username}&password=${CONFIG.auth.password}&action=get_series_info&series_id=\${item.series_id}\`)
                .then(res => res.json())
                .then(data => {
                  const seasons = [];
                  if (data.episodes) {
                    Object.keys(data.episodes).forEach(seasonNum => {
                      seasons.push({
                        season_number: parseInt(seasonNum),
                        episodes: data.episodes[seasonNum]
                      });
                    });
                  }
                  setPreviewData({...item, seasons: seasons.sort((a, b) => a.season_number - b.season_number)});
                });
            }
            setEditingItem(item);
            setView('edit');
          };
          
          const saveContent = async () => {
            if (!previewData) return;
            
            setLoading(true);
            try {
              const endpoint = editingItem ? '/api/update-content' : '/api/add-content';
              const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: tab,
                  data: previewData,
                  existingId: editingItem ? (tab === 'movies' ? editingItem.stream_id : editingItem.series_id) : null
                })
              });
              
              const data = await res.json();
              if (data.success) {
                alert(\`✅ \${editingItem ? 'Actualizado' : 'Agregado'} correctamente\`);
                setView('list');
                setPreviewData(null);
                setEditingItem(null);
                loadExistingContent();
              } else {
                alert('❌ Error: ' + data.error);
              }
            } catch (error) {
              alert('❌ Error: ' + error.message);
            } finally {
              setLoading(false);
            }
          };
          
          const deleteContent = async (item) => {
            if (!confirm('¿Estás seguro de eliminar este contenido?')) return;
            
            setLoading(true);
            try {
              const res = await fetch('/api/delete-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: tab,
                  id: tab === 'movies' ? item.stream_id : item.series_id
                })
              });
              
              const data = await res.json();
              if (data.success) {
                alert('✅ Eliminado correctamente');
                loadExistingContent();
              } else {
                alert('❌ Error: ' + data.error);
              }
            } catch (error) {
              alert('❌ Error: ' + error.message);
            } finally {
              setLoading(false);
            }
          };
          
          return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
              <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">Panel Administrativo</h1>
                  <p className="text-gray-600">Gestiona tu contenido completo con TMDB</p>
                </div>
                
                <div className="bg-white rounded-lg shadow-lg mb-6">
                  <div className="flex border-b">
                    <button onClick={() => { setTab('movies'); setView('search'); }} className={\`flex-1 px-6 py-4 font-semibold \${tab === 'movies' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}\`}>
                      🎬 Películas
                    </button>
                    <button onClick={() => { setTab('series'); setView('search'); }} className={\`flex-1 px-6 py-4 font-semibold \${tab === 'series' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}\`}>
                      📺 Series
                    </button>
                  </div>
                  <div className="flex border-b bg-gray-50">
                    <button onClick={() => setView('search')} className={\`flex-1 px-4 py-3 text-sm font-medium \${view === 'search' ? 'bg-white border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}\`}>
                      🔍 Buscar Nuevo
                    </button>
                    <button onClick={() => setView('list')} className={\`flex-1 px-4 py-3 text-sm font-medium \${view === 'list' ? 'bg-white border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}\`}>
                      📋 Contenido Existente ({existingContent.length})
                    </button>
                  </div>
                </div>
                
                {view === 'search' && (
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
                    )}
                    
                    <div className="space-y-4">
                      {results.map(item => (
                        <SearchResultCard key={item.id} item={item} tab={tab} onSelect={fetchFullMetadata} />
                      ))}
                    </div>
                  </>
                )}
                
                {view === 'list' && (
                  <div className="space-y-4">
                    {existingContent.map(item => (
                      <ExistingContentCard key={tab === 'movies' ? item.stream_id : item.series_id} item={item} tab={tab} onEdit={editExisting} onDelete={deleteContent} />
                    ))}
                  </div>
                )}
                
                {view === 'edit' && previewData && (
                  <EditForm data={previewData} setData={setPreviewData} tab={tab} onSave={saveContent} onCancel={() => { setView(editingItem ? 'list' : 'search'); setPreviewData(null); setEditingItem(null); }} loading={loading} />
                )}
              </div>
            </div>
          );
        };
        
        const SearchResultCard = ({ item, tab, onSelect }) => {
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
                  <button onClick={() => onSelect(item.id)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                    ➕ Cargar Metadata Completa
                  </button>
                </div>
              </div>
            </div>
          );
        };
        
        const ExistingContentCard = ({ item, tab, onEdit, onDelete }) => {
          const title = tab === 'movies' ? item.name : item.title || item.name;
          const poster = tab === 'movies' ? item.stream_icon : item.cover;
          
          return (
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex gap-4">
                <img src={poster} alt={title} className="w-24 h-36 object-cover rounded" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{title}</h3>
                  <p className="text-sm text-gray-600 mb-2">⭐ {item.rating || 'N/A'}</p>
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{item.overview || item.plot || 'Sin descripción'}</p>
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(item)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                      ✏️ Editar
                    </button>
                    <button onClick={() => onDelete(item)} className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        };
        
        const EditForm = ({ data, setData, tab, onSave, onCancel, loading }) => {
          const updateField = (field, value) => {
            setData({...data, [field]: value});
          };
          
          const updateSeasonEpisode = (seasonIdx, episodeIdx, field, value) => {
            const newSeasons = [...data.seasons];
            newSeasons[seasonIdx].episodes[episodeIdx][field] = value;
            setData({...data, seasons: newSeasons});
          };
          
          const addSeason = () => {
            const newSeasons = [...(data.seasons || [])];
            newSeasons.push({
              season_number: newSeasons.length + 1,
              name: \`Temporada \${newSeasons.length + 1}\`,
              overview: '',
              episodes: []
            });
            setData({...data, seasons: newSeasons});
          };
          
          const addEpisode = (seasonIdx) => {
            const newSeasons = [...data.seasons];
            const episodeNum = newSeasons[seasonIdx].episodes.length + 1;
            newSeasons[seasonIdx].episodes.push({
              episode_num: episodeNum,
              title: \`Episodio \${episodeNum}\`,
              overview: '',
              direct_source: '',
              container_extension: 'mp4'
            });
            setData({...data, seasons: newSeasons});
          };
          
          const removeSeason = (seasonIdx) => {
            if (!confirm('¿Eliminar esta temporada?')) return;
            const newSeasons = data.seasons.filter((_, idx) => idx !== seasonIdx);
            setData({...data, seasons: newSeasons});
          };
          
          const removeEpisode = (seasonIdx, episodeIdx) => {
            if (!confirm('¿Eliminar este episodio?')) return;
            const newSeasons = [...data.seasons];
            newSeasons[seasonIdx].episodes = newSeasons[seasonIdx].episodes.filter((_, idx) => idx !== episodeIdx);
            setData({...data, seasons: newSeasons});
          };
          
          return (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">
                {tab === 'movies' ? '🎬 Editar Película' : '📺 Editar Serie'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                  <input
                    type="text"
                    value={data.name || data.title || ''}
                    onChange={(e) => {
                      updateField('name', e.target.value);
                      updateField('title', e.target.value);
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {tab === 'movies' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">URL del Video *</label>
                    <input
                      type="text"
                      value={data.direct_source || ''}
                      onChange={(e) => updateField('direct_source', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Poster URL</label>
                  <input
                    type="text"
                    value={data.stream_icon || data.cover || ''}
                    onChange={(e) => {
                      updateField('stream_icon', e.target.value);
                      updateField('cover', e.target.value);
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Backdrop URL</label>
                  <input
                    type="text"
                    value={data.backdrop_path || ''}
                    onChange={(e) => updateField('backdrop_path', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    value={data.rating || ''}
                    onChange={(e) => updateField('rating', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Géneros</label>
                  <input
                    type="text"
                    value={data.genres || ''}
                    onChange={(e) => updateField('genres', e.target.value)}
                    placeholder="Acción, Drama, Ciencia Ficción"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reparto</label>
                  <input
                    type="text"
                    value={data.cast || ''}
                    onChange={(e) => updateField('cast', e.target.value)}
                    placeholder="Actor 1, Actor 2, Actor 3"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {tab === 'movies' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Director</label>
                      <input
                        type="text"
                        value={data.director || ''}
                        onChange={(e) => updateField('director', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Duración (min)</label>
                      <input
                        type="number"
                        value={data.runtime || ''}
                        onChange={(e) => updateField('runtime', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Estreno</label>
                      <input
                        type="date"
                        value={data.release_date || ''}
                        onChange={(e) => updateField('release_date', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">YouTube Trailer ID</label>
                  <input
                    type="text"
                    value={data.youtube_trailer || ''}
                    onChange={(e) => updateField('youtube_trailer', e.target.value)}
                    placeholder="dQw4w9WgXcQ"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IMDb ID</label>
                  <input
                    type="text"
                    value={data.imdb_id || ''}
                    onChange={(e) => updateField('imdb_id', e.target.value)}
                    placeholder="tt1234567"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sinopsis</label>
                <textarea
                  value={data.overview || data.plot || ''}
                  onChange={(e) => {
                    updateField('overview', e.target.value);
                    updateField('plot', e.target.value);
                  }}
                  rows="4"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {tab === 'series' && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Temporadas y Episodios</h3>
                    <button onClick={addSeason} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                      ➕ Agregar Temporada
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {(data.seasons || []).map((season, seasonIdx) => (
                      <div key={seasonIdx} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={season.name || ''}
                              onChange={(e) => {
                                const newSeasons = [...data.seasons];
                                newSeasons[seasonIdx].name = e.target.value;
                                setData({...data, seasons: newSeasons});
                              }}
                              className="w-full px-3 py-2 border rounded-lg font-bold mb-2"
                              placeholder="Nombre de la temporada"
                            />
                            <textarea
                              value={season.overview || ''}
                              onChange={(e) => {
                                const newSeasons = [...data.seasons];
                                newSeasons[seasonIdx].overview = e.target.value;
                                setData({...data, seasons: newSeasons});
                              }}
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                              placeholder="Descripción de la temporada"
                              rows="2"
                            />
                          </div>
                          <button onClick={() => removeSeason(seasonIdx)} className="ml-3 text-red-600 hover:text-red-800">
                            🗑️
                          </button>
                        </div>
                        
                        <div className="mb-3">
                          <button onClick={() => addEpisode(seasonIdx)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                            ➕ Agregar Episodio
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          {(season.episodes || []).map((episode, episodeIdx) => (
                            <div key={episodeIdx} className="bg-white rounded-lg p-3 border">
                              <div className="flex gap-3 mb-2">
                                <input
                                  type="number"
                                  value={episode.episode_num || ''}
                                  onChange={(e) => updateSeasonEpisode(seasonIdx, episodeIdx, 'episode_num', e.target.value)}
                                  className="w-20 px-2 py-1 border rounded text-sm"
                                  placeholder="Ep"
                                />
                                <input
                                  type="text"
                                  value={episode.title || ''}
                                  onChange={(e) => updateSeasonEpisode(seasonIdx, episodeIdx, 'title', e.target.value)}
                                  className="flex-1 px-2 py-1 border rounded text-sm"
                                  placeholder="Título del episodio"
                                />
                                <button onClick={() => removeEpisode(seasonIdx, episodeIdx)} className="text-red-600 hover:text-red-800 text-sm">
                                  🗑️
                                </button>
                              </div>
                              <input
                                type="text"
                                value={episode.direct_source || ''}
                                onChange={(e) => updateSeasonEpisode(seasonIdx, episodeIdx, 'direct_source', e.target.value)}
                                className="w-full px-2 py-1 border rounded text-sm mb-2"
                                placeholder="URL del video *"
                              />
                              <textarea
                                value={episode.overview || ''}
                                onChange={(e) => updateSeasonEpisode(seasonIdx, episodeIdx, 'overview', e.target.value)}
                                className="w-full px-2 py-1 border rounded text-sm"
                                placeholder="Descripción del episodio"
                                rows="2"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <button onClick={onSave} disabled={loading} className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold">
                  {loading ? '⏳ Guardando...' : '💾 Guardar Contenido'}
                </button>
                <button onClick={onCancel} className="px-6 py-3 border rounded-lg hover:bg-gray-100 font-semibold">
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

// API para agregar contenido
app.post('/api/add-content', express.json(), async (req, res) => {
  try {
    const { type, data } = req.body;
    
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
        ...data,
        stream_id: data.stream_id || (currentData.movies?.length || 0) + 1,
        num: data.num || (currentData.movies?.length || 0) + 1,
        added: data.added || Math.floor(Date.now() / 1000).toString(),
        category_id: data.category_id || "1",
        stream_type: "movie"
      };
      
      if (!currentData.movies) currentData.movies = [];
      currentData.movies.push(newMovie);
    } else {
      const seriesId = data.series_id || Object.keys(currentData.seriesEpisodes || {}).length + 1;
      
      const newSeries = {
        series_id: seriesId,
        name: data.name,
        title: data.title || data.name,
        cover: data.cover,
        backdrop_path: data.backdrop_path || '',
        plot: data.plot || data.overview || '',
        rating: data.rating || "0",
        rating_5based: data.rating_5based || 0,
        category_id: data.category_id || "1",
        category_ids: data.category_ids || [1],
        num: data.num || (currentData.series?.length || 0) + 1,
        tmdb_id: data.tmdb_id,
        first_air_date: data.first_air_date || '',
        last_air_date: data.last_air_date || '',
        number_of_seasons: data.seasons?.length || 0,
        status: data.status || '',
        genres: data.genres || '',
        cast: data.cast || '',
        youtube_trailer: data.youtube_trailer || '',
        imdb_id: data.imdb_id || ''
      };
      
      if (!currentData.series) currentData.series = [];
      currentData.series.push(newSeries);
      
      // Procesar temporadas y episodios
      if (data.seasons && data.seasons.length > 0) {
        if (!currentData.seriesEpisodes) currentData.seriesEpisodes = {};
        
        const seasons = [];
        const episodes = {};
        
        data.seasons.forEach(season => {
          seasons.push({
            air_date: season.air_date || '',
            episode_count: season.episodes?.length || 0,
            id: season.season_number,
            name: season.name || `Temporada ${season.season_number}`,
            overview: season.overview || '',
            season_number: season.season_number
          });
          
          if (season.episodes && season.episodes.length > 0) {
            episodes[season.season_number] = season.episodes.map((ep, idx) => ({
              id: `${seriesId}_${season.season_number}_${ep.episode_num || idx + 1}`,
              episode_num: ep.episode_num || idx + 1,
              title: ep.title || `Episodio ${ep.episode_num || idx + 1}`,
              container_extension: ep.container_extension || "mp4",
              info: {
                air_date: ep.air_date || '',
                crew: [],
                episode_number: ep.episode_num || idx + 1,
                guest_stars: [],
                name: ep.title || `Episodio ${ep.episode_num || idx + 1}`,
                overview: ep.overview || '',
                season_number: season.season_number,
                still_path: ep.still_path || '',
                vote_average: 0,
                vote_count: 0
              },
              direct_source: ep.direct_source || '',
              added: Math.floor(Date.now() / 1000).toString()
            }));
          }
        });
        
        currentData.seriesEpisodes[seriesId] = {
          seasons: seasons,
          episodes: episodes
        };
      }
    }
    
    // Guardar en GitHub
    const payload = {
      message: `Add ${type}: ${data.name || data.title}`,
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

// API para actualizar contenido
app.post('/api/update-content', express.json(), async (req, res) => {
  try {
    const { type, data, existingId } = req.body;
    
    // Leer datos actuales de GitHub
    const githubRes = await axios.get(
      `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${CONFIG.github.dataFile}`,
      {
        headers: {
          'Authorization': `token ${CONFIG.github.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    let currentData = JSON.parse(Buffer.from(githubRes.data.content, 'base64').toString());
    const sha = githubRes.data.sha;
    
    // Actualizar contenido
    if (type === 'movies') {
      const index = currentData.movies.findIndex(m => m.stream_id == existingId);
      if (index !== -1) {
        currentData.movies[index] = {
          ...currentData.movies[index],
          ...data,
          stream_id: existingId
        };
      }
    } else {
      const index = currentData.series.findIndex(s => s.series_id == existingId);
      if (index !== -1) {
        currentData.series[index] = {
          series_id: existingId,
          name: data.name,
          title: data.title || data.name,
          cover: data.cover,
          backdrop_path: data.backdrop_path || '',
          plot: data.plot || data.overview || '',
          rating: data.rating || "0",
          rating_5based: data.rating_5based || 0,
          category_id: data.category_id || "1",
          category_ids: data.category_ids || [1],
          num: currentData.series[index].num,
          tmdb_id: data.tmdb_id,
          first_air_date: data.first_air_date || '',
          genres: data.genres || '',
          cast: data.cast || '',
          youtube_trailer: data.youtube_trailer || '',
          imdb_id: data.imdb_id || ''
        };
        
        // Actualizar episodios
        if (data.seasons && data.seasons.length > 0) {
          const seasons = [];
          const episodes = {};
          
          data.seasons.forEach(season => {
            seasons.push({
              air_date: season.air_date || '',
              episode_count: season.episodes?.length || 0,
              id: season.season_number,
              name: season.name || `Temporada ${season.season_number}`,
              overview: season.overview || '',
              season_number: season.season_number
            });
            
            if (season.episodes && season.episodes.length > 0) {
              episodes[season.season_number] = season.episodes.map((ep, idx) => ({
                id: ep.id || `${existingId}_${season.season_number}_${ep.episode_num || idx + 1}`,
                episode_num: ep.episode_num || idx + 1,
                title: ep.title || `Episodio ${ep.episode_num || idx + 1}`,
                container_extension: ep.container_extension || "mp4",
                info: {
                  episode_number: ep.episode_num || idx + 1,
                  name: ep.title || `Episodio ${ep.episode_num || idx + 1}`,
                  overview: ep.overview || '',
                  season_number: season.season_number
                },
                direct_source: ep.direct_source || '',
                added: ep.added || Math.floor(Date.now() / 1000).toString()
              }));
            }
          });
          
          currentData.seriesEpisodes[existingId] = {
            seasons: seasons,
            episodes: episodes
          };
        }
      }
    }
    
    // Guardar en GitHub
    const payload = {
      message: `Update ${type}: ${data.name || data.title}`,
      content: Buffer.from(JSON.stringify(currentData, null, 2)).toString('base64'),
      sha
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
    console.error('Error updating content:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para eliminar contenido
app.post('/api/delete-content', express.json(), async (req, res) => {
  try {
    const { type, id } = req.body;
    
    // Leer datos actuales de GitHub
    const githubRes = await axios.get(
      `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${CONFIG.github.dataFile}`,
      {
        headers: {
          'Authorization': `token ${CONFIG.github.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    let currentData = JSON.parse(Buffer.from(githubRes.data.content, 'base64').toString());
    const sha = githubRes.data.sha;
    
    // Eliminar contenido
    if (type === 'movies') {
      currentData.movies = currentData.movies.filter(m => m.stream_id != id);
    } else {
      currentData.series = currentData.series.filter(s => s.series_id != id);
      if (currentData.seriesEpisodes && currentData.seriesEpisodes[id]) {
        delete currentData.seriesEpisodes[id];
      }
    }
    
    // Guardar en GitHub
    const payload = {
      message: `Delete ${type}: ${id}`,
      content: Buffer.from(JSON.stringify(currentData, null, 2)).toString('base64'),
      sha
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
    console.error('Error deleting content:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});
