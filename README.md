# Consultorio Psicológico Infantil "Un Rayito de Sol"

Aplicación web del consultorio, desarrollada con **Node.js + Express + PostgreSQL**
para la materia de *Seguridad y Desarrollo Web*.

## Requisitos

- Node.js 18 o superior
- PostgreSQL 14 o superior

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Crear la base de datos y cargar el esquema:

   ```bash
   createdb rayito_de_sol
   psql -d rayito_de_sol -f schema.sql
   ```

3. Copiar `.env.example` a `.env` y completar los valores
   (base de datos, `SESSION_SECRET` y las llaves de reCAPTCHA).

4. Arrancar el servidor:

   ```bash
   npm start
   ```

   y abrir <http://localhost:3000>.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` | Arranca el servidor |
| `npm run dev` | Arranca con recarga automática |
| `npm run build` | Valida la sintaxis de todo el JavaScript |
| `npm run db:esquema` | Carga `schema.sql` en la base de `DATABASE_URL` |
| `npm run db:demo` | Crea las cuentas de demostración |

## Base de datos en Neon

El proyecto está preparado para usar **Neon** (PostgreSQL gestionado). El CLI
deja la cadena de conexión en `DATABASE_URL`:

```bash
neon link --project-id <id> -y
neon env pull
npm run db:esquema
npm run db:demo
npm start
```

`database/conexion.js` prefiere `DATABASE_URL` cuando existe y, si no, usa las
variables `DB_*` del entorno local.

## Roles

Cada usuario tiene un rol en la columna `usuarios.rol`:

| Rol             | Panel que ve            |
| --------------- | ----------------------- |
| `paciente`      | Panel de paciente       |
| `medico`        | Panel de médico         |
| `administrador` | Panel de administrador  |

Cualquier registro nuevo se crea con el rol `paciente`.

## Estructura

```
app.js                 Punto de entrada (helmet, sesión, CSRF, rutas)
database/conexion.js   Pool de PostgreSQL
middleware/            CSRF y límite de peticiones
routes/                auth, dashboard, clinica, padres, mensajes, api, public
services/              usuario, citas, emociones, contenido, email
views/                 Plantillas EJS + partials
public/                CSS y JavaScript del navegador
schema.sql             Esquema de la base de datos
docs/                  Documentación (seguridad, análisis y API)
```

## API REST

El proyecto expone una API propia en `/api` (JSON), documentada en
[`docs/API.md`](docs/API.md). Usa la misma sesión que la web y exige el
token CSRF en la cabecera `x-csrf-token` para los `POST` y `PATCH`.

```bash
curl http://localhost:3000/api/estado
```

## Seguridad

- Contraseñas con `bcrypt` (coste 10).
- Consultas parametrizadas (sin inyección SQL).
- Regeneración de sesión al iniciar sesión (evita *session fixation*).
- Protección **CSRF** por token en todos los formularios y en la API.
- **Límite de peticiones** en login, registro, recuperación y API.
- Recuperación de contraseña con **token de un solo uso** y caducidad.
- Cabeceras de seguridad con `helmet` (incluida CSP).
- Mensajería **privada** entre cada paciente y la licenciada.

El detalle de la auditoría está en [`docs/README-SEGURIDAD.md`](docs/README-SEGURIDAD.md).
