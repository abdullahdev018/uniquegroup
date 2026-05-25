# Unique Properties — Backend & Database

Production database layer for the Unique Properties real estate platform:
**PostgreSQL + Prisma + Node.js**, with admin dashboard, blog, and property
management support.

## What's here

```
server/
├─ prisma/
│  ├─ schema.prisma     # complete schema — 44 tables, 8 modules (source of truth)
│  └─ seed.ts           # idempotent seed (Park View Lahore sample data)
├─ docs/
│  ├─ DATABASE.md       # ERD explanation, indexes, FTS + PostGIS, soft delete, scaling
│  └─ API.md            # REST API structure + folder layout
├─ .env.example
├─ package.json
└─ tsconfig.json
```

## Modules

1. **Auth & Users** — users, admins, roles, permissions (RBAC), sessions
2. **Properties** — listings, types, categories, status, images, features, amenities, locations (geo), views, featured
3. **Agents** — agents, profiles, social links, reviews
4. **Blog** — posts, categories, tags, comments, authors
5. **Leads** — inquiries, contact messages, property visits, newsletter
6. **Settings** — global settings, SEO, homepage sections, banners, testimonials, FAQs
7. **Media** — media library, file uploads
8. **Analytics** — events, page views, search history
- **Engagement** — favorites (wishlist), recently viewed

## Highlights

- UUID PKs, `created_at`/`updated_at` everywhere, soft delete (`deleted_at`)
- Slugs + SEO fields, full-text search (tsvector/GIN), PostGIS geolocation
- Proper FKs with deliberate `Cascade` / `Restrict` / `SetNull` rules
- Indexes on every FK + real query patterns; partial & trigram indexes
- Wishlist + recently-viewed; partition-ready analytics tables

## Quick start

```bash
cd server
cp .env.example .env          # set DATABASE_URL / DIRECT_URL (Postgres 13+)
npm install
npx prisma migrate dev --name init
# then add the FTS/PostGIS raw migration from docs/DATABASE.md §4
npm run db:seed
npx prisma studio             # browse the data
```

See **[docs/DATABASE.md](./docs/DATABASE.md)** for the full architecture and
**[docs/API.md](./docs/API.md)** for the API design.

> **Migration path:** this replaces the current `web/server.py` (JSON file store).
> The new API keeps the same `/api/properties` and `/api/blogs` paths, so the
> existing front end (`web/`) works against it unchanged.
