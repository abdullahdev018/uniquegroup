# Unique Properties — Luxury Real Estate Website

A modern luxury real estate website for **Unique Properties**, specializing in Park View Lahore.

## Pages

- `index.html` — Home (hero, featured properties, why-us, about, CTA, footer)
- `properties.html` — Listing with live filters (search / price / block / type)
- `property-details.html` — Gallery, description, features, inquiry form
- `about.html` — Company story, mission, team
- `contact.html` — Form, map, phone, email, WhatsApp
- `admin.html` — Admin demo: dashboard, properties, add-property form, inquiries

## Run

Properties are stored by a small backend, so the server **must be running** —
opening `admin.html` as a file (or with the server off) is why the panel looks
broken and listings stay empty.

**Easiest (macOS):** double-click **`web/start.command`**. It launches the
server and opens the site in your browser automatically.

**Or from a terminal:**

```bash
cd web
python3 server.py
# then open http://localhost:8080
```

`server.py` (pure Python standard library — no installs) serves the static
site **and** a JSON API:

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/properties` | list all properties (newest first) |
| POST | `/api/properties` | create one |
| PUT | `/api/properties/<id>` | update |
| DELETE | `/api/properties/<id>` | delete |

The admin panel (`admin.html`) writes to this API, and the public
`properties.html` / home page read from it. Data is persisted to
`web/data/db.json` (created automatically, git-ignored).

> The static pages still open without the server, but the Properties listing
> and admin Properties tab need `server.py` running. (Blog posts and Settings
> are still stored per-browser in `localStorage`.)

## Stack

- Vanilla HTML + CSS + JS
- Google Fonts (Poppins + Inter)
- Font Awesome (icons)
- AOS (scroll animations)
- Swiper.js (property gallery)
- Unsplash photos as placeholders

## Customize

- **WhatsApp number**: edit `WHATSAPP_NUMBER` in `assets/js/main.js`.
- **Phone / Email**: search & replace `+92 300 1234567` and `info@uniqueproperties.pk` across the HTML.
- **Colors**: tweak CSS variables (`--navy`, `--gold`, `--soft`, `--text`) at the top of `assets/css/style.css`.
- **Images**: replace the Unsplash URLs in HTML with your own images placed under `assets/img/`.
- **Map**: replace the Google Maps `src` in `property-details.html` and `contact.html` with your exact location embed.

## Deploy

Drop the `web/` folder onto any static host:
- Netlify / Vercel / GitHub Pages
- Cloudflare Pages
- Any shared hosting via FTP

## Future Upgrades

User accounts, favorites, AI chatbot, booking system, mortgage calculator, real admin backend.

---
Designed by **ABD Tech**
