# Despliegue en la nube — Unidad 4

Infraestructura para publicar el consultorio con los cinco puntos que pide
la rúbrica: servidor de aplicaciones, servidor de base de datos, balanceo
de cargas, dominio y certificados.

---

## Arquitectura

```
                    Internet
                        │
              dominio (DNS) ──────────────┐
                        │                 │
            ┌───────────┴───────────┐     │
            │   Balanceador de carga │    │  TLS termina aquí
            └───────────┬───────────┘     │
                        │                 │
          ┌─────────────┴─────────────┐   │
          │                           │   │
    [ VM app-1 ]                [ VM app-2 ]
    Node + Docker               Node + Docker
          │                           │
          └─────────────┬─────────────┘
                        │
            [ PostgreSQL gestionado ]
```

Las sesiones viven en PostgreSQL, así que **cualquiera de las dos
instancias puede atender al mismo usuario**.

---

## Requisitos

- Una cuenta en un proveedor con crédito (DigitalOcean vía GitHub Student
  Pack, Azure for Students, etc.).
- Un dominio o subdominio (DuckDNS sirve y es gratis).
- El repositorio del proyecto accesible desde la VM.

---

## Opción A — Dos máquinas + balanceador del proveedor (recomendada)

1. **Crear la base de datos gestionada** (PostgreSQL 16).
   Anota host, puerto, usuario, contraseña y nombre.

2. **Cargar el esquema** desde tu equipo o desde la VM:

   ```bash
   psql "host=$DB_HOST port=25060 dbname=$DB_NOMBRE user=$DB_USUARIO sslmode=require" \
        -f schema.sql
   ```

3. **Crear dos Droplets** (Ubuntu 24.04, 1 GB) con Docker instalado:

   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

4. **Clonar y configurar en cada VM**:

   ```bash
   git clone https://github.com/EdwinQ12/QuirozGarciaEdwinJazielUnidad4.git
   cd QuirozGarciaEdwinJazielUnidad4
   cp .env.example .env
   nano .env          # DB_*, DB_SSL=true, SESSION_SECRET
   ```

5. **Levantar la aplicación**:

   ```bash
   docker build -t rayito .
   docker run -d --restart=unless-stopped --name rayito \
     --env-file .env -p 3000:3000 rayito
   ```

6. **Crear el Load Balancer** apuntando a los dos Droplets al puerto
   `3000`, con *health check* HTTP en `/api/estado`.

7. **Certificado**: el balanceador de DigitalOcean emite Let's Encrypt
   automáticamente al asociar el dominio.

8. **Dominio**: crear un registro `A` (o `CNAME`) hacia la IP del
   balanceador.

---

## Opción B — Una sola máquina con nginx

Útil si no hay balanceador del proveedor. nginx reparte entre dos
contenedores de la misma VM.

```bash
git clone https://github.com/EdwinQ12/QuirozGarciaEdwinJazielUnidad4.git
cd QuirozGarciaEdwinJazielUnidad4
cp .env.example .env && nano .env
docker compose up -d --build
```

- La app queda en `http://IP_DEL_SERVIDOR`.
- El balanceo está en `deploy/nginx.conf` (round-robin con `max_fails`).
- Para HTTPS en la propia VM: `certbot --nginx -d tu-dominio` y cambiar
  el `listen 80` por `443 ssl` en la configuración.

---

## Variables de entorno en producción

| Variable | Ejemplo | Nota |
|---|---|---|
| `NODE_ENV` | `production` | Oculta logs sensibles |
| `PORT` | `3000` | |
| `SESSION_SECRET` | cadena de 96 caracteres | **Obligatoria** |
| `DB_HOST` | `db-postgresql-...` | |
| `DB_PUERTO` | `25060` | |
| `DB_NOMBRE` | `defaultdb` | |
| `DB_USUARIO` | `doadmin` | |
| `DB_PASSWORD` | — | |
| `DB_SSL` | `true` | Necesario en bases gestionadas |
| `TRUST_PROXY` | `1` | `2` si hay dos proxies delante |
| `RECAPTCHA_SITE_KEY` | — | |
| `RECAPTCHA_SECRET_KEY` | — | |

Genera el secreto con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Pruebas de liberación

Antes de entregar, comprobar desde el dominio público:

| Prueba | Cómo |
|---|---|
| Aplicación responde | `curl -I https://tu-dominio/` → 200 |
| API viva | `curl https://tu-dominio/api/estado` → `"ok": true` |
| HTTPS válido | candado en el navegador, sin advertencias |
| Redirección de HTTP | `curl -I http://tu-dominio/` → 301 a https |
| Sesión persistente | iniciar sesión, reiniciar una instancia y seguir dentro |
| Balanceo | `for i in 1 2 3 4; do curl -s https://tu-dominio/api/estado; done` |
| Base de datos | registro y login funcionando |
| Captcha | registro con el widget resuelto |

---

## Apagar todo al terminar

El crédito se consume mientras los recursos existen:

```bash
docker compose down        # Opción B
```

Y en el panel del proveedor: destruir Droplets, base de datos y
balanceador.
