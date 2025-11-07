const axios = require('axios');

// Configuración - Cambia estos valores
const GITHUB_TOKEN = 'TU_TOKEN_AQUI';
const GITHUB_USER = 'Demo-159';
const GITHUB_REPO = 'xtream-ui-server';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 Verificando configuración de GitHub');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function verifyGitHub() {
  try {
    // 1. Verificar autenticación
    console.log('1️⃣ Verificando token de autenticación...');
    const authResponse = await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    console.log(`   ✅ Token válido - Usuario: ${authResponse.data.login}\n`);

    // 2. Verificar acceso al repositorio
    console.log('2️⃣ Verificando acceso al repositorio...');
    const repoResponse = await axios.get(
      `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    console.log(`   ✅ Repositorio accesible: ${repoResponse.data.full_name}`);
    console.log(`   📝 Visibilidad: ${repoResponse.data.private ? 'Privado' : 'Público'}\n`);

    // 3. Verificar carpeta data/
    console.log('3️⃣ Verificando carpeta data/...');
    try {
      const dataResponse = await axios.get(
        `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data`,
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      console.log(`   ✅ Carpeta data/ existe`);
      console.log(`   📁 Archivos encontrados:`);
      dataResponse.data.forEach(file => {
        console.log(`      - ${file.name}`);
      });
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`   ⚠️  Carpeta data/ no existe`);
        console.log(`   💡 Créala con los archivos: movies.json, series.json, episodes.json\n`);
        return;
      }
      throw error;
    }

    // 4. Verificar archivos JSON
    console.log('\n4️⃣ Verificando archivos JSON...');
    const files = ['movies.json', 'series.json', 'episodes.json'];
    
    for (const file of files) {
      try {
        const fileResponse = await axios.get(
          `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/${file}`,
          {
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf-8');
        console.log(`   ✅ ${file} - ${fileResponse.data.size} bytes`);
        
        // Validar JSON
        try {
          JSON.parse(content);
          console.log(`      ✓ JSON válido`);
        } catch {
          console.log(`      ⚠️  JSON inválido`);
        }
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`   ❌ ${file} - No existe`);
        } else {
          throw error;
        }
      }
    }

    // 5. Probar escritura
    console.log('\n5️⃣ Probando permisos de escritura...');
    const testFile = 'data/test.json';
    const testContent = { test: true, timestamp: new Date().toISOString() };
    
    try {
      // Intentar crear archivo de prueba
      await axios.put(
        `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${testFile}`,
        {
          message: 'Test de escritura',
          content: Buffer.from(JSON.stringify(testContent)).toString('base64')
        },
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      console.log(`   ✅ Permisos de escritura funcionando`);
      
      // Eliminar archivo de prueba
      const deleteResponse = await axios.get(
        `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${testFile}`,
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      await axios.delete(
        `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${testFile}`,
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          data: {
            message: 'Eliminar test',
            sha: deleteResponse.data.sha
          }
        }
      );
      console.log(`   ✅ Archivo de prueba eliminado`);
    } catch (error) {
      console.log(`   ❌ Error en permisos de escritura`);
      console.log(`   💡 Asegúrate de que el token tenga permiso 'repo'`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ¡Configuración correcta! El servidor debería funcionar.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ ERROR DE CONFIGURACIÓN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (error.response?.status === 401) {
      console.log('🔴 Token inválido o expirado');
      console.log('\n💡 Soluciones:');
      console.log('   1. Genera un nuevo token en: https://github.com/settings/tokens');
      console.log('   2. Asegúrate de seleccionar el permiso "repo"');
      console.log('   3. Actualiza el token en este script y en tus variables de entorno\n');
    } else if (error.response?.status === 404) {
      console.log('🔴 Repositorio no encontrado');
      console.log('\n💡 Soluciones:');
      console.log(`   1. Verifica que el repositorio ${GITHUB_USER}/${GITHUB_REPO} existe`);
      console.log('   2. Asegúrate de tener acceso al repositorio');
      console.log('   3. Si es privado, verifica los permisos del token\n');
    } else {
      console.log('🔴 Error inesperado:');
      console.log(`   ${error.message}\n`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Mensaje: ${error.response.data?.message || 'Sin mensaje'}\n`);
      }
    }
  }
}

// Ejecutar verificación
verifyGitHub();
