# GeoStateNet Chrome Extension 🧩

Browser helper that plugs **GeoStateNet** into [GeoGuessr](https://www.geoguessr.com/) so you can see the model’s U.S.‑state predictions without leaving the game.

> **Currently supported map:** the official **United States** map only. Using the extension on other maps may return unpredictable results. Click **×** to dismiss.

> **Need different keys?** Chrome → Extensions → Keyboard shortcuts → GeoStateNet Assistant.

*Requires the [GeoStateNet‑API](https://github.com/dcrew44/geostatenet-api) running locally on **`http://127.0.0.1:8000`**.*

---

## ⚡ Quick install

### 1  Clone (or download) the repo

```bash
git clone https://github.com/dcrew44/geostatenet-extension.git
```

### 2  Load the unpacked extension

1. Open **`chrome://extensions/`** in a Chromium‑based browser.
2. Toggle **Developer mode** (top‑right).
3. Click **Load unpacked** and select the `geostatenet-extension/` folder.
4. You should now see **GeoStateNet Assistant** in the list.

### 3  Start the API backend

Follow the README in `geostatenet-api` and launch:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 4  Play GeoGuessr and press the hotkeys (below)

---

## 🎮 Default hotkeys & popup actions

| Action                                                            | Shortcut (Windows / macOS / Linux) | Popup button           |
| ----------------------------------------------------------------- | ---------------------------------- | ---------------------- |
| **Start panorama capture** – guided 4‑shot (N → E → S → W)        | `Alt + Shift + P`                  | Start Panorama Capture |
| **Trigger screenshot** – for each direction during guided capture | `Alt + Shift + X`                  | —                      |
| **Single‑view predict** – one screenshot of current heading       | `Alt + Shift + S`                  | Predict Single View    |

A small overlay with the top prediction (state flag & probability) appears in‑game. Click **×** to dismiss.

> **Need different keys?** Chrome → Extensions → Keyboard shortcuts → GeoStateNet Assistant.

---

## ⚙️  Configuration

If your API lives on a different host/port, edit the constant at the top of **`content.js`**:

```js
// Default:
const API_ENDPOINT = 'http://127.0.0.1:8000';
```

Then reload the extension (🔄 icon in `chrome://extensions/`).

---

## 🐞 Troubleshooting

| Symptom                                      | Possible cause & fix                                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Nothing happens on hotkey / popup button** | Make sure the GeoGuessr tab is active and the extension icon is visible; reload the extension after edits. |
| **“Network Error” overlay**                  | API not reachable → verify `uvicorn` is running and the endpoint URL matches `API_ENDPOINT`.               |
| **CORS blocked**                             | The API enables `*` CORS by default; if you modified it, add the extension’s origin.                       |
| **Screenshot permissions prompt loops**      | Restart Chrome; occasionally needed after first install under MV3 service workers.                         |

---

## 🔗 Related projects

* **GeoStateNet** – model & training code
  [https://github.com/dcrew44/GeoStateNet](https://github.com/dcrew44/GeoStateNet)
* **GeoStateNet‑API** – FastAPI inference backend
  [https://github.com/dcrew44/geostatenet-api](https://github.com/dcrew44/geostatenet-api)

---

## 📜 License

MIT License – see `[LICENSE](LICENSE)`.
