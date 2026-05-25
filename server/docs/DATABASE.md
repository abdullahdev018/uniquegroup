# Unique Properties — Database Architecture

Production PostgreSQL schema for the Unique Properties real estate platform, modeled with Prisma. This document covers the table structure, relationships, indexes, the PostgreSQL-specific features (full-text search, geolocation), soft deletes, and how to scale.

- **Source of truth:** [`prisma/schema.prisma`](../prisma/schema.prisma) — `prisma migrate` generates the SQL DDL from it.
- **Seed data:** [`prisma/seed.ts`](../prisma/seed.ts)
- **API design:** [`API.md`](./API.md)

---

## 1. Conventions

| Concern | Choice | Why |
|---|---|---|
| Primary keys | `UUID` via `gen_random_uuid()` | Non-guessable, mergeable across services, no sequence hot-spots. For very large tables, switch to **UUID v7** (time-ordered) for better B-tree locality. |
| Timestamps | `created_at` / `updated_at` as `timestamptz(6)` | Always store UTC with tz; `updated_at` is Prisma-managed (`@updatedAt`). |
| Naming | `snake_case` tables/columns, plural tables | Postgres-idiomatic; camelCase stays in app code via `@map`/`@@map`. |
| Soft delete | nullable `deleted_at` on content tables | Recover from mistakes; preserve referential history. Append-only event tables are **not** soft-deleted. |
| SEO | unique `slug` everywhere user-facing | Stable, indexed, human-readable URLs. |
| Money | `Decimal(14,2)` | Never floats for currency. |
| Foreign keys | explicitly indexed | Postgres does **not** auto-index FK columns. |

---

## 2. Modules & tables (44 tables)

**1 · Auth & Users** — `users`, `admins`, `roles`, `permissions`, `role_permissions`, `sessions`
**2 · Properties** — `properties`, `property_types`, `property_categories`, `property_status`, `property_locations`, `property_images`, `property_features`, `amenities`, `property_amenities`, `property_views`, `featured_properties`
**3 · Agents** — `agents`, `agent_profiles`, `agent_social_links`, `agent_reviews`
**4 · Blog** — `blogs`, `blog_categories`, `blog_tags`, `blog_post_tags`, `blog_comments`, `blog_authors`
**5 · Leads** — `inquiries`, `contact_messages`, `property_visits`, `newsletter_subscribers`
**6 · Settings** — `global_settings`, `seo_settings`, `homepage_sections`, `banners`, `testimonials`, `faqs`
**7 · Media** — `media_library`, `file_uploads`
**8 · Analytics** — `analytics_events`, `page_views`, `search_history`
**Engagement** — `favorites` (wishlist), `recently_viewed`

---

## 3. Relationships (ERD explanation)

