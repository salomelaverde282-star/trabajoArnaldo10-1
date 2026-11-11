# Biblioteca AcademiaAds — JavaScript + MariaDB en 3 capas

## 1. ¿De qué trata este proyecto?

Es un sistema de gestión de biblioteca hecho con **JavaScript puro** (sin frameworks) y **MariaDB**. Permite:

- Iniciar sesión con correo y contraseña.
- Administrar **libros** (listar, crear, eliminar).
- Administrar **usuarios** (listar, crear, eliminar), guardando las contraseñas encriptadas.
- Registrar **préstamos** y **devoluciones**, actualizando automáticamente cuántos ejemplares quedan disponibles.

Proviene del curso práctico "Desarrollo con JavaScript y MariaDB" de AcademiaADS (6 sesiones de 45 minutos). El objetivo es aprender cómo se separa una aplicación en capas y cómo se comunican entre sí.

## 2. Arquitectura en tres capas

El programa se divide en tres carpetas, cada una con una responsabilidad estricta:

| Capa | Carpeta | Qué hace | Qué NO hace |
|------|---------|----------|-------------|
| 1. Cliente (Frontend) | `src/frontend` | Muestra las páginas, el menú lateral y las tablas. Corre en el navegador. | Nunca habla directamente con MariaDB. Solo envía peticiones HTTP al servidor. |
| 2. Intermediario (Middleware) | `src/middleware` | Filtra y protege: encripta contraseñas con SHA-256, crea y verifica sesiones, lee los datos JSON que llegan. | No consulta tablas ni dibuja pantallas. |
| 3. Datos (Backend) | `src/backend` | Es la única capa que conoce MariaDB. Abre la conexión (puerto 3306) y ejecuta SELECT, INSERT, UPDATE y DELETE. | No conoce nada de la pantalla. |

**Flujo de una petición:** Navegador (Frontend) → `server.js` → Middleware (¿tiene sesión válida?) → Backend (consulta a MariaDB) → respuesta JSON → Navegador.

Ventaja: si mañana se cambia todo el diseño visual, el Middleware y el Backend no se tocan.

## 3. Conceptos base

- **JavaScript del navegador vs. Node.js:** el JavaScript del navegador solo puede dibujar botones y ventanas; por seguridad no puede abrir conexiones a bases de datos. Node.js ejecuta JavaScript fuera del navegador (en el servidor) y sí puede hablar con MariaDB.
- **MariaDB vs. gestor visual (HeidiSQL / phpMyAdmin):** MariaDB es el servicio que guarda los datos y escucha en el puerto 3306. HeidiSQL y phpMyAdmin son solo ventanas gráficas para ver las tablas.

## 4. Estructura de carpetas

```
crudJS10/
├── database/
│   └── schema.sql          # Script SQL: crea la base de datos y las 3 tablas
├── src/
│   ├── backend/            # Capa de datos (MariaDB)
│   │   ├── db.js           # Conexión (Pool) y creación automática de tablas/datos iniciales
│   │   ├── libros.js       # Consultar, crear y eliminar libros
│   │   ├── usuarios.js     # Consultar, buscar, crear y eliminar usuarios
│   │   └── prestamos.js    # Préstamos, devoluciones e INNER JOIN
│   ├── middleware/         # Capa intermedia (seguridad)
│   │   ├── auth.js         # SHA-256 + Salt, sesiones en memoria, verificación de token
│   │   └── request.js      # Leer el cuerpo JSON y responder en JSON
│   └── frontend/           # Capa de cliente (navegador)
│       ├── login.html      # Pantalla de inicio de sesión
│       ├── index.html      # Panel principal con menú lateral (Sidebar) en Tailwind
│       └── app.js          # Lógica del navegador: fetch(), tablas, formularios
├── server.js               # Servidor HTTP nativo (puerto 3000) y enrutador
└── package.json            # Datos del proyecto y dependencia mysql2
```

## 5. Cómo se construyó, sesión por sesión

