# Builds a self-contained deployment bundle for Linux/macOS/Windows targets.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/package-deploy.ps1
#
# Output:
#   noticias-deploy.tar.gz

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$ApiImg = if ($env:NOTICIAS_API_IMAGE) { $env:NOTICIAS_API_IMAGE } else { "ai-news-api:latest" }
$FeImg = if ($env:NOTICIAS_FRONTEND_IMAGE) { $env:NOTICIAS_FRONTEND_IMAGE } else { "ai-news-frontend:latest" }
$Platform = if ($env:NOTICIAS_BUILD_PLATFORM) { $env:NOTICIAS_BUILD_PLATFORM } else { "linux/amd64" }
$DistRoot = Join-Path $Root "dist-deploy"
$BundleDir = Join-Path $DistRoot "noticias-deploy"
$Archive = Join-Path $Root "noticias-deploy.tar.gz"
$ImagesTar = Join-Path $BundleDir "noticias-docker-images.tar"

docker buildx version 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "Docker Buildx es obligatorio (Docker Desktop o docker-buildx-plugin)."
}

Get-Command tar -ErrorAction Stop | Out-Null
docker buildx inspect --bootstrap 2>$null | Out-Null

New-Item -ItemType Directory -Force -Path $DistRoot | Out-Null
if (Test-Path $BundleDir) { Remove-Item -Recurse -Force $BundleDir }
if (Test-Path $Archive) { Remove-Item -Force $Archive }
New-Item -ItemType Directory -Force -Path $BundleDir | Out-Null

Write-Host "==> buildx $Platform  $ApiImg"
docker buildx build --platform $Platform --load -t $ApiImg -f Dockerfile .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> buildx $Platform  $FeImg"
docker buildx build --platform $Platform --load -t $FeImg -f frontend/Dockerfile frontend
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> verificando arquitectura de las imagenes"
docker image inspect --format '{{.RepoTags}} {{.Os}}/{{.Architecture}}' $ApiImg $FeImg
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> preparando bundle"
Copy-Item "docker-compose.yml" (Join-Path $BundleDir "docker-compose.yml")
Copy-Item ".env.example" (Join-Path $BundleDir ".env.example")
Copy-Item "scripts/deploy-bundle.sh" (Join-Path $BundleDir "deploy.sh")
Copy-Item "scripts/deploy-bundle.ps1" (Join-Path $BundleDir "deploy.ps1")

@'
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
'@ | Set-Content -Encoding UTF8 (Join-Path $BundleDir "README.md")

Write-Host "==> docker save -> $ImagesTar"
docker save $ApiImg $FeImg -o $ImagesTar
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> tar.gz -> $Archive"
tar -czf $Archive -C $DistRoot noticias-deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Get-Item $Archive, $ImagesTar | Format-Table FullName, Length, LastWriteTime
Write-Host ""
Write-Host "Bundle listo: $Archive"
