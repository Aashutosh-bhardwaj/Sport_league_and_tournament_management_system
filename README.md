# Sports League & Tournament Management System

Full-stack Relational DBMS application for managing sports leagues, teams, players, rosters, fixtures, match results, standings, venues, officials, payments, and analytics.

## Quick Start (Local System)

1. **Extract** the project ZIP into a folder.
2. **Install dependencies** (requires Node.js 20+):
   ```bash
   npm install
   ```
3. **Initialize the local SQL database files** (`database/sports_league.db` + SQL dumps):
   ```bash
   npm run db:init
   ```
4. **Run the application**:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000` in your browser.

## Connecting Local SQL Clients

When you run `npm run db:init` or `npm run dev`, the server automatically creates:
- `database/sports_league.db` — Real SQLite 3 database file on disk
- `database/sqlite_complete.sql` — Complete SQLite schema, 7 views, 9 triggers, and seed data
- `database/mysql_complete.sql` — Complete MySQL 8+ / MariaDB / XAMPP script
- `database/postgresql_complete.sql` — Complete PostgreSQL 14+ script
- `oracle_plsql.sql` — Oracle PL/SQL sequences, triggers, and stored procedures

See **`LOCAL_SQL_SETUP.md`** for step-by-step instructions to connect **DB Browser for SQLite**, **DBeaver**, **VS Code SQLite**, **MySQL Workbench / XAMPP**, **PostgreSQL / pgAdmin**, and **Oracle SQL Developer**.
