const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// ============= CONFIGURACIÓN =============
const USERNAME = process.env.XTREAM_USER || 'usuario';
const PASSWORD = process.env.XTREAM_PASS || 'password123';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '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';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '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';
const GITHUB_USER = 'Demo-159';
const GITHUB_REPO = 'xtream-ui-server';
const OMDB_API_KEY = process.env.OMDB_KEY || 'trilogy'; // API key gratuita de OMDB

// ============= BASE DE DATOS EN MEMORIA =============
let movies = [];
let series = [];
let seriesEpisodes = {};
let movieInfo = {};

// ============= MIDDLEWARE =============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============= FUNCIONES GITHUB =============
async function getGitHubFile(filename) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${filename}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );
    return {
      content: JSON.parse(Buffer.from(response.data.content, 'base64').toString()),
      sha: response.data.sha
    };
  } catch (error) {
    if (error.response?.status === 404) return { content: filename === 'movies.json' ? [] : {}, sha: null };
    throw error;
  }
}

async function updateGitHubFile(filename, content, sha) {
  const contentBase64 = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');
  const payload = {
    message: `Update ${filename}`,
    content: contentBase64,
    ...(sha && { sha })
  };
  
  await axios.put(
    `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${filename}`,
    payload,
    { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
  );
}

async function loadData() {
  try {
    const [moviesData, seriesData, episodesData, infoData] = await Promise.all([
      getGitHubFile('movies.json'),
      getGitHubFile('series.json'),
      getGitHubFile('episodes.json'),
      getGitHubFile('movieInfo.json')
    ]);
    
    movies = moviesData.content;
    series = seriesData.content;
    seriesEpisodes = episodesData.content;
    movieInfo = infoData.content;
    
    console.log('✓ Datos cargados desde GitHub');
  } catch (error) {
    console.error('Error cargando datos:', error.message);
  }
}

async function saveData() {
  try {
    const [moviesFile, seriesFile, episodesFile, infoFile] = await Promise.all([
      getGitHubFile('movies.json'),
      getGitHubFile('series.json'),
      getGitHubFile('episodes.json'),
      getGitHubFile('movieInfo.json')
    ]);
    
    await Promise.all([
      updateGitHubFile('movies.json', movies, moviesFile.sha),
      updateGitHubFile('series.json', series, seriesFile.sha),
      updateGitHubFile('episodes.json', seriesEpisodes, episodesFile.sha),
      updateGitHubFile('movieInfo.json', movieInfo, infoFile.sha)
    ]);
    
    console.log('✓ Datos guardados en GitHub');
  } catch (error) {
    console.error('Error guardando datos:', error.message);
    throw error;
  }
}

// ============= FUNCIONES OMDB API =============
async function searchOMDB(query) {
  try {
    const response = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}`);
    if (response.data.Response === 'True') {
      return response.data.Search;
    }
    return [];
  } catch (error) {
    console.error('Error buscando en OMDB:', error.message);
    return [];
  }
}

async function getOMDBDetails(imdbId) {
  try {
    const response = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}&plot=full`);
    if (response.data.Response === 'True') {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo detalles de OMDB:', error.message);
    return null;
  }
}

