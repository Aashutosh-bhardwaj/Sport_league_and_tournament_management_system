import { SCHEMA_SQL, VIEWS_SQL, TRIGGERS_SQL, QUERIES_SQL, ORACLE_PLSQL_SQL } from './sqlDefinitions.ts';
import { generateSeedSql } from './seedGenerator.ts';

export function exportSqliteCompleteSql(): string {
  return [
    '-- ============================================================================',
    '-- Sports League & Tournament Management System - Complete SQLite Export',
    `-- Generated at ${new Date().toISOString()}`,
    '-- Compatible with: SQLite 3, DB Browser for SQLite, DBeaver, VS Code SQLite',
    '-- ============================================================================',
    '',
    SCHEMA_SQL,
    '',
    VIEWS_SQL,
    '',
    TRIGGERS_SQL,
    '',
    generateSeedSql(),
  ].join('\n');
}

export function exportMysqlCompleteSql(): string {
  const seedBody = generateSeedSql()
    .replace(/PRAGMA foreign_keys = ON;\s*/g, '')
    .replace(/"MATCH"/g, '`MATCH`');

  return `-- ============================================================================
-- Sports League & Tournament Management System - Complete MySQL / MariaDB Export
-- Generated at ${new Date().toISOString()}
-- Compatible with: MySQL 8.0+, MariaDB 10.4+, XAMPP / phpMyAdmin, MySQL Workbench
-- ============================================================================

CREATE DATABASE IF NOT EXISTS sports_league_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE sports_league_db;

SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS v_tournament_revenue;
DROP VIEW IF EXISTS v_venue_utilization;
DROP VIEW IF EXISTS v_player_discipline_summary;
DROP VIEW IF EXISTS v_upcoming_matches;
DROP VIEW IF EXISTS v_team_form;
DROP VIEW IF EXISTS v_top_scorers;
DROP VIEW IF EXISTS v_points_table;

DROP TABLE IF EXISTS COMMUNICATION;
DROP TABLE IF EXISTS LEAGUE_SETTINGS;
DROP TABLE IF EXISTS PLAYER_AVAILABILITY;
DROP TABLE IF EXISTS PAYMENT;
DROP TABLE IF EXISTS RESULT_AUDIT;
DROP TABLE IF EXISTS STANDINGS;
DROP TABLE IF EXISTS DISCIPLINARY_RECORD;
DROP TABLE IF EXISTS PLAYER_STATISTICS;
DROP TABLE IF EXISTS MATCH_RESULT;
DROP TABLE IF EXISTS \`MATCH\`;
DROP TABLE IF EXISTS OFFICIAL;
DROP TABLE IF EXISTS VENUE;
DROP TABLE IF EXISTS TEAM_ROSTER;
DROP TABLE IF EXISTS PLAYER;
DROP TABLE IF EXISTS TEAM;
DROP TABLE IF EXISTS TOURNAMENT;
DROP TABLE IF EXISTS SEASON;
DROP TABLE IF EXISTS LEAGUE;
DROP TABLE IF EXISTS SPORT;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. SPORT
CREATE TABLE SPORT (
  sport_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  players_per_team INT NOT NULL CHECK (players_per_team > 0)
) ENGINE=InnoDB;

-- 2. LEAGUE
CREATE TABLE LEAGUE (
  league_id INT AUTO_INCREMENT PRIMARY KEY,
  sport_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  country VARCHAR(100) NOT NULL,
  level VARCHAR(80) NOT NULL,
  FOREIGN KEY (sport_id) REFERENCES SPORT(sport_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 3. SEASON
CREATE TABLE SEASON (
  season_id INT AUTO_INCREMENT PRIMARY KEY,
  league_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  start_date VARCHAR(20) NOT NULL,
  end_date VARCHAR(20) NOT NULL,
  CHECK (end_date > start_date),
  FOREIGN KEY (league_id) REFERENCES LEAGUE(league_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. TOURNAMENT
CREATE TABLE TOURNAMENT (
  tournament_id INT AUTO_INCREMENT PRIMARY KEY,
  season_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  format VARCHAR(30) NOT NULL CHECK (format IN ('LEAGUE', 'KNOCKOUT', 'GROUP_KNOCKOUT')),
  registration_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (registration_fee >= 0),
  status VARCHAR(20) NOT NULL CHECK (status IN ('UPCOMING', 'ONGOING', 'COMPLETED')),
  FOREIGN KEY (season_id) REFERENCES SEASON(season_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 5. TEAM
CREATE TABLE TEAM (
  team_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  city VARCHAR(100) NOT NULL,
  coach_name VARCHAR(120) NOT NULL,
  founded_year INT NOT NULL CHECK (founded_year >= 1850 AND founded_year <= 2100),
  logo_color VARCHAR(20) NOT NULL DEFAULT '#0B3D91',
  category VARCHAR(20) NOT NULL CHECK (category IN ('Youth', 'Amateur', 'Women', 'Senior')),
  registered_on VARCHAR(20) NOT NULL DEFAULT '2026-01-01'
) ENGINE=InnoDB;

-- 6. PLAYER
CREATE TABLE PLAYER (
  player_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  dob VARCHAR(20) NOT NULL,
  position VARCHAR(50) NOT NULL,
  jersey_no INT NOT NULL CHECK (jersey_no > 0 AND jersey_no <= 99),
  email VARCHAR(191) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INJURED', 'SUSPENDED', 'INACTIVE'))
) ENGINE=InnoDB;

-- 7. TEAM_ROSTER
CREATE TABLE TEAM_ROSTER (
  roster_id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  player_id INT NOT NULL,
  tournament_id INT NOT NULL,
  jersey_no INT NOT NULL CHECK (jersey_no > 0 AND jersey_no <= 99),
  joined_on VARCHAR(20) NOT NULL DEFAULT '2026-01-01',
  UNIQUE KEY uq_roster_player_tourn (player_id, tournament_id),
  UNIQUE KEY uq_roster_team_jersey (team_id, tournament_id, jersey_no),
  FOREIGN KEY (team_id) REFERENCES TEAM(team_id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES PLAYER(player_id) ON DELETE CASCADE,
  FOREIGN KEY (tournament_id) REFERENCES TOURNAMENT(tournament_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. VENUE
CREATE TABLE VENUE (
  venue_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100) NOT NULL,
  capacity INT NOT NULL CHECK (capacity > 0),
  surface_type VARCHAR(80) NOT NULL
) ENGINE=InnoDB;

-- 9. OFFICIAL
CREATE TABLE OFFICIAL (
  official_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  role VARCHAR(40) NOT NULL CHECK (role IN ('Referee', 'Linesman', 'Match Commissioner')),
  license_no VARCHAR(80) NOT NULL UNIQUE,
  phone VARCHAR(40) NOT NULL
) ENGINE=InnoDB;

-- 10. MATCH
CREATE TABLE \`MATCH\` (
  match_id INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT NOT NULL,
  home_team_id INT NOT NULL,
  away_team_id INT NOT NULL,
  venue_id INT NOT NULL,
  referee_id INT NOT NULL,
  match_date VARCHAR(20) NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  round INT NOT NULL DEFAULT 1 CHECK (round > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'POSTPONED', 'CANCELLED')),
  CHECK (home_team_id <> away_team_id),
  UNIQUE KEY uq_match_fixture (tournament_id, home_team_id, away_team_id),
  UNIQUE KEY uq_match_venue_slot (venue_id, match_date, start_time),
  FOREIGN KEY (tournament_id) REFERENCES TOURNAMENT(tournament_id) ON DELETE RESTRICT,
  FOREIGN KEY (home_team_id) REFERENCES TEAM(team_id) ON DELETE RESTRICT,
  FOREIGN KEY (away_team_id) REFERENCES TEAM(team_id) ON DELETE RESTRICT,
  FOREIGN KEY (venue_id) REFERENCES VENUE(venue_id) ON DELETE RESTRICT,
  FOREIGN KEY (referee_id) REFERENCES OFFICIAL(official_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 11. MATCH_RESULT
CREATE TABLE MATCH_RESULT (
  result_id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL UNIQUE,
  home_score INT NOT NULL CHECK (home_score >= 0),
  away_score INT NOT NULL CHECK (away_score >= 0),
  winner_team_id INT NULL,
  submitted_at VARCHAR(30) NOT NULL DEFAULT '2026-01-01 00:00:00',
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  FOREIGN KEY (match_id) REFERENCES \`MATCH\`(match_id) ON DELETE CASCADE,
  FOREIGN KEY (winner_team_id) REFERENCES TEAM(team_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 12. PLAYER_STATISTICS
CREATE TABLE PLAYER_STATISTICS (
  stat_id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  player_id INT NOT NULL,
  team_id INT NOT NULL,
  goals INT NOT NULL DEFAULT 0 CHECK (goals >= 0),
  assists INT NOT NULL DEFAULT 0 CHECK (assists >= 0),
  yellow_cards INT NOT NULL DEFAULT 0 CHECK (yellow_cards >= 0),
  red_cards INT NOT NULL DEFAULT 0 CHECK (red_cards >= 0),
  minutes_played INT NOT NULL DEFAULT 0 CHECK (minutes_played >= 0 AND minutes_played <= 130),
  UNIQUE KEY uq_stat_match_player (match_id, player_id),
  FOREIGN KEY (match_id) REFERENCES \`MATCH\`(match_id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES PLAYER(player_id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES TEAM(team_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 13. DISCIPLINARY_RECORD
CREATE TABLE DISCIPLINARY_RECORD (
  record_id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  match_id INT NOT NULL,
  offence VARCHAR(200) NOT NULL,
  card_type VARCHAR(10) NOT NULL CHECK (card_type IN ('YELLOW', 'RED')),
  suspension_matches INT NOT NULL DEFAULT 0 CHECK (suspension_matches >= 0),
  issued_on VARCHAR(20) NOT NULL DEFAULT '2026-01-01',
  FOREIGN KEY (player_id) REFERENCES PLAYER(player_id) ON DELETE CASCADE,
  FOREIGN KEY (match_id) REFERENCES \`MATCH\`(match_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 14. STANDINGS
CREATE TABLE STANDINGS (
  tournament_id INT NOT NULL,
  team_id INT NOT NULL,
  played INT NOT NULL DEFAULT 0 CHECK (played >= 0),
  won INT NOT NULL DEFAULT 0 CHECK (won >= 0),
  drawn INT NOT NULL DEFAULT 0 CHECK (drawn >= 0),
  lost INT NOT NULL DEFAULT 0 CHECK (lost >= 0),
  goals_for INT NOT NULL DEFAULT 0 CHECK (goals_for >= 0),
  goals_against INT NOT NULL DEFAULT 0 CHECK (goals_against >= 0),
  goal_diff INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0 CHECK (points >= 0),
  PRIMARY KEY (tournament_id, team_id),
  FOREIGN KEY (tournament_id) REFERENCES TOURNAMENT(tournament_id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES TEAM(team_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 15. RESULT_AUDIT
CREATE TABLE RESULT_AUDIT (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  old_home_score INT NULL,
  old_away_score INT NULL,
  new_home_score INT NOT NULL,
  new_away_score INT NOT NULL,
  changed_at VARCHAR(30) NOT NULL DEFAULT '2026-01-01 00:00:00',
  action VARCHAR(20) NOT NULL CHECK (action IN ('SUBMIT', 'CORRECT')),
  FOREIGN KEY (match_id) REFERENCES \`MATCH\`(match_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 16. PAYMENT
CREATE TABLE PAYMENT (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  tournament_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  category VARCHAR(30) NOT NULL CHECK (category IN ('Registration', 'Sponsorship', 'Merchandise', 'Other')),
  paid_on VARCHAR(20) NOT NULL DEFAULT '2026-01-01',
  FOREIGN KEY (team_id) REFERENCES TEAM(team_id) ON DELETE RESTRICT,
  FOREIGN KEY (tournament_id) REFERENCES TOURNAMENT(tournament_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 17. PLAYER_AVAILABILITY
CREATE TABLE PLAYER_AVAILABILITY (
  availability_id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  from_date VARCHAR(20) NOT NULL,
  to_date VARCHAR(20) NOT NULL,
  reason VARCHAR(200) NOT NULL,
  CHECK (to_date >= from_date),
  FOREIGN KEY (player_id) REFERENCES PLAYER(player_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 18. LEAGUE_SETTINGS
CREATE TABLE LEAGUE_SETTINGS (
  setting_key VARCHAR(80) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

-- 19. COMMUNICATION
CREATE TABLE COMMUNICATION (
  comm_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(40) NOT NULL CHECK (category IN ('Schedule Notice', 'Disciplinary', 'Registration', 'General')),
  target_audience VARCHAR(150) NOT NULL,
  sent_by VARCHAR(100) NOT NULL DEFAULT 'John Doe',
  sent_at VARCHAR(30) NOT NULL DEFAULT '2026-01-01 00:00:00'
) ENGINE=InnoDB;

-- Indexes
CREATE INDEX idx_match_date ON \`MATCH\`(match_date, start_time);
CREATE INDEX idx_match_tournament ON \`MATCH\`(tournament_id, status);
CREATE INDEX idx_roster_team ON TEAM_ROSTER(team_id);
CREATE INDEX idx_roster_tournament ON TEAM_ROSTER(tournament_id);
CREATE INDEX idx_standings_tournament ON STANDINGS(tournament_id, points DESC, goal_diff DESC);
CREATE INDEX idx_player_stats_match ON PLAYER_STATISTICS(match_id);
CREATE INDEX idx_player_stats_player ON PLAYER_STATISTICS(player_id);
CREATE INDEX idx_discipline_player ON DISCIPLINARY_RECORD(player_id);
CREATE INDEX idx_payment_tournament ON PAYMENT(tournament_id, category);

-- Views
CREATE OR REPLACE VIEW v_points_table AS
SELECT
  s.tournament_id,
  tr.name AS tournament_name,
  se.season_id,
  se.name AS season_name,
  l.league_id,
  l.name AS league_name,
  t.team_id,
  t.name AS team_name,
  t.city,
  t.logo_color,
  t.category,
  s.played,
  s.won,
  s.drawn,
  s.lost,
  s.goals_for,
  s.goals_against,
  s.goal_diff,
  s.points,
  ROW_NUMBER() OVER (
    PARTITION BY s.tournament_id
    ORDER BY s.points DESC, s.goal_diff DESC, s.goals_for DESC, t.name ASC
  ) AS rank_pos
FROM STANDINGS s
INNER JOIN TEAM t ON s.team_id = t.team_id
INNER JOIN TOURNAMENT tr ON s.tournament_id = tr.tournament_id
INNER JOIN SEASON se ON tr.season_id = se.season_id
INNER JOIN LEAGUE l ON se.league_id = l.league_id;

CREATE OR REPLACE VIEW v_top_scorers AS
SELECT
  p.player_id,
  p.full_name,
  p.position,
  p.status,
  t.team_id,
  t.name AS team_name,
  t.logo_color,
  m.tournament_id,
  tr.name AS tournament_name,
  se.season_id,
  se.name AS season_name,
  COUNT(DISTINCT ps.match_id) AS matches_played,
  COALESCE(SUM(ps.goals), 0) AS total_goals,
  COALESCE(SUM(ps.assists), 0) AS total_assists,
  COALESCE(SUM(ps.yellow_cards), 0) AS total_yellow_cards,
  COALESCE(SUM(ps.red_cards), 0) AS total_red_cards,
  COALESCE(SUM(ps.minutes_played), 0) AS total_minutes,
  RANK() OVER (
    PARTITION BY m.tournament_id
    ORDER BY COALESCE(SUM(ps.goals), 0) DESC, COALESCE(SUM(ps.assists), 0) DESC, p.full_name ASC
  ) AS scorer_rank
FROM PLAYER_STATISTICS ps
INNER JOIN PLAYER p ON ps.player_id = p.player_id
INNER JOIN TEAM t ON ps.team_id = t.team_id
INNER JOIN \`MATCH\` m ON ps.match_id = m.match_id
INNER JOIN TOURNAMENT tr ON m.tournament_id = tr.tournament_id
INNER JOIN SEASON se ON tr.season_id = se.season_id
GROUP BY p.player_id, p.full_name, p.position, p.status, t.team_id, t.name, t.logo_color, m.tournament_id, tr.name, se.season_id, se.name;

CREATE OR REPLACE VIEW v_team_form AS
WITH team_matches AS (
  SELECT
    m.tournament_id, m.match_id, m.match_date, m.start_time, m.home_team_id AS team_id,
    CASE WHEN mr.home_score > mr.away_score THEN 'W' WHEN mr.home_score = mr.away_score THEN 'D' ELSE 'L' END AS outcome
  FROM \`MATCH\` m INNER JOIN MATCH_RESULT mr ON m.match_id = mr.match_id WHERE m.status = 'COMPLETED'
  UNION ALL
  SELECT
    m.tournament_id, m.match_id, m.match_date, m.start_time, m.away_team_id AS team_id,
    CASE WHEN mr.away_score > mr.home_score THEN 'W' WHEN mr.away_score = mr.home_score THEN 'D' ELSE 'L' END AS outcome
  FROM \`MATCH\` m INNER JOIN MATCH_RESULT mr ON m.match_id = mr.match_id WHERE m.status = 'COMPLETED'
),
ranked_matches AS (
  SELECT tournament_id, team_id, match_id, match_date, outcome,
    ROW_NUMBER() OVER (PARTITION BY tournament_id, team_id ORDER BY match_date DESC, start_time DESC, match_id DESC) AS rn
  FROM team_matches
)
SELECT
  rm.tournament_id,
  rm.team_id,
  t.name AS team_name,
  GROUP_CONCAT(rm.outcome ORDER BY rm.rn ASC SEPARATOR '-') AS form_string,
  SUM(CASE WHEN rm.outcome = 'W' THEN 1 ELSE 0 END) AS recent_wins,
  SUM(CASE WHEN rm.outcome = 'D' THEN 1 ELSE 0 END) AS recent_draws,
  SUM(CASE WHEN rm.outcome = 'L' THEN 1 ELSE 0 END) AS recent_losses
FROM ranked_matches rm
INNER JOIN TEAM t ON rm.team_id = t.team_id
WHERE rm.rn <= 5
GROUP BY rm.tournament_id, rm.team_id, t.name;

CREATE OR REPLACE VIEW v_upcoming_matches AS
SELECT
  m.match_id, m.tournament_id, tr.name AS tournament_name, se.season_id, se.name AS season_name,
  m.round, m.match_date, m.start_time, m.status,
  ht.team_id AS home_team_id, ht.name AS home_team_name, ht.logo_color AS home_logo_color,
  at.team_id AS away_team_id, at.name AS away_team_name, at.logo_color AS away_logo_color,
  v.venue_id, v.name AS venue_name, v.city AS venue_city,
  o.official_id AS referee_id, o.full_name AS referee_name
FROM \`MATCH\` m
INNER JOIN TOURNAMENT tr ON m.tournament_id = tr.tournament_id
INNER JOIN SEASON se ON tr.season_id = se.season_id
INNER JOIN TEAM ht ON m.home_team_id = ht.team_id
INNER JOIN TEAM at ON m.away_team_id = at.team_id
INNER JOIN VENUE v ON m.venue_id = v.venue_id
INNER JOIN OFFICIAL o ON m.referee_id = o.official_id
WHERE m.status = 'SCHEDULED'
ORDER BY m.match_date ASC, m.start_time ASC;

CREATE OR REPLACE VIEW v_player_discipline_summary AS
SELECT
  p.player_id, p.full_name, p.status AS player_status,
  t.team_id, t.name AS team_name,
  m.tournament_id, tr.name AS tournament_name, se.season_id, se.name AS season_name,
  SUM(CASE WHEN dr.card_type = 'YELLOW' THEN 1 ELSE 0 END) AS yellow_cards,
  SUM(CASE WHEN dr.card_type = 'RED' THEN 1 ELSE 0 END) AS red_cards,
  COALESCE(SUM(dr.suspension_matches), 0) AS total_suspension_matches,
  MAX(dr.issued_on) AS last_card_date
FROM DISCIPLINARY_RECORD dr
INNER JOIN PLAYER p ON dr.player_id = p.player_id
INNER JOIN \`MATCH\` m ON dr.match_id = m.match_id
INNER JOIN TOURNAMENT tr ON m.tournament_id = tr.tournament_id
INNER JOIN SEASON se ON tr.season_id = se.season_id
LEFT JOIN TEAM_ROSTER trs ON trs.player_id = p.player_id AND trs.tournament_id = m.tournament_id
LEFT JOIN TEAM t ON trs.team_id = t.team_id
GROUP BY p.player_id, p.full_name, p.status, t.team_id, t.name, m.tournament_id, tr.name, se.season_id, se.name
HAVING COUNT(dr.record_id) > 0;

CREATE OR REPLACE VIEW v_venue_utilization AS
SELECT
  v.venue_id, v.name AS venue_name, v.city, v.capacity, v.surface_type,
  COUNT(m.match_id) AS total_matches,
  SUM(CASE WHEN m.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_matches,
  SUM(CASE WHEN m.status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduled_matches,
  ROUND(AVG(CASE WHEN mr.match_id IS NOT NULL THEN mr.home_score + mr.away_score END), 2) AS avg_goals_per_match
FROM VENUE v
LEFT JOIN \`MATCH\` m ON v.venue_id = m.venue_id
LEFT JOIN MATCH_RESULT mr ON m.match_id = mr.match_id
GROUP BY v.venue_id, v.name, v.city, v.capacity, v.surface_type;

CREATE OR REPLACE VIEW v_tournament_revenue AS
SELECT
  tr.tournament_id, tr.name AS tournament_name, se.season_id, se.name AS season_name,
  COUNT(pay.payment_id) AS payment_count,
  COALESCE(SUM(pay.amount), 0) AS total_revenue,
  COALESCE(SUM(CASE WHEN pay.category = 'Registration' THEN pay.amount ELSE 0 END), 0) AS registration_revenue,
  COALESCE(SUM(CASE WHEN pay.category = 'Sponsorship' THEN pay.amount ELSE 0 END), 0) AS sponsorship_revenue,
  COALESCE(SUM(CASE WHEN pay.category = 'Merchandise' THEN pay.amount ELSE 0 END), 0) AS merchandise_revenue,
  COALESCE(SUM(CASE WHEN pay.category = 'Other' THEN pay.amount ELSE 0 END), 0) AS other_revenue
FROM TOURNAMENT tr
INNER JOIN SEASON se ON tr.season_id = se.season_id
LEFT JOIN PAYMENT pay ON tr.tournament_id = pay.tournament_id
GROUP BY tr.tournament_id, tr.name, se.season_id, se.name;

-- Seed Data
${seedBody}
`;
}

