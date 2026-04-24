# News (multi-idioma · multi-categoría)

Agregador de noticias con API en **Bun** + **SQLite** y frontend **Astro SSR** (sistema de diseño inspirado en PlayStation.com). Cobertura en **inglés** y **español**, con **8 categorías** (IA, fútbol, internacional, tecnología, software, hack, cine y series, más **medios-int** virtual en ES). Cada noticia tiene siempre **imagen**, **título**, **descripción** y **enlace**. En la base de datos la clave primaria es **`uuid`** (texto), no un entero autoincremental.

![preview](./frontend/public/favicon.svg)

- **API** en `http://localhost:${HOST_PORT:-13100}` — `/:lang/news/:category`, `/:lang/browse/:category`, `/all-news` (export en+es + catálogo), `/sync`, `/refresh`, …
- **Frontend** en `http://localhost:${FRONTEND_PORT:-4321}` — paginación, búsqueda y filtros, SSR sin cliente pesado
- **Scraper** one-shot para cron

## Fuentes y categorías

### Inglés — `/en/news/ia`
1. MIT Technology Review
2. VentureBeat (AI)
3. The Verge
4. Wired
5. AI News (`artificialintelligence-news.com`)
6. AI Trends
7. AI Magazine
8. Analytics Insight
9. OpenAI Blog

### Español

| Categoría | Endpoint | Fuentes |
|-----------|----------|---------|
| Inteligencia artificial | `/es/news/ia` | Xataka IA · El País IA · 20 Minutos IA · Wired ES IA · Telefónica IA · Hipertextual IA |
| Fútbol | `/es/news/futbol` | Marca · AS |
| Internacional | `/es/news/internacional` | 20 Minutos Internacional · ABC Internacional |
| Tecnología | `/es/news/tecnologia` | Xataka Tecnología · ComputerHoy · Muy Interesante Tecnología · Hipertextual Ciencia |
| Software | `/es/news/software` | Softzone · MuyComputer · Hipertextual Software |
| Hack / ciberseguridad | `/es/news/hack` | Libertad Digital Hacker · The Hacker News |
| Cine y series | `/es/news/cine` | SensaCine · Hipertextual Cine/TV · eCartelera · El Séptimo Arte · HobbyCine |
| Medios int (virtual) | `/es/news/medios-int` | Agrega todo el contenido de EN (MIT TR, The Verge, Wired, OpenAI Blog…) sin duplicar almacenamiento. |

> Cuando una fuente no expone un feed RSS filtrado por tema (p.ej. El País o Libertad Digital), usamos Google News RSS (`site:dominio consulta`) para obtener solo los artículos relevantes. Esto evita scraping agresivo.

### Sincronización automática

La API ejecuta un **`/sync` global** en segundo plano cada **60 minutos** por defecto (todas las fuentes). Configurable con `AUTO_SYNC_INTERVAL_MIN` en el entorno de `api` (`0` desactiva el intervalo). El frontend incluye un botón **"Sincronizar"** que dispara un **`/sync` manual** contra la API pública (`PUBLIC_API_URL`) y recarga la vista cuando termina.

### `GET /refresh` vs `GET /sync`

- **`/refresh`** (`scrapeAllSources`): lee todos los RSS, inserta noticias nuevas y purga por antigüedad; **no** elimina filas cuyo artículo ya no aparece en el feed.
- **`/sync`** (`syncAllSources`): mismo pipeline de inserción y purga, y además **alinea** cada fuente que respondió bien: borra de la BD los registros de esa fuente cuyo `link` ya no está en el RSS actual. Si una fuente falla, **no** se borra nada de ella (evita vaciar la BD por un error puntual).

Ambas rutas son **admin** (token o `ALLOW_OPEN_ADMIN_ROUTES=1` en local; ver tabla de seguridad).

### Garantía de fuentes en IA

En `/es/news/ia` (y también en `/en/news/ia`) se garantiza que **todos los días aparezca al menos una noticia de cada fuente configurada**. Si una fuente no ha publicado hoy, se usa su artículo más reciente disponible para que nunca falte su presencia en el resultado.

## Requisitos