1. **Sesión 01 — Estructura y modelado de datos.** Se crean las carpetas, el `package.json` (única dependencia: `mysql2`) y el `schema.sql` con las tablas `usuarios`, `libros` y `prestamos`.
2. **Sesión 02 — Backend: conexión y CRUD de libros.** `db.js` abre un Pool de conexiones a MariaDB y `libros.js` programa listar, crear y eliminar libros con consultas parametrizadas.
3. **Sesión 03 — Middleware: seguridad y usuarios.** `auth.js` encripta contraseñas y maneja sesiones, `request.js` lee/responde JSON y `usuarios.js` guarda usuarios con la contraseña ya encriptada.
4. **Sesión 04 — Backend: préstamos.** `prestamos.js` cruza tres tablas con INNER JOIN y mantiene el stock de cada libro al prestar y devolver.
5. **Sesión 05 — Servidor HTTP.** `server.js` escucha en el puerto 3000, entrega los archivos del frontend y dirige cada ruta `/api/...` hacia el Middleware y el Backend.
6. **Sesión 06 — Frontend.** `login.html`, `index.html` y `app.js` construyen la interfaz y se comunican con el servidor mediante `fetch()`.

## 6. Qué es cada cosa (explicación por archivo)

### `database/schema.sql`
Define la base `biblioteca_academiaads` y sus tablas:
- **usuarios:** `id`, `nombre`, `correo` (único), `password_hash` (64 caracteres), `rol` (`admin` o `lector`), `creado_en`.
- **libros:** `id`, `titulo`, `autor`, `isbn`, `disponibles` (stock), `creado_en`.
- **prestamos:** `id`, `usuario_id`, `libro_id`, `fecha_prestamo`, `fecha_devolucion`, `estado` (`activo` o `devuelto`).

Relaciones: un usuario puede tener muchos préstamos (1:N) y un libro puede aparecer en muchos préstamos con el tiempo. La tabla `prestamos` es la tabla puente y usa dos **llaves foráneas** (`usuario_id`, `libro_id`).

Instrucciones SQL importantes:
- `INT AUTO_INCREMENT PRIMARY KEY`: número de identificación que MariaDB asigna solo (1, 2, 3…).
- `NOT NULL UNIQUE`: obligatorio y sin repetidos (evita dos cuentas con el mismo correo).
- `VARCHAR(64)` en `password_hash`: SHA-256 siempre produce 64 caracteres hexadecimales.
- `ENUM('admin','lector')`: la columna solo acepta los valores listados.
- `FOREIGN KEY ... REFERENCES`: impide registrar un préstamo de un usuario o libro que no existe.
- `ON DELETE CASCADE`: si se borra un usuario o un libro, se borran automáticamente sus préstamos asociados.

### `src/backend/db.js`
- Crea un **Pool de conexiones** (`mysql.createPool`): mantiene conexiones abiertas listas para reutilizar, en lugar de abrir una nueva por cada clic.
- `verificarBaseDeDatos()`: si la base o las tablas no existen, las crea; inserta dos usuarios iniciales y tres libros de ejemplo. Así el proyecto funciona aunque no se haya ejecutado `schema.sql`.
- Usa `mysql2/promise` para poder escribir `async` / `await`.

### `src/backend/libros.js`
- `obtenerLibros()`: devuelve todos los libros (el más nuevo primero).
- `crearLibro(...)`: inserta un libro y devuelve el `id` que MariaDB le asignó (`insertId`).
- `eliminarLibro(id)`: borra un libro por su id.
- Todas las consultas usan marcadores `?` (consultas parametrizadas) para evitar la **Inyección SQL**. Nunca se concatenan variables con `+` dentro del SQL.

### `src/middleware/auth.js`
- `encriptarPassword`: une la contraseña con una cadena secreta (**Salt**) y calcula su **SHA-256** con el módulo nativo `crypto`. Ejemplo: `123456` + `AcademiaAds_2026` → hash de 64 caracteres.
- `verificarPassword`: encripta lo que escribió el usuario y lo compara con el hash guardado en MariaDB.
- `crearSesion`: genera un **token** aleatorio (24 bytes) y guarda los datos del usuario en un `Map` en memoria.
- `eliminarSesion`: borra el token al cerrar sesión.
- `verificarAutenticacion`: lee la cabecera `Authorization: Bearer <token>` y comprueba que exista en el `Map`.
- SHA-256 es de una sola vía: desde el hash no se puede recuperar la contraseña original. Además, cambiar una sola letra cambia por completo el hash (efecto avalancha).
- Las sesiones viven en memoria: al reiniciar `node server.js` se pierden y hay que volver a iniciar sesión.

