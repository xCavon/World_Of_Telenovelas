# World of Telenovelas

The public pages are now JSON-driven. Episode data and translations live in:

`data/episodes.json`

## Run locally

Opening the HTML files directly with `file://` can block `fetch()` requests to the JSON file. Start a small local server from the project folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`.

## Adding episodes

Open `admin.html` or go directly to `/admin.html`.

1. Load `episodes.json` or import a JSON file.
2. Create or edit an episode.
3. Add translations in the language tabs.
4. Click **Download JSON**.
5. Replace `data/episodes.json` with the exported file.

The homepage and both series pages automatically read the new JSON data.
