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
          const [tab, setTab] = useState('search');
          const [contentType, setContentType] = useState('movies');
          const [query, setQuery] = useState('');
          const [results, setResults] = useState([]);
          const [loading, setLoading] = useState(false);
          const [message, setMessage] = useState('');
          const [editingContent, setEditingContent] = useState(null);
          const [existingContent, setExistingContent] = useState({ movies: [], series: [] });
          
          useEffect(() => {
            loadExistingContent();
          }, []);
          
          const loadExistingContent = async () => {
            try {
              const res = await fetch('/api/get-content');
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
              const type = contentType === 'movies' ? 'movie' : 'tv';
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
          
          const loadTMDBDetails = async (item) => {
            setLoading(true);
            try {
              const endpoint = contentType === 'movies' ? 'movie' : 'tv';
              const res = await fetch(\`https://api.themoviedb.org/3/\${endpoint}/\${item.id}?api_key=${CONFIG.tmdb.apiKey}&language=es-ES&append_to_response=credits,videos\`);
              const details = await res.json();
              
              if (contentType === 'series') {
                const seasonsData = await Promise.all(
                  (details.seasons || []).map(async (season) => {
                    if (season.season_number === 0) return null;
                    const seasonRes = await fetch(
                      \`https://api.themoviedb.org/3/tv/\${item.id}/season/\${season.season_number}?api_key=${CONFIG.tmdb.apiKey}&language=es-ES\`
                    );
                    return seasonRes.json();
                  })
                );
                details.seasonsWithEpisodes = seasonsData.filter(s => s);
              }
              
              setEditingContent({ ...details, isNew: true, contentType });
            } catch (error) {
              alert('Error: ' + error.message);
            } finally {
              setLoading(false);
            }
          };
          
          const editExisting = async (item) => {
            setLoading(true);
            try {
              const endpoint = item.stream_type === 'movie' || item.stream_id ? 'movie' : 'tv';
              const tmdbId = item.tmdb_id || item.series_id;
              
              const res = await fetch(\`https://api.themoviedb.org/3/\${endpoint}/\${tmdbId}?api_key=${CONFIG.tmdb.apiKey}&language=es-ES&append_to_response=credits,videos\`);
              const details = await res.json();
              
              if (endpoint === 'tv') {
                const seasonsData = await Promise.all(
                  (details.seasons || []).map(async (season) => {
                    if (season.season_number === 0) return null;
                    const seasonRes = await fetch(
                      \`https://api.themoviedb.org/3/tv/\${tmdbId}/season/\${season.season_number}?api_key=${CONFIG.tmdb.apiKey}&language=es-ES\`
                    );
                    return seasonRes.json();
                  })
                );
                details.seasonsWithEpisodes = seasonsData.filter(s => s);
              }
              
              setEditingContent({ 
                ...details, 
                ...item,
                isNew: false, 
                contentType: endpoint === 'movie' ? 'movies' : 'series'
              });
              setTab('search');
            } catch (error) {
              alert('Error: ' + error.message);
            } finally {
              setLoading(false);
            }
          };
          
          const deleteContent = async (item, type) => {
            if (!confirm(\`¿Eliminar "\${item.name || item.title}"?\`)) return;
            
            setLoading(true);
            try {
              const res = await fetch('/api/delete-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  type, 
                  id: type === 'movies' ? item.stream_id : item.series_id 
                })
              });
              
              const data = await res.json();
              if (data.success) {
                alert('✓ Contenido eliminado');
                loadExistingContent();
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
              <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">Panel Administrativo</h1>
                  <p className="text-gray-600">Gestiona tu contenido con TMDB</p>
                </div>
                
                <div className="bg-white rounded-lg shadow-lg mb-6">
                  <div className="flex border-b">
                    <button onClick={() => setTab('search')} className={\`flex-1 px-6 py-4 font-semibold \${tab === 'search' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}\`}>
                      🔍 Buscar y Agregar
                    </button>
                    <button onClick={() => setTab('manage')} className={\`flex-1 px-6 py-4 font-semibold \${tab === 'manage' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}\`}>
                      📚 Gestionar Contenido
                    </button>
                  </div>
                </div>
                
                {tab === 'search' && !editingContent && (
                  <>
                    <div className="bg-white rounded-lg shadow-lg mb-6">
                      <div className="flex border-b">
                        <button onClick={() => setContentType('movies')} className={\`flex-1 px-6 py-4 font-semibold \${contentType === 'movies' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600'}\`}>
                          🎬 Películas
                        </button>
                        <button onClick={() => setContentType('series')} className={\`flex-1 px-6 py-4 font-semibold \${contentType === 'series' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600'}\`}>
                          📺 Series
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          placeholder={\`Buscar \${contentType === 'movies' ? 'película' : 'serie'}...\`}
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
                        <SearchResultCard key={item.id} item={item} contentType={contentType} onSelect={loadTMDBDetails} />
                      ))}
                    </div>
                  </>
                )}
                
                {tab === 'search' && editingContent && (
                  <ContentEditor 
                    content={editingContent} 
                    onCancel={() => { setEditingContent(null); loadExistingContent(); }}
                    onSaved={() => { setEditingContent(null); loadExistingContent(); setResults([]); setQuery(''); }}
                  />
                )}
                
                {tab === 'manage' && (
                  <ManageContent 
                    content={existingContent} 
                    onEdit={editExisting}
                    onDelete={deleteContent}
                    onRefresh={loadExistingContent}
                  />
                )}
              </div>
            </div>
          );
        };
        
        const SearchResultCard = ({ item, contentType, onSelect }) => {
          const title = contentType === 'movies' ? item.title : item.name;
          const poster = item.poster_path ? \`https://image.tmdb.org/t/p/w200\${item.poster_path}\` : 'https://via.placeholder.com/200x300?text=No+Image';
          const date = item.release_date || item.first_air_date;
          
          return (
            <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
              <div className="flex gap-4">
                <img src={poster} alt={title} className="w-24 h-36 object-cover rounded" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{title}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    ⭐ {item.vote_average?.toFixed(1) || 'N/A'} • 📅 {date ? new Date(date).getFullYear() : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{item.overview || 'Sin descripción'}</p>
                  
                  <button 
                    onClick={() => onSelect(item)} 
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                  >
                    ➕ Agregar / Editar
                  </button>
                </div>
              </div>
            </div>
          );
        };
        
        const ContentEditor = ({ content, onCancel, onSaved }) => {
          const [formData, setFormData] = useState({});
          const [saving, setSaving] = useState(false);
          
          useEffect(() => {
            if (content.contentType === 'movies') {
              setFormData({
                title: content.title || '',
                overview: content.overview || '',
                rating: content.vote_average || 0,
                poster: content.poster_path ? \`https://image.tmdb.org/t/p/w500\${content.poster_path}\` : '',
                backdrop: content.backdrop_path ? \`https://image.tmdb.org/t/p/original\${content.backdrop_path}\` : '',
                director: content.credits?.crew?.find(c => c.job === 'Director')?.name || '',
                cast: content.credits?.cast?.slice(0, 5).map(a => a.name).join(', ') || '',
                genres: content.genres?.map(g => g.name).join(', ') || '',
                runtime: content.runtime || 0,
                release_date: content.release_date || '',
                url: content.direct_source || '',
                tmdb_id: content.id
              });
            } else {
              const seasons = {};
              (content.seasonsWithEpisodes || []).forEach(season => {
                if (!season) return;
                seasons[season.season_number] = {
                  name: season.name,
                  episodes: (season.episodes || []).map(ep => ({
                    episode_num: ep.episode_number,
                    title: ep.name,
                    overview: ep.overview || '',
                    still_path: ep.still_path ? \`https://image.tmdb.org/t/p/w500\${ep.still_path}\` : '',
                    url: ''
                  }))
                };
              });
              
              setFormData({
                name: content.name || '',
                overview: content.overview || '',
                rating: content.vote_average || 0,
                poster: content.poster_path ? \`https://image.tmdb.org/t/p/w500\${content.poster_path}\` : '',
                backdrop: content.backdrop_path ? \`https://image.tmdb.org/t/p/original\${content.backdrop_path}\` : '',
                cast: content.credits?.cast?.slice(0, 5).map(a => a.name).join(', ') || '',
                genres: content.genres?.map(g => g.name).join(', ') || '',
                first_air_date: content.first_air_date || '',
                last_air_date: content.last_air_date || '',
                number_of_seasons: content.number_of_seasons || 0,
                number_of_episodes: content.number_of_episodes || 0,
                tmdb_id: content.id,
                seasons
              });
            }
          }, [content]);
          
          const updateField = (field, value) => {
            setFormData(prev => ({ ...prev, [field]: value }));
          };
          
          const updateEpisodeUrl = (season, episodeIdx, url) => {
            setFormData(prev => ({
              ...prev,
              seasons: {
                ...prev.seasons,
                [season]: {
                  ...prev.seasons[season],
                  episodes: prev.seasons[season].episodes.map((ep, idx) => 
                    idx === episodeIdx ? { ...ep, url } : ep
                  )
                }
              }
            }));
          };
          
          const saveContent = async () => {
            setSaving(true);
            try {
              const res = await fetch('/api/save-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: content.contentType,
                  isNew: content.isNew,
                  data: formData,
                  originalId: content.stream_id || content.series_id
                })
              });
              
              const data = await res.json();
              if (data.success) {
                alert('✓ Contenido guardado correctamente');
                onSaved();
              } else {
                alert('Error: ' + data.error);
              }
            } catch (error) {
              alert('Error: ' + error.message);
            } finally {
              setSaving(false);
            }
          };
          
          return (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">
                  {content.isNew ? '➕ Agregar' : '✏️ Editar'} {content.contentType === 'movies' ? 'Película' : 'Serie'}
                </h2>
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              
              {content.contentType === 'movies' ? (
                <MovieForm formData={formData} updateField={updateField} />
              ) : (
                <SeriesForm formData={formData} updateField={updateField} updateEpisodeUrl={updateEpisodeUrl} />
              )}
              
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={saveContent} 
                  disabled={saving}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? '💾 Guardando...' : '💾 Guardar'}
                </button>
                <button 
                  onClick={onCancel}
                  className="px-6 py-3 border rounded-lg hover:bg-gray-100"
                >
                  Cancelar
                </button>
              </div>
            </div>
          );
        };
        
        const MovieForm = ({ formData, updateField }) => (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Título</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Director</label>
                <input
                  type="text"
                  value={formData.director || ''}
                  onChange={(e) => updateField('director', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2">Sinopsis</label>
              <textarea
                value={formData.overview || ''}
                onChange={(e) => updateField('overview', e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Rating</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.rating || 0}
                  onChange={(e) => updateField('rating', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Duración (min)</label>
                <input
                  type="number"
                  value={formData.runtime || 0}
                  onChange={(e) => updateField('runtime', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Fecha Estreno</label>
                <input
                  type="date"
                  value={formData.release_date || ''}
                  onChange={(e) => updateField('release_date', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Reparto</label>
                <input
                  type="text"
                  value={formData.cast || ''}
                  onChange={(e) => updateField('cast', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Actor 1, Actor 2, Actor 3..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Géneros</label>
                <input
                  type="text"
                  value={formData.genres || ''}
                  onChange={(e) => updateField('genres', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Acción, Drama, Comedia..."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">URL Poster</label>
                <input
                  type="text"
                  value={formData.poster || ''}
                  onChange={(e) => updateField('poster', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">URL Backdrop</label>
                <input
                  type="text"
                  value={formData.backdrop || ''}
                  onChange={(e) => updateField('backdrop', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2 text-red-600">⚠️ URL del Video (requerido)</label>
              <input
                type="text"
                value={formData.url || ''}
                onChange={(e) => updateField('url', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="https://..."
              />
            </div>
          </div>
        );
        
        const SeriesForm = ({ formData, updateField, updateEpisodeUrl }) => {
          const [selectedSeason, setSelectedSeason] = useState(null);
          
          useEffect(() => {
            if (formData.seasons && !selectedSeason) {
              const firstSeason = Object.keys(formData.seasons)[0];
              if (firstSeason) setSelectedSeason(parseInt(firstSeason));
            }
          }, [formData.seasons]);
          
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Nombre de la Serie</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Reparto</label>
                  <input
                    type="text"
                    value={formData.cast || ''}
                    onChange={(e) => updateField('cast', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Sinopsis</label>
                <textarea
                  value={formData.overview || ''}
                  onChange={(e) => updateField('overview', e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.rating || 0}
                    onChange={(e) => updateField('rating', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Temporadas</label>
                  <input
                    type="number"
                    value={formData.number_of_seasons || 0}
                    readOnly
                    className="w-full px-3 py-2 border rounded bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Primer Episodio</label>
                  <input
                    type="date"
                    value={formData.first_air_date || ''}
                    onChange={(e) => updateField('first_air_date', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Último Episodio</label>
                  <input
                    type="date"
                    value={formData.last_air_date || ''}
                    onChange={(e) => updateField('last_air_date', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Géneros</label>
                  <input
                    type="text"
                    value={formData.genres || ''}
                    onChange={(e) => updateField('genres', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">URL Poster</label>
                  <input
                    type="text"
                    value={formData.poster || ''}
                    onChange={(e) => updateField('poster', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              
              <div className="border-t pt-4 mt-6">
                <h3 className="text-lg font-bold mb-4">📺 Temporadas y Episodios</h3>
                
                {formData.seasons && Object.keys(formData.seasons).length > 0 && (
                  <>
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                      {Object.keys(formData.seasons).map(seasonNum => (
                        <button
                          key={seasonNum}
                          onClick={() => setSelectedSeason(parseInt(seasonNum))}
                          className={\`px-4 py-2 rounded whitespace-nowrap \${
                            selectedSeason === parseInt(seasonNum)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300'
                          }\`}
                        >
                          Temporada {seasonNum} ({formData.seasons[seasonNum].episodes?.length || 0} eps)
                        </button>
                      ))}
                    </div>
                    
                    {selectedSeason && formData.seasons[selectedSeason] && (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {formData.seasons[selectedSeason].episodes.map((episode, idx) => (
                          <div key={idx} className="border rounded p-3 bg-gray-50">
                            <div className="flex gap-3">
                              {episode.still_path && (
                                <img 
                                  src={episode.still_path} 
                                  alt={episode.title}
                                  className="w-32 h-20 object-cover rounded"
                                />
                              )}
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">
                                  {selectedSeason}x{String(episode.episode_num).padStart(2, '0')} - {episode.title}
                                </h4>
                                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{episode.overview}</p>
                                <input
                                  type="text"
                                  placeholder="URL del episodio"
                                  value={episode.url || ''}
                                  onChange={(e) => updateEpisodeUrl(selectedSeason, idx, e.target.value)}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        };
        
        const ManageContent = ({ content, onEdit, onDelete, onRefresh }) => {
          const [filter, setFilter] = useState('all');
          
          return (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">🎬 Películas ({content.movies?.length || 0})</h2>
                  <button onClick={onRefresh} className="text-blue-600 hover:text-blue-700">
                    🔄 Recargar
                  </button>
                </div>
                <div className="space-y-3">
                  {content.movies?.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No hay películas agregadas</p>
                  )}
                  {content.movies?.map(movie => (
                    <div key={movie.stream_id} className="border rounded p-3 flex items-start gap-3">
                      <img 
                        src={movie.stream_icon} 
                        alt={movie.name}
                        className="w-16 h-24 object-cover rounded"
                        onError={(e) => e.target.src = 'https://via.placeholder.com/100x150?text=No+Image'}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{movie.name}</h3>
                        <p className="text-sm text-gray-600">⭐ {movie.rating || 'N/A'}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{movie.overview}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onEdit(movie)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => onDelete(movie, 'movies')}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">📺 Series ({content.series?.length || 0})</h2>
                <div className="space-y-3">
                  {content.series?.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No hay series agregadas</p>
                  )}
                  {content.series?.map(series => (
                    <div key={series.series_id} className="border rounded p-3 flex items-start gap-3">
                      <img 
                        src={series.cover} 
                        alt={series.name}
                        className="w-16 h-24 object-cover rounded"
                        onError={(e) => e.target.src = 'https://via.placeholder.com/100x150?text=No+Image'}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{series.name}</h3>
                        <p className="text-sm text-gray-600">⭐ {series.rating || 'N/A'}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{series.plot}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onEdit(series)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => onDelete(series, 'series')}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
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

// API para obtener contenido existente
app.get('/api/get-content', (req, res) => {
  res.json({
    movies: contentData.movies || [],
    series: contentData.series || []
  });
});

// API para guardar contenido (nuevo o editado)
app.post('/api/save-content', express.json(), async (req, res) => {
  try {
    const { type, isNew, data, originalId } = req.body;
    
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
    
    if (type === 'movies') {
      if (!currentData.movies) currentData.movies = [];
      
      const movieData = {
        stream_id: isNew ? (currentData.movies.length + 1) : originalId,
        num: isNew ? (currentData.movies.length + 1) : originalId,
        name: data.title,
        title: data.title,
        stream_type: "movie",
        stream_icon: data.poster,
        rating: data.rating?.toString() || "0",
        rating_5based: (data.rating / 2) || 0,
        added: Math.floor(Date.now() / 1000).toString(),
        category_id: "1",
        container_extension: data.url?.split('.').pop() || "mp4",
        custom_sid: "",
        direct_source: data.url,
        tmdb_id: data.tmdb_id,
        overview: data.overview,
        director: data.director,
        cast: data.cast,
        genres: data.genres,
        runtime: data.runtime,
        release_date: data.release_date,
        backdrop_path: data.backdrop
      };
      
      if (isNew) {
        currentData.movies.push(movieData);
      } else {
        const idx = currentData.movies.findIndex(m => m.stream_id == originalId);
        if (idx !== -1) {
          currentData.movies[idx] = movieData;
        }
      }
    } else {
      // Series
      if (!currentData.series) currentData.series = [];
      if (!currentData.seriesEpisodes) currentData.seriesEpisodes = {};
      
      const seriesId = isNew ? (Object.keys(currentData.seriesEpisodes).length + 1) : originalId;
      
      const seriesData = {
        series_id: seriesId,
        name: data.name,
        title: data.name,
        cover: data.poster,
        plot: data.overview || '',
        cast: data.cast || '',
        director: data.director || '',
        genre: data.genres || '',
        rating: data.rating?.toString() || "0",
        rating_5based: (data.rating / 2) || 0,
        category_id: "1",
        category_ids: [1],
        num: isNew ? (currentData.series.length + 1) : originalId,
        last_modified: Math.floor(Date.now() / 1000).toString(),
        tmdb_id: data.tmdb_id,
        backdrop_path: data.backdrop
      };
      
      if (isNew) {
        currentData.series.push(seriesData);
      } else {
        const idx = currentData.series.findIndex(s => s.series_id == originalId);
        if (idx !== -1) {
          currentData.series[idx] = seriesData;
        }
      }
      
      // Procesar episodios
      const seasons = [];
      const episodes = {};
      
      for (const seasonNum in data.seasons) {
        const season = data.seasons[seasonNum];
        
        seasons.push({
          air_date: data.first_air_date || "",
          episode_count: season.episodes.length,
          id: parseInt(seasonNum),
          name: season.name || "Temporada " + seasonNum,
          overview: "",
          season_number: parseInt(seasonNum)
        });
        
        episodes[seasonNum] = season.episodes.map((ep, idx) => {
          const episodeId = seriesId + "_" + seasonNum + "_" + ep.episode_num;
          return {
            id: episodeId,
            episode_num: ep.episode_num,
            title: ep.title,
            container_extension: ep.url?.split('.').pop() || "mp4",
            info: {
              name: ep.title,
              overview: ep.overview || '',
              still_path: ep.still_path || '',
              air_date: data.first_air_date || '',
              rating: data.rating || 0
            },
            direct_source: ep.url,
            added: Math.floor(Date.now() / 1000).toString()
          };
        });
      }
      
      currentData.seriesEpisodes[seriesId] = {
        seasons,
        episodes
      };
    }
    
    // Guardar en GitHub
    const commitMessage = isNew 
      ? \`Add \${type === 'movies' ? 'movie' : 'series'}: \${data.title || data.name}\`
      : \`Update \${type === 'movies' ? 'movie' : 'series'}: \${data.title || data.name}\`;
    
    const payload = {
      message: commitMessage,
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
    console.error('Error saving content:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para eliminar contenido
app.post('/api/delete-content', express.json(), async (req, res) => {
  try {
    const { type, id } = req.body;
    
    // Leer datos actuales de GitHub
    let currentData = { ...contentData };
    let sha = null;
    
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
    
    // Eliminar contenido
    if (type === 'movies') {
      currentData.movies = (currentData.movies || []).filter(m => m.stream_id != id);
    } else {
      currentData.series = (currentData.series || []).filter(s => s.series_id != id);
      if (currentData.seriesEpisodes) {
        delete currentData.seriesEpisodes[id];
      }
    }
    
    // Guardar en GitHub
    const payload = {
      message: \`Delete \${type}: ID \${id}\`,
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