### `src/middleware/request.js`
- `leerBodyJSON(req)`: Node.js entrega el cuerpo de una petición por fragmentos (eventos `data` y `end`). Esta función los une y los convierte en un objeto con `JSON.parse()`.
- `responderJSON(res, codigo, datos)`: envía la respuesta en formato JSON con el código HTTP indicado.

### `src/backend/usuarios.js`
- `obtenerUsuarios`, `buscarUsuarioPorCorreo`, `crearUsuario`, `eliminarUsuario`.
- `crearUsuario` primero encripta la contraseña con el Middleware y guarda únicamente el hash.

### `src/backend/prestamos.js`
- `obtenerPrestamos`: usa **INNER JOIN** para reunir en una sola consulta datos de `prestamos`, `usuarios` y `libros`. Los alias de tabla (`p`, `u`, `l`) evitan la ambigüedad de columnas con el mismo nombre (`id`). Los alias de columna (`AS usuario_nombre`) dan nombres claros al JSON.
- `crearPrestamo`: verifica que el libro exista y tenga ejemplares; si es así, inserta el préstamo con la fecha actual (`CURDATE()`) y resta 1 al stock.
- `devolverPrestamo`: verifica que el préstamo exista y no esté ya devuelto; lo marca `devuelto`, guarda la fecha y suma 1 al stock.
- Cuando algo no se cumple se lanza `throw new Error(...)` y el servidor lo responde como error.

### `server.js`
- Usa `http.createServer` (módulo nativo de Node.js) y escucha en el **puerto 3000** después de verificar la conexión con MariaDB.
- **A. Archivos del frontend:** entrega `login.html`, `index.html` y `app.js` leyéndolos con el módulo `fs`.
- **B. Ruta pública** `POST /api/login`: valida correo y contraseña y devuelve un token. Está programada antes del filtro de seguridad porque aún no se tiene token al iniciar sesión.
- **C. Filtro de seguridad:** toda ruta que empiece por `/api/` exige un token válido; si no, responde 401.
- Códigos HTTP usados: 200 (éxito), 201 (creado), 400 (error en la operación), 401 (no autorizado), 404 (no encontrado), 500 (error del servidor).
- Datos por **cuerpo JSON** (POST) cuando son varios o sensibles; por **parámetros de URL** (`?id=5`) cuando solo se necesita un id (DELETE).

### `src/frontend/login.html`
Formulario de ingreso hecho con Tailwind CSS. Al enviarlo hace `fetch('/api/login')`; si es correcto guarda el token y los datos del usuario en `localStorage` y redirige a `/index.html`. Si ya hay token guardado, redirige directamente al panel.

### `src/frontend/index.html`
Panel principal. Un contenedor con `flex` reúne un **Sidebar** fijo de ancho `w-64` (menú Libros / Usuarios / Préstamos y botón Cerrar Sesión) y un área `main` con tres secciones (libros, usuarios, préstamos), cada una con su formulario y su tabla. Solo una sección se muestra a la vez.

### `src/frontend/app.js`
- `peticionAPI(url, metodo, datos)`: centraliza todas las llamadas con `fetch()` y adjunta `Authorization: Bearer <token>`. Si el servidor responde 401, borra la sesión y vuelve al login.
- `mostrarMensaje`: muestra avisos de éxito o error.
- `cambiarSeccion`: muestra la sección elegida, resalta el botón del menú y recarga los datos.
- `cargarLibros`, `cargarUsuarios`, `cargarPrestamos`: piden los datos al servidor e inyectan filas `<tr>` en las tablas (manipulación del **DOM**) sin recargar la página. Usan comillas invertidas (plantillas) para armar el HTML con variables.
- `cargarPrestamos` usa `Promise.all` para pedir usuarios, libros y préstamos en paralelo.
- `cerrarSesion`: avisa al servidor y borra el token del navegador.

## 7. Cómo ejecutarlo

Requisitos: Node.js y un servidor MariaDB/MySQL encendido en `localhost:3306` (por ejemplo con XAMPP o Laragon).

1. Clonar el repositorio y abrir la carpeta del proyecto en la terminal.
2. Instalar dependencias:
   ```
   npm install
   ```
3. (Opcional) Ejecutar `database/schema.sql` en HeidiSQL o phpMyAdmin. Si no se hace, `db.js` crea todo automáticamente.
4. Iniciar el servidor:
   ```
   npm start
   ```
