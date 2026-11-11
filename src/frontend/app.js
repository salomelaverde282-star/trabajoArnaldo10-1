const token = localStorage.getItem('token_academiaads');
const usuarioGuardado = JSON.parse(localStorage.getItem('usuario_academiaads') || 'null');

if (!token || !usuarioGuardado) {
  window.location.href = '/login.html';
} else {
  document.getElementById('nombreUsuarioActivo').textContent =
    `${usuarioGuardado.nombre} (${usuarioGuardado.rol})`;
}

async function peticionAPI(url, metodo = 'GET', datos = null) {
  const opciones = {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  if (datos) {
    opciones.body = JSON.stringify(datos);
  }

  const respuesta = await fetch(url, opciones);

  if (respuesta.status === 401) {
    localStorage.removeItem('token_academiaads');
    localStorage.removeItem('usuario_academiaads');
    window.location.href = '/login.html';
    return null;
  }

  const resultado = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(resultado.error || 'Ocurrió un error en el servidor');
  }

  return resultado;
}

function mostrarMensaje(texto, tipo = 'exito') {
  const caja = document.getElementById('notificacion');
  caja.textContent = texto;
  caja.className = 'mb-6 px-4 py-3 rounded-lg text-sm font-medium border ';
  caja.className += tipo === 'exito'
    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
    : 'bg-red-50 border-red-300 text-red-800';

  setTimeout(() => caja.classList.add('hidden'), 3500);
}

function cambiarSeccion(seccion) {
  ['libros', 'usuarios', 'prestamos'].forEach((nombre) => {
    const divSeccion = document.getElementById(`seccion-${nombre}`);
    const botonMenu = document.getElementById(`btnMenu-${nombre}`);

    if (nombre === seccion) {
      divSeccion.classList.remove('hidden');
      botonMenu.className = 'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition bg-indigo-600 text-white';
    } else {
      divSeccion.classList.add('hidden');
      botonMenu.className = 'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition text-slate-300 hover:bg-slate-800';
    }
  });

  if (seccion === 'libros') cargarLibros();
  if (seccion === 'usuarios') cargarUsuarios();
  if (seccion === 'prestamos') cargarPrestamos();
}

// MÓDULO 1: LIBROS
async function cargarLibros() {
  try {
    const libros = await peticionAPI('/api/libros');
    if (!libros) return;
    const tbody = document.getElementById('tablaLibros');
    tbody.innerHTML = '';

    libros.forEach((libro) => {
      tbody.innerHTML += `
        <tr class="hover:bg-slate-50">
          <td class="py-3 px-4 font-semibold text-slate-600">#${libro.id}</td>
          <td class="py-3 px-4 font-medium text-slate-900">${libro.titulo}</td>
          <td class="py-3 px-4 text-slate-600">${libro.autor}</td>
          <td class="py-3 px-4 font-mono text-xs text-slate-500">${libro.isbn}</td>
          <td class="py-3 px-4">${libro.disponibles} disponibles</td>
          <td class="py-3 px-4 text-right">
            <button onclick="borrarLibro(${libro.id})" class="text-red-600 hover:text-red-800 text-xs font-semibold">Eliminar</button>
          </td>
        </tr>
      `;
    });
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  }
}

document.getElementById('formLibro').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await peticionAPI('/api/libros', 'POST', {
      titulo: document.getElementById('libroTitulo').value.trim(),
      autor: document.getElementById('libroAutor').value.trim(),
      isbn: document.getElementById('libroIsbn').value.trim(),
      disponibles: Number(document.getElementById('libroDisponibles').value)
    });
    e.target.reset();
    mostrarMensaje('Libro guardado en MariaDB correctamente');
    cargarLibros();
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  }
});

async function borrarLibro(id) {
  if (!confirm('¿Deseas eliminar este libro?')) return;
  try {
    await peticionAPI(`/api/libros?id=${id}`, 'DELETE');
    cargarLibros();
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  }
}

