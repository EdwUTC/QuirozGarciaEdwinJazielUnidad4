# Análisis y propuesta de mejora

Consultorio Psicológico Infantil "Un Rayito de Sol"
Revisión técnica, de negocio y de diseño — noviembre de 2026

---

## 1. Diagnóstico general

La aplicación ya cubre el núcleo de un consultorio: sitio público, cuentas con
tres roles, agenda de citas, diario de emociones, perfil y dos áreas de
contenido (niños y padres). La base es sólida: consultas parametrizadas,
contraseñas con bcrypt, CSRF, límite de peticiones, sesión regenerada al
entrar y cabeceras con helmet.

Lo que sigue es la diferencia entre "un proyecto que funciona" y "un producto
que se puede operar". Está ordenado por prioridad real, no por lucimiento.

---

## 2. Funcionamiento (técnico)

### 2.1 Hallazgos de prioridad alta

| Hallazgo | Por qué importa | Solución propuesta |
| --- | --- | --- |
| **Sesiones en memoria** (`MemoryStore`) | Se pierden al reiniciar y no funcionan con más de un proceso. | `connect-pg-simple` sobre la misma base. |
| **Sin pruebas automatizadas** | Cada cambio se valida a mano; el riesgo crece con el código. | `node:test` + `supertest` para rutas y `schema.sql` en una base de pruebas. |
| **Sin respaldos** | Un `DROP` accidental borra la operación completa. | `pg_dump` diario a disco externo + prueba de restauración mensual. |
| **Sin aviso de privacidad ni consentimiento** | En México la LFPDPPP obliga al tratar datos de menores. | Documento + casilla de aceptación al registrarse y al agendar. |

### 2.2 Prioridad media

| Hallazgo | Solución propuesta |
| --- | --- |
| Validación manual repetida en cada ruta | Centralizar con `zod` o `express-validator` y un middleware de validación. |
| Sin paginación en citas, diario y buzón | `LIMIT`/`OFFSET` con controles de página. |
| `schema.sql` idempotente, pero sin migraciones versionadas | Carpeta `db/migrations` con numeración y una tabla `migraciones`. |
| Límite de peticiones en memoria | Mismo almacén que las sesiones (Postgres o Redis). |
| `timestamp` sin zona horaria | Migrar a `timestamptz` y fijar `TimeZone` en la conexión. |
| Errores async con `try/catch` repetido | Middleware de errores central y un `asyncHandler`. |
| Sin registro de auditoría | Tabla `auditoria` (quién, qué, cuándo) para cambios de citas y usuarios. |
| Sin CI | GitHub Actions: `node --check`, pruebas y `npm audit` en cada push. |
| CSP con `'unsafe-inline'` | Migrar los scripts inline a archivos y usar nonces. |

### 2.3 Prioridad baja

- Caché de estáticos (`Cache-Control` en `/public`).
- Borrado lógico (`activo`) en lugar de `DELETE`.
- Compresión (`compression`) y `ETag` en respuestas HTML.
- Separar `app.js` en `app.js` (configuración) y `server.js` (arranque) para poder testear.

---

## 3. Negocio

### 3.1 Lo que hoy no existe y un consultorio necesita

| Necesidad | Impacto | Esfuerzo |
| --- | --- | --- |
| **Disponibilidad real por especialista** (horarios por día, vacaciones, bloqueos) | Alto: hoy todos comparten los mismos 8 horarios. | Medio |
| **Recordatorios automáticos** 24 h antes por correo o WhatsApp | Alto: reduce inasistencias entre 30 % y 50 %. | Medio |
| **Confirmar o cancelar desde el enlace del correo** | Alto: quita trabajo manual a recepción. | Medio |
| **Expediente clínico** con notas por sesión y acceso restringido | Alto: es el corazón de un consultorio. | Alto |
| **Consentimiento informado y aviso de privacidad** | Alto: obligación legal. | Bajo |
| **Vinculación médico ↔ especialista** | Medio: hoy el médico ve todas las citas. | Bajo |
| **Lista de espera** y liberación automática de lugares | Medio: aprovecha cancelaciones. | Medio |
| **Encuesta de satisfacción** al cerrar la cita | Medio: mide calidad y da testimonio. | Bajo |
| **Pagos o anticipos** en línea | Medio: reduce plantones. | Alto |
| **Teleconsulta** (videollamada) | Medio: amplía cobertura. | Alto |

### 3.2 Indicadores que conviene medir desde ya

- Citas por semana y por especialista.
- Tasa de asistencia (atendidas / agendadas).
- Tiempo promedio entre la solicitud y la primera cita.
- Porcentaje de cancelaciones y quién cancela.
- Artículos de la biblioteca más leídos (requiere registrar visitas).

### 3.3 La biblioteca para padres como motor de captación

