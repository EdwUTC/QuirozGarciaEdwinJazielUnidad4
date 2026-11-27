# Despliegue en la nube — Unidad 4

Stack 100 % gratuito y **sin tarjeta de crédito**, elegido porque el acceso a
Azure de la cuenta institucional está bloqueado y el pack de GitHub ya no
incluye DigitalOcean.

---

## Arquitectura

```
                    rayitodesol.me
                          │
        Cloudflare (DNS + HTTPS + balanceador)
                          │
          ┌───────────────┴───────────────┐
   rayito-app-1                    rayito-app-2
   (Render, free)                  (Render, free)
          └───────────────┬───────────────┘
                          │
                    Neon (PostgreSQL)
```

| Requisito de la unidad | Servicio |
|---|---|
| Servidor de aplicaciones | 2 Web Services de Render |
| Servidor de base de datos | Neon (PostgreSQL gestionado) |
| Balanceo de cargas | Cloudflare Worker (`deploy/cloudflare-worker.js`) |
| Configuración de dominio | Namecheap `.me` + DNS en Cloudflare |
| Certificados de seguridad | HTTPS automático de Cloudflare y Render |

Las sesiones viven en PostgreSQL, así que cualquiera de las dos instancias
atiende al mismo usuario.

---

## 1. Base de datos (Neon)

1. Crear cuenta en <https://neon.tech> (se puede con GitHub).
2. Crear un proyecto; anotar la cadena de conexión.
3. Cargar el esquema:

   ```bash
   psql "postgresql://USUARIO:PASSWORD@HOST/DB?sslmode=require" -f schema.sql
   ```

4. Guardar estos valores para Render: host, puerto, base, usuario, contraseña.

## 2. Aplicación (Render)

1. Entrar a <https://render.com> con GitHub.
2. **New → Blueprint** y elegir el repositorio.
3. Render lee `render.yaml` y crea **rayito-app-1** y **rayito-app-2**.
4. Completar las variables que pide:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | la cadena de conexión de Neon |
   | `RECAPTCHA_SITE_KEY` | clave pública del captcha |
   | `RECAPTCHA_SECRET_KEY` | clave secreta del captcha |

   `SESSION_SECRET` lo genera Render, y `INSTANCE_ID`, `NODE_ENV` y
   `TRUST_PROXY` vienen definidos en el archivo.

5. Esperar el primer despliegue y comprobar:

   ```bash
   curl https://rayito-app-1.onrender.com/api/estado
   curl https://rayito-app-2.onrender.com/api/estado
   ```

   Cada una debe devolver un `"instancia"` distinto: `app-1` y `app-2`.

## 3. Dominio (Namecheap + Cloudflare)

1. Reclamar el dominio `.me` en <https://education.github.com/pack> → Namecheap.
2. Crear cuenta en <https://cloudflare.com> y agregar el dominio.
3. Copiar los *nameservers* que da Cloudflare en Namecheap.
4. En Cloudflare, crear el Worker con el contenido de
   `deploy/cloudflare-worker.mjs` y definir sus variables:

   | Variable | Valor |
   |---|---|
   | `ORIGEN_1` | `https://rayito-app-1.onrender.com` |
   | `ORIGEN_2` | `https://rayito-app-2.onrender.com` |
   | `SITIO` | `rayitodesol.me` |

5. Asociar el Worker a la ruta `rayitodesol.me/*`.
6. Añadir un *Cron Trigger* cada 10 minutos para que las instancias no se
   duerman (plan gratuito de Render).

---

## Pruebas de liberación

| Prueba | Comando o criterio |
|---|---|
| Aplicación responde | `curl -I https://rayitodesol.me/` → 200 |
| API viva | `curl https://rayitodesol.me/api/estado` → `"ok": true` |
| HTTPS | candado válido, sin advertencias |
| Dominio | `nslookup rayitodesol.me` apunta a Cloudflare |
| **Balanceo** | `for i in 1 2 3 4; do curl -s https://rayitodesol.me/api/estado; done` alterna `app-1` y `app-2` |
| Resistencia | borrar una instancia en Render y comprobar que el sitio sigue |
| Sesión compartida | iniciar sesión y navegar: no se pierde entre instancias |
| Base de datos | registro, login y citas funcionando |

### Prueba del balanceador antes de publicarlo

El Worker se puede probar sin desplegarlo: se ejecuta en Node y atiende
peticiones reales contra las dos instancias.

```bash
node deploy/probar-worker.mjs
```

Comprueba el reparto alterno, el inicio de sesión a través del dominio, la
tolerancia a fallos (una instancia caída y ambas caídas) y la tarea de
mantenimiento. Resultado esperado: `13 correctas, 0 fallas`.

---

## Limitaciones del plan gratuito

- Render suspende las instancias tras 15 minutos sin tráfico; el cron del
  Worker las mantiene activas durante la evaluación.
- Neon limita el almacenamiento; suficiente para la demostración.
- El balanceo es a nivel de aplicación (Worker), no un balanceador de red
  dedicado. Se documenta así en el informe.
