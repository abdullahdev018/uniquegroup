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

Open `index.html` directly in your browser. No build step. No server required.

To preview locally with a quick HTTP server:

```bash
cd web
python3 -m http.server 8080
# then open http://localhost:8080
```

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
