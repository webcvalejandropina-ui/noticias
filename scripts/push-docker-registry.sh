#!/usr/bin/env sh
# Publica imágenes linux/amd64 en un registry (para MODO 3 — producción).
# Ejemplo:
#   REGISTRY=ghcr.io/mi-org TAG=1.0.0 ./scripts/push-docker-registry.sh
#
# El registry debe estar autenticado: docker login <registry>

set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"

: "${REGISTRY:?Define REGISTRY (p.ej. ghcr.io/mi-org o registry.midominio.com/noticias)}"
: "${TAG:?Define TAG (p.ej. 1.0.0). No uses :latest en producción.}"
PLATFORM="${NOTICIAS_BUILD_PLATFORM:-linux/amd64}"

API_IMG="$REGISTRY/noticias-api:$TAG"
FE_IMG="$REGISTRY/noticias-frontend:$TAG"

if ! docker buildx version >/dev/null 2>&1; then
  echo "ERROR: Docker Buildx es obligatorio." >&2
  exit 1
fi
docker buildx inspect --bootstrap >/dev/null 2>&1 || true

echo "==> buildx $PLATFORM --push  $API_IMG"
docker buildx build --platform "$PLATFORM" --push -t "$API_IMG" -f Dockerfile .

echo "==> buildx $PLATFORM --push  $FE_IMG"
docker buildx build --platform "$PLATFORM" --push -t "$FE_IMG" -f frontend/Dockerfile frontend

echo ""
echo "Publicado:"
echo "  $API_IMG"
echo "  $FE_IMG"
echo ""
echo "Desplegar en el VPS:"
echo "  NOTICIAS_API_IMAGE=$API_IMG \\"
echo "    NOTICIAS_FRONTEND_IMAGE=$FE_IMG \\"
echo "    PUBLIC_API_URL=https://api.tudominio.com \\"
echo "    ADMIN_API_TOKEN=\$(openssl rand -hex 32) \\"
echo "    CORS_ALLOWED_ORIGINS=https://noticias.tudominio.com \\"
echo "    docker compose -f docker-compose.prod.yml up -d"
