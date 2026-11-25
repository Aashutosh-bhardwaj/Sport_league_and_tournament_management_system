# Local SQL Connection Guide

After extracting the project ZIP and running `npm install`, you can connect **any** SQL database engine or GUI tool to this project.

---

## Option 1: SQLite (Recommended — Zero Extra Setup)

Running `npm run dev` (or `npm run db:init`) automatically generates the real SQLite database file at:

```
database/sports_league.db
```

### Connect with GUI Tools
- **DB Browser for SQLite**: Open DB Browser -> Click **Open Database** -> Select `database/sports_league.db`.
- **DBeaver**: New Database Connection -> **SQLite** -> Browse to `database/sports_league.db` -> Finish.
- **VS Code**: Install **SQLite Viewer** or **SQLite** extension -> Click `database/sports_league.db`.
- **Command Line (`sqlite3`)**:
  ```bash
  sqlite3 database/sports_league.db
  .tables
  SELECT * FROM v_points_table WHERE tournament_id = 1;
  ```

### Sync Browser Edits to Disk `sports_league.db`
While running locally at `http://localhost:3000`:
1. Go to **Settings** -> **Local Project & SQL Export**.
2. Click **Sync Browser DB to Local Disk (`sports_league.db`)** to save any in-browser match results/edits directly into `database/sports_league.db`.

---

## Option 2: MySQL / MariaDB / XAMPP / phpMyAdmin

1. Open **MySQL Workbench**, **phpMyAdmin** (XAMPP), or MySQL CLI.
2. Run `database/mysql_complete.sql` (generated automatically by `npm run db:init` or exported from **Settings -> Download MySQL (.sql)**):
   ```bash
   mysql -u root -p < database/mysql_complete.sql
   ```
3. Verify the database and views:
   ```sql
   USE sports_league_db;
   SHOW TABLES;
   SELECT * FROM v_points_table WHERE tournament_id = 1;
   ```

---

## Option 3: PostgreSQL / pgAdmin 4

1. Create a database (e.g. `sports_league_db`) in **pgAdmin 4** or `psql`:
   ```bash
   createdb sports_league_db
   psql -d sports_league_db -f database/postgresql_complete.sql
   ```
2. Verify:
   ```sql
   SELECT * FROM v_points_table WHERE tournament_id = 1;
   ```

---

## Option 4: Oracle Database (PL/SQL)

Run `oracle_plsql.sql` in **Oracle SQL Developer** or **SQL*Plus** to create the Oracle tables, sequences, `trg_update_standings_after_result` trigger, and `submit_match_result` / `correct_match_result` stored procedures.

---

## Local SQL Server Endpoints (Express API on Port 3000)

When `npm run dev` or `npm start` is running, the built-in Express server exposes:
- `GET /api/db/status` — Inspect local `database/sports_league.db` status and row counts
- `POST /api/db/query` — Execute read-only SQL against `database/sports_league.db` (`{ "sql": "SELECT * FROM TEAM" }`)
- `GET /api/db/download-sqlite` — Download `database/sports_league.db`
- `POST /api/db/sync` — Persist browser SQLite bytes to `database/sports_league.db`
- `GET /api/export-project.zip` — Download the complete project as a `.zip` archive
