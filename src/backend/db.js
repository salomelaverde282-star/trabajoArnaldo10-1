const mysql = require('mysql2/promise');

// Configuración de credenciales locales de MariaDB
const configConexion = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'biblioteca_academiaads'
};

// Creamos un Pool de conexiones para reutilizar la conexión en cada consulta
const pool = mysql.createPool(configConexion);

/**
 * Función de apoyo para el laboratorio:
 * Crea automáticamente la base de datos, las tablas y los registros iniciales
 * si el equipo donde se ejecuta aún no tiene cargado el archivo schema.sql.
 */
async function verificarBaseDeDatos() {
  try {
    const conexionInicial = await mysql.createConnection({
      host: configConexion.host,
      port: configConexion.port,
      user: configConexion.user,
      password: configConexion.password
    });

    await conexionInicial.query(
      'CREATE DATABASE IF NOT EXISTS biblioteca_academiaads CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci'
    );
    await conexionInicial.end();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        correo VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(64) NOT NULL,
        rol ENUM('admin', 'lector') DEFAULT 'lector',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS libros (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(150) NOT NULL,
        autor VARCHAR(100) NOT NULL,
        isbn VARCHAR(40) NOT NULL,
        disponibles INT NOT NULL DEFAULT 1,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS prestamos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        libro_id INT NOT NULL,
        fecha_prestamo DATE NOT NULL,
        fecha_devolucion DATE DEFAULT NULL,
        estado ENUM('activo', 'devuelto') DEFAULT 'activo',
        CONSTRAINT fk_prestamo_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        CONSTRAINT fk_prestamo_libro FOREIGN KEY (libro_id) REFERENCES libros(id) ON DELETE CASCADE
      )
    `);

    // Usuario administrador inicial de AcademiaAds (Contraseña en texto plano: 123456)
    await pool.query(`
      INSERT IGNORE INTO usuarios (id, nombre, correo, password_hash, rol) VALUES
      (1, 'Administrador AcademiaAds', 'admin@academiaads.com', '76811619909439f13a0557f8db5a67aed4ffc723606d9ff0f04eec162199ee76', 'admin'),
      (2, 'Ana García (Estudiante)', 'ana@academiaads.com', '76811619909439f13a0557f8db5a67aed4ffc723606d9ff0f04eec162199ee76', 'lector')
    `);

    const [librosExistentes] = await pool.query('SELECT COUNT(*) AS total FROM libros');
    if (librosExistentes[0].total === 0) {
      await pool.query(`
        INSERT INTO libros (titulo, autor, isbn, disponibles) VALUES
        ('JavaScript Desde Cero - Guía AcademiaAds', 'AcademiaAds Editorial', '978-958-0001-01', 5),
        ('Domina SQL y MariaDB Paso a Paso', 'Carlos Mendoza', '978-958-0001-02', 3),
        ('Lógica de Programación Moderna', 'Elena Torres', '978-958-0001-03', 4)
      `);
    }

    console.log('[AcademiaAds DB] Conexión a MariaDB exitosa (Base de datos: biblioteca_academiaads)');
  } catch (error) {
    console.error('[AcademiaAds DB] Error al conectar con MariaDB:', error.message);
  }
}

module.exports = {
  pool,
  verificarBaseDeDatos
};
