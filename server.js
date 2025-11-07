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
const OMDB_API_KEY = 'trilogy'; // API Key gratuita de OMDb

// Base de datos en memoria (se carga desde GitHub)
let movies = [];
let series = [];
let seriesEpisodes = {};

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ============ FUNCIONES GITHUB ============
async function getGitHubFile(path) {
  try {
    const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`;
    const response = await axios.get(url, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
    });
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    return { content: JSON.parse(content), sha: response.data.sha };
  } catch (error) {
    if (error.response?.status === 404) {
      return { content: null, sha: null };
    }
    throw error;
  }
}

async function updateGitHubFile(path, content, sha) {
  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`;
  const encodedContent = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');
  
  await axios.put(url, {
    message: `Update ${path}`,
    content: encodedContent,
    sha: sha
  }, {
    headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
  });
}

async function loadData() {
  try {
    const moviesData = await getGitHubFile('data/movies.json');
    const seriesData = await getGitHubFile('data/series.json');
    const episodesData = await getGitHubFile('data/episodes.json');
    
    movies = moviesData.content || [];
    series = seriesData.content || [];
    seriesEpisodes = episodesData.content || {};
    
    console.log('✅ Datos cargados desde GitHub');
  } catch (error) {
    console.log('⚠️ Error cargando datos, usando arrays vacíos:', error.message);
  }
}

async function saveData() {
  try {
    const moviesData = await getGitHubFile('data/movies.json');
    const seriesData = await getGitHubFile('data/series.json');
    const episodesData = await getGitHubFile('data/episodes.json');
    
    await updateGitHubFile('data/movies.json', movies, moviesData.sha);
    await updateGitHubFile('data/series.json', series, seriesData.sha);
    await updateGitHubFile('data/episodes.json', seriesEpisodes, episodesData.sha);
    
    console.log('✅ Datos guardados en GitHub');
  } catch (error) {
    console.error('❌ Error guardando datos:', error.message);
    throw error;
  }
}

// ============ API OMDB ============
async function searchOMDB(title) {
  try {
    const response = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(title)}`);
    return response.data.Search || [];
  } catch (error) {
    console.error('Error buscando en OMDb:', error.message);
    return [];
  }
}

async function getOMDBDetails(imdbId) {
  try {
    const response = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}&plot=full`);
    return response.data;
  } catch (error) {
    console.error('Error obteniendo detalles de OMDb:', error.message);
    return null;
  }
}

