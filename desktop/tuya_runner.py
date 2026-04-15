"""
tuya_runner.py
──────────────
Lightweight local HTTP server that lists and runs .bat files from
C:\Scripts\Tuya Scenes\Bones

Run with:  pythonw tuya_runner.py
Runs on:   http://localhost:8765

Endpoints:
  GET /ping         → {"alive": true}
  GET /list         → {"scripts": ["Lights On.bat", "Lights Off.bat", ...]}
  GET /run?script=  → {"ok": true}  or  {"ok": false, "error": "..."}
"""

import os
import json
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs, unquote

SCENES_DIR = r"C:\Scripts\Tuya Scenes\Bones"
PORT = 8765


class Handler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass  # Silence default request logging

    def _send(self, data: dict, status: int = 200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path   = parsed.path
        params = parse_qs(parsed.query)

        if path == "/ping":
            self._send({"alive": True})

        elif path == "/list":
            try:
                files = sorted(
                    f for f in os.listdir(SCENES_DIR)
                    if f.lower().endswith(".bat")
                )
                self._send({"scripts": files})
            except FileNotFoundError:
                self._send({"scripts": [], "error": f"Directory not found: {SCENES_DIR}"})

        elif path == "/run":
            script = unquote(params.get("script", [""])[0])
            if not script:
                self._send({"ok": False, "error": "No script specified"}, 400)
                return

            # Safety: only allow .bat files that actually live in SCENES_DIR
            full_path = os.path.normpath(os.path.join(SCENES_DIR, script))
            if not full_path.startswith(os.path.normpath(SCENES_DIR)):
                self._send({"ok": False, "error": "Invalid path"}, 403)
                return
            if not os.path.isfile(full_path):
                self._send({"ok": False, "error": f"Not found: {script}"}, 404)
                return

            try:
                # Run the .bat file without showing a console window
                subprocess.Popen(
                    [full_path],
                    creationflags=subprocess.CREATE_NO_WINDOW,
                    shell=True
                )
                self._send({"ok": True})
            except Exception as e:
                self._send({"ok": False, "error": str(e)}, 500)

        else:
            self._send({"error": "Not found"}, 404)


if __name__ == "__main__":
    server = HTTPServer(("localhost", PORT), Handler)
    print(f"Tuya runner listening on http://localhost:{PORT}")
    print(f"Scanning: {SCENES_DIR}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
