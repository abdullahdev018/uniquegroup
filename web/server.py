#!/usr/bin/env python3
"""
Unique Properties — local dev backend.

Serves the static website AND a small JSON REST API for listings, so properties
(and blogs) are stored on the server instead of in each visitor's browser.

Run:   python3 server.py            # from the web/ folder
       PORT=9000 python3 server.py  # custom port

API (JSON):
    GET    /api/properties          -> list (newest first)
    POST   /api/properties          -> create   {title, price, ...}
    GET    /api/properties/<id>     -> single
    PUT    /api/properties/<id>     -> update
    DELETE /api/properties/<id>     -> remove
    (the same routes exist for /api/blogs)

Data is persisted to web/data/db.json (created automatically).
No third-party dependencies — pure Python standard library.
"""
import json
import os
import secrets
import threading
import time
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

BASE = os.path.dirname(os.path.abspath(__file__))      # the web/ directory
DATA_DIR = os.path.join(BASE, "data")
DB_PATH = os.path.join(DATA_DIR, "db.json")
PORT = int(os.environ.get("PORT", "8080"))
COLLECTIONS = ("properties", "blogs")
_lock = threading.Lock()

# ---- Admin auth ----
# Change the password by setting ADMIN_PASSWORD before starting the server:
#   ADMIN_PASSWORD='your-secret' python3 server.py
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "unique2026")
_tokens = set()           # valid session tokens (in memory; cleared on restart)


def load_db():
    try:
        with open(DB_PATH, encoding="utf-8") as f:
            db = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        db = {}
    for c in COLLECTIONS:
        db.setdefault(c, [])
    return db


def save_db(db):
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = DB_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    os.replace(tmp, DB_PATH)  # atomic write


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE, **kwargs)

    # Send no-cache headers on EVERY response (static files + API) so edits and
    # cleared listings always show on refresh instead of a stale cached copy.
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    # ---------- response helpers ----------
    def _json(self, obj, status=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return {}
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
            return data if isinstance(data, dict) else {}
        except (json.JSONDecodeError, ValueError):
            return {}

    def _api_parts(self):
        """Return ['properties'] / ['properties', '<id>'] for /api/* paths, else None."""
        path = urlparse(self.path).path
        if not path.startswith("/api/"):
            return None
        return [p for p in path[len("/api/"):].split("/") if p]

    # ---------- HTTP verbs ----------
    def do_GET(self):
        parts = self._api_parts()
        if parts is None:
            # don't expose the database file or the server source
            path = urlparse(self.path).path
            if path.startswith("/data/") or path.endswith("server.py"):
                return self.send_error(403, "Forbidden")
            return super().do_GET()
        self._api("GET", parts)

    def do_POST(self):
        parts = self._api_parts()
        if parts is None:
            return self.send_error(404)
        self._api("POST", parts)

    def do_PUT(self):
        parts = self._api_parts()
        if parts is None:
            return self.send_error(404)
        self._api("PUT", parts)

    def do_DELETE(self):
        parts = self._api_parts()
        if parts is None:
            return self.send_error(404)
        self._api("DELETE", parts)

    # ---------- auth helpers ----------
    def _bearer(self):
        h = self.headers.get("Authorization", "")
        return h[7:].strip() if h.startswith("Bearer ") else ""

    def _authed(self):
        return self._bearer() in _tokens

    # ---------- API routing ----------
    def _api(self, method, parts):
        # Auth endpoints (no collection).
        if parts and parts[0] == "login":
            if method != "POST":
                return self._json({"error": "method not allowed"}, 405)
            if self._body_json().get("password") == ADMIN_PASSWORD:
                token = secrets.token_hex(24)
                _tokens.add(token)
                return self._json({"token": token})
            return self._json({"error": "Incorrect password"}, 401)
        if parts and parts[0] == "logout":
            _tokens.discard(self._bearer())
            return self._json({"ok": True})

        if not parts or parts[0] not in COLLECTIONS:
            return self._json({"error": "unknown collection"}, 404)
        coll = parts[0]
        item_id = parts[1] if len(parts) > 1 else None

        # GET is public (the site needs to read); writes require a valid admin token.
        if method in ("POST", "PUT", "DELETE") and not self._authed():
            return self._json({"error": "unauthorized"}, 401)

        with _lock:
            db = load_db()
            items = db[coll]

            if method == "GET":
                if item_id:
                    found = next((x for x in items if x.get("id") == item_id), None)
                    return self._json(found if found else {"error": "not found"},
                                      200 if found else 404)
                return self._json(items)

            if method == "POST":
                data = self._body_json()
                data["id"] = uuid.uuid4().hex[:12]
                data["createdAt"] = int(time.time() * 1000)
                items.insert(0, data)            # newest first
                save_db(db)
                return self._json(data, 201)

            if method == "PUT":
                if not item_id:
                    return self._json({"error": "id required"}, 400)
                data = self._body_json()
                data.pop("id", None)
                for i, x in enumerate(items):
                    if x.get("id") == item_id:
                        items[i] = {**x, **data}
                        save_db(db)
                        return self._json(items[i])
                return self._json({"error": "not found"}, 404)

            if method == "DELETE":
                if not item_id:
                    return self._json({"error": "id required"}, 400)
                before = len(items)
                db[coll] = [x for x in items if x.get("id") != item_id]
                save_db(db)
                return self._json({"ok": True, "deleted": before - len(db[coll])})

        self._json({"error": "method not allowed"}, 405)

    def log_message(self, fmt, *args):
        pass  # keep the console quiet


if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"Unique Properties — running at  http://localhost:{PORT}")
    print(f"  Static site : {BASE}")
    print(f"  API         : http://localhost:{PORT}/api/properties")
    print(f"  Database    : {DB_PATH}")
    print("  Press Ctrl+C to stop.")
    try:
        ThreadingHTTPServer(("", PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
