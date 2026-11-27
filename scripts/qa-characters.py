#!/usr/bin/env python3
"""QA: 네 캐릭터를 크게 그려 한 장으로 확인."""
import http.server
import pathlib
import socketserver
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = 8792


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        pass


socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", PORT), Handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={"width": 760, "height": 320}, device_scale_factor=2)
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
    pg.wait_for_timeout(800)
    pg.evaluate("""() => {
      const sprites = Array.from(document.querySelectorAll('.agent')).map(a => ({
        id: a.getAttribute('data-agent'),
        tag: a.querySelector('.agent-tag').textContent,
        svg: a.querySelector('svg.sprite').outerHTML
      }));
      const box = document.createElement('div');
      box.id = 'qa';
      box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fbf3e6;display:flex;align-items:center;justify-content:space-around;gap:8px;padding:10px';
      box.innerHTML = sprites.map(s => `
        <div style="text-align:center;font:800 12px/1.4 system-ui;color:#3a2a18">
          <div style="width:150px;height:200px">${s.svg.replace('class="sprite"','class="sprite" style="width:150px;height:200px;overflow:visible;filter:drop-shadow(0 4px 4px rgba(0,0,0,.25))"')}</div>
          <div>${s.tag}</div><div style="font:600 10px system-ui;color:#8b7a63">${s.id}</div>
        </div>`).join('');
      document.body.appendChild(box);
    }""")
    pg.wait_for_timeout(300)
    pg.locator("#qa").screenshot(path=str(ROOT / ".verify" / "characters-qa.png"))
    b.close()

httpd.shutdown()
print("ok")
