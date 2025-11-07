const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Configuración
const USERNAME = 'usuario';
const PASSWORD = 'password123';
const GITHUB_TOKEN = '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';
const GITHUB_USER = 'Demo-159';
const GITHUB_REPO = 'xtream-ui-server';
const DATA_FILE = 'data.json';

// APIs gratuitas para metadatos
const OMDB_API_KEY = '3e3e3e3e'; // Usa tu propia key de http://www.omdbapi.com/
const TMDB_API_KEY = ''; // Opcional: https://www.themoviedb.org/settings/api

let contentData = {
  movies: [],
  series: [],
  categories: [{ category_id: "1", category_name: "Películas", parent_id: 0 }],
  seriesCategories: [{ category_id: "1", category_name: "Series", parent_id: 0 }]
};

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ==================== GITHUB FUNCTIONS ====================
async function loadDataFromGitHub() {
  try {
    const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${DATA_FILE}`;
    const response = await axios.get(url, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
    });
    
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    contentData = JSON.parse(content);
    console.log('✅ Datos cargados desde GitHub');
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('📝 Creando archivo de datos inicial en GitHub...');
      await saveDataToGitHub();
    } else {
      console.log('⚠️ Usando datos por defecto');
    }
  }
}

async function saveDataToGitHub() {
  try {
    const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${DATA_FILE}`;
    let sha = null;
    
    try {
      const existing = await axios.get(url, {
        headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
      });
      sha = existing.data.sha;
    } catch (e) {}
    
    const content = Buffer.from(JSON.stringify(contentData, null, 2)).toString('base64');
    
    await axios.put(url, {
      message: `Update content data - ${new Date().toISOString()}`,
      content: content,
      sha: sha
    }, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
    });
    
    console.log('✅ Datos guardados en GitHub');
    return true;
  } catch (error) {
    console.error('❌ Error guardando en GitHub:', error.message);
    return false;
  }
}

// ==================== METADATA APIs ====================
async function searchOMDb(query, type = 'movie', year = null) {
  try {
    const searchUrl = `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}&type=${type}`;
    const searchRes = await axios.get(searchUrl);
    
    if (searchRes.data.Response === 'True' && searchRes.data.Search?.length > 0) {
      const results = [];
      for (let item of searchRes.data.Search.slice(0, 5)) {
        const detailUrl = `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${item.imdbID}&plot=full`;
        const detail = await axios.get(detailUrl);
        if (detail.data.Response === 'True') {
          results.push(detail.data);
        }
      }
      return results;
    }
  } catch (error) {
    console.error('Error OMDB:', error.message);
  }
  return [];
}

async function getOMDbById(imdbId) {
  try {
    const url = `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}&plot=full`;
    const response = await axios.get(url);
    if (response.data.Response === 'True') {
      return response.data;
    }
  } catch (error) {
    console.error('Error OMDB:', error.message);
  }
  return null;
}

