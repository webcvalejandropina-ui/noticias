# News (multi-idioma · multi-categoría)

Agregador de noticias con API en **Bun** + **SQLite** y frontend **Astro SSR** (sistema de diseño inspirado en PlayStation.com). Cobertura en **inglés** y **español**, con 6 categorías (IA, fútbol, internacional, tecnología, software, hack). Cada noticia tiene siempre **imagen**, **título**, **descripción** y **enlace**.

![preview](./frontend/public/favicon.svg)

- **API** en `http://localhost:${HOST_PORT:-13100}` — endpoints `/:lang/news/:category`, `/:lang/browse/:category`, `/refresh`, …
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
| Inteligencia artificial | `/es/news/ia` | Xataka IA · El País IA · 20 Minutos IA · Wired ES IA · Telefónica IA |
| Fútbol | `/es/news/futbol` | Marca · AS |
| Internacional | `/es/news/internacional` | 20 Minutos Internacional · ABC Internacional |
| Tecnología | `/es/news/tecnologia` | Muy Interesante Tecnología |
| Software | `/es/news/software` | Europa Press Software |
| Hack / ciberseguridad | `/es/news/hack` | Libertad Digital Hacker · The Hacker News |

> Cuando una fuente no expone un feed RSS filtrado por tema (p.ej. El País o Libertad Digital), usamos Google News RSS (`site:dominio consulta`) para obtener solo los artículos relevantes. Esto evita scraping agresivo.

### Garantía de fuentes en IA

En `/es/news/ia` (y también en `/en/news/ia`) se garantiza que **todos los días aparezca al menos una noticia de cada fuente configurada**. Si una fuente no ha publicado hoy, se usa su artículo más reciente disponible para que nunca falte su presencia en el resultado.

## Requisitos

