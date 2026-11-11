const { pool } = require('./db');

// 1. Listar préstamos cruzando las tablas usuarios y libros con INNER JOIN
async function obtenerPrestamos() {
  const sql = `
    SELECT 
      p.id,
      p.usuario_id,
      u.nombre AS usuario_nombre,
      u.correo AS usuario_correo,
      p.libro_id,
      l.titulo AS libro_titulo,
      p.fecha_prestamo,
      p.fecha_devolucion,
      p.estado
    FROM prestamos p
    INNER JOIN usuarios u ON p.usuario_id = u.id
    INNER JOIN libros l ON p.libro_id = l.id
    ORDER BY p.id DESC
  `;
  const [filas] = await pool.query(sql);
  return filas;
}

// 2. Registrar un nuevo préstamo y descontar 1 unidad disponible del libro
async function crearPrestamo(usuarioId, libroId) {
  const [libros] = await pool.query(
    `SELECT disponibles, titulo FROM libros WHERE id = ?`,
    [libroId]
  );

  if (libros.length === 0) {
    throw new Error('El libro seleccionado no existe');
  }

  if (libros[0].disponibles <= 0) {
    throw new Error(`No hay ejemplares disponibles de "${libros[0].titulo}"`);
  }

  const sqlInsertar = `
    INSERT INTO prestamos (usuario_id, libro_id, fecha_prestamo, estado)
    VALUES (?, ?, CURDATE(), 'activo')
  `;
  const [resultado] = await pool.query(sqlInsertar, [usuarioId, libroId]);

  await pool.query(
    `UPDATE libros SET disponibles = disponibles - 1 WHERE id = ?`,
    [libroId]
  );

  return {
    id: resultado.insertId,
    mensaje: 'Préstamo registrado con éxito'
  };
}

// 3. Marcar un préstamo como devuelto y sumar 1 unidad de vuelta al libro
async function devolverPrestamo(prestamoId) {
  const [prestamos] = await pool.query(
    `SELECT libro_id, estado FROM prestamos WHERE id = ?`,
    [prestamoId]
  );

  if (prestamos.length === 0) {
    throw new Error('El préstamo no existe');
  }

  if (prestamos[0].estado === 'devuelto') {
    throw new Error('Este libro ya fue devuelto anteriormente');
  }

  const libroId = prestamos[0].libro_id;

  await pool.query(
    `UPDATE prestamos SET estado = 'devuelto', fecha_devolucion = CURDATE() WHERE id = ?`,
    [prestamoId]
  );

  await pool.query(
    `UPDATE libros SET disponibles = disponibles + 1 WHERE id = ?`,
    [libroId]
  );

  return { mensaje: 'Libro devuelto correctamente a la biblioteca' };
}

module.exports = {
  obtenerPrestamos,
  crearPrestamo,
  devolverPrestamo
};
