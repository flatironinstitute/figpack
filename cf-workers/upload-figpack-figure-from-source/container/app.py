import os
import json
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer

FIGPACK_API_KEY = os.environ.get("FIGPACK_API_KEY")
PORT = int(os.environ.get("PORT", "8080"))


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, payload: dict):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.path != "/run":
            self._send(404, {"error": "not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            body = json.loads(raw or "{}")
        except Exception as e:
            self._send(400, {"error": f"invalid json: {e}"})
            return

        source_url = (body.get("source_url") or "").strip()
        title = (body.get("title") or f"Source: {source_url}").strip()

        if not source_url:
            self._send(400, {"error": "missing source_url"})
            return

        if not FIGPACK_API_KEY:
            self._send(500, {"error": "FIGPACK_API_KEY not set in container env"})
            return

        # Build the figpack command
        cmd = [
            "figpack",
            "upload-from-source-url",
            source_url,
            "--title",
            title,
        ]

        # Inherit env, but ensure FIGPACK_API_KEY is present
        env = os.environ.copy()
        env["FIGPACK_API_KEY"] = FIGPACK_API_KEY

        try:
            proc = subprocess.run(
                cmd, capture_output=True, text=True, env=env, timeout=60 * 10
            )
            if proc.returncode != 0:
                self._send(502, {"error": "figpack failed", "stderr": proc.stderr})
                return

            self._send(200, {"ok": True, "stdout": proc.stdout})
        except subprocess.TimeoutExpired:
            self._send(504, {"error": "figpack timed out"})
        except Exception as e:
            self._send(500, {"error": f"unexpected error: {e}"})


def main():
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
