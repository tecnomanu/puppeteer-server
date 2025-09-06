# Ejemplos de Configuración MCP

Esta carpeta contiene ejemplos de configuración para usar el Puppeteer Server como servidor MCP.

## Archivos de Configuración

### 📝 `mcp-config-example.json`
Configuración básica para desarrollo y pruebas locales.

### 🔒 `mcp-config-secure-example.json`
Configuración segura para entornos de producción con todas las medidas de seguridad habilitadas.

### 🐳 `docker-mcp-config.json`
Configuración para usar el servidor dentro de contenedores Docker.

### 🌐 `claude-desktop-config.json`
Configuración específica para Claude Desktop con rutas y variables de entorno optimizadas.

## Uso

1. **Copia el archivo de ejemplo** que mejor se adapte a tu caso de uso
2. **Actualiza las rutas absolutas** a tu instalación del proyecto
3. **Configura las variables de entorno** según tus necesidades de seguridad
4. **Coloca el archivo** en la ubicación requerida por tu cliente MCP

## Variables de Entorno Importantes

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `ALLOWED_ORIGINS` | Dominios permitidos para navegación | `https://example.com,https://*.trusted.org` |
| `MAX_SCREENSHOT_SIZE` | Tamaño máximo de capturas (bytes) | `2097152` (2MB) |
| `MAX_CONTENT_LENGTH` | Tamaño máximo de contenido (bytes) | `1048576` (1MB) |
| `TOOL_TIMEOUT` | Timeout para operaciones (ms) | `30000` (30s) |
| `ALLOW_DANGEROUS` | Permitir argumentos peligrosos | `false` (recomendado) |

## Seguridad

⚠️ **IMPORTANTE**: Nunca uses `ALLOWED_ORIGINS="*"` en producción. Siempre especifica dominios específicos o patrones seguros.

✅ **Recomendado**: 
```json
"ALLOWED_ORIGINS": "https://example.com,https://*.trusted-domain.org"
```

❌ **Peligroso**: 
```json
"ALLOWED_ORIGINS": "*"
```