Contenido útil y bien posicionado es la forma más barata de que una familia
encuentre el consultorio. Siguiente paso natural:

1. Meta descripción y Open Graph por artículo.
2. `sitemap.xml` y `robots.txt`.
3. Un formulario de suscripción ("un correo al mes con una guía").
4. Enlazar cada artículo con el servicio relacionado y con "agendar cita".

---

## 4. Diseño y experiencia

### 4.1 Sistema visual

| Problema | Propuesta |
| --- | --- |
| Cuatro hojas CSS (`style`, `interactivo`, `clinica`, `contenido`) con valores repetidos | Tokens en `:root`: color, radio, sombra, espaciado; y una sola hoja base. |
| Colores definidos a mano en cada archivo | Variables (`--color-primario`, `--radio-tarjeta`, `--sombra-suave`). |
| Mezcla de emojis e iconos de Font Awesome | Regla: emojis solo en la zona infantil; iconos en la zona adulta. |
| Amarillo `#ffc107` como color de texto sobre blanco | No cumple contraste AA. Usarlo solo como fondo o borde. |

### 4.2 Accesibilidad (objetivo: WCAG 2.1 AA)

- Enlace "saltar al contenido" al inicio del `body`.
- Revisar contraste de textos secundarios en modo claro y oscuro.
- Área táctil mínima de 44 × 44 px en botones de móvil.
- Mensajes de error junto al campo, no solo como aviso flotante.
- Probar todo el flujo solo con teclado y con lector de pantalla.

### 4.3 Contenido y voz

La aplicación atiende a dos públicos que no deben mezclarse:

- **Niños**: tono lúdico, frases cortas, emojis, recompensas (medallas).
  Todo lo infantil vive en `/rincon`.
- **Adultos**: tono profesional, información verificable, sin infantilizar.
  Todo lo informativo vive en `/padres`.

Esa separación ya está aplicada y conviene mantenerla como regla de diseño.

### 4.4 Estados que faltan

- Página de carga o "esqueleto" mientras se consultan datos.
- Estado vacío con acción sugerida (hoy algunos solo dicen "no hay").
- Confirmación antes de cancelar una cita (hoy se cancela con un clic).

---

## 5. Lo implementado en esta iteración

| Área | Cambio |
| --- | --- |
| **Para padres** | Nueva sección `/padres` con biblioteca de 6 artículos, filtro por categoría, página de detalle, artículos relacionados y aviso de que no sustituye una evaluación profesional. |
| **Para niños** | Sección "Aprende las emociones" con 6 tarjetas desplegables (qué se siente y qué ayuda) y sistema de 3 medallas que se guardan en el dispositivo. |
| **Portada** | Reescrita como página de aterrizaje: hero con llamado a la acción, pilares del consultorio, servicios, presentación de la licenciada, línea de tiempo de participaciones y carrusel de actividades. |
| **Actividades** | Nueva página `/actividades` con las seis actividades del consultorio, enlazada desde el menú y desde la portada. |
| **Mensajería privada** | Nuevo canal `/mensajes` entre cada paciente y la licenciada: hilo por conversación, bandeja con contador de no leídos y actualización automática. Sustituye al antiguo `/chat`, donde **cualquier usuario con sesión podía leer los mensajes de todos**. |
| **API REST propia** | Endpoints JSON en `/api` (estado, especialistas, citas, diario y mensajes) con códigos HTTP correctos, sesión, CSRF y límite de peticiones. Documentada en `docs/API.md` y consumida por el chat. |
| **Audiencias** | Dos accesos claros desde la portada: "Para niños y niñas" (Rincón) y "Para la familia" (guías). |
| **Navegación** | "Padres" en el menú principal; pie de página con enlaces secundarios (incluido el mapa del sitio). |
| **Contenido** | El catálogo vive en la tabla `recursos`, así que se pueden publicar artículos sin tocar código. |

---

## 6. Hoja de ruta sugerida

### Ahora (1 a 2 semanas)

1. Aviso de privacidad y consentimiento al registrarse.
2. Sesiones en Postgres.
3. Recordatorio de cita por correo (24 h antes).
4. Horarios reales por especialista.
5. Pruebas automatizadas de las rutas principales.

### Siguiente (1 a 2 meses)

6. Expediente clínico con permisos por rol.
7. Confirmación y cancelación desde el correo.
8. Encuesta de satisfacción.
9. CI con GitHub Actions.
10. SEO: metadatos, `sitemap.xml` y Open Graph.

### Después

11. Pagos o anticipos en línea.
12. Teleconsulta.
13. Lista de espera automática.
14. Segundo factor para administradores.
15. Auditoría de cambios.

---

> Este documento es una guía de trabajo, no una lista de deseos: cada punto
> tiene un motivo concreto y un orden pensado para que el sistema siga
> funcionando mientras crece.