export function exportPostgresCompleteSql(): string {
  const seedBody = generateSeedSql().replace(/PRAGMA foreign_keys = ON;\s*/g, '');

  return `-- ============================================================================
-- Sports League & Tournament Management System - Complete PostgreSQL Export
-- Generated at ${new Date().toISOString()}
-- Compatible with: PostgreSQL 14+, pgAdmin 4, DBeaver, Supabase, Neon, Cloud SQL
-- ============================================================================

DROP VIEW IF EXISTS v_tournament_revenue CASCADE;
DROP VIEW IF EXISTS v_venue_utilization CASCADE;
DROP VIEW IF EXISTS v_player_discipline_summary CASCADE;
DROP VIEW IF EXISTS v_upcoming_matches CASCADE;
DROP VIEW IF EXISTS v_team_form CASCADE;
DROP VIEW IF EXISTS v_top_scorers CASCADE;
DROP VIEW IF EXISTS v_points_table CASCADE;

DROP TABLE IF EXISTS COMMUNICATION CASCADE;
DROP TABLE IF EXISTS LEAGUE_SETTINGS CASCADE;
DROP TABLE IF EXISTS PLAYER_AVAILABILITY CASCADE;
DROP TABLE IF EXISTS PAYMENT CASCADE;
DROP TABLE IF EXISTS RESULT_AUDIT CASCADE;
DROP TABLE IF EXISTS STANDINGS CASCADE;
DROP TABLE IF EXISTS DISCIPLINARY_RECORD CASCADE;
DROP TABLE IF EXISTS PLAYER_STATISTICS CASCADE;
DROP TABLE IF EXISTS MATCH_RESULT CASCADE;
DROP TABLE IF EXISTS "MATCH" CASCADE;
DROP TABLE IF EXISTS OFFICIAL CASCADE;
DROP TABLE IF EXISTS VENUE CASCADE;
DROP TABLE IF EXISTS TEAM_ROSTER CASCADE;
DROP TABLE IF EXISTS PLAYER CASCADE;
DROP TABLE IF EXISTS TEAM CASCADE;
DROP TABLE IF EXISTS TOURNAMENT CASCADE;
DROP TABLE IF EXISTS SEASON CASCADE;
DROP TABLE IF EXISTS LEAGUE CASCADE;
DROP TABLE IF EXISTS SPORT CASCADE;

CREATE TABLE SPORT (
  sport_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  players_per_team INTEGER NOT NULL CHECK (players_per_team > 0)
);

CREATE TABLE LEAGUE (
  league_id SERIAL PRIMARY KEY,
  sport_id INTEGER NOT NULL REFERENCES SPORT(sport_id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  level TEXT NOT NULL
);

CREATE TABLE SEASON (
  season_id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES LEAGUE(league_id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  CHECK (end_date > start_date)
);

CREATE TABLE TOURNAMENT (
  tournament_id SERIAL PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES SEASON(season_id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('LEAGUE', 'KNOCKOUT', 'GROUP_KNOCKOUT')),
  registration_fee DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (registration_fee >= 0),
  status TEXT NOT NULL CHECK (status IN ('UPCOMING', 'ONGOING', 'COMPLETED'))
);

CREATE TABLE TEAM (
  team_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  coach_name TEXT NOT NULL,
  founded_year INTEGER NOT NULL CHECK (founded_year >= 1850 AND founded_year <= 2100),
  logo_color TEXT NOT NULL DEFAULT '#0B3D91',
  category TEXT NOT NULL CHECK (category IN ('Youth', 'Amateur', 'Women', 'Senior')),
  registered_on TEXT NOT NULL DEFAULT CURRENT_DATE::TEXT
);

CREATE TABLE PLAYER (
  player_id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  dob TEXT NOT NULL,
  position TEXT NOT NULL,
  jersey_no INTEGER NOT NULL CHECK (jersey_no > 0 AND jersey_no <= 99),
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INJURED', 'SUSPENDED', 'INACTIVE'))
);

CREATE TABLE TEAM_ROSTER (
  roster_id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES TEAM(team_id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES PLAYER(player_id) ON DELETE CASCADE,
  tournament_id INTEGER NOT NULL REFERENCES TOURNAMENT(tournament_id) ON DELETE CASCADE,
  jersey_no INTEGER NOT NULL CHECK (jersey_no > 0 AND jersey_no <= 99),
  joined_on TEXT NOT NULL DEFAULT CURRENT_DATE::TEXT,
  UNIQUE (player_id, tournament_id),
  UNIQUE (team_id, tournament_id, jersey_no)
);

CREATE TABLE VENUE (
  venue_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  surface_type TEXT NOT NULL
);

CREATE TABLE OFFICIAL (
  official_id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Referee', 'Linesman', 'Match Commissioner')),
  license_no TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL
);

CREATE TABLE "MATCH" (
  match_id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES TOURNAMENT(tournament_id) ON DELETE RESTRICT,
  home_team_id INTEGER NOT NULL REFERENCES TEAM(team_id) ON DELETE RESTRICT,
  away_team_id INTEGER NOT NULL REFERENCES TEAM(team_id) ON DELETE RESTRICT,
  venue_id INTEGER NOT NULL REFERENCES VENUE(venue_id) ON DELETE RESTRICT,
  referee_id INTEGER NOT NULL REFERENCES OFFICIAL(official_id) ON DELETE RESTRICT,
  match_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  round INTEGER NOT NULL DEFAULT 1 CHECK (round > 0),
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'POSTPONED', 'CANCELLED')),
  CHECK (home_team_id <> away_team_id),
  UNIQUE (tournament_id, home_team_id, away_team_id),
  UNIQUE (venue_id, match_date, start_time)
);

CREATE TABLE MATCH_RESULT (
  result_id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL UNIQUE REFERENCES "MATCH"(match_id) ON DELETE CASCADE,
  home_score INTEGER NOT NULL CHECK (home_score >= 0),
  away_score INTEGER NOT NULL CHECK (away_score >= 0),
  winner_team_id INTEGER NULL REFERENCES TEAM(team_id) ON DELETE SET NULL,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE TABLE PLAYER_STATISTICS (
  stat_id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES "MATCH"(match_id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES PLAYER(player_id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES TEAM(team_id) ON DELETE CASCADE,
  goals INTEGER NOT NULL DEFAULT 0 CHECK (goals >= 0),
  assists INTEGER NOT NULL DEFAULT 0 CHECK (assists >= 0),
  yellow_cards INTEGER NOT NULL DEFAULT 0 CHECK (yellow_cards >= 0),
  red_cards INTEGER NOT NULL DEFAULT 0 CHECK (red_cards >= 0),
  minutes_played INTEGER NOT NULL DEFAULT 0 CHECK (minutes_played >= 0 AND minutes_played <= 130),
  UNIQUE (match_id, player_id)
);

CREATE TABLE DISCIPLINARY_RECORD (
  record_id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES PLAYER(player_id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL REFERENCES "MATCH"(match_id) ON DELETE CASCADE,
  offence TEXT NOT NULL,
  card_type TEXT NOT NULL CHECK (card_type IN ('YELLOW', 'RED')),
  suspension_matches INTEGER NOT NULL DEFAULT 0 CHECK (suspension_matches >= 0),
  issued_on TEXT NOT NULL DEFAULT CURRENT_DATE::TEXT
);

CREATE TABLE STANDINGS (
  tournament_id INTEGER NOT NULL REFERENCES TOURNAMENT(tournament_id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES TEAM(team_id) ON DELETE CASCADE,
  played INTEGER NOT NULL DEFAULT 0 CHECK (played >= 0),
  won INTEGER NOT NULL DEFAULT 0 CHECK (won >= 0),
  drawn INTEGER NOT NULL DEFAULT 0 CHECK (drawn >= 0),
  lost INTEGER NOT NULL DEFAULT 0 CHECK (lost >= 0),
  goals_for INTEGER NOT NULL DEFAULT 0 CHECK (goals_for >= 0),
  goals_against INTEGER NOT NULL DEFAULT 0 CHECK (goals_against >= 0),
  goal_diff INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  PRIMARY KEY (tournament_id, team_id)
);

CREATE TABLE RESULT_AUDIT (
  audit_id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES "MATCH"(match_id) ON DELETE CASCADE,
  old_home_score INTEGER NULL,
  old_away_score INTEGER NULL,
  new_home_score INTEGER NOT NULL,
  new_away_score INTEGER NOT NULL,
  changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  action TEXT NOT NULL CHECK (action IN ('SUBMIT', 'CORRECT'))
);

CREATE TABLE PAYMENT (
  payment_id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES TEAM(team_id) ON DELETE RESTRICT,
  tournament_id INTEGER NOT NULL REFERENCES TOURNAMENT(tournament_id) ON DELETE RESTRICT,
  amount DOUBLE PRECISION NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL CHECK (category IN ('Registration', 'Sponsorship', 'Merchandise', 'Other')),
  paid_on TEXT NOT NULL DEFAULT CURRENT_DATE::TEXT
);

CREATE TABLE PLAYER_AVAILABILITY (
  availability_id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES PLAYER(player_id) ON DELETE CASCADE,
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  CHECK (to_date >= from_date)
);

CREATE TABLE LEAGUE_SETTINGS (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL
);

CREATE TABLE COMMUNICATION (
  comm_id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Schedule Notice', 'Disciplinary', 'Registration', 'General')),
  target_audience TEXT NOT NULL,
  sent_by TEXT NOT NULL DEFAULT 'John Doe',
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

-- Views
CREATE OR REPLACE VIEW v_points_table AS
SELECT
  s.tournament_id, tr.name AS tournament_name, se.season_id, se.name AS season_name,
  l.league_id, l.name AS league_name, t.team_id, t.name AS team_name, t.city, t.logo_color, t.category,
  s.played, s.won, s.drawn, s.lost, s.goals_for, s.goals_against, s.goal_diff, s.points,
  ROW_NUMBER() OVER (PARTITION BY s.tournament_id ORDER BY s.points DESC, s.goal_diff DESC, s.goals_for DESC, t.name ASC) AS rank_pos
FROM STANDINGS s
INNER JOIN TEAM t ON s.team_id = t.team_id
INNER JOIN TOURNAMENT tr ON s.tournament_id = tr.tournament_id
INNER JOIN SEASON se ON tr.season_id = se.season_id
INNER JOIN LEAGUE l ON se.league_id = l.league_id;

CREATE OR REPLACE VIEW v_top_scorers AS
SELECT
  p.player_id, p.full_name, p.position, p.status,
  t.team_id, t.name AS team_name, t.logo_color,
  m.tournament_id, tr.name AS tournament_name, se.season_id, se.name AS season_name,
  COUNT(DISTINCT ps.match_id) AS matches_played,
  COALESCE(SUM(ps.goals), 0) AS total_goals,
  COALESCE(SUM(ps.assists), 0) AS total_assists,
  COALESCE(SUM(ps.yellow_cards), 0) AS total_yellow_cards,
  COALESCE(SUM(ps.red_cards), 0) AS total_red_cards,
  COALESCE(SUM(ps.minutes_played), 0) AS total_minutes,
  RANK() OVER (PARTITION BY m.tournament_id ORDER BY COALESCE(SUM(ps.goals), 0) DESC, COALESCE(SUM(ps.assists), 0) DESC, p.full_name ASC) AS scorer_rank
FROM PLAYER_STATISTICS ps
INNER JOIN PLAYER p ON ps.player_id = p.player_id
INNER JOIN TEAM t ON ps.team_id = t.team_id
INNER JOIN "MATCH" m ON ps.match_id = m.match_id
INNER JOIN TOURNAMENT tr ON m.tournament_id = tr.tournament_id
INNER JOIN SEASON se ON tr.season_id = se.season_id
GROUP BY p.player_id, p.full_name, p.position, p.status, t.team_id, t.name, t.logo_color, m.tournament_id, tr.name, se.season_id, se.name;

CREATE OR REPLACE VIEW v_team_form AS
WITH team_matches AS (
  SELECT m.tournament_id, m.match_id, m.match_date, m.start_time, m.home_team_id AS team_id,
    CASE WHEN mr.home_score > mr.away_score THEN 'W' WHEN mr.home_score = mr.away_score THEN 'D' ELSE 'L' END AS outcome
  FROM "MATCH" m INNER JOIN MATCH_RESULT mr ON m.match_id = mr.match_id WHERE m.status = 'COMPLETED'
  UNION ALL
  SELECT m.tournament_id, m.match_id, m.match_date, m.start_time, m.away_team_id AS team_id,
    CASE WHEN mr.away_score > mr.home_score THEN 'W' WHEN mr.away_score = mr.home_score THEN 'D' ELSE 'L' END AS outcome
  FROM "MATCH" m INNER JOIN MATCH_RESULT mr ON m.match_id = mr.match_id WHERE m.status = 'COMPLETED'
),
ranked_matches AS (
  SELECT tournament_id, team_id, match_id, match_date, outcome,
    ROW_NUMBER() OVER (PARTITION BY tournament_id, team_id ORDER BY match_date DESC, start_time DESC, match_id DESC) AS rn
  FROM team_matches
)
SELECT
  rm.tournament_id, rm.team_id, t.name AS team_name,
  STRING_AGG(rm.outcome, '-' ORDER BY rm.rn ASC) AS form_string,
  SUM(CASE WHEN rm.outcome = 'W' THEN 1 ELSE 0 END) AS recent_wins,
  SUM(CASE WHEN rm.outcome = 'D' THEN 1 ELSE 0 END) AS recent_draws,
  SUM(CASE WHEN rm.outcome = 'L' THEN 1 ELSE 0 END) AS recent_losses
FROM ranked_matches rm
INNER JOIN TEAM t ON rm.team_id = t.team_id
WHERE rm.rn <= 5
GROUP BY rm.tournament_id, rm.team_id, t.name;

CREATE OR REPLACE VIEW v_upcoming_matches AS
SELECT
  m.match_id, m.tournament_id, tr.name AS tournament_name, se.season_id, se.name AS season_name,
  m.round, m.match_date, m.start_time, m.status,
  ht.team_id AS home_team_id, ht.name AS home_team_name, ht.logo_color AS home_logo_color,
  at.team_id AS away_team_id, at.name AS away_team_name, at.logo_color AS away_logo_color,
  v.venue_id, v.name AS venue_name, v.city AS venue_city,
  o.official_id AS referee_id, o.full_name AS referee_name
FROM "MATCH" m
INNER JOIN TOURNAMENT tr ON m.tournament_id = tr.tournament_id
INNER JOIN SEASON se ON tr.season_id = se.season_id
INNER JOIN TEAM ht ON m.home_team_id = ht.team_id
INNER JOIN TEAM at ON m.away_team_id = at.team_id
INNER JOIN VENUE v ON m.venue_id = v.venue_id
INNER JOIN OFFICIAL o ON m.referee_id = o.official_id
WHERE m.status = 'SCHEDULED'
ORDER BY m.match_date ASC, m.start_time ASC;

CREATE OR REPLACE VIEW v_player_discipline_summary AS
SELECT
  p.player_id, p.full_name, p.status AS player_status,
  t.team_id, t.name AS team_name,
  m.tournament_id, tr.name AS tournament_name, se.season_id, se.name AS season_name,
  SUM(CASE WHEN dr.card_type = 'YELLOW' THEN 1 ELSE 0 END) AS yellow_cards,
  SUM(CASE WHEN dr.card_type = 'RED' THEN 1 ELSE 0 END) AS red_cards,
  COALESCE(SUM(dr.suspension_matches), 0) AS total_suspension_matches,
  MAX(dr.issued_on) AS last_card_date
FROM DISCIPLINARY_RECORD dr
INNER JOIN PLAYER p ON dr.player_id = p.player_id
INNER JOIN "MATCH" m ON dr.match_id = m.match_id
INNER JOIN TOURNAMENT tr ON m.tournament_id = tr.tournament_id
INNER JOIN SEASON se ON tr.season_id = se.season_id
LEFT JOIN TEAM_ROSTER trs ON trs.player_id = p.player_id AND trs.tournament_id = m.tournament_id
LEFT JOIN TEAM t ON trs.team_id = t.team_id
GROUP BY p.player_id, p.full_name, p.status, t.team_id, t.name, m.tournament_id, tr.name, se.season_id, se.name
HAVING COUNT(dr.record_id) > 0;

CREATE OR REPLACE VIEW v_venue_utilization AS
SELECT
  v.venue_id, v.name AS venue_name, v.city, v.capacity, v.surface_type,
  COUNT(m.match_id) AS total_matches,
  SUM(CASE WHEN m.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_matches,
  SUM(CASE WHEN m.status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduled_matches,
  ROUND(AVG(CASE WHEN mr.match_id IS NOT NULL THEN mr.home_score + mr.away_score END)::numeric, 2) AS avg_goals_per_match
FROM VENUE v
LEFT JOIN "MATCH" m ON v.venue_id = m.venue_id
LEFT JOIN MATCH_RESULT mr ON m.match_id = mr.match_id
GROUP BY v.venue_id, v.name, v.city, v.capacity, v.surface_type;

CREATE OR REPLACE VIEW v_tournament_revenue AS
SELECT
  tr.tournament_id, tr.name AS tournament_name, se.season_id, se.name AS season_name,
  COUNT(pay.payment_id) AS payment_count,
  COALESCE(SUM(pay.amount), 0) AS total_revenue,
  COALESCE(SUM(CASE WHEN pay.category = 'Registration' THEN pay.amount ELSE 0 END), 0) AS registration_revenue,
  COALESCE(SUM(CASE WHEN pay.category = 'Sponsorship' THEN pay.amount ELSE 0 END), 0) AS sponsorship_revenue,
  COALESCE(SUM(CASE WHEN pay.category = 'Merchandise' THEN pay.amount ELSE 0 END), 0) AS merchandise_revenue,
  COALESCE(SUM(CASE WHEN pay.category = 'Other' THEN pay.amount ELSE 0 END), 0) AS other_revenue
FROM TOURNAMENT tr
INNER JOIN SEASON se ON tr.season_id = se.season_id
LEFT JOIN PAYMENT pay ON tr.tournament_id = pay.tournament_id
GROUP BY tr.tournament_id, tr.name, se.season_id, se.name;

-- Seed Data
${seedBody}

-- Reset PostgreSQL SERIAL sequences after explicit ID inserts
SELECT setval(pg_get_serial_sequence('sport', 'sport_id'), COALESCE(MAX(sport_id), 1)) FROM SPORT;
SELECT setval(pg_get_serial_sequence('league', 'league_id'), COALESCE(MAX(league_id), 1)) FROM LEAGUE;
SELECT setval(pg_get_serial_sequence('season', 'season_id'), COALESCE(MAX(season_id), 1)) FROM SEASON;
SELECT setval(pg_get_serial_sequence('tournament', 'tournament_id'), COALESCE(MAX(tournament_id), 1)) FROM TOURNAMENT;
SELECT setval(pg_get_serial_sequence('team', 'team_id'), COALESCE(MAX(team_id), 1)) FROM TEAM;
SELECT setval(pg_get_serial_sequence('player', 'player_id'), COALESCE(MAX(player_id), 1)) FROM PLAYER;
SELECT setval(pg_get_serial_sequence('team_roster', 'roster_id'), COALESCE(MAX(roster_id), 1)) FROM TEAM_ROSTER;
SELECT setval(pg_get_serial_sequence('venue', 'venue_id'), COALESCE(MAX(venue_id), 1)) FROM VENUE;
SELECT setval(pg_get_serial_sequence('official', 'official_id'), COALESCE(MAX(official_id), 1)) FROM OFFICIAL;
SELECT setval(pg_get_serial_sequence('"MATCH"', 'match_id'), COALESCE(MAX(match_id), 1)) FROM "MATCH";
SELECT setval(pg_get_serial_sequence('match_result', 'result_id'), COALESCE(MAX(result_id), 1)) FROM MATCH_RESULT;
SELECT setval(pg_get_serial_sequence('player_statistics', 'stat_id'), COALESCE(MAX(stat_id), 1)) FROM PLAYER_STATISTICS;
SELECT setval(pg_get_serial_sequence('disciplinary_record', 'record_id'), COALESCE(MAX(record_id), 1)) FROM DISCIPLINARY_RECORD;
SELECT setval(pg_get_serial_sequence('result_audit', 'audit_id'), COALESCE(MAX(audit_id), 1)) FROM RESULT_AUDIT;
SELECT setval(pg_get_serial_sequence('payment', 'payment_id'), COALESCE(MAX(payment_id), 1)) FROM PAYMENT;
SELECT setval(pg_get_serial_sequence('player_availability', 'availability_id'), COALESCE(MAX(availability_id), 1)) FROM PLAYER_AVAILABILITY;
SELECT setval(pg_get_serial_sequence('communication', 'comm_id'), COALESCE(MAX(comm_id), 1)) FROM COMMUNICATION;
`;
}

export { SCHEMA_SQL, VIEWS_SQL, TRIGGERS_SQL, QUERIES_SQL, ORACLE_PLSQL_SQL };