// ==================== PANEL DE ADMINISTRACIÓN ====================
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
    .episode-item {
      background: white;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 10px;
      border: 1px solid #ddd;
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
      <button class="tab active" onclick="showTab('movies')">🎬 Películas</button>
      <button class="tab" onclick="showTab('series')">📺 Series</button>
      <button class="tab" onclick="showTab('list')">📋 Contenido Existente</button>
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
        
        <form id="movie-form">
          <div class="grid-2">
            <div class="form-group">
              <label>Título:</label>
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
              <input type="number" id="movie-rating" step="0.1" min="0" max="10">
            </div>
          </div>
          
          <div class="grid-2">
            <div class="form-group">
              <label>URL Poster:</label>
              <input type="url" id="movie-poster">
            </div>
            <div class="form-group">
              <label>URL Video:</label>
              <input type="url" id="movie-url" required>
            </div>
          </div>
          
          <div class="form-group">
            <label>IMDb ID:</label>
            <input type="text" id="movie-imdb" placeholder="tt1234567">
          </div>
          
          <button type="submit">💾 Guardar Película</button>
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
        
        <form id="series-form">
          <div class="grid-2">
            <div class="form-group">
              <label>Título:</label>
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
              <input type="number" id="series-rating" step="0.1" min="0" max="10">
            </div>
          </div>
          
          <div class="form-group">
            <label>URL Poster:</label>
            <input type="url" id="series-poster">
          </div>
          
          <button type="submit">💾 Crear Serie</button>
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
        
        <h3 style="margin-top: 30px;">🎬 Películas</h3>
        <div id="movies-list" class="content-list"></div>
        
        <h3 style="margin-top: 30px;">📺 Series</h3>
        <div id="series-list" class="content-list"></div>
      </div>
    </div>
  </div>

  <script>
    let currentSeriesId = null;
    let editingMovie = null;
    let editingSeries = null;
    
    function showTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
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
      if (!query) return;
      
      try {
        const res = await fetch(\`/api/search?query=\${encodeURIComponent(query)}&type=movie\`);
        const data = await res.json();
        
        const resultsDiv = document.getElementById('movie-search-results');
        resultsDiv.innerHTML = '';
        
        data.forEach(item => {
          const div = document.createElement('div');
          div.className = 'search-result';
          div.innerHTML = \`
            <img src="\${item.Poster !== 'N/A' ? item.Poster : 'https://via.placeholder.com/200x300?text=No+Poster'}" alt="\${item.Title}">
            <h4>\${item.Title} (\${item.Year})</h4>
            <p>\${item.Genre || 'N/A'}</p>
            <p>⭐ \${item.imdbRating || 'N/A'}</p>
          \`;
          div.onclick = () => fillMovieForm(item);
          resultsDiv.appendChild(div);
        });
      } catch (error) {
        showAlert('Error al buscar película', 'error');
      }
    }
    
    function fillMovieForm(data) {
      document.getElementById('movie-title').value = data.Title || '';
      document.getElementById('movie-year').value = data.Year || '';
      document.getElementById('movie-plot').value = data.Plot || '';
      document.getElementById('movie-director').value = data.Director || '';
      document.getElementById('movie-cast').value = data.Actors || '';
      document.getElementById('movie-genre').value = data.Genre || '';
      document.getElementById('movie-rating').value = data.imdbRating || '';
      document.getElementById('movie-poster').value = data.Poster !== 'N/A' ? data.Poster : '';
      document.getElementById('movie-imdb').value = data.imdbID || '';
    }
    
    async function searchSeries() {
      const query = document.getElementById('series-search').value.trim();
      if (!query) return;
      
      try {
        const res = await fetch(\`/api/search?query=\${encodeURIComponent(query)}&type=series\`);
        const data = await res.json();
        
        const resultsDiv = document.getElementById('series-search-results');
        resultsDiv.innerHTML = '';
        
        data.forEach(item => {
          const div = document.createElement('div');
          div.className = 'search-result';
          div.innerHTML = \`
            <img src="\${item.Poster !== 'N/A' ? item.Poster : 'https://via.placeholder.com/200x300?text=No+Poster'}" alt="\${item.Title}">
            <h4>\${item.Title} (\${item.Year})</h4>
            <p>\${item.Genre || 'N/A'}</p>
            <p>⭐ \${item.imdbRating || 'N/A'}</p>
          \`;
          div.onclick = () => fillSeriesForm(item);
          resultsDiv.appendChild(div);
        });
      } catch (error) {
        showAlert('Error al buscar serie', 'error');
      }
    }
    
    function fillSeriesForm(data) {
      document.getElementById('series-title').value = data.Title || '';
      document.getElementById('series-year').value = data.Year || '';
      document.getElementById('series-plot').value = data.Plot || '';
      document.getElementById('series-director').value = data.Director || '';
      document.getElementById('series-cast').value = data.Actors || '';
      document.getElementById('series-genre').value = data.Genre || '';
      document.getElementById('series-rating').value = data.imdbRating || '';
      document.getElementById('series-poster').value = data.Poster !== 'N/A' ? data.Poster : '';
    }
    
    document.getElementById('movie-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
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
      
      try {
        const res = await fetch('/api/movie', {
          method: editingMovie ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingMovie ? {...movieData, id: editingMovie} : movieData)
        });
        
        if (res.ok) {
          showAlert(editingMovie ? 'Película actualizada' : 'Película agregada correctamente');
          document.getElementById('movie-form').reset();
          document.getElementById('movie-search-results').innerHTML = '';
          editingMovie = null;
        } else {
          showAlert('Error al guardar película', 'error');
        }
      } catch (error) {
        showAlert('Error de conexión', 'error');
      }
    });
    
    document.getElementById('series-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
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
      
      try {
        const res = await fetch('/api/series', {
          method: editingSeries ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingSeries ? {...seriesData, id: editingSeries} : seriesData)
        });
        
        const data = await res.json();
        if (res.ok) {
          showAlert(editingSeries ? 'Serie actualizada' : 'Serie creada correctamente');
          currentSeriesId = data.series_id;
          document.getElementById('season-manager').style.display = 'block';
          loadSeasons(currentSeriesId);
          editingSeries = null;
        } else {
          showAlert('Error al guardar serie', 'error');
        }
      } catch (error) {
        showAlert('Error de conexión', 'error');
      }
    });
    
    async function loadSeasons(seriesId) {
      try {
        const res = await fetch(\`/api/series/\${seriesId}/seasons\`);
        const data = await res.json();
        
        const container = document.getElementById('seasons-container');
        container.innerHTML = '';
        
        data.seasons.forEach(season => {
          const seasonDiv = document.createElement('div');
          seasonDiv.innerHTML = \`
            <h4>Temporada \${season.season_number}</h4>
            <button onclick="addEpisode(\${seriesId}, \${season.season_number})">➕ Agregar Episodio</button>
            <div id="episodes-\${season.season_number}"></div>
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
        container.innerHTML = '';
        
        episodes.forEach(ep => {
          const epDiv = document.createElement('div');
          epDiv.className = 'episode-item';
          epDiv.innerHTML = \`
            <strong>E\${ep.episode_num}: \${ep.title}</strong>
            <p>\${ep.info.plot || 'Sin sinopsis'}</p>
            <small>URL: \${ep.direct_source}</small>
          \`;
          container.appendChild(epDiv);
        });
      } catch (error) {
        console.error('Error cargando episodios:', error);
      }
    }
    
    async function addSeason() {
      const seasonNum = prompt('Número de temporada:');
      if (!seasonNum || !currentSeriesId) return;
      
      try {
        await fetch(\`/api/series/\${currentSeriesId}/seasons\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ season_number: parseInt(seasonNum) })
        });
        loadSeasons(currentSeriesId);
        showAlert('Temporada agregada');
      } catch (error) {
        showAlert('Error al agregar temporada', 'error');
      }
    }
    
    async function addEpisode(seriesId, seasonNum) {
      const title = prompt('Título del episodio:');
      const url = prompt('URL del video:');
      if (!title || !url) return;
      
      try {
        await fetch(\`/api/series/\${seriesId}/seasons/\${seasonNum}/episodes\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, url, plot: '' })
        });
        loadEpisodes(seriesId, seasonNum);
        showAlert('Episodio agregado');
      } catch (error) {
        showAlert('Error al agregar episodio', 'error');
      }
    }
    
    async function loadContentList() {
      try {
        const res = await fetch('/api/content');
        const data = await res.json();
        
        // Películas
        const moviesList = document.getElementById('movies-list');
        moviesList.innerHTML = '';
        data.movies.forEach(movie => {
          const div = document.createElement('div');
          div.className = 'content-item';
          div.innerHTML = \`
            <img src="\${movie.stream_icon || 'https://via.placeholder.com/80x120?text=No+Poster'}" alt="\${movie.name}">
            <div class="content-item-info">
              <h3>\${movie.name}</h3>
              <p>⭐ \${movie.rating || 'N/A'} | 🎬 \${movie.genre