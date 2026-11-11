const { pool } = require('./db');

// 1. Listar todos los libros de la biblioteca
async function obtenerLibros() {
  const sql = `
    SELECT id, titulo, autor, isbn, disponibles, creado_en
    FROM libros
    ORDER BY id DESC
  `;
  const [filas] = await pool.query(sql);
  return filas;
}

// 2. Agregar un nuevo libro a MariaDB
async function crearLibro(titulo, autor, isbn, disponibles) {
  const cantidad = Number(disponibles) || 1;
  const sql = `
    INSERT INTO libros (titulo, autor, isbn, disponibles)
    VALUES (?, ?, ?, ?)
  `;
  const [resultado] = await pool.query(sql, [titulo, autor, isbn, cantidad]);

  return {
    id: resultado.insertId,
    titulo,
    autor,
    isbn,
    disponibles: cantidad
  };
}

// 3. Eliminar un libro por su ID
async function eliminarLibro(id) {
  const sql = `DELETE FROM libros WHERE id = ?`;
  await pool.query(sql, [id]);
  return { mensaje: 'Libro eliminado correctamente' };
}

module.exports = {
  obtenerLibros,
  crearLibro,
  eliminarLibro
};
