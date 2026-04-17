#!/usr/bin/env sh
# Genera noticias-docker-images.tar con imágenes linux/amd64 (compatibles con cualquier
# PC Linux x86_64 y Docker Desktop Windows/macOS en modo "Linux containers").
#
# Uso desde la raíz:  ./scripts/export-docker-tar.sh

set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"

# Tags por defecto alineados con docker-compose.yml (MODO 2: red local).
API_IMG="${NOTICIAS_API_IMAGE:-ai-news-api:latest}"
FE_IMG="${NOTICIAS_FRONTEND_IMAGE:-ai-news-frontend:latest}"
OUT="${ROOT}/noticias-docker-images.tar"
PLATFORM="${NOTICIAS_BUILD_PLATFORM:-linux/amd64}"

if ! docker buildx version >/dev/null 2>&1; then
  echo "ERROR: Docker Buildx es obligatorio (viene con Docker Desktop / paquete docker-buildx-plugin)." >&2
  exit 1
fi
docker buildx inspect --bootstrap >/dev/null 2>&1 || true

echo "==> buildx $PLATFORM  $API_IMG"
docker buildx build --platform "$PLATFORM" --load -t "$API_IMG" -f Dockerfile .

echo "==> buildx $PLATFORM  $FE_IMG"
docker buildx build --platform "$PLATFORM" --load -t "$FE_IMG" -f frontend/Dockerfile frontend

echo "==> verificando arquitectura de las imágenes"
docker image inspect --format '{{.RepoTags}} {{.Os}}/{{.Architecture}}' "$API_IMG" "$FE_IMG"

echo "==> docker save -> $OUT"
docker save "$API_IMG" "$FE_IMG" -o "$OUT"

ls -lh "$OUT"
echo ""
echo "En el equipo destino:"
echo "  docker load -i noticias-docker-images.tar"
echo "  docker compose up -d"
