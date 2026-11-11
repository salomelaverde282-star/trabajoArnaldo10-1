const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Importar funciones de la Capa Middleware
const {
  verificarPassword,
  crearSesion,
  eliminarSesion,
  verificarAutenticacion
} = require('./src/middleware/auth');
const { leerBodyJSON, responderJSON } = require('./src/middleware/request');

// 2. Importar controladores de la Capa Backend (MariaDB)
const { verificarBaseDeDatos } = require('./src/backend/db');
const {
  obtenerUsuarios,
  buscarUsuarioPorCorreo,
  crearUsuario,
  eliminarUsuario
} = require('./src/backend/usuarios');
const { obtenerLibros, crearLibro, eliminarLibro } = require('./src/backend/libros');
const {
  obtenerPrestamos,
  crearPrestamo,
  devolverPrestamo
} = require('./src/backend/prestamos');

const PUERTO = 3000;

// Función auxiliar para leer y enviar los archivos HTML y JS del Frontend
function servirArchivoFrontend(res, nombreArchivo, tipoContenido) {
  const rutaCompleta = path.join(__dirname, 'src', 'frontend', nombreArchivo);
  fs.readFile(rutaCompleta, (err, contenido) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Archivo no encontrado');
      return;
    }
    res.writeHead(200, { 'Content-Type': tipoContenido });
    res.end(contenido);
  });
}

const servidor = http.createServer(async (req, res) => {
  const urlCompleta = new URL(req.url, `http://${req.headers.host}`);
  const ruta = urlCompleta.pathname;
  const metodo = req.method;

  // A. Entrega de archivos de la Capa Frontend
  if (metodo === 'GET' && (ruta === '/' || ruta === '/login.html')) {
    return servirArchivoFrontend(res, 'login.html', 'text/html; charset=utf-8');
  }
  if (metodo === 'GET' && ruta === '/index.html') {
    return servirArchivoFrontend(res, 'index.html', 'text/html; charset=utf-8');
  }
  if (metodo === 'GET' && ruta === '/app.js') {
    return servirArchivoFrontend(res, 'app.js', 'application/javascript; charset=utf-8');
  }

  // B. Ruta pública de inicio de sesión
  if (metodo === 'POST' && ruta === '/api/login') {
    try {
      const { correo, password } = await leerBodyJSON(req);
      const usuario = await buscarUsuarioPorCorreo(correo);

      if (!usuario) {
        return responderJSON(res, 401, { error: 'El correo no está registrado' });
      }

      const esValida = verificarPassword(password, usuario.password_hash);
      if (!esValida) {
        return responderJSON(res, 401, { error: 'Contraseña incorrecta' });
      }

      const token = crearSesion(usuario);

      return responderJSON(res, 200, {
        mensaje: 'Bienvenido a la Biblioteca AcademiaAds',
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol: usuario.rol
        }
      });
    } catch (error) {
      return responderJSON(res, 500, { error: error.message });
    }
  }

  // C. Filtro de seguridad Middleware para todas las rutas privadas (/api/*)
  if (ruta.startsWith('/api/')) {
    const usuarioAutenticado = verificarAutenticacion(req);
    if (!usuarioAutenticado) {
      return responderJSON(res, 401, {
        error: 'Acceso no autorizado. Debes iniciar sesión primero.'
      });
    }

    try {
      if (metodo === 'POST' && ruta === '/api/logout') {
        const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
        eliminarSesion(token);
        return responderJSON(res, 200, { mensaje: 'Sesión cerrada' });
      }

      // Rutas de Libros
      if (ruta === '/api/libros' && metodo === 'GET') {
        return responderJSON(res, 200, await obtenerLibros());
      }
      if (ruta === '/api/libros' && metodo === 'POST') {
        const { titulo, autor, isbn, disponibles } = await leerBodyJSON(req);
        return responderJSON(res, 201, await crearLibro(titulo, autor, isbn, disponibles));
      }
      if (ruta === '/api/libros' && metodo === 'DELETE') {
        const id = urlCompleta.searchParams.get('id');
        return responderJSON(res, 200, await eliminarLibro(id));
      }

      // Rutas de Usuarios
      if (ruta === '/api/usuarios' && metodo === 'GET') {
        return responderJSON(res, 200, await obtenerUsuarios());
      }
      if (ruta === '/api/usuarios' && metodo === 'POST') {
        const { nombre, correo, password, rol } = await leerBodyJSON(req);
        return responderJSON(res, 201, await crearUsuario(nombre, correo, password, rol));
      }
      if (ruta === '/api/usuarios' && metodo === 'DELETE') {
        const id = urlCompleta.searchParams.get('id');
        return responderJSON(res, 200, await eliminarUsuario(id));
      }

      // Rutas de Préstamos
      if (ruta === '/api/prestamos' && metodo === 'GET') {
        return responderJSON(res, 200, await obtenerPrestamos());
      }
      if (ruta === '/api/prestamos' && metodo === 'POST') {
        const { usuario_id, libro_id } = await leerBodyJSON(req);
        return responderJSON(res, 201, await crearPrestamo(usuario_id, libro_id));
      }
      if (ruta === '/api/prestamos/devolver' && metodo === 'POST') {
        const { id } = await leerBodyJSON(req);
        return responderJSON(res, 200, await devolverPrestamo(id));
      }
    } catch (error) {
      return responderJSON(res, 400, { error: error.message });
    }
  }

  responderJSON(res, 404, { error: 'Ruta no encontrada en el servidor de AcademiaAds' });
});

verificarBaseDeDatos().then(() => {
  servidor.listen(PUERTO, () => {
    console.log('SISTEMA DE BIBLIOTECA - AcademiaAds');
    console.log(`Servidor activo en: http://localhost:${PUERTO}`);
  });
});
