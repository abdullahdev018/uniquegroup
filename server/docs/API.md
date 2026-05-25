# Unique Properties — API Structure

A suggested REST API over the Prisma schema. It maps cleanly onto what the
current site already calls (`/api/properties`, `/api/blogs`) while adding the
auth, admin, and engagement surfaces the full schema enables. GraphQL would map
just as well; REST is shown for continuity with the existing front end.

## Stack

- **Node.js + Express** (or Fastify / NestJS) + **Prisma Client**
- **Auth:** JWT access token (15m) + rotating refresh token (`sessions` table, hashed)
- **Validation:** Zod / class-validator on every input
- **Authorization:** RBAC middleware checking `permissions.slug`
- **Conventions:** JSON, `snake_case`-free camelCase payloads, cursor pagination

## Suggested folder layout

```
server/
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ src/
│  ├─ index.ts                # app bootstrap
│  ├─ db.ts                   # Prisma client (+ soft-delete extension)
│  ├─ middleware/             # auth, rbac, error, rate-limit, validate
│  ├─ lib/                    # jwt, hashing, slug, pagination, storage
│  └─ modules/
│     ├─ auth/                # routes • controller • service
│     ├─ properties/
│     ├─ agents/
│     ├─ blog/
│     ├─ leads/               # inquiries, contact, visits, newsletter
│     ├─ media/
│     ├─ settings/
│     ├─ analytics/
│     └─ admin/               # dashboard aggregates
└─ docs/
```
Each module = `*.routes.ts` (HTTP) → `*.controller.ts` (req/res + validation) →
`*.service.ts` (Prisma + business logic). Keeps Prisma out of controllers.

## Conventions

- **Pagination:** `?cursor=<id>&limit=20` (cursor) or `?page=&pageSize=` for admin tables. Responses: `{ data: [...], meta: { nextCursor, total } }`.
- **Filtering/sorting:** `?purpose=SALE&type=villa&minPrice=&maxPrice=&sort=-publishedAt`.
- **Errors:** `{ error: { code, message, details? } }` with proper HTTP status.
- **Public vs. admin:** public routes under `/api/...`; privileged under `/api/admin/...` behind auth + RBAC.

---

## Endpoints

### Auth — `/api/auth`
| Method | Path | Notes |
|---|---|---|
| POST | `/register` | create `user` |
| POST | `/login` | issue access + refresh (`sessions`) |
| POST | `/refresh` | rotate refresh token |
| POST | `/logout` | revoke session |
| GET | `/me` | current user/admin |
| POST | `/admin/login` | staff login |

### Properties — `/api/properties` (public read)
| Method | Path | Notes |
|---|---|---|
| GET | `/` | list; filters, sort, cursor pagination |
| GET | `/featured` | `featured_properties` (active, ordered) |
| GET | `/search?q=` | full-text (tsvector) |
| GET | `/near?lat=&lng=&radius=` | PostGIS radius search |
| GET | `/:slug` | single (joins type/status/agent/images/amenities/location); bumps `property_views` + `views_count` |
| GET | `/:id/similar` | by type/price/location |

### Properties (admin) — `/api/admin/properties` — needs `property.*`
`POST /` create · `PUT /:id` update · `DELETE /:id` soft-delete · `PATCH /:id/status` · `POST /:id/images` · `PATCH /:id/feature` (toggle featured). **Maps to admin panel: add/edit/delete properties.**

### Lookups — `/api/lookups`
`GET /property-types` · `/categories` · `/statuses` · `/amenities` (cache heavily). Admin CRUD under `/api/admin/lookups/*`.

### Agents — `/api/agents`
`GET /` · `GET /:slug` (profile + social + reviews + listings) · `POST /:id/reviews` (→ `PENDING`). Admin: CRUD + review moderation.

### Blog — `/api/blogs` (public read)
| Method | Path | Notes |
|---|---|---|
| GET | `/` | published, by category/tag, cursor paginated |
| GET | `/:slug` | single + author + tags |
| GET | `/categories`, `/tags` | taxonomies |
| POST | `/:id/comments` | → `PENDING` for moderation |

Admin — `/api/admin/blogs` (`blog.manage`): CRUD posts, manage categories/tags, moderate comments. **Maps to: manage blogs.**

### Leads — `/api/...`
`POST /inquiries` (property lead) · `POST /contact` · `POST /visits` (schedule) · `POST /newsletter` / `GET /newsletter/unsubscribe?token=`. Admin: list/filter by status, update status, export.

### Engagement — `/api/me` (auth user)
`GET/POST/DELETE /favorites` (wishlist) · `GET /recently-viewed` (upsert on property view) · `GET /search-history`.

### Media — `/api/admin/media` (`media.upload`)
`POST /upload` (→ `file_uploads` → `media_library`) · `GET /` (library, paginated) · `DELETE /:id`. **Maps to: upload media.**

### Settings & SEO — `/api/admin/settings` (`settings.manage` / `seo.manage`)
`GET/PUT /global` (key-value) · `GET/PUT /seo/:pagePath` · CRUD `/homepage-sections`, `/banners`, `/testimonials`, `/faqs`. Public mirror: `GET /api/settings/public`, `GET /api/homepage`. **Maps to: manage homepage content, settings, SEO.**

### Analytics — `/api/analytics`
`POST /events` (ingest; queue/batch insert) · `POST /pageviews`. Admin dashboard — `/api/admin/analytics` (`analytics.view`): `GET /overview` (totals, growth), `/traffic?range=7m`, `/inquiries-by-source`, `/top-properties` — served from **materialized views**. **Maps to: dashboard analytics.**

---

## Mapping the current site onto this API

The live site already uses `GET/POST/PUT/DELETE /api/properties` and `/api/blogs`. Those become the **public read** + **admin write** routes above, unchanged in shape — so `admin.js` / `main.js` keep working while you migrate the Python/JSON backend to Node + Prisma + Postgres behind the same paths.
