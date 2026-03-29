# 🏪 Ganesh Store — AI Product Image Pipeline

An AI-powered bulk image processing system for store owners. Upload hundreds of product images and let the system automatically classify, rename, organize, and catalog them — all powered by Claude Vision AI.

---

## ✨ Features

- **Bulk Upload** — Drag & drop up to 200 images at once
- **AI Classification** — Claude Vision identifies product category and generates descriptive tags
- **Auto-Rename** — Files renamed to `<category>_<tag>_<uniqueID>.jpg`
- **Category Folders** — Images stored in organized `catalog/<category>/` directories
- **JSON Database** — All metadata saved (filename, category, tags, URL, timestamp)
- **Search & Filter** — Browse by category or search by tag/name
- **Grid + List Views** — Toggle between product card grid and table list
- **Real-time Queue** — Live progress tracking for each image through the pipeline
- **Pipeline Visualizer** — Animated status bar showing each processing stage

---

##  Project Structure

```
ganesh-store/
├── server.js            # Express backend + AI pipeline
├── package.json         # Node dependencies
├── db.json              # Auto-generated JSON database
├── public/
│   └── index.html       # Complete frontend UI
├── uploads/
│   └── temp/            # Temporary holding area for uploaded images
└── catalog/             # Final organized image storage
    ├── groceries/
    ├── clothing/
    ├── electronics/
    ├── household/
    ├── beauty/
    ├── sports/
    ├── toys/
    ├── furniture/
    └── other/
```

---

## 🚀 Setup & Run

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
node server.js
```

### 3. Open the App
Visit: [http://localhost:3001](http://localhost:3001)

---

## 🔄 How the Pipeline Works

```
[User Uploads Images]
        ↓
[Multer saves to uploads/temp/]
        ↓
[Jobs added to in-memory queue]
        ↓
[Background worker picks next job]
        ↓
[Image sent to Claude Vision API]
        ↓
[AI returns: category + tag + confidence]
        ↓
[File renamed: category_tag_id.jpg]
        ↓
[Moved to catalog/<category>/ folder]
        ↓
[Metadata saved to db.json]
        ↓
[Frontend updates in real-time]
```

---

## 📂 Supported Categories

| Category    | Icon | Examples                        |
|-------------|------|---------------------------------|
| groceries   | 🥦   | fresh apples, basmati rice      |
| clothing    | 👕   | men's t-shirt, women's kurta    |
| electronics | 📱   | wireless headphones, USB hub    |
| household   | 🏠   | steel pressure cooker, mop      |
| beauty      | 💄   | face cream, lipstick            |
| sports      | ⚽   | cricket bat, yoga mat           |
| toys        | 🧸   | lego set, remote car            |
| furniture   | 🛋️   | wooden chair, study table       |
| other       | 📦   | anything unrecognized           |

---

## 🔌 API Reference

| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| POST   | `/api/upload`         | Upload image files (multipart)     |
| POST   | `/api/status/batch`   | Poll status for multiple job IDs   |
| GET    | `/api/products`       | List processed products            |
| GET    | `/api/stats`          | Dashboard stats & category counts  |
| DELETE | `/api/products/:id`   | Delete a product                   |
| GET    | `/catalog/<cat>/<file>` | Serve the actual image file      |

### Query params for `/api/products`
- `category` — Filter by category name
- `search` — Search in tags/filename
- `page` — Pagination (default: 1)
- `limit` — Results per page (default: 20)

---

## 🛠 Tech Stack

- **Backend** — Node.js, Express, Multer
- **AI** — Anthropic Claude Sonnet (Vision)
- **Database** — JSON file (db.json via fs)
- **Frontend** — Vanilla HTML/CSS/JS (no framework)
- **Fonts** — Syne, DM Mono, Instrument Serif (Google Fonts)

---

## ⚙️ Configuration

Edit `server.js` to change:
- `PORT` — Default: `3001`
- `limits.fileSize` — Default: `10MB` per file
- `upload.array('images', 200)` — Max files per batch

---

## 📝 File Naming Convention

Every processed image is renamed to:
```
<category>_<tag>_<shortID>.jpg
```
Examples:
- `groceries_fresh_apples_a1b2c3d4.jpg`
- `electronics_wireless_headphones_e5f6g7h8.jpg`
- `clothing_mens_tshirt_i9j0k1l2.jpg`
