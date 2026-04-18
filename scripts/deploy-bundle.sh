#!/usr/bin/env sh
# Deploys a previously generated noticias-deploy bundle on Linux/macOS.

set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$ROOT"

if [ ! -f noticias-docker-images.tar ]; then
  echo "ERROR: noticias-docker-images.tar no existe en este directorio." >&2
  echo "Si estas en Portainer, no uses este script: importa los dos archivos noticias-*-image.tar y crea un Stack." >&2
  exit 1
fi

if [ ! -f docker-compose.yml ]; then
  echo "ERROR: docker-compose.yml no existe en este directorio." >&2
  exit 1
fi

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "==> creado .env desde .env.example"
  echo "    Si accedes desde otra maquina de la LAN, edita PUBLIC_API_URL en .env."
fi

echo "==> cargando imagenes Docker"
docker load -i noticias-docker-images.tar

echo "==> levantando stack"
docker compose up -d --remove-orphans

echo "==> estado"
docker compose ps

echo ""
echo "Listo:"
echo "  Frontend: http://localhost:4321"
echo "  API:      http://localhost:13100"