- [Bun](https://bun.sh) ≥ 1.1 (para desarrollo local), **o**
- Docker / Docker Compose (para ejecutar sin instalar Bun)

## Ejecución local

```bash
bun install
bun run dev        # desarrollo con hot reload
bun run start      # producción
bun run scrape     # scraping manual (todos los idiomas/categorías)
bun run scrape es ia       # solo español + IA
bun run scrape es futbol   # solo español + fútbol
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

### Llevarlo a otro equipo sin acceso al código (Portainer, .tar)

Genera un `.tar` con las imágenes **`linux/amd64`** (compatible con cualquier PC Linux x86_64 y con Docker Desktop de Windows/macOS en modo Linux containers):

```bash
./scripts/export-docker-tar.sh                                           # Linux / macOS
powershell -ExecutionPolicy Bypass -File scripts/export-docker-tar.ps1   # Windows
```

Se crea `noticias-docker-images.tar` (~270 MB). Copia ese fichero y `docker-compose.yml` al equipo destino y ejecuta:

```bash
docker load -i noticias-docker-images.tar
docker compose up -d            # no hace build: ya tiene las imágenes cargadas
```

En **Portainer** (`Stacks → Add stack → Web editor`):

1. Pega el contenido de `docker-compose.yml`.
2. En **Environment variables** añade al menos:
   ```
   PUBLIC_API_URL=http://192.168.1.128:13100
   ```
   (IP real del host Docker; `:13100` es el puerto del API).
3. Deploy.

Portainer no construirá nada: la imagen ya está en el daemon porque hiciste `docker load` previamente.

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
- **`ADMIN_API_TOKEN`**: obligatorio en producción. Protege `GET /refresh`, `GET /sync`, `GET /enrich`, `GET /cleanup` y las rutas `/:lang/sync` y `/:lang/refresh/:category`. Uso: cabecera `Authorization: Bearer <token>` o `X-Admin-Token: <token>`. El cron con `docker compose --profile scrape run` **no** pasa por HTTP; no necesita el token.
- **`CORS_ALLOWED_ORIGINS`**: orígenes permitidos para peticiones al API desde el navegador (p. ej. la URL del frontend). En producción, si está vacío, **no** se envía `Access-Control-Allow-Origin: *` (más seguro). El frontend Astro hace `fetch` en SSR hacia `http://api:13100`, así que sigue funcionando sin CORS abierto.

Recomendado delante del VPS: **Caddy** o **nginx** con TLS, limitando exposición de puertos al 443 (y proxy interno a `frontend:4321` y `api:13100` si quieres un solo host; en el compose actual ambos puertos se publican en el host para simplicidad).

Nunca uses `:latest` en producción; rotar `TAG` te da rollbacks triviales.

#### Seguridad (resumen)

| Entorno | `APP_ENV` | Rutas admin (`/refresh`, …) | CORS |
|---------|-----------|-----------------------------|------|
| `docker-compose.yml` por defecto | `development` | Abiertas (cómodo en local) | `*` |
| `docker-compose.prod.yml` | `production` | Requieren `ADMIN_API_TOKEN` | Lista en `CORS_ALLOWED_ORIGINS` o estricto |

Cabecera en todas las respuestas JSON: `X-Content-Type-Options: nosniff`. Los errores 500 en producción no incluyen el mensaje interno en el JSON.

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
| `SCRAPE_ON_START` | `1` | Si es `1`, dispara un scraping global en segundo plano al arrancar el API |
| `APP_ENV` | `development` (compose base) / `production` (prod) | Activa protección de rutas admin y CORS estricto en producción |
| `ADMIN_API_TOKEN` | vacío (dev) / obligatorio (prod) | Token para `/refresh`, `/sync`, `/enrich`, `/cleanup` y variantes |
| `CORS_ALLOWED_ORIGINS` | vacío | En prod: lista separada por comas de orígenes permitidos; vacío = sin wildcard |
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
| GET | `/sources` | Fuentes configuradas (con su idioma y categoría) |
| GET | `/refresh` | Fuerza scraping de **todas** las fuentes |
| GET | `/news` | Alias retrocompat → `/en/news/ia` |
| GET | `/:lang/categories` | Categorías disponibles para un idioma (`en`, `es`) |
| GET | `/:lang/news` | Top 10 de categoría IA en ese idioma |
| GET | `/:lang/news/:category` | Top 10 de una categoría (`ia`, `futbol`, `internacional`, `tecnologia`, `software`, `hack`) |
| GET | `/:lang/news/:category?limit=N` | Personaliza el número (1-50) |
| GET | `/:lang/browse/:category` | Listado paginado con filtros (`page`, `pageSize`, `q`, `source`) — pensado para el frontend |
| GET | `/:lang/sources?category=X` | Fuentes de un idioma (opcional: filtradas por categoría) |
| GET | `/:lang/all` | Todas las noticias del día para ese idioma |
| GET | `/:lang/refresh/:category` | Fuerza scraping de un bucket concreto |

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
      "id": 1234,
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
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
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

El campo `link UNIQUE` evita duplicados entre scrapings. Al abrir una DB vieja (sin `language`/`category`), el código ejecuta un `ALTER TABLE ADD COLUMN` idempotente para migrarla sin perder datos.

## Frontend (Astro SSR)

El frontend vive en `frontend/` y se construye con **Astro 5** (adaptador `@astrojs/node` en modo standalone). El sistema de diseño sigue `DESIGN.md` (inspirado en PlayStation.com): negro → blanco → azul, SST-alike en weight 300 para displays, botones pill con signature hover cyan + ring azul + scale.

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
bun install
API_URL=http://localhost:13100 bun run build
API_URL=http://localhost:13100 bun ./dist/server/entry.mjs   # o `bun run start` con node 20
```

## Estructura del proyecto

```
.
├── bunfig.toml
├── package.json
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
│   │   └── scrape.ts           # CLI: `bun run scrape [idioma] [categoria]`
│   └── scrapers/
│       ├── index.ts            # Orquestador + cache por bucket + fairness
│       ├── sources.ts          # Fuentes configuradas (21)
│       ├── rss.ts              # Parser RSS/Atom + filtro por keywords
│       └── og-image.ts         # Extractor de og:image
└── frontend/                   # Frontend Astro SSR
    ├── Dockerfile              # imagen Astro (Node 20)
    ├── astro.config.mjs
    ├── tsconfig.json
    ├── package.json
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
