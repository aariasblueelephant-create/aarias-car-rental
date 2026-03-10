# Aarias Car Rental Management System

A professional car rental management dashboard with neon-themed UI, OCR license plate scanning, A5 receipt PDF generation, visual scheduling, earnings tracking, and fleet management.

![Neon Theme](https://img.shields.io/badge/theme-neon-00f0ff) ![Node.js](https://img.shields.io/badge/node-16%2B-39ff14) ![SQLite](https://img.shields.io/badge/db-SQLite-ff00ea)

## Features

- **Dashboard** — KPIs, recent rentals, quick actions
- **OCR Plate Scanning** — Camera capture + Tesseract.js recognition
- **A5 Receipt PDFs** — Client-side (html2canvas + jsPDF) and server-side (pdfkit)
- **Visual Schedule** — 7-day fleet booking grid with conflict detection
- **Double-Booking Guard** — Automatic overlap detection per vehicle
- **Earnings Tracker** — Monthly revenue chart, agent commission, customer ledger
- **Fleet Management** — Multi-asset support (cars, vans, motorbikes)
- **Booking Links** — Shareable URLs for loyal clients

## Quick Start

```bash
# Install dependencies
npm install

# Seed the database with mock data
npm run seed

# Start the server
npm start
```

Open **http://localhost:4000** in your browser.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rentals` | List all rentals |
| POST | `/api/rentals` | Create a new rental |
| PATCH | `/api/rentals/:id/status` | Update rental status |
| GET | `/api/rentals/:id/receipt` | Download server-generated PDF receipt |
| GET | `/api/availability?plate=X&pickup=Y&returnDate=Z` | Check for booking conflicts |
| GET | `/api/reports/daily?date=YYYY-MM-DD` | Daily revenue report |
| GET | `/api/reports/monthly?month=YYYY-MM` | Monthly revenue report |
| GET | `/api/reports/categories` | Revenue breakdown by category |

## GitHub Pages (Static Demo)

The `public/` folder can be deployed to GitHub Pages as a static demo. The UI will render with mock data but API calls require the Express server.

To deploy:
1. Go to repo **Settings → Pages**
2. Set source to **Deploy from a branch**
3. Select `main` branch and `/docs` folder (or symlink `public/` to `docs/`)

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS, Chart.js, Tesseract.js, jsPDF, html2canvas
- **Backend:** Express.js, SQLite3, pdfkit
- **Theme:** Neon glassmorphism (cyan/magenta/green on dark)
- **Database:** SQLite (portable to Firebase/Supabase)

## Project Structure

```
├── server.js           # Express API server
├── seed.js             # Database seeder
├── package.json        # Dependencies & scripts
├── .gitignore          # Ignored files
├── public/
│   ├── index.html      # SPA with sidebar navigation
│   ├── styles.css      # Neon glassmorphism theme
│   ├── app.js          # Frontend logic & interactions
│   ├── logo.svg        # Neon gradient logo
│   ├── favicon.svg     # Neon car favicon
│   └── mock-rentals.json # Sample rental data
└── README.md
```
