# ============================================================
#  Imagen de producción del consultorio
#  Se usa Debian (no Alpine) para que bcrypt encuentre su
#  binario precompilado y no requiera compilar.
# ============================================================
FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# Dependencias primero: si el código cambia, esta capa se reutiliza.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Código de la aplicación
COPY . .

# El proceso corre sin privilegios.
USER node

EXPOSE 3000

# El balanceador consulta este endpoint para saber si la instancia vive.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/estado').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "app.js"]