// MÓDULO 2: USUARIOS
async function cargarUsuarios() {
  try {
    const usuarios = await peticionAPI('/api/usuarios');
    if (!usuarios) return;
    const tbody = document.getElementById('tablaUsuarios');
    tbody.innerHTML = '';

    usuarios.forEach((u) => {
      const hashCorto = u.password_hash ? `${u.password_hash.substring(0, 22)}...` : '';
      tbody.innerHTML += `
        <tr class="hover:bg-slate-50">
          <td class="py-3 px-4 font-semibold text-slate-600">#${u.id}</td>
          <td class="py-3 px-4 font-medium text-slate-900">${u.nombre}</td>
          <td class="py-3 px-4 text-slate-600">${u.correo}</td>
          <td class="py-3 px-4 uppercase text-xs font-semibold">${u.rol}</td>
          <td class="py-3 px-4 font-mono text-xs text-slate-500" title="${u.password_hash}">${hashCorto}</td>
          <td class="py-3 px-4 text-right">
            <button onclick="borrarUsuario(${u.id})" class="text-red-600 hover:text-red-800 text-xs font-semibold">Eliminar</button>
          </td>
        </tr>
      `;
    });
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  }
}

document.getElementById('formUsuario').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await peticionAPI('/api/usuarios', 'POST', {
      nombre: document.getElementById('usuarioNombre').value.trim(),
      correo: document.getElementById('usuarioCorreo').value.trim(),
      password: document.getElementById('usuarioPassword').value,
      rol: document.getElementById('usuarioRol').value
    });
    e.target.reset();
    mostrarMensaje('Usuario creado con contraseña encriptada en SHA-256');
    cargarUsuarios();
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  }
});

async function borrarUsuario(id) {
  if (!confirm('¿Deseas eliminar este usuario?')) return;
  try {
    await peticionAPI(`/api/usuarios?id=${id}`, 'DELETE');
    cargarUsuarios();
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  }
}

// MÓDULO 3: PRÉSTAMOS
async function cargarPrestamos() {
  try {
    const [usuarios, libros, prestamos] = await Promise.all([
      peticionAPI('/api/usuarios'),
      peticionAPI('/api/libros'),
      peticionAPI('/api/prestamos')
    ]);

    document.getElementById('prestamoUsuarioId').innerHTML = usuarios
      .map((u) => `<option value="${u.id}">${u.nombre} (${u.correo})</option>`)
      .join('');

    const disponibles = libros.filter((l) => l.disponibles > 0);
    document.getElementById('prestamoLibroId').innerHTML = disponibles.length
      ? disponibles.map((l) => `<option value="${l.id}">${l.titulo} (${l.disponibles} disp.)</option>`).join('')
      : '<option value="">-- Sin ejemplares disponibles --</option>';

    const tbody = document.getElementById('tablaPrestamos');
    tbody.innerHTML = '';

    prestamos.forEach((p) => {
      const fPrestamo = p.fecha_prestamo ? p.fecha_prestamo.toString().substring(0, 10) : '-';
      const fDevolucion = p.fecha_devolucion ? p.fecha_devolucion.toString().substring(0, 10) : 'Pendiente';
      const esActivo = p.estado === 'activo';

      tbody.innerHTML += `
        <tr class="hover:bg-slate-50">
          <td class="py-3 px-4 font-semibold text-slate-600">#${p.id}</td>
          <td class="py-3 px-4 font-medium text-slate-900">${p.usuario_nombre}</td>
          <td class="py-3 px-4 text-slate-700">${p.libro_titulo}</td>
          <td class="py-3 px-4 text-slate-600">${fPrestamo}</td>
          <td class="py-3 px-4 text-slate-600">${fDevolucion}</td>
          <td class="py-3 px-4 uppercase text-xs font-semibold">${p.estado}</td>
          <td class="py-3 px-4 text-right">
            ${esActivo
              ? `<button onclick="marcarDevuelto(${p.id})" class="bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Devolver Libro</button>`
              : '<span class="text-xs text-slate-400">Completado</span>'}
          </td>
        </tr>
      `;
    });
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  }
}

document.getElementById('formPrestamo').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await peticionAPI('/api/prestamos', 'POST', {
      usuario_id: Number(document.getElementById('prestamoUsuarioId').value),
      libro_id: Number(document.getElementById('prestamoLibroId').value)
    });
    mostrarMensaje('Préstamo registrado con éxito');
    cargarPrestamos();
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  }
});

async function marcarDevuelto(prestamoId) {
  try {
    await peticionAPI('/api/prestamos/devolver', 'POST', { id: prestamoId });
    mostrarMensaje('Libro devuelto correctamente');
    cargarPrestamos();
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  }
}

async function cerrarSesion() {
  try { await peticionAPI('/api/logout', 'POST'); } catch (e) {}
  localStorage.removeItem('token_academiaads');
  localStorage.removeItem('usuario_academiaads');
  window.location.href = '/login.html';
}

cargarLibros();