- [pnpm](https://pnpm.io/) ≥ 9 para instalar y ejecutar scripts
- [Bun](https://bun.sh) ≥ 1.1 como runtime local de la API
- Docker / Docker Compose (para ejecutar sin instalar pnpm ni Bun localmente)

## Ejecución local

```bash
pnpm install
pnpm dev              # desarrollo con hot reload
pnpm start            # producción
pnpm scrape           # scraping manual (todos los idiomas/categorías)
pnpm scrape es ia     # solo español + IA
pnpm scrape es futbol # solo español + fútbol
```

La API arranca en `http://localhost:3000` (configurable con `PORT`).

## Ejecución con Docker

El proyecto funciona en **cualquier sistema operativo** con Docker Desktop o Docker Engine (Linux, Windows con WSL2/Hyper-V, macOS Intel/Apple Silicon) siempre en modo **Linux containers**. Solo hay dos ficheros compose:

| Fichero | Caso de uso |
|---------|-------------|
| **`docker-compose.yml`** | Desarrollo local + red local (LAN) + Portainer. En tu PC se combina con `docker-compose.override.yml` (build automático). |
| **`docker-compose.prod.yml`** | VPS / producción: solo imágenes del registry, `pull_policy: always`, API en modo seguro (`APP_ENV=production`). |

### Arranque rápido (mismo equipo o otro PC de la LAN)

```bash
# 1ª vez: construye las imágenes y levanta (vale en Linux, macOS y Windows)
docker compose up -d --build

# siguientes arranques (imagen ya existe)
docker compose up -d
```

Abre en el navegador:

- **Desde la misma máquina:** `http://localhost:4321`
- **Desde otro PC de la LAN:** `http://IP_DEL_HOST:4321` (ej. `http://192.168.1.128:4321`)

> Si vas a acceder desde **otro equipo de la red**, crea un `.env` (copia `.env.example`) con:
> ```
> PUBLIC_API_URL=http://192.168.1.128:13100
> ```
> Esto es imprescindible: el navegador del otro PC no puede resolver `localhost`. La variable se inyecta en el HTML SSR para que el footer y cualquier enlace público apunten al API correcto. **En local lo único que suele cambiar es `PUBLIC_API_URL`** (mismo compose, mismo código).

El stack arranca con `SCRAPE_ON_START=1` por defecto, así que en segundo plano empieza a poblar la base de datos nada más levantar. El primer `/:lang/browse/:category` que llegue al API también dispara un scraping bajo demanda si aún no hay datos, de modo que no verás la interfaz vacía más que un instante.

Comandos habituales:

```bash
docker compose logs -f api                                # logs backend
docker compose logs -f frontend                           # logs frontend
docker compose --profile scrape run --rm scraper          # scraping manual (todas las fuentes)
docker compose --profile scrape run --rm scraper es ia    # solo es/ia
docker compose down                                       # para y limpia contenedores
```

### Bundle portable para cualquier sistema

La forma recomendada para llevarlo a otro equipo sin código fuente es generar
un bundle autocontenido. Incluye imágenes Docker, `docker-compose.yml`,
plantilla `.env` y scripts de despliegue para Linux/macOS y Windows.

```bash
./scripts/package-deploy.sh                                           # Linux / macOS
powershell -ExecutionPolicy Bypass -File scripts/package-deploy.ps1   # Windows
```

Se crean estos artefactos:

| Archivo | Uso |
|---------|-----|
| `noticias-deploy.tar.gz` | Bundle completo para terminal Linux/macOS/Windows. No lo subas a `Images > Import image` en Portainer. |
| `noticias-docker-images.tar` | Archivo combinado para `docker load -i noticias-docker-images.tar`. |
| `noticias-api-image.tar` | Imagen individual para Portainer UI: usar image name `ai-news-api:latest`. |
| `noticias-frontend-image.tar` | Imagen individual para Portainer UI: usar image name `ai-news-frontend:latest`. |

Copia `noticias-deploy.tar.gz` al equipo destino y ejecuta:

```bash
tar -xzf noticias-deploy.tar.gz
cd noticias-deploy
./deploy.sh
```

En Windows PowerShell:

```powershell
tar -xzf noticias-deploy.tar.gz
cd noticias-deploy
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

En **Portainer**, no subas `noticias-deploy.tar.gz` en `Images → Import image`.
Esa pantalla espera una imagen Docker directa y por eso pide `Image name`.

Flujo recomendado en Portainer UI:

1. Ve a `Images → Import image`.
2. Selecciona `noticias-api-image.tar`.
3. En `Advanced mode`, usa image name `ai-news-api:latest` y pulsa `Upload`.
4. Repite con `noticias-frontend-image.tar` usando image name `ai-news-frontend:latest`.
5. Ve a `Stacks → Add stack → Web editor`.
6. Pega el contenido de `docker-compose.yml`.
7. En **Environment variables** añade al menos:
   ```
   PUBLIC_API_URL=http://192.168.1.128:13100
   ```
   (IP real del host Docker; `:13100` es el puerto del API).
8. Deploy.

Si tienes shell en el host de Portainer, también puedes descomprimir el bundle
y cargar ambas imágenes de una vez:

```bash
tar -xzf noticias-deploy.tar.gz
cd noticias-deploy
docker load -i noticias-docker-images.tar
docker compose up -d
```

Si prefieres el flujo manual antiguo, puedes seguir generando solo el `.tar`
de imágenes:

```bash
./scripts/export-docker-tar.sh                                           # Linux / macOS
powershell -ExecutionPolicy Bypass -File scripts/export-docker-tar.ps1   # Windows
```

Luego copia `noticias-docker-images.tar` y `docker-compose.yml` al destino:

```bash
docker load -i noticias-docker-images.tar
docker compose up -d
```

En **Portainer** con el flujo manual:

1. Pega el contenido de `docker-compose.yml`.
2. En **Environment variables** añade al menos:
   ```
   PUBLIC_API_URL=http://192.168.1.128:13100
   ```
   (IP real del host Docker; `:13100` es el puerto del API).
3. Deploy.

Portainer no construirá nada: las imágenes ya están en el daemon porque las importaste o hiciste `docker load` previamente.

> **`Exec format error` / `tini … failed`** = arquitectura incorrecta. Regenera el `.tar` con el script: fuerza `linux/amd64` mediante `docker buildx --platform linux/amd64`.

### Producción — VPS y registry

Publica las imágenes con un tag inmutable:

```bash
REGISTRY=ghcr.io/tu-org TAG=1.0.0 ./scripts/push-docker-registry.sh
```

En el VPS (solo necesitas Docker; no hace falta el código fuente):

```bash
export NOTICIAS_API_IMAGE=ghcr.io/tu-org/noticias-api:1.0.0
export NOTICIAS_FRONTEND_IMAGE=ghcr.io/tu-org/noticias-frontend:1.0.0
export PUBLIC_API_URL=https://api.tudominio.com
export ADMIN_API_TOKEN="$(openssl rand -hex 32)"
export CORS_ALLOWED_ORIGINS=https://noticias.tudominio.com

docker compose -f docker-compose.prod.yml up -d
```

- **`PUBLIC_API_URL`**: URL HTTPS (o HTTP interno detrás de un proxy) con la que el **navegador** llama al API; debe ser la misma que uses en el dominio público.
- **`ADMIN_API_TOKEN`**: obligatorio en producción. Protege `GET /refresh`, `GET /sync`, `GET /enrich`, `GET /cleanup` y las rutas `/:lang/sync` y `/:lang/refresh/:category`. Uso: cabecera `Authorization: Bearer <token>` o `X-Admin-Token: <token>`; en producción no se acepta `?token=` para evitar filtraciones en logs/historial. El cron con `docker compose --profile scrape run` **no** pasa por HTTP; no necesita el token.
- **`CORS_ALLOWED_ORIGINS`**: orígenes permitidos para peticiones al API desde el navegador (p. ej. la URL del frontend). En producción, si está vacío, **no** se envía `Access-Control-Allow-Origin: *` (más seguro), y los wildcards se ignoran aunque se configuren por error. El frontend Astro hace `fetch` en SSR hacia `http://api:13100`, así que sigue funcionando sin CORS abierto.

Recomendado delante del VPS: **Caddy** o **nginx** con TLS, limitando exposición de puertos al 443 (y proxy interno a `frontend:4321` y `api:13100` si quieres un solo host; en el compose actual ambos puertos se publican en el host para simplicidad).

Nunca uses `:latest` en producción; rotar `TAG` te da rollbacks triviales.

#### Seguridad (resumen)

| Entorno | `APP_ENV` | Rutas admin (`/refresh`, …) | CORS |
|---------|-----------|-----------------------------|------|
| `docker-compose.yml` + override local | `development` | Con `ALLOW_OPEN_ADMIN_ROUTES=1` en override: sin token; si no, requieren token | `*` |
| `docker-compose.prod.yml` | `production` | Requieren `ADMIN_API_TOKEN` | Lista en `CORS_ALLOWED_ORIGINS` o estricto |

Cabecera en todas las respuestas JSON: `X-Content-Type-Options: nosniff`. Los errores 500 en producción no incluyen el mensaje interno en el JSON. Los enlaces e imágenes que llegan desde RSS se normalizan y solo se almacenan/renderizan si son URLs públicas `http`/`https` (sin `javascript:`, `data:`, localhost ni redes privadas).

El stack tiene tres servicios:

- **api** — servidor Bun en `:13100` (interno) mapeado a `${HOST_PORT:-13100}`
- **frontend** — SSR Astro (Node) en `:4321`, consume la API vía red interna Docker
- **scraper** — one-shot para cron, activable con el perfil `scrape`

Variables de entorno soportadas (definibles en un `.env`):

| Variable | Default | Descripción |
|----------|---------|-------------|
| `HOST_PORT` | `13100` | Puerto host donde se publica la API |
| `FRONTEND_PORT` | `4321` | Puerto host donde se publica el frontend |
| `PUBLIC_API_URL` | `http://localhost:13100` | URL con la que el **navegador** llega a la API. En LAN: `http://IP_HOST:13100`. En prod: dominio real. |
| `NOTICIAS_API_IMAGE` | `ai-news-api:latest` (dev/LAN) / obligatorio (producción) | Imagen de la API |
| `NOTICIAS_FRONTEND_IMAGE` | `ai-news-frontend:latest` (dev/LAN) / obligatorio (producción) | Imagen del frontend |
| `SCRAPE_ON_START` | `1` | Si es `1`, dispara un **`/sync`** global en segundo plano al arrancar el API |
| `AUTO_SYNC_INTERVAL_MIN` | `60` | Minutos entre syncs automáticos en background (`0` = desactivado) |
| `MAX_ITEMS_PER_SOURCE` | `50` | Máximo de ítems tomados por fuente en cada scrape (tras filtro de antigüedad) |
| `APP_ENV` | `development` (compose base) / `production` (prod) | Activa protección de rutas admin y CORS estricto en producción |
| `ALLOW_OPEN_ADMIN_ROUTES` | vacío | Si es `1`, `/refresh`, `/sync`, `/enrich`, `/cleanup` y variantes **no** exigen token (solo entornos locales de confianza; el `docker-compose.override.yml` local lo activa) |
| `ADMIN_API_TOKEN` | vacío (dev) / obligatorio (prod) | Token para `/refresh`, `/sync`, `/enrich`, `/cleanup` y variantes |
| `CORS_ALLOWED_ORIGINS` | vacío | En prod: lista separada por comas de orígenes permitidos; vacío = sin wildcard, `*` se ignora |
| `DB_PATH` | `/app/data/news.db` | Ruta al fichero SQLite (contenedor API) |
| `TZ` | `Europe/Madrid` | Zona horaria de los contenedores |

La base de datos SQLite se persiste en el volumen Docker `ai-news-data`, así que sobrevive a reinicios y reconstrucciones de la imagen.

### Programar el scraping (cron)

Para mantener la DB fresca sin esperar al primer request, puedes programar un scraping periódico usando el servicio `scraper`:

```bash
# crontab -e  (cada hora)
0 * * * * cd /ruta/al/repo && docker compose --profile scrape run --rm scraper >> /var/log/news-scraper.log 2>&1
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Info general y listado de endpoints |
| GET | `/health` | Health check con nº de noticias de hoy |
| GET | `/sources` | Fuentes configuradas (`name`, `language`, `category`, `homepage`) |
| GET | `/all-news` | Noticias de **hoy** en **en** y **es** + catálogo (`categories`, `sources`) para integrar con otra API |
| GET | `/refresh` | **Admin.** Scrape global sin borrado por “links ausentes del RSS” (ver sección refresh vs sync) |
| GET | `/sync` | **Admin.** Sync global (inserta + alinea fuentes que respondieron bien) |
| GET | `/enrich` | **Admin.** Revisa links tipo Google News / imágenes placeholder y actualiza registros |
| GET | `/cleanup` | **Admin.** Purga manual por antigüedad (`MAX_AGE_DAYS` en código) |
| GET | `/news` | Alias retrocompat → `/en/news/ia` |
| GET | `/:lang/categories` | Categorías disponibles para un idioma (`en`, `es`) |
| GET | `/:lang/news` | Top 10 de categoría IA en ese idioma |
| GET | `/:lang/news/:category` | Top 10 de una categoría (`ia`, `futbol`, `internacional`, `tecnologia`, `software`, `hack`, `cine`, `medios-int`) |
| GET | `/:lang/news/:category?limit=N` | Personaliza el número (1-50) |
| GET | `/:lang/browse/:category` | Listado paginado (`page`, `pageSize`, `q`, `source`) |
| GET | `/:lang/digest?perCategory=N` | Resumen: N noticias por categoría del idioma |
| GET | `/:lang/general?limit=N&mode=recent` | Feed general mezclando categorías (`mode=random` = aleatorio puro) |
| GET | `/:lang/sources?category=X` | Fuentes del idioma (opcional: filtradas por categoría) |
| GET | `/:lang/all` | Todas las noticias **del día** (`scrape_day` hoy) para ese idioma |
| GET | `/:lang/sync` | **Admin.** Sync de todas las fuentes de ese idioma |
| GET | `/:lang/sync/:category` | **Admin.** Sync de un bucket (idioma + categoría) |
| GET | `/:lang/refresh/:category` | **Admin.** Scrape de un bucket (sin borrado por links ausentes) |

`lang` ∈ `en` | `es`. Rutas **admin**: en producción usa `Authorization: Bearer …` o `X-Admin-Token` con `ADMIN_API_TOKEN` (en desarrollo, opcionalmente `?token=`).

### Ejemplo de respuesta `/es/news/ia`

```json
{
  "language": "es",
  "category": "ia",
  "day": "2026-04-17",
  "fromCache": true,
  "totalAvailable": 246,
  "count": 10,
  "sources": [
    "Xataka IA", "El País IA", "20 Minutos IA", "Wired ES IA", "Telefónica IA"
  ],
  "news": [
    {
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "source": "Xataka IA",
      "title": "Siri se ha convertido en un patito feo. Así que Apple va a mandar a 200 ingenieros…",
      "description": "Apple reorganiza su división de IA tras…",
      "link": "https://www.xataka.com/...",
      "image": "https://i.blogs.es/.../xataka-ia.jpg",
      "pubDate": "2026-04-17T08:30:00.000Z",
      "scrapedAt": "2026-04-17T10:12:44.512Z",
      "scrapeDay": "2026-04-17",
      "language": "es",
      "category": "ia"
    }
  ]
}
```

### `GET /all-news` (export integración)

Misma ventana temporal que `/:lang/all`: noticias con **`scrape_day`** = hoy (UTC). Incluye:

- `day`, `languages`, `totalCount`, `en` / `es` (`count`, `news`)
- `categories`: `all`, `byLanguage`, `virtual` (p. ej. `medios-int` → `sourceLanguage`)
- `sources`: `count`, `items` (misma forma que `/sources`)

## Cómo funciona el cache

- Cada **bucket** `(idioma, categoría)` tiene su propio TTL de 3 horas.
- Al pedir `/es/news/futbol`, si hay noticias de hoy de ese bucket **y** el último scraping fue hace < 3h, se sirve desde SQLite sin golpear las fuentes.
- Si está caducado o vacío, se dispara el scraping **solo de las fuentes de ese bucket** (no de las 21 a la vez), se insertan los items nuevos (`INSERT OR IGNORE` por `link UNIQUE` → sin duplicados), y se devuelve el top N.
- Ajusta el TTL en `src/scrapers/index.ts` (`CACHE_TTL_MS`).

## Garantía de imagen en cada noticia

Toda noticia devuelta siempre tiene imagen, siguiendo esta cascada:

1. **Imagen embebida en RSS** (`media:content`, `media:thumbnail`, `enclosure`, `itunes:image`).
2. **Primera `<img>`** encontrada dentro de `content:encoded`, `content`, `description` o `summary`.
3. **`og:image` / `twitter:image`** extraído de la página original (solo una vez por noticia, queda cacheado).
4. **Favicon de alta resolución** de la fuente (Google S2) como último recurso cuando el sitio bloquea el scraping (p.ej. Cloudflare en OpenAI).

## Esquema SQLite

```sql
CREATE TABLE news (
  uuid        TEXT PRIMARY KEY,
  source      TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  link        TEXT NOT NULL UNIQUE,
  image       TEXT NOT NULL DEFAULT '',
  pub_date    TEXT NOT NULL DEFAULT '',
  scraped_at  TEXT NOT NULL,
  scrape_day  TEXT NOT NULL,
  language    TEXT NOT NULL DEFAULT 'en',
  category    TEXT NOT NULL DEFAULT 'ia'
);
-- Índices: scrape_day, source, pub_date, (language, category), (language, category, scrape_day)
```

El campo `link UNIQUE` evita duplicados entre scrapings. Al abrir una BD antigua con clave entera `id`, el arranque del API **migra automáticamente** a `uuid` (nuevos UUID por fila; los `id` numéricos no se conservan). Las columnas `language` / `category` en BD muy viejas se añaden con `ALTER TABLE` idempotente si faltan.

## Frontend (Astro SSR)

El frontend vive en `frontend/` y se construye con **Astro 6** (adaptador `@astrojs/node` en modo standalone). El sistema de diseño sigue `DESIGN.md` (inspirado en PlayStation.com): negro → blanco → azul, SST-alike en weight 300 para displays, botones pill con signature hover cyan + ring azul + scale.

Qué incluye:

- Hero negro con estadísticas (total indexado, fuentes activas)
- Barra de filtros sticky con **categorías** (pills), **buscador** y **selector de fuente**
- Grid responsivo (3/2/1 columnas) con cards 16:9 y sombra feather
- **Paginación compacta** con elipsis (1 … 4 5 [6] 7 8 … N)
- Footer azul con endpoint público de la API
- Toggle de idioma ES/EN en la cabecera

Ejecución local del frontend (sin Docker):

```bash
cd frontend
pnpm install
API_URL=http://localhost:13100 pnpm build
API_URL=http://localhost:13100 pnpm start
```

## Estructura del proyecto

```
.
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── Dockerfile                  # imagen API (Bun)
├── docker-compose.yml          # dev / LAN / Portainer (build local + reuso)
├── docker-compose.prod.yml     # producción desde registry (pull_policy: always)
├── scripts/
│   ├── export-docker-tar.sh    # buildx linux/amd64 + docker save (portable)
│   ├── export-docker-tar.ps1   # idem en Windows
│   └── push-docker-registry.sh # buildx linux/amd64 + docker push (producción)
├── .env.example                # variables por modo
├── .dockerignore
├── data/                       # SQLite (volumen Docker `ai-news-data`)
│   └── news.db
├── src/                        # Backend Bun
│   ├── index.ts                # Servidor HTTP (Bun.serve) con /:lang/news|browse|...
│   ├── db.ts                   # SQLite: esquema + migraciones + queries filtradas
│   ├── types.ts                # Tipos compartidos
│   ├── cli/
│   │   └── scrape.ts           # CLI: `pnpm scrape [idioma] [categoria]`
│   └── scrapers/
│       ├── index.ts            # Orquestador + cache por bucket + fairness
│       ├── sources.ts          # Fuentes RSS configuradas (lista en código)
│       ├── rss.ts              # Parser RSS/Atom + filtro por keywords
│       └── og-image.ts         # Extractor de og:image
└── frontend/                   # Frontend Astro SSR
    ├── Dockerfile              # imagen Astro (build con pnpm, runtime Node 24)
    ├── astro.config.mjs
    ├── tsconfig.json
    ├── package.json
    ├── pnpm-lock.yaml
    ├── public/
    │   └── favicon.svg
    └── src/
        ├── env.d.ts
        ├── layouts/
        │   └── Layout.astro
        ├── pages/
        │   └── index.astro     # listado con filtros + búsqueda + paginación
        ├── components/
        │   ├── Header.astro
        │   ├── Hero.astro
        │   ├── FilterBar.astro
        │   ├── NewsGrid.astro
        │   ├── NewsCard.astro
        │   ├── Pagination.astro
        │   └── Footer.astro
        ├── lib/
        │   ├── api.ts          # cliente SSR de la API Bun
        │   ├── constants.ts    # labels por idioma / categoría
        │   ├── types.ts
        │   └── url.ts          # build/parse de query string
        └── styles/
            └── global.css      # tokens + utilidades PS (pill, btn, tag…)
```

## Notas legales / buenas prácticas

- El scraping se hace a partir de feeds **RSS/Atom** públicos que los propios medios publican para este tipo de consumo.
- Para fuentes sin feed filtrado usamos **Google News RSS** (`news.google.com/rss/search?q=site:…`), que también es un recurso oficial de búsqueda.
- Respetamos `User-Agent` identificable y timeouts razonables.
- Si vas a usar esto comercialmente, revisa los términos de servicio de cada medio y considera atribución visible a la fuente original (ya incluida en el campo `source`).
