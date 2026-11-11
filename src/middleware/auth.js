const crypto = require('crypto');

// Cadena secreta (Salt) de AcademiaAds que se añade a la contraseña antes de encriptar
const SALT_SECRETA = 'AcademiaAds_2026';

// Estructura Map en memoria para relacionar cada Token con los datos del usuario conectado
const sesionesActivas = new Map();

/**
 * 1. Transforma una contraseña en texto plano en un hash SHA-256 de 64 caracteres
 */
function encriptarPassword(passwordPlano) {
  const textoConSal = passwordPlano + SALT_SECRETA;
  const hash = crypto
    .createHash('sha256')
    .update(textoConSal)
    .digest('hex');

  return hash;
}

/**
 * 2. Compara la contraseña escrita en el Login con el hash almacenado en MariaDB
 */
function verificarPassword(passwordPlano, hashGuardadoEnBD) {
  const hashCalculado = encriptarPassword(passwordPlano);
  return hashCalculado === hashGuardadoEnBD;
}

/**
 * 3. Genera un token aleatorio de sesión cuando las credenciales son válidas
 */
function crearSesion(usuario) {
  const token = crypto.randomBytes(24).toString('hex');
  const datosSesion = {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    fechaIngreso: new Date().toISOString()
  };

  sesionesActivas.set(token, datosSesion);
  return token;
}

/**
 * 4. Elimina el token al cerrar sesión
 */
function eliminarSesion(token) {
  sesionesActivas.delete(token);
}

/**
 * 5. Interceptor de seguridad: comprueba si la petición HTTP incluye un token activo
 */
function verificarAutenticacion(req) {
  const cabeceraAuth = req.headers['authorization'];
  if (!cabeceraAuth) {
    return null;
  }

  const token = cabeceraAuth.replace('Bearer ', '').trim();
  const usuario = sesionesActivas.get(token);

  return usuario || null;
}

module.exports = {
  encriptarPassword,
  verificarPassword,
  crearSesion,
  eliminarSesion,
  verificarAutenticacion
};