// ============= AUTENTICACIÓN =============
function authenticate(req, res, next) {
  const { username, password } = req.query;
  if (username === USERNAME && password === PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
}

function authenticateAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token === ADMIN_TOKEN) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// ============= PANEL ADMIN HTML =============
app.get('/admin', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel Admin - Xtream UI</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0f172a; color: #e2e8f0; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; margin-bottom: 30px; box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3); }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .tabs { display: flex; gap: 10px; margin-bottom: 30px; }
        .tab { padding: 15px 30px; background: #1e293b; border: none; color: #94a3b8; cursor: pointer; border-radius: 10px; font-size: 16px; transition: all 0.3s; }
        .tab.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .tab:hover { transform: translateY(-2px); }
        .section { display: none; }
        .section.active { display: block; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: 600; color: #cbd5e1; }
        .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 12px; background: #1e293b; border: 2px solid #334155; color: #e2e8f0; border-radius: 8px; font-size: 14px; }
        .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #667eea; }
        .btn { padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s; }
        .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .btn-success { background: #10b981; color: white; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-secondary { background: #475569; color: white; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
        .search-results { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .result-card { background: #1e293b; padding: 15px; border-radius: 10px; cursor: pointer; transition: all 0.3s; border: 2px solid transparent; }
        .result-card:hover { border-color: #667eea; transform: translateY(-5px); }
        .result-card img { width: 100%; border-radius: 8px; margin-bottom: 10px; }
        .result-card h4 { margin-bottom: 5px; }
        .result-card p { font-size: 12px; color: #94a3b8; }
        .content-list { display: grid; gap: 15px; }
        .content-item { background: #1e293b; padding: 20px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; }
        .content-item h3 { color: #e2e8f0; margin-bottom: 5px; }
        .content-item p { color: #94a3b8; font-size: 14px; }
        .actions { display: flex; gap: 10px; }
        .season-section { background: #334155; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .episode-item { background: #1e293b; padding: 15px; border-radius: 8px; margin-bottom: 10px; }
        .alert { padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .alert-success { background: #10b981; }
        .alert-error { background: #ef4444; }
        .loading { display: none; text-align: center; padding: 20px; }
        .loading.show { display: block; }
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; }
        .modal.show { display: flex; align-items: center; justify-content: center; }
        .modal-content { background: #1e293b; padding: 30px; border-radius: 15px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 Panel de Administración</h1>
            <p>Gestión de contenido Xtream UI</p>
        </div>

        <div class="tabs">
            <button class="tab active" onclick="showTab('movies')">Películas</button>
            <button class="tab" onclick="showTab('series')">Series</button>
        </div>

        <!-- SECCIÓN PELÍCULAS -->
        <div id="movies" class="section active">
            <button class="btn btn-primary" onclick="showAddMovieModal()">+ Agregar Película</button>
            <div id="moviesList" class="content-list"></div>
        </div>

        <!-- SECCIÓN SERIES -->
        <div id="series" class="section">
            <button class="btn btn-primary" onclick="showAddSeriesModal()">+ Agregar Serie</button>
            <div id="seriesList" class="content-list"></div>
        </div>
    </div>

    <!-- MODAL AGREGAR/EDITAR PELÍCULA -->
    <div id="movieModal" class="modal">
        <div class="modal-content">
            <h2 id="movieModalTitle">Agregar Película</h2>
            <div class="form-group">
                <label>Buscar en OMDB:</label>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="movieSearch" placeholder="Nombre o ID de IMDB">
                    <button class="btn btn-primary" onclick="searchMovie()">Buscar</button>
                </div>
            </div>
            <div id="movieSearchResults" class="search-results"></div>
            <form id="movieForm">
                <input type="hidden" id="movieId">
                <div class="grid-2">
                    <div class="form-group">
                        <label>Nombre:</label>
                        <input type="text" id="movieName" required>
                    </div>
                    <div class="form-group">
                        <label>IMDB ID:</label>
                        <input type="text" id="movieImdb">
                    </div>
                </div>
                <div class="form-group">
                    <label>URL del Video (Archive.org o similar):</label>
                    <input type="url" id="movieUrl" required>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Imagen:</label>
                        <input type="url" id="movieCover">
                    </div>
                    <div class="form-group">
                        <label>Año:</label>
                        <input type="text" id="movieYear">
                    </div>
                </div>
                <div class="form-group">
                    <label>Descripción:</label>
                    <textarea id="moviePlot" rows="4"></textarea>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Director:</label>
                        <input type="text" id="movieDirector">
                    </div>
                    <div class="form-group">
                        <label>Actores:</label>
                        <input type="text" id="movieActors">
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Género:</label>
                        <input type="text" id="movieGenre">
                    </div>
                    <div class="form-group">
                        <label>Rating:</label>
                        <input type="text" id="movieRating">
                    </div>
                </div>
                <div class="actions">
                    <button type="submit" class="btn btn-success">Guardar</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal('movieModal')">Cancelar</button>
                </div>
            </form>
        </div>
    </div>

    <!-- MODAL AGREGAR/EDITAR SERIE -->
    <div id="seriesModal" class="modal">
        <div class="modal-content">
            <h2 id="seriesModalTitle">Agregar Serie</h2>
            <div class="form-group">
                <label>Buscar en OMDB:</label>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="seriesSearch" placeholder="Nombre o ID de IMDB">
                    <button class="btn btn-primary" onclick="searchSeries()">Buscar</button>
                </div>
            </div>
            <div id="seriesSearchResults" class="search-results"></div>
            <form id="seriesForm">
                <input type="hidden" id="seriesId">
                <div class="grid-2">
                    <div class="form-group">
                        <label>Nombre:</label>
                        <input type="text" id="seriesName" required>
                    </div>
                    <div class="form-group">
                        <label>IMDB ID:</label>
                        <input type="text" id="seriesImdb">
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Imagen:</label>
                        <input type="url" id="seriesCover">
                    </div>
                    <div class="form-group">
                        <label>Año:</label>
                        <input type="text" id="seriesYear">
                    </div>
                </div>
                <div class="form-group">
                    <label>Descripción:</label>
                    <textarea id="seriesPlot" rows="4"></textarea>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Director:</label>
                        <input type="text" id="seriesDirector">
                    </div>
                    <div class="form-group">
                        <label>Actores:</label>
                        <input type="text" id="seriesActors">
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Género:</label>
                        <input type="text" id="seriesGenre">
                    </div>
                    <div class="form-group">
                        <label>Rating:</label>
                        <input type="text" id="seriesRating">
                    </div>
                </div>
                <div class="actions">
                    <button type="submit" class="btn btn-success">Guardar Serie</button>
                    <button type="button" class="btn btn-primary" onclick="showEpisodeManager()">Gestionar Episodios</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal('seriesModal')">Cancelar</button>
                </div>
            </form>
        </div>
    </div>

    <!-- MODAL GESTIÓN DE EPISODIOS -->
    <div id="episodeModal" class="modal">
        <div class="modal-content">
            <h2>Gestión de Episodios - <span id="episodeSeriesName"></span></h2>
            <button class="btn btn-primary" onclick="addSeason()">+ Agregar Temporada</button>
            <div id="seasonsContainer"></div>
            <div class="actions">
                <button class="btn btn-success" onclick="saveEpisodes()">Guardar Todo</button>
                <button class="btn btn-secondary" onclick="closeModal('episodeModal')">Cerrar</button>
            </div>
        </div>
    </div>

    <div id="alert"></div>
    <div id="loading" class="loading">Cargando...</div>

    <script>
        const API_URL = window.location.origin;
        const ADMIN_TOKEN = localStorage.getItem('adminToken') || prompt('Token de administrador:');
        localStorage.setItem('adminToken', ADMIN_TOKEN);

        let currentSeriesId = null;

        async function apiCall(endpoint, method = 'GET', body = null) {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + ADMIN_TOKEN
                }
            };
            if (body) options.body = JSON.stringify(body);
            const response = await fetch(API_URL + endpoint, options);
            if (!response.ok) throw new Error('Error en la petición');
            return response.json();
        }

        function showTab(tab) {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.getElementById(tab).classList.add('active');
            event.target.classList.add('active');
            if (tab === 'movies') loadMovies();
            if (tab === 'series') loadSeries();
        }

        function showAlert(message, type = 'success') {
            const alert = document.getElementById('alert');
            alert.innerHTML = \`<div class="alert alert-\${type}">\${message}</div>\`;
            setTimeout(() => alert.innerHTML = '', 3000);
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('show');
        }

        // ===== PELÍCULAS =====
        async function loadMovies() {
            const movies = await apiCall('/api/movies');
            const list = document.getElementById('moviesList');
            list.innerHTML = movies.map(m => \`
                <div class="content-item">
                    <div>
                        <h3>\${m.name}</h3>
                        <p>\${m.info?.genre || 'Sin género'} - Rating: \${m.rating || 'N/A'}</p>
                    </div>
                    <div class="actions">
                        <button class="btn btn-primary" onclick="editMovie(\${m.stream_id})">Editar</button>
                        <button class="btn btn-danger" onclick="deleteMovie(\${m.stream_id})">Eliminar</button>
                    </div>
                </div>
            \`).join('');
        }

        function showAddMovieModal() {
            document.getElementById('movieModalTitle').textContent = 'Agregar Película';
            document.getElementById('movieForm').reset();
            document.getElementById('movieId').value = '';
            document.getElementById('movieModal').classList.add('show');
        }

        async function searchMovie() {
            const query = document.getElementById('movieSearch').value;
            if (!query) return;
            
            const results = await apiCall(\`/api/omdb/search?q=\${encodeURIComponent(query)}\`);
            const container = document.getElementById('movieSearchResults');
            container.innerHTML = results.map(r => \`
                <div class="result-card" onclick="selectMovie('\${r.imdbID}')">
                    <img src="\${r.Poster !== 'N/A' ? r.Poster : 'https://via.placeholder.com/200x300'}" alt="\${r.Title}">
                    <h4>\${r.Title}</h4>
                    <p>\${r.Year} - \${r.Type}</p>
                </div>
            \`).join('');
        }

        async function selectMovie(imdbId) {
            const details = await apiCall(\`/api/omdb/details?id=\${imdbId}\`);
            document.getElementById('movieName').value = details.Title;
            document.getElementById('movieImdb').value = details.imdbID;
            document.getElementById('movieCover').value = details.Poster !== 'N/A' ? details.Poster : '';
            document.getElementById('movieYear').value = details.Year;
            document.getElementById('moviePlot').value = details.Plot;
            document.getElementById('movieDirector').value = details.Director;
            document.getElementById('movieActors').value = details.Actors;
            document.getElementById('movieGenre').value = details.Genre;
            document.getElementById('movieRating').value = details.imdbRating;
        }

        async function editMovie(id) {
            const movies = await apiCall('/api/movies');
            const movie = movies.find(m => m.stream_id === id);
            document.getElementById('movieModalTitle').textContent = 'Editar Película';
            document.getElementById('movieId').value = movie.stream_id;
            document.getElementById('movieName').value = movie.name;
            document.getElementById('movieUrl').value = movie.direct_source;
            document.getElementById('movieImdb').value = movie.info?.tmdb_id || '';
            document.getElementById('movieCover').value = movie.stream_icon;
            document.getElementById('movieYear').value = movie.info?.releasedate?.split('-')[0] || '';
            document.getElementById('moviePlot').value = movie.info?.plot || '';
            document.getElementById('movieDirector').value = movie.info?.director || '';
            document.getElementById('movieActors').value = movie.info?.actors || '';
            document.getElementById('movieGenre').value = movie.info?.genre || '';
            document.getElementById('movieRating').value = movie.rating;
            document.getElementById('movieModal').classList.add('show');
        }

        async function deleteMovie(id) {
            if (!confirm('¿Eliminar esta película?')) return;
            await apiCall(\`/api/movies/\${id}\`, 'DELETE');
            showAlert('Película eliminada');
            loadMovies();
        }

        document.getElementById('movieForm').onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('movieId').value;
            const data = {
                name: document.getElementById('movieName').value,
                direct_source: document.getElementById('movieUrl').value,
                stream_icon: document.getElementById('movieCover').value,
                rating: document.getElementById('movieRating').value,
                info: {
                    tmdb_id: document.getElementById('movieImdb').value,
                    plot: document.getElementById('moviePlot').value,
                    director: document.getElementById('movieDirector').value,
                    actors: document.getElementById('movieActors').value,
                    genre: document.getElementById('movieGenre').value,
                    releasedate: document.getElementById('movieYear').value
                }
            };
            
            if (id) {
                await apiCall(\`/api/movies/\${id}\`, 'PUT', data);
                showAlert('Película actualizada');
            } else {
                await apiCall('/api/movies', 'POST', data);
                showAlert('Película agregada');
            }
            closeModal('movieModal');
            loadMovies();
        };

        // ===== SERIES =====
        async function loadSeries() {
            const series = await apiCall('/api/series');
            const list = document.getElementById('seriesList');
            list.innerHTML = series.map(s => \`
                <div class="content-item">
                    <div>
                        <h3>\${s.name}</h3>
                        <p>\${s.genre || 'Sin género'} - Rating: \${s.rating || 'N/A'}</p>
                    </div>
                    <div class="actions">
                        <button class="btn btn-primary" onclick="editSeries(\${s.series_id})">Editar</button>
                        <button class="btn btn-success" onclick="manageEpisodes(\${s.series_id})">Episodios</button>
                        <button class="btn btn-danger" onclick="deleteSeries(\${s.series_id})">Eliminar</button>
                    </div>
                </div>
            \`).join('');
        }

        function showAddSeriesModal() {
            document.getElementById('seriesModalTitle').textContent = 'Agregar Serie';
            document.getElementById('seriesForm').reset();
            document.getElementById('seriesId').value = '';
            document.getElementById('seriesModal').classList.add('show');
        }

        async function searchSeries() {
            const query = document.getElementById('seriesSearch').value;
            if (!query) return;
            
            const results = await apiCall(\`/api/omdb/search?q=\${encodeURIComponent(query)}\`);
            const container = document.getElementById('seriesSearchResults');
            container.innerHTML = results.map(r => \`
                <div class="result-card" onclick="selectSeries('\${r.imdbID}')">
                    <img src="\${r.Poster !== 'N/A' ? r.Poster : 'https://via.placeholder.com/200x300'}" alt="\${r.Title}">
                    <h4>\${r.Title}</h4>
                    <p>\${r.Year} - \${r.Type}</p>
                </div>
            \`).join('');
        }

        async function selectSeries(imdbId) {
            const details = await apiCall(\`/api/omdb/details?id=\${imdbId}\`);
            document.getElementById('seriesName').value = details.Title;
            document.getElementById('seriesImdb').value = details.imdbID;
            document.getElementById('seriesCover').value = details.Poster !== 'N/A' ? details.Poster : '';
            document.getElementById('seriesYear').value = details.Year;
            document.getElementById('seriesPlot').value = details.Plot;
            document.getElementById('seriesDirector').value = details.Director;
            document.getElementById('seriesActors').value = details.Actors;
            document.getElementById('seriesGenre').value = details.Genre;
            document.getElementById('seriesRating').value = details.imdbRating;
        }

        async function editSeries(id) {
            const series = await apiCall('/api/series');
            const serie = series.find(s => s.series_id === id);
            document.getElementById('seriesModalTitle').textContent = 'Editar Serie';
            document.getElementById('seriesId').value = serie.series_id;
            document.getElementById('seriesName').value = serie.name;
            document.getElementById('seriesCover').value = serie.cover;
            document.getElementById('seriesYear').value = serie.releaseDate;
            document.getElementById('seriesPlot').value = serie.plot;
            document.getElementById('seriesDirector').value = serie.director;
            document.getElementById('seriesActors').value = serie.cast;
            document.getElementById('seriesGenre').value = serie.genre;
            document.getElementById('seriesRating').value = serie.rating;
            document.getElementById('seriesModal').classList.add('show');
        }

        async function deleteSeries(id) {
            if (!confirm('¿Eliminar esta serie?')) return;
            await apiCall(\`/api/series/\${id}\`, 'DELETE');
            showAlert('Serie eliminada');
            loadSeries();
        }

        document.getElementById('seriesForm').onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('seriesId').value;
            const data = {
                name: document.getElementById('seriesName').value,
                cover: document.getElementById('seriesCover').value,
                plot: document.getElementById('seriesPlot').value,
                director: document.getElementById('seriesDirector').value,
                cast: document.getElementById('seriesActors').value,
                genre: document.getElementById('seriesGenre').value,
                rating: document.getElementById('seriesRating').value,
                releaseDate: document.getElementById('seriesYear').value
            };
            
            if (id) {
                await apiCall(\`/api/series/\${id}\`, 'PUT', data);
                showAlert('Serie actualizada');
            } else {
                await apiCall('/api/series', 'POST', data);
                showAlert('Serie agregada');
            }
            closeModal('seriesModal');
            loadSeries();
        };

        // ===== EPISODIOS =====
        async function manageEpisodes(seriesId) {
            currentSeriesId = seriesId;
            const series = await apiCall('/api/series');
            const serie = series.find(s => s.series_id === seriesId);
            document.getElementById('episodeSeriesName').textContent = serie.name;
            
            const episodes = await apiCall(\`/api/episodes/\${seriesId}\`);
            renderSeasons(episodes);
            
            document.getElementById('episodeModal').classList.add('show');
        }

        function renderSeasons(episodeData) {
            const container = document.getElementById('seasonsContainer');
            const seasons = episodeData.seasons || [];
            const episodes = episodeData.episodes || {};
            
            container.innerHTML = seasons.map((season, idx) => \`
                <div class="season-section" id="season-\${season.season_number}">
                    <h3>Temporada \${season.season_number}</h3>
                    <div id="episodes-\${season.season_number}">
                        \${(episodes[season.season_number] || []).map((ep, epIdx) => \`
                            <div class="episode-item">
                                <strong>Episodio \${ep.episode_num}: \${ep.title}</strong>
                                <input type="text" placeholder="URL del video" value="\${ep.direct_source}" 
                                    id="ep-\${season.season_number}-\${ep.episode_num}-url" style="margin-top: 10px; width: 100%;">
                                <button class="btn btn-danger" style="margin-top: 10px;" 
                                    onclick="removeEpisode(\${season.season_number}, \${epIdx})">Eliminar</button>
                            </div>
                        \`).join('')}
                    </div>
                    <button class="btn btn-primary" onclick="addEpisode(\${season.season_number})">+ Agregar Episodio</button>
                    <button class="btn btn-danger" onclick="removeSeason(\${idx})">Eliminar Temporada</button>
                </div>
            \`).join('');
        }

        function addSeason() {
            const container = document.getElementById('seasonsContainer');
            const seasonNum = container.children.length + 1;
            container.innerHTML += \`
                <div class="season-section" id="season-\${seasonNum}">
                    <h3>Temporada \${seasonNum}</h3>
                    <div id="episodes-\${seasonNum}"></div>
                    <button class="btn btn-primary" onclick="addEpisode(\${seasonNum})">+ Agregar Episodio</button>
                    <button class="btn btn-danger" onclick="removeSeason(\${seasonNum - 1})">Eliminar Temporada</button>
                </div>
            \`;
        }

        function addEpisode(seasonNum) {
            const container = document.getElementById(\`episodes-\${seasonNum}\`);
            const epNum = container.children.length + 1;
            container.innerHTML += \`
                <div class="episode-item">
                    <input type="text" placeholder="Título del episodio" id="ep-\${seasonNum}-\${epNum}-title" style="width: 100%; margin-bottom: 10px;">
                    <input type="text" placeholder="URL del video" id="ep-\${seasonNum}-\${epNum}-url" style="width: 100%;">
                    <button class="btn btn-danger" style="margin-top: 10px;" onclick="removeEpisode(\${seasonNum}, \${epNum - 1})">Eliminar</button>
                </div>
            \`;
        }

        function removeSeason(idx) {
            if (!confirm('¿Eliminar esta temporada?')) return;
            const container = document.getElementById('seasonsContainer');
            container.children[idx].remove();
        }

        function removeEpisode(season, idx) {
            if (!confirm('¿Eliminar este episodio?')) return;
            const container = document.getElementById(\`episodes-\${season}\`);
            container.children[idx].remove();
        }

        async function saveEpisodes() {
            const seasons = [];
            const episodes = {};
            
            const seasonContainers = document.getElementById('seasonsContainer').children;
            for (let i = 0; i < seasonContainers.length; i++) {
                const seasonNum = i + 1;
                const episodeContainer = document.getElementById(\`episodes-\${seasonNum}\`);
                const episodeElements = episodeContainer.children;
                
                const seasonEpisodes = [];
                for (let j = 0; j < episodeElements.length; j++) {
                    const epNum = j + 1;
                    const title = document.getElementById(\`ep-\${seasonNum}-\${epNum}-title\`)?.value || \`Episodio \${epNum}\`;
                    const url = document.getElementById(\`ep-\${seasonNum}-\${epNum}-url\`)?.value;
                    
                    if (url) {
                        seasonEpisodes.push({
                            id: \`\${currentSeriesId}\${seasonNum}\${String(epNum).padStart(2, '0')}\`,
                            episode_num: epNum,
                            title: title,
                            container_extension: 'mp4',
                            info: {
                                name: title,
                                season: seasonNum,
                                episode_num: epNum,
                                duration: '45:00',
                                duration_secs: '2700'
                            },
                            direct_source: url
                        });
                    }
                }
                
                if (seasonEpisodes.length > 0) {
                    seasons.push({
                        season_number: seasonNum,
                        name: \`Temporada \${seasonNum}\`,
                        episode_count: seasonEpisodes.length
                    });
                    episodes[seasonNum] = seasonEpisodes;
                }
            }
            
            await apiCall(\`/api/episodes/\${currentSeriesId}\`, 'PUT', { seasons, episodes });
            showAlert('Episodios guardados');
            closeModal('episodeModal');
        }

        function showEpisodeManager() {
            const id = document.getElementById('seriesId').value;
            if (id) {
                closeModal('seriesModal');
                manageEpisodes(parseInt(id));
            }
        }

        // Cargar películas al inicio
        loadMovies();
    </script>
</body>
</html>`);
});

// ============= API ENDPOINTS =============

// Endpoint OMDB Search
app.get('/api/omdb/search', authenticateAdmin, async (req, res) => {
  try {
    const results = await searchOMDB(req.query.q);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint OMDB Details
app.get('/api/omdb/details', authenticateAdmin, async (req, res) => {
  try {
    const details = await getOMDBDetails(req.query.id);
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Movies CRUD
app.get('/api/movies', authenticateAdmin, (req, res) => {
  res.json(movies);
});

app.post('/api/movies', authenticateAdmin, async (req, res) => {
  try {
    const newId = movies.length > 0 ? Math.max(...movies.map(m => m.stream_id)) + 1 : 1;
    const movie = {
      stream_id: newId,
      num: newId,
      name: req.body.name,
      title: req.body.name,
      stream_type: "movie",
      stream_icon: req.body.stream_icon,
      rating: req.body.rating || "0",
      rating_5based: parseFloat(req.body.rating || 0) / 2,
      added: String(Math.floor(Date.now() / 1000)),
      category_id: "1",
      container_extension: "mp4",
      custom_sid: "",
      direct_source: req.body.direct_source
    };
    
    movieInfo[newId] = {
      info: {
        tmdb_id: req.body.info?.tmdb_id || "",
        name: req.body.name,
        cover_big: req.body.stream_icon,
        releasedate: req.body.info?.releasedate || "",
        director: req.body.info?.director || "",
        actors: req.body.info?.actors || "",
        cast: req.body.info?.actors || "",
        description: req.body.info?.plot || "",
        plot: req.body.info?.plot || "",
        genre: req.body.info?.genre || "",
        rating: req.body.rating || "0",
        duration_secs: 7200
      },
      movie_data: movie
    };
    
    movies.push(movie);
    await saveData();
    res.json({ success: true, id: newId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/movies/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = movies.findIndex(m => m.stream_id === id);
    
    if (index !== -1) {
      movies[index] = {
        ...movies[index],
        name: req.body.name,
        title: req.body.name,
        stream_icon: req.body.stream_icon,
        rating: req.body.rating,
        rating_5based: parseFloat(req.body.rating || 0) / 2,
        direct_source: req.body.direct_source
      };
      
      movieInfo[id] = {
        info: {
          ...movieInfo[id]?.info,
          tmdb_id: req.body.info?.tmdb_id || "",
          name: req.body.name,
          cover_big: req.body.stream_icon,
          releasedate: req.body.info?.releasedate || "",
          director: req.body.info?.director || "",
          actors: req.body.info?.actors || "",
          cast: req.body.info?.actors || "",
          plot: req.body.info?.plot || "",
          genre: req.body.info?.genre || "",
          rating: req.body.rating || "0"
        },
        movie_data: movies[index]
      };
      
      await saveData();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Movie not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/movies/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    movies = movies.filter(m => m.stream_id !== id);
    delete movieInfo[id];
    await saveData();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Series CRUD
app.get('/api/series', authenticateAdmin, (req, res) => {
  res.json(series);
});

app.post('/api/series', authenticateAdmin, async (req, res) => {
  try {
    const newId = series.length > 0 ? Math.max(...series.map(s => s.series_id)) + 1 : 1;
    const newSeries = {
      series_id: newId,
      name: req.body.name,
      title: req.body.name,
      cover: req.body.cover,
      plot: req.body.plot || "",
      cast: req.body.cast || "",
      director: req.body.director || "",
      genre: req.body.genre || "",
      releaseDate: req.body.releaseDate || "",
      rating: req.body.rating || "0",
      rating_5based: parseFloat(req.body.rating || 0) / 2,
      category_id: "1",
      category_ids: [1],
      num: newId
    };
    
    series.push(newSeries);
    seriesEpisodes[newId] = { seasons: [], episodes: {} };
    await saveData();
    res.json({ success: true, id: newId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/series/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = series.findIndex(s => s.series_id === id);
    
    if (index !== -1) {
      series[index] = {
        ...series[index],
        name: req.body.name,
        title: req.body.name,
        cover: req.body.cover,
        plot: req.body.plot,
        cast: req.body.cast,
        director: req.body.director,
        genre: req.body.genre,
        releaseDate: req.body.releaseDate,
        rating: req.body.rating,
        rating_5based: parseFloat(req.body.rating || 0) / 2
      };
      
      await saveData();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Series not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/series/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    series = series.filter(s => s.series_id !== id);
    delete seriesEpisodes[id];
    await saveData();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Episodes
app.get('/api/episodes/:id', authenticateAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  res.json(seriesEpisodes[id] || { seasons: [], episodes: {} });
});

app.put('/api/episodes/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    seriesEpisodes[id] = req.body;
    await saveData();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= XTREAM CODES API =============

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

app.get('/player_api.php', authenticate, (req, res) => {
  const action = req.query.action;

  switch (action) {
    case 'get_vod_streams':
      res.json(movies);
      break;
    
    case 'get_vod_info':
      const vodId = req.query.vod_id;
      res.json(movieInfo[vodId] || { error: "VOD not found" });
      break;
    
    case 'get_series':
      res.json(series);
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
    
    default:
      res.json({
        user_info: {
          username: USERNAME,
          password: PASSWORD,
          auth: 1,
          status: "Active",
          exp_date: "2099999999"
        },
        server_info: {
          url: req.protocol + '://' + req.get('host'),
          port: port
        }
      });
  }
});

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

app.get('/', (req, res) => {
  res.send(`
    <h1>Xtream API Server</h1>
    <p>✅ Servidor funcionando correctamente</p>
    <ul>
      <li><a href="/admin">Panel de Administración</a></li>
      <li>Películas: ${movies.length}</li>
      <li>Series: ${series.length}</li>
    </ul>
  `);
});

// Iniciar servidor y cargar datos
app.listen(port, async () => {
  console.log(`🚀 Xtream API Server corriendo en puerto ${port}`);
  console.log(`📺 Panel Admin: http://localhost:${port}/admin`);
  console.log(`👤 Usuario Xtream: ${USERNAME}`);
  console.log(`🔑 Contraseña Xtream: ${PASSWORD}`);
  console.log(`🔐 Token Admin: ${ADMIN_TOKEN}`);
  await loadData();
});
