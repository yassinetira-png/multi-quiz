#!/usr/bin/env python3
"""Sert Multi Quiz en local, avec en-têtes HTTP de sécurité."""

from __future__ import annotations

import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
ALLOWED_EXT = {".html", ".css", ".js", ".ico", ".svg", ".png", ".txt", ".md"}
INDEX = "index.html"

SECURITY_HEADERS = {
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self'; "
        "img-src 'self'; "
        "font-src 'none'; "
        "connect-src 'none'; "
        "object-src 'none'; "
        "base-uri 'none'; "
        "form-action 'self'; "
        "frame-ancestors 'none'"
    ),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Cache-Control": "no-store",
}


class SecureHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        for name, value in SECURITY_HEADERS.items():
            self.send_header(name, value)
        super().end_headers()

    def list_directory(self, path: str):  # noqa: ARG002
        self.send_error(403, "Listing interdit")
        return None

    def do_POST(self) -> None:  # noqa: N802
        self.send_error(405, "Méthode non autorisée")

    def do_PUT(self) -> None:  # noqa: N802
        self.send_error(405, "Méthode non autorisée")

    def do_DELETE(self) -> None:  # noqa: N802
        self.send_error(405, "Méthode non autorisée")

    def translate_path(self, path: str) -> str:
        parsed = unquote(urlparse(path).path)
        relative = parsed.lstrip("/")
        if not relative or relative.endswith("/"):
            candidate = ROOT / INDEX
        else:
            candidate = (ROOT / relative).resolve()
        try:
            candidate.relative_to(ROOT)
        except ValueError:
            return str(ROOT / "__denied__")
        if candidate.is_dir():
            candidate = candidate / INDEX
        if candidate.suffix.lower() not in ALLOWED_EXT:
            return str(ROOT / "__denied__")
        return str(candidate)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        super().log_message(format, *args)


def main() -> None:
    parser = argparse.ArgumentParser(description="Serveur local sécurisé Multi Quiz")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5173)
    args = parser.parse_args()
    httpd = ThreadingHTTPServer((args.host, args.port), SecureHandler)
    print(f"Multi Quiz : http://{args.host}:{args.port}")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
