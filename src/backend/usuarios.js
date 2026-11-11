const { pool } = require('./db');
const { encriptarPassword } = require('../middleware/auth');

async function obtenerUsuarios() {
  const sql = `
    SELECT id, nombre, correo, password_hash, rol, creado_en
    FROM usuarios
    ORDER BY id DESC
  `;
  const [filas] = await pool.query(sql);
  return filas;
}

async function buscarUsuarioPorCorreo(correo) {
  const sql = `SELECT * FROM usuarios WHERE correo = ? LIMIT 1`;
  const [filas] = await pool.query(sql, [correo]);
  return filas[0] || null;
}

async function crearUsuario(nombre, correo, passwordPlano, rol = 'lector') {
  // 1. Encriptamos la contraseña a través de la capa Middleware
  const passwordEncriptada = encriptarPassword(passwordPlano);

  // 2. Guardamos el registro en MariaDB con su hash SHA-256
  const sql = `
    INSERT INTO usuarios (nombre, correo, password_hash, rol)
    VALUES (?, ?, ?, ?)
  `;
  const [resultado] = await pool.query(sql, [
    nombre,
    correo,
    passwordEncriptada,
    rol
  ]);

  return {
    id: resultado.insertId,
    nombre,
    correo,
    password_hash: passwordEncriptada,
    rol
  };
}

async function eliminarUsuario(id) {
  const sql = `DELETE FROM usuarios WHERE id = ?`;
  await pool.query(sql, [id]);
  return { mensaje: 'Usuario eliminado correctamente' };
}

module.exports = {
  obtenerUsuarios,
  buscarUsuarioPorCorreo,
  crearUsuario,
  eliminarUsuario
};
