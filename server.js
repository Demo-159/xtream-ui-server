const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Configuración
const USERNAME = process.env.XTREAM_USER || 'usuario';
const PASSWORD = process.env.XTREAM_PASS || 'password123';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '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';
const GITHUB_USER = 'Demo-159';
const GITHUB_REPO = 'xtream-ui-server';
const DATA_FILE = 'data.json';
const OMDB_API_KEY = process.env.OMDB_KEY || '3e3e3e3e';

// Datos iniciales
let contentData = {
  movies: [],
  series: [],
  categories: [{ category_id: "1", category_name: "Películas", parent_id: 0 }],
  seriesCategories: [{ category_id: "1", category_name: "Series", parent_id: 0 }]
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// GitHub Functions
async function loadDataFromGitHub() {
  try {
    const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${DATA_FILE}`;
    const response = await axios.get(url, {
      headers: { 
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 10000
    });
    
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    contentData = JSON.parse(content);
    console.log('✅ Datos cargados desde GitHub');
    return true;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('📝 Archivo no existe, se creará al guardar datos');
    } else {
      console.log('⚠️ Error cargando desde GitHub:', error.message);
    }
    console.log('📦 Usando datos por defecto');
    return false;
  }
}

async function saveDataToGitHub() {
  try {
    const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${DATA_FILE}`;
    let sha = null;
    
    try {
      const existing = await axios.get(url, {
        headers: { 
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 10000
      });
      sha = existing.data.sha;
    } catch (e) {
      // Archivo no existe aún
    }
    
    const content = Buffer.from(JSON.stringify(contentData, null, 2)).toString('base64');
    
    await axios.put(url, {
      message: `Update content - ${new Date().toISOString()}`,
      content: content,
      sha: sha
    }, {
      headers: { 
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 15000
    });
    
    console.log('✅ Guardado en GitHub');
    return true;
  } catch (error) {
    console.error('❌ Error guardando en GitHub:', error.message);
    return false;
  }
}

// Traducir texto usando Google Translate API (gratis, sin key)
async function translateToSpanish(text) {
  if (!text || text === 'N/A') return text;
  
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(text)}`;
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data && response.data[0]) {
      return response.data[0].map(item => item[0]).join('');
    }
  } catch (error) {
    console.error('Error traduciendo:', error.message);
  }
  
  return text;
}

// OMDb API Functions
async function searchOMDb(query, type = 'movie') {
  try {
    if (!OMDB_API_KEY || OMDB_API_KEY === '3e3e3e3e') {
      return [];
    }
    
    const searchUrl = `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}&type=${type}`;
    const searchRes = await axios.get(searchUrl, { timeout: 8000 });
    
    if (searchRes.data.Response === 'True' && searchRes.data.Search?.length > 0) {
      const results = [];
      for (let item of searchRes.data.Search.slice(0, 5)) {
        const detailUrl = `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${item.imdbID}&plot=full`;
        const detail = await axios.get(detailUrl, { timeout: 8000 });
        if (detail.data.Response === 'True') {
          // Traducir sinopsis y género al español
          const plotES = await translateToSpanish(detail.data.Plot);
          const genreES = await translateToSpanish(detail.data.Genre);
          
          results.push({
            ...detail.data,
            Plot: plotES,
            PlotOriginal: detail.data.Plot,
            Genre: genreES,
            GenreOriginal: detail.data.Genre
          });
        }
      }
      return results;
    }
  } catch (error) {
    console.error('Error OMDb:', error.message);
  }
  return [];
}

// Panel de Administración
app.get('/admin', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Panel Xtream UI</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { 
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 15px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
    .tabs {
      display: flex;
      background: #f5f5f5;
      border-bottom: 2px solid #ddd;
    }
    .tab {
      flex: 1;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
      border: none;
      background: none;
      font-size: 16px;
    }
    .tab:hover { background: #e0e0e0; }
    .tab.active {
      background: white;
      border-bottom: 3px solid #667eea;
      color: #667eea;
    }
    .content { padding: 30px; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-weight: bold;
      margin-bottom: 8px;
      color: #333;
    }
    input, textarea, select {
      width: 100%;
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      transition: border 0.3s;
    }
    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: #667eea;
    }
    textarea { 
      min-height: 100px;
      resize: vertical;
      font-family: inherit;
    }
    
    .search-container {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .search-container input {
      flex: 1;
    }
    
    button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    button:active {
      transform: translateY(0);
    }
    button.secondary {
      background: #6c757d;
    }
    button.danger {
      background: #dc3545;
    }
    
    .search-results {
      margin-top: 20px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 15px;
    }
    .search-result {
      border: 2px solid #ddd;
      border-radius: 8px;
      padding: 10px;
      cursor: pointer;
      transition: all 0.3s;
      background: white;
    }
    .search-result:hover {
      border-color: #667eea;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      transform: translateY(-3px);
    }
    .search-result img {
      width: 100%;
      height: 250px;
      object-fit: cover;
      border-radius: 5px;
      margin-bottom: 10px;
    }
    .search-result h4 {
      font-size: 14px;
      margin-bottom: 5px;
      color: #333;
    }
    .search-result p {
      font-size: 12px;
      color: #666;
    }
    
    .content-list {
      margin-top: 30px;
    }
    .content-item {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 15px;
      border: 2px solid #ddd;
      border-radius: 8px;
      margin-bottom: 15px;
      background: #f9f9f9;
    }
    .content-item img {
      width: 80px;
      height: 120px;
      object-fit: cover;
      border-radius: 5px;
    }
    .content-item-info {
      flex: 1;
    }
    .content-item-info h3 {
      margin-bottom: 5px;
      color: #333;
    }
    .content-item-info p {
      color: #666;
      font-size: 14px;
    }
    .content-item-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .content-item-actions button {
      padding: 8px 15px;
      font-size: 14px;
    }
    
    .season-manager {
      margin-top: 20px;
      border: 2px solid #667eea;
      border-radius: 8px;
      padding: 20px;
      background: #f8f9ff;
    }
    .season-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .season-block {
      background: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
      border: 1px solid #ddd;
    }
    .episode-item {
      background: #f9f9f9;
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 10px;
      border: 1px solid #e0e0e0;
    }
    
    .alert {
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-weight: bold;
    }
    .alert-success {
      background: #d4edda;
      color: #155724;
      border: 2px solid #c3e6cb;
    }
    .alert-error {
      background: #f8d7da;
      color: #721c24;
      border: 2px solid #f5c6cb;
    }
    
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    
    @media (max-width: 768px) {
      .grid-2 { grid-template-columns: 1fr; }
      .search-results { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
      .content-item { flex-direction: column; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 Panel Xtream UI</h1>
      <p>Administra tu contenido VOD y Series</p>
    </div>
    
    <div class="tabs">
      <button class="tab active" onclick="showTab('movies', this)">🎬 Películas</button>
      <button class="tab" onclick="showTab('series', this)">📺 Series</button>
      <button class="tab" onclick="showTab('list', this)">📋 Contenido</button>
    </div>
    
    <div class="content">
      <div id="alert-container"></div>
      
      <!-- TAB PELÍCULAS -->
      <div id="movies" class="tab-content active">
        <h2>Agregar Película</h2>
        
        <div class="search-container">
          <input type="text" id="movie-search" placeholder="Buscar por título o IMDb ID (ej: tt1234567)">
          <button onclick="searchMovie()">🔍 Buscar</button>
        </div>
        
        <div id="movie-search-results" class="search-results"></div>
        
        <form id="movie-form" onsubmit="saveMovie(event)">
          <div class="grid-2">
            <div class="form-group">
              <label>Título *:</label>
              <input type="text" id="movie-title" required>
            </div>
            <div class="form-group">
              <label>Año:</label>
              <input type="text" id="movie-year">
            </div>
          </div>
          
          <div class="form-group">
            <label>Sinopsis:</label>
            <textarea id="movie-plot"></textarea>
          </div>
          
          <div class="grid-2">
            <div class="form-group">
              <label>Director:</label>
              <input type="text" id="movie-director">
            </div>
            <div class="form-group">
              <label>Reparto:</label>
              <input type="text" id="movie-cast">
            </div>
          </div>
          
          <div class="grid-2">
            <div class="form-group">
              <label>Género:</label>
              <input type="text" id="movie-genre">
            </div>
            <div class="form-group">
              <label>Calificación (0-10):</label>
              <input type="number" id="movie-rating" step="0.1" min="0" max="10" value="7.0">
            </div>
          </div>
          
          <div class="grid-2">
            <div class="form-group">
              <label>URL Poster:</label>
              <input type="url" id="movie-poster">
            </div>
            <div class="form-group">
              <label>URL Video *:</label>
              <input type="url" id="movie-url" required>
            </div>
          </div>
          
          <div class="form-group">
            <label>IMDb ID:</label>
            <input type="text" id="movie-imdb" placeholder="tt1234567">
          </div>
          
          <input type="hidden" id="movie-edit-id">
          <button type="submit">💾 Guardar Película</button>
          <button type="button" class="secondary" onclick="resetMovieForm()" style="margin-left: 10px;">🔄 Limpiar</button>
        </form>
      </div>
      
      <!-- TAB SERIES -->
      <div id="series" class="tab-content">
        <h2>Agregar Serie</h2>
        
        <div class="search-container">
          <input type="text" id="series-search" placeholder="Buscar serie por título o IMDb ID">
          <button onclick="searchSeries()">🔍 Buscar</button>
        </div>
        
        <div id="series-search-results" class="search-results"></div>
        
        <form id="series-form" onsubmit="saveSeries(event)">
          <div class="grid-2">
            <div class="form-group">
              <label>Título *:</label>
              <input type="text" id="series-title" required>
            </div>
            <div class="form-group">
              <label>Año:</label>
              <input type="text" id="series-year">
            </div>
          </div>
          
          <div class="form-group">
            <label>Sinopsis:</label>
            <textarea id="series-plot"></textarea>
          </div>
          
          <div class="grid-2">
            <div class="form-group">
              <label>Director/Creador:</label>
              <input type="text" id="series-director">
            </div>
            <div class="form-group">
              <label>Reparto:</label>
              <input type="text" id="series-cast">
            </div>
          </div>
          
          <div class="grid-2">
            <div class="form-group">
              <label>Género:</label>
              <input type="text" id="series-genre">
            </div>
            <div class="form-group">
              <label>Calificación (0-10):</label>
              <input type="number" id="series-rating" step="0.1" min="0" max="10" value="8.0">
            </div>
          </div>
          
          <div class="form-group">
            <label>URL Poster:</label>
            <input type="url" id="series-poster">
          </div>
          
          <input type="hidden" id="series-edit-id">
          <button type="submit">💾 Guardar Serie</button>
          <button type="button" class="secondary" onclick="resetSeriesForm()" style="margin-left: 10px;">🔄 Limpiar</button>
        </form>
        
        <div id="season-manager" style="display:none;" class="season-manager">
          <div class="season-header">
            <h3>Temporadas y Episodios</h3>
            <button type="button" onclick="addSeason()">➕ Nueva Temporada</button>
          </div>
          <div id="seasons-container"></div>
        </div>
      </div>
      
      <!-- TAB LISTA -->
      <div id="list" class="tab-content">
        <h2>Contenido Existente</h2>
        
        <h3 style="margin-top: 30px;">🎬 Películas (<span id="movie-count">0</span>)</h3>
        <div id="movies-list" class="content-list"></div>
        
        <h3 style="margin-top: 30px;">📺 Series (<span id="series-count">0</span>)</h3>
        <div id="series-list" class="content-list"></div>
      </div>
    </div>
  </div>

  <script>
    let currentSeriesId = null;
    
    function showTab(tab, element) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      element.classList.add('active');
      document.getElementById(tab).classList.add('active');
      
      if (tab === 'list') {
        loadContentList();
      }
    }
    
    function showAlert(message, type = 'success') {
      const container = document.getElementById('alert-container');
      container.innerHTML = \`<div class="alert alert-\${type}">\${message}</div>\`;
      setTimeout(() => container.innerHTML = '', 5000);
    }
    
    async function searchMovie() {
      const query = document.getElementById('movie-search').value.trim();
      if (!query) {
        showAlert('Escribe un título o ID de IMDb', 'error');
        return;
      }
      
      showAlert('Buscando...', 'success');
      
      try {
        const res = await fetch(\`/api/search?query=\${encodeURIComponent(query)}&type=movie\`);
        const data = await res.json();
        
        const resultsDiv = document.getElementById('movie-search-results');
        resultsDiv.innerHTML = '';
        
        if (data.length === 0) {
          resultsDiv.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">No se encontraron resultados. Verifica la API Key de OMDb.</p>';
          return;
        }
        
        data.forEach(item => {
          const div = document.createElement('div');
          div.className = 'search-result';
          div.innerHTML = \`
            <img src="\${item.Poster !== 'N/A' ? item.Poster : 'https://via.placeholder.com/200x300?text=Sin+Poster'}" alt="\${item.Title}">
            <h4>\${item.Title}</h4>
            <p>📅 \${item.Year}</p>
            <p>🎭 \${item.Genre || 'N/A'}</p>
            <p>⭐ \${item.imdbRating || 'N/A'}</p>
          \`;
          div.onclick = () => fillMovieForm(item);
          resultsDiv.appendChild(div);
        });
        
        showAlert(\`\${data.length} resultados encontrados\`, 'success');
      } catch (error) {
        showAlert('Error al buscar. Verifica tu conexión.', 'error');
      }
    }
    
    function fillMovieForm(data) {
      document.getElementById('movie-title').value = data.Title || '';
      document.getElementById('movie-year').value = data.Year || '';
      document.getElementById('movie-plot').value = data.Plot || '';
      document.getElementById('movie-director').value = data.Director || '';
      document.getElementById('movie-cast').value = data.Actors || '';
      document.getElementById('movie-genre').value = data.Genre || '';
      document.getElementById('movie-rating').value = data.imdbRating || '7.0';
      document.getElementById('movie-poster').value = data.Poster !== 'N/A' ? data.Poster : '';
      document.getElementById('movie-imdb').value = data.imdbID || '';
      
      showAlert('Formulario rellenado. Añade la URL del video y guarda.', 'success');
      document.getElementById('movie-url').focus();
    }
    
    async function searchSeries() {
      const query = document.getElementById('series-search').value.trim();
      if (!query) {
        showAlert('Escribe un título o ID de IMDb', 'error');
        return;
      }
      
      showAlert('Buscando...', 'success');
      
      try {
        const res = await fetch(\`/api/search?query=\${encodeURIComponent(query)}&type=series\`);
        const data = await res.json();
        
        const resultsDiv = document.getElementById('series-search-results');
        resultsDiv.innerHTML = '';
        
        if (data.length === 0) {
          resultsDiv.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">No se encontraron resultados. Verifica la API Key de OMDb.</p>';
          return;
        }
        
        data.forEach(item => {
          const div = document.createElement('div');
          div.className = 'search-result';
          div.innerHTML = \`
            <img src="\${item.Poster !== 'N/A' ? item.Poster : 'https://via.placeholder.com/200x300?text=Sin+Poster'}" alt="\${item.Title}">
            <h4>\${item.Title}</h4>
            <p>📅 \${item.Year}</p>
            <p>🎭 \${item.Genre || 'N/A'}</p>
            <p>⭐ \${item.imdbRating || 'N/A'}</p>
          \`;
          div.onclick = () => fillSeriesForm(item);
          resultsDiv.appendChild(div);
        });
        
        showAlert(\`\${data.length} resultados encontrados\`, 'success');
      } catch (error) {
        showAlert('Error al buscar. Verifica tu conexión.', 'error');
      }
    }
    
    function fillSeriesForm(data) {
      document.getElementById('series-title').value = data.Title || '';
      document.getElementById('series-year').value = data.Year?.split('–')[0] || '';
      document.getElementById('series-plot').value = data.Plot || '';
      document.getElementById('series-director').value = data.Director || '';
      document.getElementById('series-cast').value = data.Actors || '';
      document.getElementById('series-genre').value = data.Genre || '';
      document.getElementById('series-rating').value = data.imdbRating || '8.0';
      document.getElementById('series-poster').value = data.Poster !== 'N/A' ? data.Poster : '';
      
      showAlert('Formulario rellenado. Guarda la serie.', 'success');
    }
    
    async function saveMovie(e) {
      e.preventDefault();
      
      const editId = document.getElementById('movie-edit-id').value;
      const movieData = {
        name: document.getElementById('movie-title').value,
        year: document.getElementById('movie-year').value,
        plot: document.getElementById('movie-plot').value,
        director: document.getElementById('movie-director').value,
        cast: document.getElementById('movie-cast').value,
        genre: document.getElementById('movie-genre').value,
        rating: document.getElementById('movie-rating').value,
        poster: document.getElementById('movie-poster').value,
        url: document.getElementById('movie-url').value,
        imdb: document.getElementById('movie-imdb').value
      };
      
      if (editId) {
        movieData.id = editId;
      }
      
      try {
        const res = await fetch('/api/movie', {
          method: editId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(movieData)
        });
        
        if (res.ok) {
          showAlert(editId ? '✅ Película actualizada y guardada en GitHub' : '✅ Película agregada y guardada en GitHub', 'success');
          resetMovieForm();
          document.getElementById('movie-search-results').innerHTML = '';
        } else {
          const error = await res.json();
          showAlert('❌ Error: ' + (error.error || 'Error desconocido'), 'error');
        }
      } catch (error) {
        showAlert('❌ Error de conexión', 'error');
      }
    }
    
    async function saveSeries(e) {
      e.preventDefault();
      
      const editId = document.getElementById('series-edit-id').value;
      const seriesData = {
        name: document.getElementById('series-title').value,
        year: document.getElementById('series-year').value,
        plot: document.getElementById('series-plot').value,
        director: document.getElementById('series-director').value,
        cast: document.getElementById('series-cast').value,
        genre: document.getElementById('series-genre').value,
        rating: document.getElementById('series-rating').value,
        poster: document.getElementById('series-poster').value
      };
      
      if (editId) {
        seriesData.id = editId;
      }
      
      try {
        const res = await fetch('/api/series', {
          method: editId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(seriesData)
        });
        
        const data = await res.json();
        if (res.ok) {
          showAlert(editId ? '✅ Serie actualizada' : '✅ Serie creada. Ahora añade temporadas y episodios.', 'success');
          currentSeriesId = data.series_id || editId;
          document.getElementById('season-manager').style.display = 'block';
          loadSeasons(currentSeriesId);
        } else {
          showAlert('❌ Error: ' + (data.error || 'Error desconocido'), 'error');
        }
      } catch (error) {
        showAlert('❌ Error de conexión', 'error');
      }
    }
    
    function resetMovieForm() {
      document.getElementById('movie-form').reset();
      document.getElementById('movie-edit-id').value = '';
      document.getElementById('movie-rating').value = '7.0';
    }
    
    function resetSeriesForm() {
      document.getElementById('series-form').reset();
      document.getElementById('series-edit-id').value = '';
      document.getElementById('series-rating').value = '8.0';
      document.getElementById('season-manager').style.display = 'none';
      currentSeriesId = null;
    }
    
    async function loadSeasons(seriesId) {
      try {
        const res = await fetch(\`/api/series/\${seriesId}/seasons\`);
        const data = await res.json();
        
        const container = document.getElementById('seasons-container');
        container.innerHTML = '';
        
        if (!data.seasons || data.seasons.length === 0) {
          container.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">No hay temporadas. Añade una usando el botón de arriba.</p>';
          return;
        }
        
        data.seasons.forEach(season => {
          const seasonDiv = document.createElement('div');
          seasonDiv.className = 'season-block';
          seasonDiv.innerHTML = \`
            <h4>📺 Temporada \${season.season_number} - \${season.episode_count || 0} episodios</h4>
            <button onclick="addEpisode(\${seriesId}, \${season.season_number})">➕ Agregar Episodio</button>
            <div id="episodes-\${season.season_number}" style="margin-top: 15px;"></div>
          \`;
          container.appendChild(seasonDiv);
          
          loadEpisodes(seriesId, season.season_number);
        });
      } catch (error) {
        console.error('Error cargando temporadas:', error);
      }
    }
    
    async function loadEpisodes(seriesId, seasonNum) {
      try {
        const res = await fetch(\`/api/series/\${seriesId}/seasons/\${seasonNum}/episodes\`);
        const episodes = await res.json();
        
        const container = document.getElementById(\`episodes-\${seasonNum}\`);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (episodes.length === 0) {
          container.innerHTML = '<p style="color: #999; font-size: 13px; margin-top: 10px;">Sin episodios</p>';
          return;
        }
        
        episodes.forEach(ep => {
          const epDiv = document.createElement('div');
          epDiv.className = 'episode-item';
          epDiv.innerHTML = \`
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 10px;">
              <div style="flex: 1;">
                <strong>Episodio \${ep.episode_num}: \${ep.title}</strong>
                <p style="font-size: 12px; margin-top: 5px;">\${ep.info.plot || 'Sin sinopsis'}</p>
                <small style="color: #999; font-size: 11px;">🔗 \${ep.direct_source.substring(0, 60)}...</small>
              </div>
              <div style="display: flex; gap: 5px; flex-shrink: 0;">
                <button onclick="editEpisode(\${seriesId}, \${seasonNum}, '\${ep.id}')" style="padding: 5px 10px; font-size: 12px;">✏️</button>
                <button class="danger" onclick="deleteEpisode(\${seriesId}, \${seasonNum}, '\${ep.id}')" style="padding: 5px 10px; font-size: 12px;">🗑️</button>
              </div>
            </div>
          \`;
          container.appendChild(epDiv);
        });
      } catch (error) {
        console.error('Error cargando episodios:', error);
      }
    }
    
    async function addSeason() {
      if (!currentSeriesId) {
        showAlert('Primero guarda la serie', 'error');
        return;
      }
      
      const seasonNum = prompt('Número de temporada:');
      if (!seasonNum || isNaN(seasonNum)) {
        showAlert('Número inválido', 'error');
        return;
      }
      
      try {
        const res = await fetch(\`/api/series/\${currentSeriesId}/seasons\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ season_number: parseInt(seasonNum) })
        });
        
        if (res.ok) {
          showAlert('✅ Temporada agregada', 'success');
          loadSeasons(currentSeriesId);
        } else {
          showAlert('❌ Error al agregar temporada', 'error');
        }
      } catch (error) {
        showAlert('❌ Error de conexión', 'error');
      }
    }
    
    async function addEpisode(seriesId, seasonNum) {
      const title = prompt('Título del episodio:');
      if (!title) return;
      
      const url = prompt('URL del video:');
      if (!url) return;
      
      const plot = prompt('Sinopsis (opcional):') || '';
      
      try {
        const res = await fetch(\`/api/series/\${seriesId}/seasons/\${seasonNum}/episodes\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, url, plot })
        });
        
        if (res.ok) {
          showAlert('✅ Episodio agregado y guardado en GitHub', 'success');
          loadEpisodes(seriesId, seasonNum);
          loadSeasons(seriesId);
        } else {
          showAlert('❌ Error al agregar episodio', 'error');
        }
      } catch (error) {
        showAlert('❌ Error de conexión', 'error');
      }
    }
    
    async function editEpisode(seriesId, seasonNum, episodeId) {
      try {
        const res = await fetch(\`/api/series/\${seriesId}/seasons/\${seasonNum}/episodes\`);
        const episodes = await res.json();
        const episode = episodes.find(ep => ep.id === episodeId);
        
        if (!episode) {
          showAlert('❌ Episodio no encontrado', 'error');
          return;
        }
        
        const newTitle = prompt('Nuevo título del episodio:', episode.title);
        if (!newTitle) return;
        
        const newUrl = prompt('Nueva URL del video:', episode.direct_source);
        if (!newUrl) return;
        
        const newPlot = prompt('Nueva sinopsis (opcional):', episode.info.plot || '');
        
        const updateRes = await fetch(\`/api/series/\${seriesId}/seasons/\${seasonNum}/episodes/\${episodeId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: newTitle, 
            url: newUrl, 
            plot: newPlot || '' 
          })
        });
        
        if (updateRes.ok) {
          showAlert('✅ Episodio actualizado y guardado en GitHub', 'success');
          loadEpisodes(seriesId, seasonNum);
        } else {
          showAlert('❌ Error al actualizar episodio', 'error');
        }
      } catch (error) {
        showAlert('❌ Error de conexión', 'error');
      }
    }
    
    async function deleteEpisode(seriesId, seasonNum, episodeId) {
      if (!confirm('¿Eliminar este episodio? Esta acción no se puede deshacer.')) return;
      
      try {
        const res = await fetch(\`/api/series/\${seriesId}/seasons/\${seasonNum}/episodes/\${episodeId}\`, { 
          method: 'DELETE' 
        });
        
        if (res.ok) {
          showAlert('✅ Episodio eliminado y sincronizado con GitHub', 'success');
          loadEpisodes(seriesId, seasonNum);
          loadSeasons(seriesId);
        } else {
          showAlert('❌ Error al eliminar episodio', 'error');
        }
      } catch (error) {
        showAlert('❌ Error de conexión', 'error');
      }
    }
    
    async function loadContentList() {
      try {
        const res = await fetch('/api/content');
        const data = await res.json();
        
        document.getElementById('movie-count').textContent = data.movies.length;
        document.getElementById('series-count').textContent = data.series.length;
        
        // Películas
        const moviesList = document.getElementById('movies-list');
        moviesList.innerHTML = '';
        
        if (data.movies.length === 0) {
          moviesList.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">No hay películas. Ve a la pestaña "🎬 Películas" para agregar.</p>';
        } else {
          data.movies.forEach(movie => {
            const div = document.createElement('div');
            div.className = 'content-item';
            div.innerHTML = \`
              <img src="\${movie.stream_icon || 'https://via.placeholder.com/80x120?text=Sin+Poster'}" alt="\${movie.name}">
              <div class="content-item-info">
                <h3>\${movie.name}</h3>
                <p>⭐ \${movie.rating || 'N/A'} | 🎭 \${movie.genre || 'N/A'}</p>
                <p style="font-size: 12px; color: #999;">\${movie.plot ? movie.plot.substring(0, 100) + '...' : 'Sin sinopsis'}</p>
              </div>
              <div class="content-item-actions">
                <button onclick="editMovie(\${movie.stream_id})">✏️ Editar</button>
                <button class="danger" onclick="deleteMovie(\${movie.stream_id})">🗑️</button>
              </div>
            \`;
            moviesList.appendChild(div);
          });
        }
        
        // Series
        const seriesList = document.getElementById('series-list');
        seriesList.innerHTML = '';
        
        if (data.series.length === 0) {
          seriesList.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">No hay series. Ve a la pestaña "📺 Series" para agregar.</p>';
        } else {
          data.series.forEach(series => {
            const totalEpisodes = series.seasons ? series.seasons.reduce((acc, s) => acc + (s.episode_count || 0), 0) : 0;
            const div = document.createElement('div');
            div.className = 'content-item';
            div.innerHTML = \`
              <img src="\${series.cover || 'https://via.placeholder.com/80x120?text=Sin+Poster'}" alt="\${series.name}">
              <div class="content-item-info">
                <h3>\${series.name}</h3>
                <p>⭐ \${series.rating || 'N/A'} | 🎭 \${series.genre || 'N/A'}</p>
                <p style="font-size: 12px; color: #999;">📺 \${series.seasons?.length || 0} temporadas | 🎬 \${totalEpisodes} episodios</p>
              </div>
              <div class="content-item-actions">
                <button onclick="editSeries(\${series.series_id})">✏️ Editar</button>
                <button onclick="manageSeries(\${series.series_id})">📋 Episodios</button>
                <button class="danger" onclick="deleteSeries(\${series.series_id})">🗑️</button>
              </div>
            \`;
            seriesList.appendChild(div);
          });
        }
      } catch (error) {
        showAlert('❌ Error cargando contenido', 'error');
      }
    }
    
    async function editMovie(id) {
      try {
        const res = await fetch(\`/api/movie/\${id}\`);
        const movie = await res.json();
        
        document.getElementById('movie-edit-id').value = id;
        document.getElementById('movie-title').value = movie.name?.replace(/\s*\(\d{4}\)$/, '') || '';
        document.getElementById('movie-year').value = movie.year || '';
        document.getElementById('movie-plot').value = movie.plot || '';
        document.getElementById('movie-director').value = movie.director || '';
        document.getElementById('movie-cast').value = movie.cast || '';
        document.getElementById('movie-genre').value = movie.genre || '';
        document.getElementById('movie-rating').value = movie.rating || '7.0';
        document.getElementById('movie-poster').value = movie.stream_icon || '';
        document.getElementById('movie-url').value = movie.direct_source || '';
        document.getElementById('movie-imdb').value = movie.tmdb_id || '';
        
        document.querySelectorAll('.tab')[0].click();
        showAlert('✏️ Editando película. Modifica y guarda.', 'success');
      } catch (error) {
        showAlert('❌ Error cargando película', 'error');
      }
    }
    
    async function deleteMovie(id) {
      if (!confirm('¿Eliminar esta película? Esta acción no se puede deshacer.')) return;
      
      try {
        const res = await fetch(\`/api/movie/\${id}\`, { method: 'DELETE' });
        if (res.ok) {
          showAlert('✅ Película eliminada y sincronizada con GitHub', 'success');
          loadContentList();
        } else {
          showAlert('❌ Error al eliminar', 'error');
        }
      } catch (error) {
        showAlert('❌ Error de conexión', 'error');
      }
    }
    
    async function editSeries(id) {
      try {
        const res = await fetch(\`/api/series/\${id}\`);
        const series = await res.json();
        
        document.getElementById('series-edit-id').value = id;
        document.getElementById('series-title').value = series.name || '';
        document.getElementById('series-year').value = series.releaseDate?.split('-')[0] || '';
        document.getElementById('series-plot').value = series.plot || '';
        document.getElementById('series-director').value = series.director || '';
        document.getElementById('series-cast').value = series.cast || '';
        document.getElementById('series-genre').value = series.genre || '';
        document.getElementById('series-rating').value = series.rating || '8.0';
        document.getElementById('series-poster').value = series.cover || '';
        
        currentSeriesId = id;
        document.getElementById('season-manager').style.display = 'block';
        loadSeasons(id);
        
        document.querySelectorAll('.tab')[1].click();
        showAlert('✏️ Editando serie. Modifica y guarda.', 'success');
      } catch (error) {
        showAlert('❌ Error cargando serie', 'error');
      }
    }
    
    async function manageSeries(id) {
      currentSeriesId = id;
      document.getElementById('series-edit-id').value = id;
      document.getElementById('season-manager').style.display = 'block';
      loadSeasons(id);
      document.querySelectorAll('.tab')[1].click();
      showAlert('Gestiona las temporadas y episodios de la serie', 'success');
    }
    
    async function deleteSeries(id) {
      if (!confirm('¿Eliminar esta serie y todos sus episodios? Esta acción no se puede deshacer.')) return;
      
      try {
        const res = await fetch(\`/api/series/\${id}\`, { method: 'DELETE' });
        if (res.ok) {
          showAlert('✅ Serie eliminada y sincronizada con GitHub', 'success');
          loadContentList();
        } else {
          showAlert('❌ Error al eliminar', 'error');
        }
      } catch (error) {
        showAlert('❌ Error de conexión', 'error');
      }
    }
    
    // Cargar contenido al abrir la página
    if (window.location.hash === '#list') {
      document.querySelectorAll('.tab')[2].click();
    }
  </script>
</body>
</html>`);
});

// API Endpoints
app.get('/api/search', async (req, res) => {
  const { quer