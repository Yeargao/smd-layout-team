# State Machine Diagram Layout Editor — integration proposal

Requires Python 3 and Node.js 20+. No npm dependencies. From this folder:

```
npm test
node tests/layout-benchmark.mjs
python -m http.server 8000
```

Open http://localhost:8000/. Drag states and orange waypoints. Right-click dotted regions or collapsed circles. Use the Parent region menu when adding nodes/regions. Save JSON downloads the complete graph and geometry and saves a browser-local copy. Reload opens the last saved browser copy. Load JSON validates the document before replacing the view. Auto-layout is explicit; it replaces manual geometry.

Optional UI test (requires Playwright and Chromium): `python -m pip install playwright`, `python -m playwright install chromium`, `python tools/browser_test.py`.

See `docs/integration-report.md` for evidence and limitations. This is a proposed integration, not a claim of independent student work or accepted final release.
