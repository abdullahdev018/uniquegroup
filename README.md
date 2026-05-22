# Unique Properties

A real estate project for **Unique Properties** (Park View Lahore), containing two parts:

- **`app/`** — Native Android app built with Kotlin + Jetpack Compose (Material 3).
- **`web/`** — Marketing & admin website built with vanilla HTML, CSS, and JS.

---

## Android App (`app/`)

- **Language:** Kotlin
- **UI:** Jetpack Compose, Material 3
- **Package:** `com.scoreboard.uniqueproperties`
- **minSdk:** 29 · **targetSdk:** 36 · **compileSdk:** 36
- **JVM target:** 11

### Build & Run

Open the project root in **Android Studio** (Giraffe or newer recommended) and let Gradle sync, then run the `app` configuration on an emulator or device.

From the command line:

```bash
./gradlew :app:assembleDebug          # build debug APK
./gradlew :app:installDebug           # install on a connected device
./gradlew test                        # unit tests
./gradlew connectedAndroidTest        # instrumented tests
```

The debug APK is produced at `app/build/outputs/apk/debug/app-debug.apk`.

---

## Website (`web/`)

A static luxury real estate site. No build step — just open `web/index.html` in a browser, or serve the folder:

```bash
cd web
python3 -m http.server 8080
# then open http://localhost:8080
```

### Pages

| File | Purpose |
| --- | --- |
| `index.html` | Home (hero, featured properties, why-us, about, CTA) |
| `properties.html` | Listing with live filters (search / price / block / type) |
| `property-details.html` | Gallery, description, features, inquiry form |
| `about.html` | Company story, mission, team |
| `contact.html` | Form, map, phone, email, WhatsApp |
| `admin.html` | Admin demo: dashboard, properties, add-property, inquiries |
| `blog.html`, `blog-*.html` | Blog index and articles |

### Stack

Vanilla HTML + CSS + JS · Google Fonts (Poppins + Inter) · Font Awesome · AOS (scroll animations) · Swiper.js (galleries) · Unsplash placeholder photos.

### Customize

- **WhatsApp number:** edit `WHATSAPP_NUMBER` in `web/assets/js/main.js`.
- **Phone / Email:** search & replace `+92 300 1234567` and `info@uniqueproperties.pk` across the HTML.
- **Brand colors:** tweak CSS variables (`--navy`, `--gold`, `--soft`, `--text`) at the top of `web/assets/css/style.css`.
- **Images:** replace the Unsplash URLs with your own under `web/assets/img/`.
- **Map:** swap the Google Maps `src` in `property-details.html` and `contact.html`.

### Deploy

Drop the `web/` folder onto any static host — Netlify, Vercel, GitHub Pages, Cloudflare Pages, or shared hosting via FTP.

---

## Repository Layout

```
.
├── app/                  Android app module
├── web/                  Static marketing & admin site
├── gradle/               Gradle wrapper & version catalog
├── build.gradle.kts      Root Gradle build
├── settings.gradle.kts   Gradle settings (includes :app)
└── README.md             You are here
```

---

Designed by **ABD Tech**