5. Abrir `http://localhost:3000` en el navegador.
6. Ingresar con el usuario de prueba: `admin@academiaads.com` / contraseña `123456`.

Si tu MariaDB tiene contraseña para `root`, colócala en la propiedad `password` de `configConexion` dentro de `src/backend/db.js`.

## 8. API del servidor

| Método | Ruta | Requiere sesión | Qué hace |
|--------|------|-----------------|----------|
| POST | `/api/login` | No | Inicia sesión y devuelve un token |
| POST | `/api/logout` | Sí | Cierra la sesión |
| GET | `/api/libros` | Sí | Lista los libros |
| POST | `/api/libros` | Sí | Crea un libro |
| DELETE | `/api/libros?id=N` | Sí | Elimina un libro |
| GET | `/api/usuarios` | Sí | Lista los usuarios |
| POST | `/api/usuarios` | Sí | Crea un usuario (contraseña encriptada) |
| DELETE | `/api/usuarios?id=N` | Sí | Elimina un usuario |
| GET | `/api/prestamos` | Sí | Lista los préstamos (INNER JOIN) |
| POST | `/api/prestamos` | Sí | Registra un préstamo y descuenta stock |
| POST | `/api/prestamos/devolver` | Sí | Registra la devolución y repone stock |

## 9. Errores frecuentes y solución

| Síntoma | Causa | Solución |
|---------|-------|----------|
| `'npm' no se reconoce como un comando` | Node.js no está instalado o no se reinició VS Code | Instalar Node.js desde nodejs.org y reiniciar VS Code |
| `Error #1046 - No database selected` | Se ejecutó el SQL sin la línea `USE biblioteca_academiaads;` | Ejecutar `schema.sql` completo desde la primera línea |
| `errno: 150 Foreign key constraint` | Se creó `prestamos` antes que `usuarios` y `libros` | Respetar el orden: primero tablas maestras, al final `prestamos` |
| `connect ECONNREFUSED 127.0.0.1:3306` | MariaDB está apagado | Iniciar el servicio en XAMPP, Laragon o Servicios de Windows |
| `Access denied for user root@localhost` | `root` tiene contraseña | Escribirla en `password` de `src/backend/db.js` |
| `Column 'id' in field list is ambiguous` | Falta el alias de tabla en un JOIN | Usar `p.id`, `u.id` o `l.id` |
| `EADDRINUSE: address already in use :::3000` | Ya hay otro servidor corriendo | Cerrar la otra terminal o presionar Ctrl + C |
| `Cannot find module ./src/backend/libros` | Nombre o ruta de archivo incorrectos | Verificar nombres en minúsculas y carpetas |
| `ERR_HTTP_HEADERS_SENT` | Falta `return` antes de `responderJSON(...)` | Anteponer siempre `return` |
| Redirige solo al login | Se reinició el servidor y se perdieron las sesiones | Volver a iniciar sesión |
| La página se recarga al enviar un formulario | Falta `e.preventDefault()` | Ponerlo en la primera línea del manejador `submit` |
| Contraseña válida rechazada | Se cambió `SALT_SECRETA` | Mantener `AcademiaAds_2026` sin cambios |

## 10. Herramientas de depuración (tecla F12)

- **Console:** muestra errores de JavaScript en rojo.
- **Network:** muestra cada llamada `fetch()`, su código de estado y el JSON recibido.
- **Application → Local Storage:** muestra el token `token_academiaads` guardado al iniciar sesión.

## 11. Glosario rápido

- **Pool de conexiones:** conjunto de conexiones a la base de datos que se reutilizan.
- **Consulta parametrizada:** consulta SQL con marcadores `?` que protege contra Inyección SQL.
- **Hash SHA-256:** resumen de 64 caracteres que no se puede revertir.
- **Salt (sal):** texto secreto que se añade a la contraseña antes de aplicar el hash.
- **Token:** identificador aleatorio que prueba que el usuario inició sesión.
- **Middleware:** capa intermedia que filtra y valida antes de llegar a los datos.
- **INNER JOIN:** une filas de varias tablas donde las llaves coinciden.
- **Llave foránea:** columna que apunta al `id` de otra tabla.
- **DOM:** árbol de objetos que el navegador crea a partir del HTML; JavaScript lo modifica sin recargar la página.
- **Fetch API:** función del navegador para hacer peticiones HTTP.

Material de cátedra: AcademiaADS — Módulo MOD-JS-SQL.
