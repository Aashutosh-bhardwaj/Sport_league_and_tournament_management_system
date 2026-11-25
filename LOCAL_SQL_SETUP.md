# 🗄️ Local SQL & MySQL Workbench Setup Guide

This project runs a **Dual-Database Architecture**:
1. **In-Browser SQLite (`sql.js` + IndexedDB):** Provides instant read/write performance and enforces relational DBMS constraints (`PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`, Views, and Triggers) directly in the browser.
2. **MySQL Workbench (`sports_league_db` via Python FastAPI):** Automatically persists every `INSERT`, `UPDATE`, and `DELETE` operation across all modules (Teams, Players, Games, Schedule, Officials, Venues, Tournaments, Statistics, and Payments) into your local MySQL server in real time.

---

## 1. MySQL Workbench Database Initialization

1. Open **MySQL Workbench** and connect to your local MySQL server (`localhost:3306`, user: `root`).
2. Create and select the database:
   ```sql
   CREATE DATABASE IF NOT EXISTS sports_league_db;
   USE sports_league_db;