// ============ AUTENTICACIÓN ============
function authenticate(req, res, next) {
  const { username, password } = req.query;
  if (username === USERNAME && password === PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
}

// ============ PANEL DE ADMINISTRACIÓN ============
app.get('/admin', (req, res) => {
  res.send(`
<!DOCTYPE html>
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
    .container { max-width: 1400px; margin: 0 auto; }
    .header {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      margin-bottom: 30px;
      text-align: center;
    }
    .header h1 { color: #667eea; font-size: 2.5em; margin-bottom: 10px; }
    .header p { color: #666; font-size: 1.1em; }
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .tab {
      background: white;
      border: none;
      padding: 15px 30px;
      border-radius: 10px;
      font-size: 1.1em;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .tab:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0,0,0,0.15); }
    .tab.active { background: #667eea; color: white; }
    .content {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .section { display: none; }
    .section.active { display: block; }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }
    .form-group input, .form-group textarea, .form-group select {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1em;
      transition: border 0.3s;
    }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
      outline: none;
      border-color: #667eea;
    }
    .form-group textarea { min-height: 100px; resize: vertical; }
    .btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 8px;
      font-size: 1.1em;
      cursor: pointer;
      transition: all 0.3s;
      margin-right: 10px;
    }
    .btn:hover { background: #5568d3; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
    .btn-secondary { background: #6c757d; }
    .btn-secondary:hover { background: #5a6268; }
    .btn-danger { background: #dc3545; }
    .btn-danger:hover { background: #c82333; }
    .search-results {
      margin-top: 20px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 15px;
    }
    .search-item {
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      padding: 15px;
      cursor: pointer;
      transition: all 0.3s;
      text-align: center;
    }
    .search-item:hover { border-color: #667eea; transform: scale(1.05); }
    .search-item img { width: 100%; height: 250px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; }
    .search-item h4 { font-size: 0.95em; margin-bottom: 5px; }
    .search-item p { font-size: 0.85em; color: #666; }
    .items-list {
      margin-top: 30px;
    }
    .item {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.3s;
    }
    .item:hover { box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    .item-info { flex: 1; }
    .item-info h3 { color: #667eea; margin-bottom: 5px; }
    .item-info p { color: #666; font-size: 0.9em; }
    .item-actions { display: flex; gap: 10px; }
    .loading {
      display: none;
      text-align: center;
      padding: 20px;
      color: #667eea;
      font-size: 1.2em;
    }
    .loading.show { display: block; }
    .episode-form {
      background: #f0f0f0;
      padding: 20px;
      border-radius: 10px;
      margin-top: 20px;
    }
    .season-selector {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .season-btn {
      padding: 10px 20px;
      background: #e0e0e0;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
    }
    .season-btn.active { background: #667eea; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 Panel Xtream UI</h1>
      <p>Gestión de Películas y Series con GitHub + OMDb</p>
    </div>

    <div class="tabs">
      <button class="tab active" onclick="showTab('movies')">🎬 Películas</button>
      <button class="tab" onclick="showTab('series')">📺 Series</button>
    </div>

    <div class="content">
      <!-- PELÍCULAS -->
      <div id="movies" class="section active">
        <h2>Gestión de Películas</h2>
        
        <div class="form-group">
          <label>🔍 Buscar película (título o ID IMDb):</label>
          <input type="text" id="movieSearch" placeholder="Ej: Shrek o tt0126029">
          <button class="btn" onclick="searchMovie()">Buscar</button>
        </div>

        <div class="loading" id="movieLoading">Buscando...</div>
        <div class="search-results" id="movieResults"></div>

        <div id="movieForm" style="display: none;">
          <h3>Información de la Película</h3>
          <input type="hidden" id="movieEditId">
          <div class="form-group">
            <label>Título:</label>
            <input type="text" id="movieTitle">
          </div>
          <div class="form-group">
            <label>Año:</label>
            <input type="text" id="movieYear">
          </div>
          <div class="form-group">
            <label>ID IMDb:</label>
            <input type="text" id="movieImdb">
          </div>
          <div class="form-group">
            <label>Póster (URL):</label>
            <input type="text" id="moviePoster">
          </div>
          <div class="form-group">
            <label>Sinopsis:</label>
            <textarea id="moviePlot"></textarea>
          </div>
          <div class="form-group">
            <label>Director:</label>
            <input type="text" id="movieDirector">
          </div>
          <div class="form-group">
            <label>Actores:</label>
            <input type="text" id="movieActors">
          </div>
          <div class="form-group">
            <label>Género:</label>
            <input type="text" id="movieGenre">
          </div>
          <div class="form-group">
            <label>Rating IMDb:</label>
            <input type="text" id="movieRating">
          </div>
          <div class="form-group">
            <label>Duración (minutos):</label>
            <input type="number" id="movieDuration">
          </div>
          <div class="form-group">
            <label>URL del video (Archive.org):</label>
            <input type="text" id="movieSource" placeholder="https://archive.org/download/...">
          </div>
          <button class="btn" onclick="saveMovie()">💾 Guardar Película</button>
          <button class="btn btn-secondary" onclick="cancelMovie()">❌ Cancelar</button>
        </div>

        <div class="items-list" id="moviesList"></div>
      </div>

      <!-- SERIES -->
      <div id="series" class="section">
        <h2>Gestión de Series</h2>
        
        <div class="form-group">
          <label>🔍 Buscar serie (título o ID IMDb):</label>
          <input type="text" id="seriesSearch" placeholder="Ej: Breaking Bad o tt0903747">
          <button class="btn" onclick="searchSeries()">Buscar</button>
        </div>

        <div class="loading" id="seriesLoading">Buscando...</div>
        <div class="search-results" id="seriesResults"></div>

        <div id="seriesForm" style="display: none;">
          <h3>Información de la Serie</h3>
          <input type="hidden" id="seriesEditId">
          <div class="form-group">
            <label>Título:</label>
            <input type="text" id="seriesTitle">
          </div>
          <div class="form-group">
            <label>Año:</label>
            <input type="text" id="seriesYear">
          </div>
          <div class="form-group">
            <label>ID IMDb:</label>
            <input type="text" id="seriesImdb">
          </div>
          <div class="form-group">
            <label>Póster (URL):</label>
            <input type="text" id="seriesPoster">
          </div>
          <div class="form-group">
            <label>Sinopsis:</label>
            <textarea id="seriesPlot"></textarea>
          </div>
          <div class="form-group">
            <label>Director/Creador:</label>
            <input type="text" id="seriesDirector">
          </div>
          <div class="form-group">
            <label>Actores:</label>
            <input type="text" id="seriesActors">
          </div>
          <div class="form-group">
            <label>Género:</label>
            <input type="text" id="seriesGenre">
          </div>
          <div class="form-group">
            <label>Rating IMDb:</label>
            <input type="text" id="seriesRating">
          </div>
          <button class="btn" onclick="saveSeries()">💾 Guardar Serie</button>
          <button class="btn btn-secondary" onclick="cancelSeries()">❌ Cancelar</button>
        </div>

        <div class="items-list" id="seriesList"></div>

        <!-- Gestión de Episodios -->
        <div id="episodesSection" style="display: none;">
          <div class="episode-form">
            <h3>📝 Gestión de Episodios - <span id="currentSeriesName"></span></h3>
            <input type="hidden" id="episodeSeriesId">
            
            <div class="form-group">
              <label>Temporada:</label>
              <select id="episodeSeason" onchange="loadEpisodes()">
                <option value="1">Temporada 1</option>
                <option value="2">Temporada 2</option>
                <option value="3">Temporada 3</option>
                <option value="4">Temporada 4</option>
                <option value="5">Temporada 5</option>
              </select>
            </div>

            <div class="form-group">
              <label>Número de Episodio:</label>
              <input type="number" id="episodeNumber" min="1" value="1">
            </div>

            <div class="form-group">
              <label>Título del Episodio:</label>
              <input type="text" id="episodeTitle">
            </div>

            <div class="form-group">
              <label>Sinopsis:</label>
              <textarea id="episodePlot"></textarea>
            </div>

            <div class="form-group">
              <label>Duración (minutos):</label>
              <input type="number" id="episodeDuration" value="45">
            </div>

            <div class="form-group">
              <label>URL del video (Archive.org):</label>
              <input type="text" id="episodeSource" placeholder="https://archive.org/download/...">
            </div>

            <button class="btn" onclick="saveEpisode()">💾 Añadir Episodio</button>
            <button class="btn btn-secondary" onclick="closeEpisodes()">❌ Cerrar</button>

            <div id="episodesList" style="margin-top: 20px;"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    let moviesData = [];
    let seriesData = [];
    let episodesData = {};

    // Cargar datos iniciales
    async function loadInitialData() {
      const response = await fetch('/api/data');
      const data = await response.json();
      moviesData = data.movies;
      seriesData = data.series;
      episodesData = data.episodes;
      renderMovies();
      renderSeries();
    }

    function showTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById(tab).classList.add('active');
    }

    // ===== PELÍCULAS =====
    async function searchMovie() {
      const query = document.getElementById('movieSearch').value.trim();
      if (!query) return alert('Ingresa un título o ID IMDb');

      document.getElementById('movieLoading').classList.add('show');
      document.getElementById('movieResults').innerHTML = '';

      const response = await fetch(\`/api/search?type=movie&query=\${encodeURIComponent(query)}\`);
      const results = await response.json();

      document.getElementById('movieLoading').classList.remove('show');

      if (results.length === 0) {
        document.getElementById('movieResults').innerHTML = '<p>No se encontraron resultados</p>';
        return;
      }

      document.getElementById('movieResults').innerHTML = results.map(movie => \`
        <div class="search-item" onclick='selectMovie(\${JSON.stringify(movie).replace(/'/g, "&apos;")})'>
          <img src="\${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/200x300?text=Sin+Poster'}" alt="\${movie.Title}">
          <h4>\${movie.Title}</h4>
          <p>\${movie.Year} • \${movie.Type}</p>
        </div>
      \`).join('');
    }

    async function selectMovie(movie) {
      const response = await fetch(\`/api/details?imdbId=\${movie.imdbID}\`);
      const details = await response.json();

      document.getElementById('movieEditId').value = '';
      document.getElementById('movieTitle').value = details.Title || '';
      document.getElementById('movieYear').value = details.Year || '';
      document.getElementById('movieImdb').value = details.imdbID || '';
      document.getElementById('moviePoster').value = details.Poster !== 'N/A' ? details.Poster : '';
      document.getElementById('moviePlot').value = details.Plot || '';
      document.getElementById('movieDirector').value = details.Director || '';
      document.getElementById('movieActors').value = details.Actors || '';
      document.getElementById('movieGenre').value = details.Genre || '';
      document.getElementById('movieRating').value = details.imdbRating || '';
      document.getElementById('movieDuration').value = details.Runtime ? parseInt(details.Runtime) : '';
      document.getElementById('movieSource').value = '';

      document.getElementById('movieForm').style.display = 'block';
      document.getElementById('movieResults').innerHTML = '';
    }

    async function saveMovie() {
      const id = document.getElementById('movieEditId').value;
      const movie = {
        stream_id: id || Date.now(),
        name: document.getElementById('movieTitle').value,
        title: document.getElementById('movieTitle').value,
        stream_type: 'movie',
        stream_icon: document.getElementById('moviePoster').value,
        rating: document.getElementById('movieRating').value,
        rating_5based: parseFloat(document.getElementById('movieRating').value) / 2,
        added: Math.floor(Date.now() / 1000).toString(),
        category_id: '1',
        container_extension: 'mp4',
        direct_source: document.getElementById('movieSource').value,
        year: document.getElementById('movieYear').value,
        imdb_id: document.getElementById('movieImdb').value,
        plot: document.getElementById('moviePlot').value,
        director: document.getElementById('movieDirector').value,
        actors: document.getElementById('movieActors').value,
        genre: document.getElementById('movieGenre').value,
        duration: parseInt(document.getElementById('movieDuration').value) * 60
      };

      const response = await fetch('/api/movies', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movie)
      });

      if (response.ok) {
        alert('✅ Película guardada correctamente');
        cancelMovie();
        loadInitialData();
      } else {
        alert('❌ Error al guardar la película');
      }
    }

    function cancelMovie() {
      document.getElementById('movieForm').style.display = 'none';
      document.getElementById('movieSearch').value = '';
      document.getElementById('movieResults').innerHTML = '';
    }

    function editMovie(id) {
      const movie = moviesData.find(m => m.stream_id == id);
      if (!movie) return;

      document.getElementById('movieEditId').value = movie.stream_id;
      document.getElementById('movieTitle').value = movie.name;
      document.getElementById('movieYear').value = movie.year || '';
      document.getElementById('movieImdb').value = movie.imdb_id || '';
      document.getElementById('moviePoster').value = movie.stream_icon;
      document.getElementById('moviePlot').value = movie.plot || '';
      document.getElementById('movieDirector').value = movie.director || '';
      document.getElementById('movieActors').value = movie.actors || '';
      document.getElementById('movieGenre').value = movie.genre || '';
      document.getElementById('movieRating').value = movie.rating;
      document.getElementById('movieDuration').value = movie.duration ? movie.duration / 60 : '';
      document.getElementById('movieSource').value = movie.direct_source;

      document.getElementById('movieForm').style.display = 'block';
    }

    async function deleteMovie(id) {
      if (!confirm('¿Seguro que quieres eliminar esta película?')) return;

      const response = await fetch(\`/api/movies/\${id}\`, { method: 'DELETE' });
      if (response.ok) {
        alert('✅ Película eliminada');
        loadInitialData();
      }
    }

    function renderMovies() {
      const html = moviesData.map(movie => \`
        <div class="item">
          <div class="item-info">
            <h3>\${movie.name}</h3>
            <p>⭐ \${movie.rating} | 📅 \${movie.year || 'N/A'}</p>
          </div>
          <div class="item-actions">
            <button class="btn" onclick="editMovie(\${movie.stream_id})">✏️ Editar</button>
            <button class="btn btn-danger" onclick="deleteMovie(\${movie.stream_id})">🗑️ Eliminar</button>
          </div>
        </div>
      \`).join('');
      document.getElementById('moviesList').innerHTML = html || '<p>No hay películas agregadas</p>';
    }

    // ===== SERIES =====
    async function searchSeries() {
      const query = document.getElementById('seriesSearch').value.trim();
      if (!query) return alert('Ingresa un título o ID IMDb');

      document.getElementById('seriesLoading').classList.add('show');
      document.getElementById('seriesResults').innerHTML = '';

      const response = await fetch(\`/api/search?type=series&query=\${encodeURIComponent(query)}\`);
      const results = await response.json();

      document.getElementById('seriesLoading').classList.remove('show');

      if (results.length === 0) {
        document.getElementById('seriesResults').innerHTML = '<p>No se encontraron resultados</p>';
        return;
      }

      document.getElementById('seriesResults').innerHTML = results.map(series => \`
        <div class="search-item" onclick='selectSeries(\${JSON.stringify(series).replace(/'/g, "&apos;")})'>
          <img src="\${series.Poster !== 'N/A' ? series.Poster : 'https://via.placeholder.com/200x300?text=Sin+Poster'}" alt="\${series.Title}">
          <h4>\${series.Title}</h4>
          <p>\${series.Year} • \${series.Type}</p>
        </div>
      \`).join('');
    }

    async function selectSeries(series) {
      const response = await fetch(\`/api/details?imdbId=\${series.imdbID}\`);
      const details = await response.json();

      document.getElementById('seriesEditId').value = '';
      document.getElementById('seriesTitle').value = details.Title || '';
      document.getElementById('seriesYear').value = details.Year || '';
      document.getElementById('seriesImdb').value = details.imdbID || '';
      document.getElementById('seriesPoster').value = details.Poster !== 'N/A' ? details.Poster : '';
      document.getElementById('seriesPlot').value = details.Plot || '';
      document.getElementById('seriesDirector').value = details.Director || '';
      document.getElementById('seriesActors').value = details.Actors || '';
      document.getElementById('seriesGenre').value = details.Genre || '';
      document.getElementById('seriesRating').value = details.imdbRating || '';

      document.getElementById('seriesForm').style.display = 'block';
      document.getElementById('seriesResults').innerHTML = '';
    }

    async function saveSeries() {
      const id = document.getElementById('seriesEditId').value;
      const series = {
        series_id: id || Date.now(),
        name: document.getElementById('seriesTitle').value,
        title: document.getElementById('seriesTitle').value,
        cover: document.getElementById('seriesPoster').value,
        plot: document.getElementById('seriesPlot').value,
        cast: document.getElementById('seriesActors').value,
        director: document.getElementById('seriesDirector').value,
        genre: document.getElementById('seriesGenre').value,
        releaseDate: document.getElementById('seriesYear').value,
        rating: document.getElementById('seriesRating').value,
        rating_5based: parseFloat(document.getElementById('seriesRating').value) / 2,
        last_modified: Math.floor(Date.now() / 1000).toString(),
        category_id: '1',
        category_ids: [1],
        imdb_id: document.getElementById('seriesImdb').value,
        backdrop_path: [document.getElementById('seriesPoster').value],
        episode_run_time: '45'
      };

      const response = await fetch('/api/series', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(series)
      });

      if (response.ok) {
        alert('✅ Serie guardada correctamente');
        cancelSeries();
        loadInitialData();
      } else {
        alert('❌ Error al guardar la serie');
      }
    }

    function cancelSeries() {
      document.getElementById('seriesForm').style.display = 'none';
      document.getElementById('seriesSearch').value = '';
      document.getElementById('seriesResults').innerHTML = '';
    }

    function editSeries(id) {
      const series = seriesData.find(s => s.series_id == id);
      if (!series) return;

      document.getElementById('seriesEditId').value = series.series_id;
      document.getElementById('seriesTitle').value = series.name;
      document.getElementById('seriesYear').value = series.releaseDate || '';
      document.getElementById('seriesImdb').value = series.imdb_id || '';
      document.getElementById('seriesPoster').value = series.cover;
      document.getElementById('seriesPlot').value = series.plot || '';
      document.getElementById('seriesDirector').value = series.director || '';
      document.getElementById('seriesActors').value = series.cast || '';
      document.getElementById('seriesGenre').value = series.genre || '';
      document.getElementById('seriesRating').value = series.rating;

      document.getElementById('seriesForm').style.display = 'block';
    }

    async function deleteSeries(id) {
      if (!confirm('¿Seguro que quieres eliminar esta serie y todos sus episodios?')) return;

      const response = await fetch(\`/api/series/\${id}\`, { method: 'DELETE' });
      if (response.ok) {
        alert('✅ Serie eliminada');
        loadInitialData();
      }
    }

    function manageEpisodes(id) {
      const series = seriesData.find(s => s.series_id == id);
      if (!series) return;

      document.getElementById('episodeSeriesId').value = id;
      document.getElementById('currentSeriesName').textContent = series.name;
      document.getElementById('episodesSection').style.display = 'block';
      loadEpisodes();
      
      window.scrollTo({ top: document.getElementById('episodesSection').offsetTop, behavior: 'smooth' });
    }

    function closeEpisodes() {
      document.getElementById('episodesSection').style.display = 'none';
    }

    async function loadEpisodes() {
      const seriesId = document.getElementById('episodeSeriesId').value;
      const season = document.getElementById('episodeSeason').value;

      const episodes = episodesData[seriesId]?.episodes?.[season] || [];
      
      const html = episodes.map((ep, idx) => \`
        <div class="item">
          <div class="item-info">
            <h4>E\${ep.episode_num} - \${ep.title}</h4>
            <p>\${ep.info.plot || 'Sin sinopsis'}</p>
          </div>
          <div class="item-actions">
            <button class="btn btn-danger" onclick="deleteEpisode(\${seriesId}, \${season}, \${idx})">🗑️</button>
          </div>
        </div>
      \`).join('');

      document.getElementById('episodesList').innerHTML = html || '<p>No hay episodios en esta temporada</p>';
    }

    async function saveEpisode() {
      const seriesId = document.getElementById('episodeSeriesId').value;
      const season = parseInt(document.getElementById('episodeSeason').value);
      const episodeNum = parseInt(document.getElementById('episodeNumber').value);
      const title = document.getElementById('episodeTitle').value;
      const plot = document.getElementById('episodePlot').value;
      const duration = parseInt(document.getElementById('episodeDuration').value);
      const source = document.getElementById('episodeSource').value;

      if (!title || !source) {
        return alert('⚠️ Completa todos los campos obligatorios');
      }

      const episode = {
        id: \`\${seriesId}_\${season}_\${episodeNum}\`,
        episode_num: episodeNum,
        title: title,
        container_extension: 'mp4',
        info: {
          name: title,
          season: season,
          episode_num: episodeNum,
          air_date: new Date().toISOString().split('T')[0],
          plot: plot,
          duration_secs: (duration * 60).toString(),
          duration: \`\${duration}:00\`,
          rating: '8.0',
          cover_big: 'https://via.placeholder.com/500x300?text=Episode+Cover'
        },
        direct_source: source
      };

      const response = await fetch(\`/api/episodes/\${seriesId}/\${season}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(episode)
      });

      if (response.ok) {
        alert('✅ Episodio añadido correctamente');
        document.getElementById('episodeTitle').value = '';
        document.getElementById('episodePlot').value = '';
        document.getElementById('episodeSource').value = '';
        document.getElementById('episodeNumber').value = parseInt(episodeNum) + 1;
        await loadInitialData();
        loadEpisodes();
      } else {
        alert('❌ Error al guardar el episodio');
      }
    }

    async function deleteEpisode(seriesId, season, index) {
      if (!confirm('¿Eliminar este episodio?')) return;

      const response = await fetch(\`/api/episodes/\${seriesId}/\${season}/\${index}\`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('✅ Episodio eliminado');
        await loadInitialData();
        loadEpisodes();
      }
    }

    function renderSeries() {
      const html = seriesData.map(series => \`
        <div class="item">
          <div class="item-info">
            <h3>\${series.name}</h3>
            <p>⭐ \${series.rating} | 📅 \${series.releaseDate || 'N/A'}</p>
          </div>
          <div class="item-actions">
            <button class="btn" onclick="manageEpisodes(\${series.series_id})">📝 Episodios</button>
            <button class="btn" onclick="editSeries(\${series.series_id})">✏️ Editar</button>
            <button class="btn btn-danger" onclick="deleteSeries(\${series.series_id})">🗑️ Eliminar</button>
          </div>
        </div>
      \`).join('');
      document.getElementById('seriesList').innerHTML = html || '<p>No hay series agregadas</p>';
    }

    loadInitialData();
  </script>
</body>
</html>
  `);
});

// ============ API ENDPOINTS ============

// Obtener todos los datos
app.get('/api/data', (req, res) => {
  res.json({
    movies: movies,
    series: series,
    episodes: seriesEpisodes
  });
});

// Buscar en OMDb
app.get('/api/search', async (req, res) => {
  const { type, query } = req.query;
  const results = await searchOMDB(query);
  const filtered = type === 'movie' 
    ? results.filter(r => r.Type === 'movie')
    : results.filter(r => r.Type === 'series');
  res.json(filtered);
});

// Obtener detalles de OMDb
app.get('/api/details', async (req, res) => {
  const { imdbId } = req.query;
  const details = await getOMDBDetails(imdbId);
  res.json(details);
});

// CRUD Películas
app.post('/api/movies', async (req, res) => {
  const movie = req.body;
  movies.push(movie);
  await saveData();
  res.json({ success: true });
});

app.put('/api/movies', async (req, res) => {
  const movie = req.body;
  const index = movies.findIndex(m => m.stream_id == movie.stream_id);
  if (index !== -1) {
    movies[index] = movie;
    await saveData();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Movie not found' });
  }
});

app.delete('/api/movies/:id', async (req, res) => {
  const id = req.params.id;
  movies = movies.filter(m => m.stream_id != id);
  await saveData();
  res.json({ success: true });
});

// CRUD Series
app.post('/api/series', async (req, res) => {
  const serie = req.body;
  series.push(serie);
  
  // Inicializar estructura de episodios
  if (!seriesEpisodes[serie.series_id]) {
    seriesEpisodes[serie.series_id] = {
      seasons: [],
      episodes: {}
    };
  }
  
  await saveData();
  res.json({ success: true });
});

app.put('/api/series', async (req, res) => {
  const serie = req.body;
  const index = series.findIndex(s => s.series_id == serie.series_id);
  if (index !== -1) {
    series[index] = serie;
    await saveData();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Series not found' });
  }
});

app.delete('/api/series/:id', async (req, res) => {
  const id = req.params.id;
  series = series.filter(s => s.series_id != id);
  delete seriesEpisodes[id];
  await saveData();
  res.json({ success: true });
});

// CRUD Episodios
app.post('/api/episodes/:seriesId/:season', async (req, res) => {
  const { seriesId, season } = req.params;
  const episode = req.body;
  
  if (!seriesEpisodes[seriesId]) {
    seriesEpisodes[seriesId] = { seasons: [], episodes: {} };
  }
  
  if (!seriesEpisodes[seriesId].episodes[season]) {
    seriesEpisodes[seriesId].episodes[season] = [];
    
    // Añadir info de temporada si no existe
    const seasonExists = seriesEpisodes[seriesId].seasons.find(s => s.season_number == season);
    if (!seasonExists) {
      seriesEpisodes[seriesId].seasons.push({
        season_number: parseInt(season),
        name: `Temporada ${season}`,
        episode_count: 0,
        cover: 'https://via.placeholder.com/500x300?text=Season+Cover',
        cover_big: 'https://via.placeholder.com/1920x1080?text=Season+Cover',
        air_date: new Date().toISOString().split('T')[0]
      });
    }
  }
  
  seriesEpisodes[seriesId].episodes[season].push(episode);
  
  // Actualizar episode_count
  const seasonIndex = seriesEpisodes[seriesId].seasons.findIndex(s => s.season_number == season);
  if (seasonIndex !== -1) {
    seriesEpisodes[seriesId].seasons[seasonIndex].episode_count = 
      seriesEpisodes[seriesId].episodes[season].length;
  }
  
  await saveData();
  res.json({ success: true });
});

app.delete('/api/episodes/:seriesId/:season/:index', async (req, res) => {
  const { seriesId, season, index } = req.params;
  
  if (seriesEpisodes[seriesId]?.episodes[season]) {
    seriesEpisodes[seriesId].episodes[season].splice(parseInt(index), 1);
    
    // Actualizar episode_count
    const seasonIndex = seriesEpisodes[seriesId].seasons.findIndex(s => s.season_number == season);
    if (seasonIndex !== -1) {
      seriesEpisodes[seriesId].seasons[seasonIndex].episode_count = 
        seriesEpisodes[seriesId].episodes[season].length;
    }
    
    await saveData();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Episode not found' });
  }
});

// ============ XTREAM API ENDPOINTS ============

// Endpoint M3U para TiviMate
app.get('/get.php', (req, res) => {
  const { username, password, type } = req.query;
  
  if (username !== USERNAME || password !== PASSWORD) {
    return res.status(401).send('#EXTM3U\n#EXTINF:-1,Error: Invalid credentials\nhttp://invalid');
  }
  
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  let m3uContent = '#EXTM3U x-tvg-url=""\n\n';
  
  if (!type || type === 'series') {
    series.forEach(serie => {
      const serieData = seriesEpisodes[serie.series_id];
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
    movies.forEach(movie => {
      m3uContent += `#EXTINF:-1 tvg-id="${movie.stream_id}" tvg-name="${movie.name}" tvg-logo="${movie.stream_icon}" tvg-type="movie" group-title="🎬 Películas",${movie.name}\n`;
      m3uContent += `${baseUrl}/movie/${username}/${password}/${movie.stream_id}.${movie.container_extension}\n\n`;
    });
  }
  
  res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="playlist.m3u"');
  res.send(m3uContent);
});

// Endpoint de autenticación Xtream Codes
app.get('/player_api.php', authenticate, (req, res) => {
  const action = req.query.action;

  switch (action) {
    case 'get_vod_streams':
      res.json(movies);
      break;
    
    case 'get_vod_categories':
      res.json([{ category_id: "1", category_name: "Películas", parent_id: 0 }]);
      break;
    
    case 'get_vod_info':
      const vodId = req.query.vod_id;
      const movie = movies.find(m => m.stream_id == vodId);
      if (movie) {
        res.json({
          info: movie,
          movie_data: movie
        });
      } else {
        res.json({ error: "VOD not found" });
      }
      break;
    
    case 'get_series':
      res.json(series);
      break;
    
    case 'get_series_categories':
      res.json([{ category_id: "1", category_name: "Series", parent_id: 0 }]);
      break;
    
    case 'get_series_info':
      const seriesId = req.query.series_id;
      const serieInfo = series.find(s => s.series_id == seriesId);
      const serieEpisodes = seriesEpisodes[seriesId];
      
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
          username: USERNAME,
          password: PASSWORD,
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
          port: port.toString(),
          https_port: "",
          server_protocol: req.protocol,
          rtmp_port: "",
          timezone: "UTC",
          timestamp_now: Math.floor(Date.now() / 1000),
          time_now: new Date().toISOString()
        }
      });
  }
});

