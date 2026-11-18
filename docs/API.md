# API REST — Un Rayito de Sol

API propia del consultorio. Todas las respuestas son **JSON** con la forma
`{ "ok": true|false, ... }`.

- **Base:** `http://localhost:3100/api`
- **Autenticación:** la misma sesión de la web (cookie `rayito.sid`).
- **CSRF:** los `POST` y `PATCH` requieren el token en la cabecera
  `x-csrf-token`. El token se entrega en la etiqueta
  `<meta name="csrf-token">` de cualquier página.
- **Límite:** 120 peticiones por minuto por IP.

---

## Endpoints

| Método | Ruta | Autenticación | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/estado` | Pública | Estado del servicio y de la base |
| `GET` | `/api/especialistas` | Pública | Catálogo de especialistas activos |
| `GET` | `/api/citas` | Sesión | Citas del usuario |
| `POST` | `/api/citas` | Sesión + CSRF | Agendar una cita |
| `PATCH` | `/api/citas/:id` | Sesión + CSRF | Cancelar una cita propia |
| `GET` | `/api/diario` | Sesión | Últimos 30 registros de emociones |
| `POST` | `/api/diario` | Sesión + CSRF | Registrar o actualizar la emoción del día |
| `GET` | `/api/mensajes` | Sesión | Conversación (staff: `?usuario=ID`) |
| `POST` | `/api/mensajes` | Sesión + CSRF | Enviar un mensaje |
| `GET` | `/api/mensajes/estado` | Sesión | Número de mensajes de la conversación |

---

## Ejemplos

### Estado del servicio

```bash
curl http://localhost:3100/api/estado
```

```json
{
  "ok": true,
  "servicio": "consultorio-rayito-de-sol",
  "version": "1.0.0",
  "base_datos": "conectada",
  "hora": "2026-11-17T15:04:05.000Z"
}
```

### Iniciar sesión y guardar la cookie

```bash
# 1. Obtener el token CSRF
TOKEN=$(curl -s -c cookies.txt http://localhost:3100/login \
  | grep -o 'name="csrf-token" content="[a-f0-9]*"' | cut -d'"' -f4)

# 2. Iniciar sesión (la API usa la misma sesión)
curl -s -b cookies.txt -c cookies.txt \
  -d "_csrf=$TOKEN&correo=prueba@rayito.test&password=Prueba123" \
  http://localhost:3100/login
```

### Agendar una cita

```bash
curl -s -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $TOKEN" \
  -d '{"especialista_id":1,"fecha":"2026-12-01","hora":"10:00","motivo":"Primera consulta"}' \
  http://localhost:3100/api/citas
```

```json
{
  "ok": true,
  "datos": { "id": 12, "fecha": "2026-12-01", "hora": "10:00", "motivo": "Primera consulta", "estado": "pendiente" }
}
```

### Cancelar una cita

```bash
curl -s -b cookies.txt -X PATCH \
  -H "x-csrf-token: $TOKEN" \
  http://localhost:3100/api/citas/12
```

### Registrar la emoción del día

```bash
curl -s -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $TOKEN" \
  -d '{"emocion":"feliz","nota":"Jugué con mis primos"}' \
  http://localhost:3100/api/diario
```

### Enviar un mensaje

```bash
curl -s -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $TOKEN" \
  -d '{"texto":"Hola, tengo una duda sobre la cita."}' \
  http://localhost:3100/api/mensajes
```

---

## Códigos de estado

| Código | Cuándo |
| --- | --- |
| `200` | Consulta correcta |
| `201` | Recurso creado (cita, registro, mensaje) |
| `400` | Datos inválidos (validación) |
| `401` | Sin sesión |
| `403` | Token CSRF inválido |
| `404` | Recurso o ruta inexistente |
| `409` | Conflicto (horario ya ocupado) |
| `429` | Demasiadas peticiones |
| `500` | Error interno |

Ejemplo de error:

```json
{ "ok": false, "error": "Ese horario ya está ocupado. Elige otro." }
```

---

## Uso desde el navegador

El chat de la aplicación ya consume esta API: `public/js/mensajes.js` envía
los mensajes con `fetch` a `POST /api/mensajes` y consulta
`GET /api/mensajes/estado` cada 10 segundos. Si JavaScript falla, el
formulario sigue funcionando de la forma tradicional.
