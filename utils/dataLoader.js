// ============================================
// utils/dataLoader.js - Carga de datos
// ============================================
const axios = require('axios');
const config = require('../config/config');

let contentData = {
  movies: [],
  series: [],
  seriesEpisodes: {},
  movieInfo: {},
  categories: [
    { category_id: "1", category_name: "Películas", parent_id: 0 }
  ],
  seriesCategories: [
    { category_id: "1", category_name: "Series", parent_id: 0 }
  ]
};

async function loadDataFromGitHub() {
  try {
    const url = `https://api.github.com/repos/${config.github.owner}/${config.github.repo}/contents/${config.github.dataFile}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `token ${config.github.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    const content = JSON.parse(Buffer.from(response.data.content, 'base64').toString());
    contentData = { ...contentData, ...content };
    
    console.log('✓ Datos cargados desde GitHub');
    return true;
  } catch (error) {
    console.log('⚠ No se pudo cargar desde GitHub, usando datos por defecto');
    return false;
  }
}

function loadData() {
  loadDataFromGitHub();
}

function getData() {
  return contentData;
}

function updateData(newData) {
  contentData = { ...contentData, ...newData };
}

module.exports = {
  loadData,
  getData,
  updateData
};
