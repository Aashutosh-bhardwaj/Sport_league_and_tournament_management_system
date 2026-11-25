# 🏆 Sports League & Tournament Management System

A full-stack **Sports League & Tournament Management System** featuring an interactive React + TypeScript frontend, an in-browser SQLite (`sql.js`) engine with relational constraints, and a Python **FastAPI** backend that automatically syncs every mutation in real time to a **MySQL Workbench** (`sports_league_db`) database.

---

## ✨ Key Features

- **Real-Time Dual-Database Architecture:** Instant UI responsiveness via WebAssembly SQLite (`sql.js`) + IndexedDB persistence, paired with automatic background synchronization to MySQL via FastAPI (`/api/sync-sql`).
- **Complete League Administration:**
  - **Dashboard & Reports:** Live KPIs, match summaries, and league-wide analytics.
  - **Teams & Rosters:** Register teams (`Senior`, `Women`, `Amateur`, `Youth`), manage coaches, shield colors, and player rosters.
  - **Players:** Track player profiles, positions, eligibility, and match statistics.
  - **Games & Schedule:** Schedule fixtures, assign venues, prevent booking/fixture conflicts, and record match results.
  - **Standings & Statistics:** Automated league standings tables and individual player performance metrics.
  - **Venues & Officials:** Manage stadiums/grounds, referee licenses, and match official assignments.
  - **Leagues, Seasons & Payments:** Organize multi-season tournaments, registration fees, and league announcements.
- **Relational DBMS Enforcement:** Enforces `PRIMARY KEY`, `FOREIGN KEY` (`ON DELETE RESTRICT`), `UNIQUE`, `CHECK` constraints, SQL views, and triggers.
- **One-Click Local Startup:** Includes `start_all.bat` for Windows to launch both the FastAPI server and Vite dev server simultaneously.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Client DB Engine** | `sql.js` (SQLite compiled to WebAssembly) + IndexedDB |
| **Backend API** | Python 3, FastAPI, Uvicorn, Pydantic |
| **Persistent Database** | MySQL 8.0 (`sports_league_db`) + MySQL Workbench |

---

## 📂 Project Structure

```text
sports/
├── backend/
│   └── main.py                 # FastAPI server & SQLite-to-MySQL sync endpoint
├── database/                   # SQL schema, views, triggers & seed scripts
├── public/
│   └── sql-wasm.wasm           # WebAssembly binary for in-browser SQLite
├── src/
│   ├── components/             # Reusable UI components (Modals, Tables, Badges)
│   ├── context/                # Global application state & toast notifications
│   ├── db/                     # SQL definitions & seed data generator
│   ├── pages/                  # Teams, Players, Games, Schedule, Standings, etc.
│   └── services/
│       └── db.ts               # SQLite runner + universal MySQL sync hook
├── start_all.bat               # One-click Windows script to start backend & frontend
├── package.json
└── README.md