// Endpoint para streaming de películas
app.get('/movie/:username/:password/:streamId.:ext', (req, res) => {
  const { username, password, streamId } = req.params;
  
  if (username !== USERNAME || password !== PASSWORD) {
    return res.status(401).send('Unauthorized');
  }
  
  const movie = movies.find(m => m.stream_id == streamId);
  if (movie && movie.direct_source) {
    res.redirect(movie.direct_source);
  } else {
    res.status(404).send('Movie not found');
  }
});

// Endpoint para streaming de series
app.get('/series/:username/:password/:episodeId.:ext', (req, res) => {
  const { username, password, episodeId } = req.params;
  
  if (username !== USERNAME || password !== PASSWORD) {
    return res.status(401).send('Unauthorized');
  }
  
  let foundEpisode = null;
  
  for (const seriesId in seriesEpisodes) {
    const serieData = seriesEpisodes[seriesId];
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

// Ruta de inicio
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Xtream API Server</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .container {
            text-align: center;
            background: rgba(255,255,255,0.1);
            padding: 50px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
          }
          h1 { font-size: 3em; margin-bottom: 20px; }
          a {
            display: inline-block;
            margin-top: 30px;
            padding: 15px 40px;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            font-size: 1.2em;
            transition: transform 0.3s;
          }
          a:hover { transform: scale(1.05); }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎬 Xtream API Server</h1>
          <p>Servidor funcionando correctamente</p>
          <a href="/admin">Ir al Panel de Administración</a>
        </div>
      </body>
    </html>
  `);
});

// Iniciar servidor y cargar datos
app.listen(port, async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Xtream API Server - INICIADO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Puerto: ${port}`);
  console.log(`🌐 URL: http://localhost:${port}`);
  console.log(`👤 Usuario: ${USERNAME}`);
  console.log(`🔑 Contraseña: ${PASSWORD}`);
  console.log(`⚙️  Panel: http://localhost:${port}/admin`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await loadData();
});
