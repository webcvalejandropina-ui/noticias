#!/usr/bin/env sh
# Builds a self-contained deployment bundle for Linux/macOS/Windows targets.
#
# Usage:
#   ./scripts/package-deploy.sh
#
# Output:
#   noticias-deploy.tar.gz

set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"

API_IMG="${NOTICIAS_API_IMAGE:-ai-news-api:latest}"
FE_IMG="${NOTICIAS_FRONTEND_IMAGE:-ai-news-frontend:latest}"
PLATFORM="${NOTICIAS_BUILD_PLATFORM:-linux/amd64}"
DIST_ROOT="${ROOT}/dist-deploy"
BUNDLE_DIR="${DIST_ROOT}/noticias-deploy"
ARCHIVE="${ROOT}/noticias-deploy.tar.gz"
IMAGES_TAR="${BUNDLE_DIR}/noticias-docker-images.tar"

if ! docker buildx version >/dev/null 2>&1; then
  echo "ERROR: Docker Buildx es obligatorio (Docker Desktop o docker-buildx-plugin)." >&2
  exit 1
fi

if ! command -v tar >/dev/null 2>&1; then
  echo "ERROR: tar no esta disponible en este sistema." >&2
  exit 1
fi

docker buildx inspect --bootstrap >/dev/null 2>&1 || true

mkdir -p "$DIST_ROOT"
rm -rf "$BUNDLE_DIR" "$ARCHIVE"
mkdir -p "$BUNDLE_DIR"

echo "==> buildx $PLATFORM  $API_IMG"
docker buildx build --platform "$PLATFORM" --load -t "$API_IMG" -f Dockerfile .

echo "==> buildx $PLATFORM  $FE_IMG"
docker buildx build --platform "$PLATFORM" --load -t "$FE_IMG" -f frontend/Dockerfile frontend

echo "==> verificando arquitectura de las imagenes"
docker image inspect --format '{{.RepoTags}} {{.Os}}/{{.Architecture}}' "$API_IMG" "$FE_IMG"

echo "==> preparando bundle"
cp docker-compose.yml "$BUNDLE_DIR/docker-compose.yml"
cp .env.example "$BUNDLE_DIR/.env.example"
cp scripts/deploy-bundle.sh "$BUNDLE_DIR/deploy.sh"
cp scripts/deploy-bundle.ps1 "$BUNDLE_DIR/deploy.ps1"
chmod +x "$BUNDLE_DIR/deploy.sh"

cat > "$BUNDLE_DIR/README.md" <<'EOF'
# Noticias Deploy Bundle

Este paquete permite desplegar la app sin tener el codigo fuente ni instalar pnpm/Bun.
Solo necesitas Docker con Linux containers y Docker Compose.

## Linux/macOS

```bash
tar -xzf noticias-deploy.tar.gz
cd noticias-deploy
./deploy.sh
```

## Windows PowerShell

```powershell
tar -xzf noticias-deploy.tar.gz
cd noticias-deploy
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

## LAN / otro equipo

Antes de ejecutar el deploy, edita `.env` si el navegador accedera desde otro
equipo de la red:

```env
PUBLIC_API_URL=http://IP_DEL_HOST:13100
```

## URLs por defecto

- Frontend: http://localhost:4321
- API: http://localhost:13100
EOF

echo "==> docker save -> $IMAGES_TAR"
docker save "$API_IMG" "$FE_IMG" -o "$IMAGES_TAR"

echo "==> tar.gz -> $ARCHIVE"
tar -czf "$ARCHIVE" -C "$DIST_ROOT" noticias-deploy

ls -lh "$ARCHIVE" "$IMAGES_TAR"
echo ""
echo "Bundle listo: $ARCHIVE"