### Identity & access
- **`admins` → `roles` → `permissions`** is classic RBAC. An admin has exactly one role (`Restrict` on delete — you can't delete a role still in use). A role has many permissions through the join table **`role_permissions`** (composite PK `(role_id, permission_id)`). Check `permissions.slug` (e.g. `property.delete`) in middleware.
- **`sessions`** belongs to *either* a `user` *or* an `admin` (both FKs nullable, `Cascade` delete). Store only a **hash** of the token.
- **`users`** are public customers; **`admins`** are staff. They're deliberately separate tables (different lifecycles, auth, columns). A `user` may optionally also be an `agent` (1:1, `agents.user_id`).

### Properties (the core aggregate)
```
property_types ─┐
property_categories (self-nesting) ─┤
property_status ─┼──< properties >── agents ──< agent_reviews
admins (created_by) ─┘      │                └─ agent_profiles (1:1)
                            │                └─< agent_social_links
        ┌───────────────────┼───────────────────────────┐
   property_locations   property_images            property_features
      (1:1, geo)        (gallery, cover)          (key/value attrs)
        ┌───────────────────┼───────────────────────────┐
   property_amenities   property_views            featured_properties
   >── amenities        (one row per view)        (1:1, homepage)
```
- A **`property`** references a `type` (`Restrict`), optional `category` (`SetNull`), `status` (`Restrict`), optional `agent` (`SetNull`), and the `admin` who created it (`SetNull`).
- **`property_locations`** is 1:1 (`property_id UNIQUE`, `Cascade`) — split out so geo columns and a future PostGIS column live together and don't bloat the hot `properties` row.
- **`property_images`**, **`property_features`** are 1:many and `Cascade` (delete the property → delete its images/features).
- **`amenities`** is a shared catalog joined many-to-many via **`property_amenities`**. Features (free-form per-property) vs. amenities (reusable catalog) are intentionally different tables.
- **`property_views`** is append-only, one row per view (`Cascade`). `properties.views_count` is a denormalized counter for fast sorting; the table is the audit trail.
- **`featured_properties`** is a 1:1 placement record with optional `starts_at`/`ends_at` for scheduled homepage campaigns.

### Blog
- **`blogs`** → optional `blog_categories` (self-nesting) and `blog_authors` (`SetNull`). A `blog_author` may link to an `admin` (1:1).
- **`blog_tags`** many-to-many through **`blog_post_tags`**.
- **`blog_comments`** are threaded via a self-relation (`parent_id`, `Cascade`) and moderated via `status`.

### Leads
- **`inquiries`** optionally reference a `property`, `agent`, and `user` (all `SetNull`, so deleting a property keeps the lead). **`property_visits`** are scheduled viewings tied to a property (`Cascade`). **`contact_messages`** and **`newsletter_subscribers`** are standalone.

### Engagement
- **`favorites`** and **`recently_viewed`** both have a `UNIQUE(user_id, property_id)` and `Cascade` both ways — the wishlist and history die with either the user or the property. `recently_viewed` is upserted (bump `viewed_at`).

### Delete-rule summary
| Rule | Used for | Meaning |
|---|---|---|
| `Cascade` | images, features, amenities, views, location, favorites, visits, comments, sessions | child is meaningless without parent |
| `Restrict` | property→type/status, admin→role | block deletion of in-use lookups |
| `SetNull` | property→agent/category/createdBy, inquiry→*, media→uploadedBy | keep the record, drop the link |

---

## 4. Recommended indexes

Most are already declared in the schema (`@unique`, `@@index`, `@@id`). Highlights:

- **Every foreign key is indexed** (e.g. `properties(type_id, category_id, status_id, agent_id)`).
- **All `slug` columns** are `UNIQUE` (implicit index) for URL lookups.
- **Listing feeds:** `properties(is_published, published_at DESC)`, `properties(created_at DESC)`, `properties(is_featured)`, `properties(price)`, `properties(purpose)`.
- **Moderation queues:** `inquiries(status)`, `blog_comments(blog_id, status)`, `agent_reviews(agent_id, status)`.
- **Time-series reads:** `property_views(property_id, created_at)`, `page_views(path, created_at)`, `analytics_events(event_type, created_at)`.
- **Engagement:** `recently_viewed(user_id, viewed_at DESC)`, unique `favorites(user_id, property_id)`.

### Specialized indexes added via raw migration (Prisma can't express these)

Create `prisma/migrations/<timestamp>_search_and_geo/migration.sql` (or run `prisma migrate dev --create-only` then paste):

```sql
-- Extensions (declared in schema; ensure they exist)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS postgis;

-- 4a. FULL-TEXT SEARCH on properties: a generated tsvector + GIN index.
ALTER TABLE properties
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;
CREATE INDEX properties_search_idx ON properties USING GIN (search_vector);

-- Same for blogs.
ALTER TABLE blogs
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) STORED;
CREATE INDEX blogs_search_idx ON blogs USING GIN (search_vector);

-- 4b. Trigram index for fuzzy "as you type" matching on titles/locations.
CREATE INDEX properties_title_trgm_idx ON properties USING GIN (title gin_trgm_ops);

-- 4c. GEOLOCATION: PostGIS geography column + GiST index for radius/map search.
ALTER TABLE property_locations
  ADD COLUMN geo geography(Point, 4326)
  GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)::geography
  ) STORED;
CREATE INDEX property_locations_geo_idx ON property_locations USING GIST (geo);

-- 4d. Data integrity CHECKs not expressible in Prisma.
ALTER TABLE agent_reviews   ADD CONSTRAINT rating_range CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE testimonials    ADD CONSTRAINT rating_range CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE properties      ADD CONSTRAINT price_nonneg  CHECK (price >= 0);

-- 4e. Partial index: only index live listings (smaller, faster feed query).
CREATE INDEX properties_live_idx ON properties (published_at DESC)
  WHERE is_published = true AND deleted_at IS NULL;
```

### Querying these features

```ts
// Full-text (preview feature `fullTextSearch`)
await prisma.property.findMany({ where: { description: { search: 'kanal & villa' } } });

// Radius search (raw — within 5km of a point, nearest first)
const rows = await prisma.$queryRaw`
  SELECT p.id, p.title, ST_Distance(l.geo, ST_MakePoint(${lng}, ${lat})::geography) AS meters
  FROM properties p JOIN property_locations l ON l.property_id = p.id
  WHERE ST_DWithin(l.geo, ST_MakePoint(${lng}, ${lat})::geography, 5000)
    AND p.is_published = true AND p.deleted_at IS NULL
  ORDER BY meters ASC LIMIT 50;`;
```

---

## 5. Soft delete

`deleted_at` is on content tables. Enforce it globally with a **Prisma Client extension** so application queries never see soft-deleted rows:

```ts
// src/db.ts
import { PrismaClient } from '@prisma/client';

const base = new PrismaClient();
const SOFT = new Set(['User','Admin','Property','PropertyType','PropertyCategory',
  'Agent','Blog','BlogCategory','MediaLibrary','Inquiry','ContactMessage']);

export const prisma = base.$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (SOFT.has(model)) args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
      async findFirst({ model, args, query }) {
        if (SOFT.has(model)) args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
      // Turn delete() into an update() that stamps deleted_at.
      async delete({ model, args, query }) {
        if (!SOFT.has(model)) return query(args);
        return (base as any)[model[0].toLowerCase() + model.slice(1)]
          .update({ ...args, data: { deletedAt: new Date() } });
      },
    },
  },
});
```
Provide an explicit `prisma.$parent` / raw path for admin "trash" views that *do* need to see deleted rows.

---

## 6. Migrations & local setup

```bash
cd server
cp .env.example .env            # set DATABASE_URL / DIRECT_URL
npm install
npx prisma migrate dev --name init      # creates tables from schema
# add the raw SQL from §4 as a follow-up migration:
npx prisma migrate dev --create-only --name search_and_geo   # paste SQL, then:
npx prisma migrate dev
npm run db:seed                 # load lookups + sample Lahore data
npx prisma studio               # browse the DB
```
Production deploys use `npx prisma migrate deploy` (no prompts, applies pending migrations).

---

## 7. Scaling best practices

**Connection management.** Serverless/Node pools exhaust Postgres connections fast. Put **PgBouncer** (transaction mode) or **Prisma Accelerate** in front; point `DATABASE_URL` at the pooler and `DIRECT_URL` at the raw DB for migrations.

**Partition the firehose tables.** `analytics_events`, `page_views`, and `property_views` grow without bound. Convert them to **declarative range partitions by month** on `created_at`, auto-create next month's partition (pg_partman), and detach/drop or archive old partitions to cold storage (S3/Parquet). Keeps indexes small and `DELETE` cheap.

**Denormalize hot counters.** `properties.views_count`, `favorites_count`, `agents.rating_avg/reviews_count` avoid `COUNT(*)` on every page. Update them with triggers or a background job; treat the row tables as the source of truth.

**Read replicas.** Send the public site's read traffic (listings, blog, search) to replicas; keep writes (admin, inquiries) on the primary. Prisma supports the read-replica extension.

**Caching.** Cache rendered listing pages / search results and lookup tables (`property_types`, `amenities`, `global_settings`) in Redis; invalidate on write. Settings/SEO are read constantly and change rarely — perfect cache candidates.

**Materialized views** for dashboard analytics (e.g. monthly visitors, inquiries-by-source). Refresh `CONCURRENTLY` on a schedule instead of aggregating live.

**Full-text vs. dedicated search.** The Postgres GIN/tsvector setup scales to millions of rows. Beyond that, or for typo-tolerant faceted search, stream changes to **OpenSearch / Meilisearch / Typesense**.

**Indexes & maintenance.** Index for your real query patterns (composite, ordered, partial), not every column. Monitor with `pg_stat_statements`; build indexes `CONCURRENTLY` in prod; keep `autovacuum` healthy on high-churn tables.

**Media off the DB.** Store files in S3/Cloudinary; `media_library`/`file_uploads` hold metadata + URLs only. Serve via CDN.

**Integrity at the DB layer.** Keep FKs, `CHECK`s, and `UNIQUE`s in the database (not just app code) — they're your last line of defense under concurrency.
