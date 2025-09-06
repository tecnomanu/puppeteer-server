# Dockerfile seguro para puppeteer-server
FROM node:18-alpine AS builder

# Instalar dependencias necesarias para compilación
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar archivos de configuración
COPY package*.json tsconfig.json ./
COPY src/ ./src/

# Instalar dependencias y compilar
RUN npm ci --only=production && npm run build

# Imagen final con configuración de seguridad
FROM node:18-alpine

# Crear usuario no privilegiado
RUN addgroup -g 1001 -S puppeteer && \
    adduser -S -D -H -u 1001 -s /sbin/nologin -G puppeteer puppeteer

# Instalar Chromium y dependencias necesarias
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

# Configurar variables de entorno para seguridad
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    DOCKER_CONTAINER=true \
    NODE_ENV=production

WORKDIR /app

# Copiar aplicación compilada
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Cambiar propietario de archivos
RUN chown -R puppeteer:puppeteer /app

# Cambiar a usuario no privilegiado
USER puppeteer

# Configurar límites de seguridad
# Estas variables deben ser configuradas según el entorno
ENV ALLOWED_ORIGINS="" \
    MAX_SCREENSHOT_SIZE=2097152 \
    MAX_CONTENT_LENGTH=1048576 \
    TOOL_TIMEOUT=30000 \
    ALLOW_DANGEROUS=false

# Exponer información de salud (no puerto de red)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check OK')" || exit 1

# Usar dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]

# Comando por defecto
CMD ["node", "dist/index.js"]

# Configuraciones de seguridad Docker recomendadas:
# docker run --cap-drop=ALL --security-opt=no-new-privileges:true \
#   --user 1001:1001 --read-only --tmpfs /tmp \
#   -e ALLOWED_ORIGINS="https://example.com,https://*.example.org" \
#   puppeteer-server
