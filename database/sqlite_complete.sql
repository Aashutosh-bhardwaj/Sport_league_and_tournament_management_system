PRAGMA foreign_keys = ON;

-- 1. SPORT
CREATE TABLE IF NOT EXISTS SPORT (
  sport_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  players_per_team INTEGER NOT NULL CHECK (players_per_team > 0)
);

-- 2. LEAGUE
CREATE TABLE IF NOT EXISTS LEAGUE (
  league_id INTEGER PRIMARY KEY AUTOINCREMENT,
  sport_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  level TEXT NOT NULL,
  FOREIGN KEY (sport_id) REFERENCES SPORT(sport_id) ON DELETE RESTRICT
);

-- 3. SEASON
CREATE TABLE IF NOT EXISTS SEASON (
  season_id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  CHECK (end_date > start_date),
  FOREIGN KEY (league_id) REFERENCES LEAGUE(league_id) ON DELETE RESTRICT
);

-- 4. TOURNAMENT
CREATE TABLE IF NOT EXISTS TOURNAMENT (
  tournament_id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('LEAGUE', 'KNOCKOUT', 'GROUP_KNOCKOUT')),
  registration_fee REAL NOT NULL DEFAULT 0 CHECK (registration_fee >= 0),
  status TEXT NOT NULL CHECK (status IN ('UPCOMING', 'ONGOING', 'COMPLETED')),
  FOREIGN KEY (season_id) REFERENCES SEASON(season_id) ON DELETE RESTRICT
);

-- 5. TEAM
CREATE TABLE IF NOT EXISTS TEAM (
  team_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  coach_name TEXT NOT NULL,
  founded_year INTEGER NOT NULL CHECK (founded_year >= 1850 AND founded_year <= 2100),
  logo_color TEXT NOT NULL DEFAULT '#0B3D91',
  category TEXT NOT NULL CHECK (category IN ('Youth', 'Amateur', 'Women', 'Senior')),
  registered_on TEXT NOT NULL DEFAULT (date('now'))
);

-- 6. PLAYER
CREATE TABLE IF NOT EXISTS PLAYER (
  player_id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  dob TEXT NOT NULL,
  position TEXT NOT NULL,
  jersey_no INTEGER NOT NULL CHECK (jersey_no > 0 AND jersey_no <= 99),
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INJURED', 'SUSPENDED', 'INACTIVE'))
);

-- 7. TEAM_ROSTER (associative entity preserving historical membership per tournament)
CREATE TABLE IF NOT EXISTS TEAM_ROSTER (
  roster_id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  tournament_id INTEGER NOT NULL,
  jersey_no INTEGER NOT NULL CHECK (jersey_no > 0 AND jersey_no <= 99),
  joined_on TEXT NOT NULL DEFAULT (date('now')),
  UNIQUE (player_id, tournament_id),
  UNIQUE (team_id, tournament_id, jersey_no),
  FOREIGN KEY (team_id) REFERENCES TEAM(team_id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES PLAYER(player_id) ON DELETE CASCADE,
  FOREIGN KEY (tournament_id) REFERENCES TOURNAMENT(tournament_id) ON DELETE CASCADE
);

-- 8. VENUE
CREATE TABLE IF NOT EXISTS VENUE (
  venue_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  surface_type TEXT NOT NULL
);

-- 9. OFFICIAL
CREATE TABLE IF NOT EXISTS OFFICIAL (
  official_id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Referee', 'Linesman', 'Match Commissioner')),
  license_no TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL
);

-- 10. MATCH
CREATE TABLE IF NOT EXISTS "MATCH" (
  match_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  venue_id INTEGER NOT NULL,
  referee_id INTEGER NOT NULL,
  match_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  round INTEGER NOT NULL DEFAULT 1 CHECK (round > 0),
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'POSTPONED', 'CANCELLED')),
  CHECK (home_team_id <> away_team_id),
  UNIQUE (tournament_id, home_team_id, away_team_id),
  UNIQUE (venue_id, match_date, start_time),
  FOREIGN KEY (tournament_id) REFERENCES TOURNAMENT(tournament_id) ON DELETE RESTRICT,
  FOREIGN KEY (home_team_id) REFERENCES TEAM(team_id) ON DELETE RESTRICT,
  FOREIGN KEY (away_team_id) REFERENCES TEAM(team_id) ON DELETE RESTRICT,
  FOREIGN KEY (venue_id) REFERENCES VENUE(venue_id) ON DELETE RESTRICT,
  FOREIGN KEY (referee_id) REFERENCES OFFICIAL(official_id) ON DELETE RESTRICT
);

-- 11. MATCH_RESULT
CREATE TABLE IF NOT EXISTS MATCH_RESULT (
  result_id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL UNIQUE,
  home_score INTEGER NOT NULL CHECK (home_score >= 0),
  away_score INTEGER NOT NULL CHECK (away_score >= 0),
  winner_team_id INTEGER NULL,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  FOREIGN KEY (match_id) REFERENCES "MATCH"(match_id) ON DELETE CASCADE,
  FOREIGN KEY (winner_team_id) REFERENCES TEAM(team_id) ON DELETE SET NULL
);

-- 12. PLAYER_STATISTICS
CREATE TABLE IF NOT EXISTS PLAYER_STATISTICS (
  stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  goals INTEGER NOT NULL DEFAULT 0 CHECK (goals >= 0),
  assists INTEGER NOT NULL DEFAULT 0 CHECK (assists >= 0),
  yellow_cards INTEGER NOT NULL DEFAULT 0 CHECK (yellow_cards >= 0),
  red_cards INTEGER NOT NULL DEFAULT 0 CHECK (red_cards >= 0),
  minutes_played INTEGER NOT NULL DEFAULT 0 CHECK (minutes_played >= 0 AND minutes_played <= 130),
  UNIQUE (match_id, player_id),
  FOREIGN KEY (match_id) REFERENCES "MATCH"(match_id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES PLAYER(player_id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES TEAM(team_id) ON DELETE CASCADE
);

-- 13. DISCIPLINARY_RECORD
CREATE TABLE IF NOT EXISTS DISCIPLINARY_RECORD (
  record_id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  match_id INTEGER NOT NULL,
  offence TEXT NOT NULL,
  card_type TEXT NOT NULL CHECK (card_type IN ('YELLOW', 'RED')),
  suspension_matches INTEGER NOT NULL DEFAULT 0 CHECK (suspension_matches >= 0),
  issued_on TEXT NOT NULL DEFAULT (date('now')),
  FOREIGN KEY (player_id) REFERENCES PLAYER(player_id) ON DELETE CASCADE,
  FOREIGN KEY (match_id) REFERENCES "MATCH"(match_id) ON DELETE CASCADE
);

-- Supporting Table 14: STANDINGS
CREATE TABLE IF NOT EXISTS STANDINGS (
  tournament_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  played INTEGER NOT NULL DEFAULT 0 CHECK (played >= 0),
  won INTEGER NOT NULL DEFAULT 0 CHECK (won >= 0),
  drawn INTEGER NOT NULL DEFAULT 0 CHECK (drawn >= 0),
  lost INTEGER NOT NULL DEFAULT 0 CHECK (lost >= 0),
  goals_for INTEGER NOT NULL DEFAULT 0 CHECK (goals_for >= 0),
  goals_against INTEGER NOT NULL DEFAULT 0 CHECK (goals_against >= 0),
  goal_diff INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  PRIMARY KEY (tournament_id, team_id),
  FOREIGN KEY (tournament_id) REFERENCES TOURNAMENT(tournament_id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES TEAM(team_id) ON DELETE CASCADE
);

-- Supporting Table 15: RESULT_AUDIT
CREATE TABLE IF NOT EXISTS RESULT_AUDIT (
  audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  old_home_score INTEGER NULL,
  old_away_score INTEGER NULL,
  new_home_score INTEGER NOT NULL,
  new_away_score INTEGER NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  action TEXT NOT NULL CHECK (action IN ('SUBMIT', 'CORRECT')),
  FOREIGN KEY (match_id) REFERENCES "MATCH"(match_id) ON DELETE CASCADE
);

-- Supporting Table 16: PAYMENT
CREATE TABLE IF NOT EXISTS PAYMENT (
  payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  tournament_id INTEGER NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL CHECK (category IN ('Registration', 'Sponsorship', 'Merchandise', 'Other')),
  paid_on TEXT NOT NULL DEFAULT (date('now')),
  FOREIGN KEY (team_id) REFERENCES TEAM(team_id) ON DELETE RESTRICT,
  FOREIGN KEY (tournament_id) REFERENCES TOURNAMENT(tournament_id) ON DELETE RESTRICT
);

-- Supporting Table 17: PLAYER_AVAILABILITY
CREATE TABLE IF NOT EXISTS PLAYER_AVAILABILITY (
  availability_id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  CHECK (to_date >= from_date),
  FOREIGN KEY (player_id) REFERENCES PLAYER(player_id) ON DELETE CASCADE
);

-- Supporting Table 18: LEAGUE_SETTINGS (configurable points rules)
CREATE TABLE IF NOT EXISTS LEAGUE_SETTINGS (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL
);

-- Supporting Table 19: COMMUNICATION (league notices & announcements)
CREATE TABLE IF NOT EXISTS COMMUNICATION (
  comm_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Schedule Notice', 'Disciplinary', 'Registration', 'General')),
  target_audience TEXT NOT NULL,
  sent_by TEXT NOT NULL DEFAULT 'John Doe',
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_match_date ON "MATCH"(match_date, start_time);
CREATE INDEX IF NOT EXISTS idx_match_tournament ON "MATCH"(tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_roster_team ON TEAM_ROSTER(team_id);
CREATE INDEX IF NOT EXISTS idx_roster_tournament ON TEAM_ROSTER(tournament_id);
CREATE INDEX IF NOT EXISTS idx_standings_tournament ON STANDINGS(tournament_id, points DESC, goal_diff DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_match ON PLAYER_STATISTICS(match_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON PLAYER_STATISTICS(player_id);
CREATE INDEX IF NOT EXISTS idx_discipline_player ON DISCIPLINARY_RECORD(player_id);
CREATE INDEX IF NOT EXISTS idx_payment_tournament ON PAYMENT(tournament_id, category);


-- Sports League & Tournament Management System
-- SQL Views demonstrating JOINs, Aggregates, Subqueries, and Window Functions

-- 1. Live Points Table View (Window function ranking by points, goal difference, goals for)
CREATE VIEW IF NOT EXISTS v_points_table AS
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

-- 2. Top Scorers View (Aggregates + Window Function)
CREATE VIEW IF NOT EXISTS v_top_scorers AS
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
INNER JOIN "MATCH" m ON ps.match_id = m.match_id
INNER JOIN TOURNAMENT tr ON m.tournament_id = tr.tournament_id
INNER JOIN SEASON se ON tr.season_id = se.season_id
GROUP BY p.player_id, t.team_id, m.tournament_id;

-- 3. Team Recent Form View (Last 5 completed match outcomes per team & tournament)
CREATE VIEW IF NOT EXISTS v_team_form AS
WITH team_matches AS (
  SELECT
    m.tournament_id,
    m.match_id,
    m.match_date,
    m.start_time,
    m.home_team_id AS team_id,
    CASE
      WHEN mr.home_score > mr.away_score THEN 'W'
      WHEN mr.home_score = mr.away_score THEN 'D'
      ELSE 'L'
    END AS outcome
  FROM "MATCH" m
  INNER JOIN MATCH_RESULT mr ON m.match_id = mr.match_id
  WHERE m.status = 'COMPLETED'
  UNION ALL
  SELECT
    m.tournament_id,
    m.match_id,
    m.match_date,
    m.start_time,
    m.away_team_id AS team_id,
    CASE
      WHEN mr.away_score > mr.home_score THEN 'W'
      WHEN mr.away_score = mr.home_score THEN 'D'
      ELSE 'L'
    END AS outcome
  FROM "MATCH" m
  INNER JOIN MATCH_RESULT mr ON m.match_id = mr.match_id
  WHERE m.status = 'COMPLETED'
),
ranked_matches AS (
  SELECT
    tournament_id,
    team_id,
    match_id,
    match_date,
    outcome,
    ROW_NUMBER() OVER (
      PARTITION BY tournament_id, team_id
      ORDER BY match_date DESC, start_time DESC, match_id DESC
    ) AS rn
  FROM team_matches
)
SELECT
  rm.tournament_id,
  rm.team_id,
  t.name AS team_name,
  GROUP_CONCAT(rm.outcome, '-') AS form_string,
  SUM(CASE WHEN rm.outcome = 'W' THEN 1 ELSE 0 END) AS recent_wins,
  SUM(CASE WHEN rm.outcome = 'D' THEN 1 ELSE 0 END) AS recent_draws,
  SUM(CASE WHEN rm.outcome = 'L' THEN 1 ELSE 0 END) AS recent_losses
FROM ranked_matches rm
INNER JOIN TEAM t ON rm.team_id = t.team_id
WHERE rm.rn <= 5
GROUP BY rm.tournament_id, rm.team_id;

-- 4. Upcoming Matches View (Multi-table JOIN including self-join on TEAM)
CREATE VIEW IF NOT EXISTS v_upcoming_matches AS
SELECT
  m.match_id,
  m.tournament_id,
  tr.name AS tournament_name,
  se.season_id,
  se.name AS season_name,
  m.round,
  m.match_date,
  m.start_time,
  m.status,
  ht.team_id AS home_team_id,
  ht.name AS home_team_name,
  ht.logo_color AS home_logo_color,
  at.team_id AS away_team_id,
  at.name AS away_team_name,
  at.logo_color AS away_logo_color,
  v.venue_id,
  v.name AS venue_name,
  v.city AS venue_city,
  o.official_id AS referee_id,
  o.full_name AS referee_name
FROM "MATCH" m
INNER JOIN TOURNAMENT tr ON m.tournament_id = tr.tournament_id
INNER JOIN SEASON se ON tr.season_id = se.season_id
INNER JOIN TEAM ht ON m.home_team_id = ht.team_id
INNER JOIN TEAM at ON m.away_team_id = at.team_id
INNER JOIN VENUE v ON m.venue_id = v.venue_id
INNER JOIN OFFICIAL o ON m.referee_id = o.official_id
WHERE m.status = 'SCHEDULED'
ORDER BY m.match_date ASC, m.start_time ASC;

-- 5. Player Discipline Summary View (GROUP BY + HAVING + Subquery)
CREATE VIEW IF NOT EXISTS v_player_discipline_summary AS
SELECT
  p.player_id,
  p.full_name,
  p.status AS player_status,
  t.team_id,
  t.name AS team_name,
  m.tournament_id,
  tr.name AS tournament_name,
  se.season_id,
  se.name AS season_name,
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
GROUP BY p.player_id, m.tournament_id
HAVING COUNT(dr.record_id) > 0;

-- 6. Venue Utilization View (LEFT JOIN + Aggregates)
CREATE VIEW IF NOT EXISTS v_venue_utilization AS
SELECT
  v.venue_id,
  v.name AS venue_name,
  v.city,
  v.capacity,
  v.surface_type,
  COUNT(m.match_id) AS total_matches,
  SUM(CASE WHEN m.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_matches,
  SUM(CASE WHEN m.status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduled_matches,
  ROUND(AVG(CASE WHEN mr.match_id IS NOT NULL THEN mr.home_score + mr.away_score END), 2) AS avg_goals_per_match
FROM VENUE v
LEFT JOIN "MATCH" m ON v.venue_id = m.venue_id
LEFT JOIN MATCH_RESULT mr ON m.match_id = mr.match_id
GROUP BY v.venue_id;

-- 7. Tournament Revenue View (Conditional Aggregation by Payment Category)
CREATE VIEW IF NOT EXISTS v_tournament_revenue AS
SELECT
  tr.tournament_id,
  tr.name AS tournament_name,
  se.season_id,
  se.name AS season_name,
  COUNT(pay.payment_id) AS payment_count,
  COALESCE(SUM(pay.amount), 0) AS total_revenue,
  COALESCE(SUM(CASE WHEN pay.category = 'Registration' THEN pay.amount ELSE 0 END), 0) AS registration_revenue,
  COALESCE(SUM(CASE WHEN pay.category = 'Sponsorship' THEN pay.amount ELSE 0 END), 0) AS sponsorship_revenue,
  COALESCE(SUM(CASE WHEN pay.category = 'Merchandise' THEN pay.amount ELSE 0 END), 0) AS merchandise_revenue,
  COALESCE(SUM(CASE WHEN pay.category = 'Other' THEN pay.amount ELSE 0 END), 0) AS other_revenue
FROM TOURNAMENT tr
INNER JOIN SEASON se ON tr.season_id = se.season_id
LEFT JOIN PAYMENT pay ON tr.tournament_id = pay.tournament_id
GROUP BY tr.tournament_id;


-- Sports League & Tournament Management System
-- SQLite Triggers (PL/SQL Equivalent Business Rule Enforcement)

-- 1. Block a player from being rostered in two teams in the same tournament
CREATE TRIGGER IF NOT EXISTS trg_block_double_roster
BEFORE INSERT ON TEAM_ROSTER
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM TEAM_ROSTER
  WHERE player_id = NEW.player_id
    AND tournament_id = NEW.tournament_id
)
BEGIN
  SELECT RAISE(ABORT, 'Roster Constraint: Player is already assigned to another team in this tournament.');
END;

-- 2. Block recording match statistics for a SUSPENDED or INACTIVE player
CREATE TRIGGER IF NOT EXISTS trg_block_suspended_player_stats
BEFORE INSERT ON PLAYER_STATISTICS
FOR EACH ROW
WHEN (
  SELECT status FROM PLAYER WHERE player_id = NEW.player_id
) IN ('SUSPENDED', 'INACTIVE')
BEGIN
  SELECT RAISE(ABORT, 'Eligibility Constraint: Cannot log match statistics for a SUSPENDED or INACTIVE player.');
END;

-- 3. Block venue double-booking on INSERT
CREATE TRIGGER IF NOT EXISTS trg_block_venue_double_booking_ins
BEFORE INSERT ON "MATCH"
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM "MATCH"
  WHERE venue_id = NEW.venue_id
    AND match_date = NEW.match_date
    AND start_time = NEW.start_time
    AND status <> 'CANCELLED'
)
BEGIN
  SELECT RAISE(ABORT, 'Venue Conflict: Selected venue is already booked at this date and start time.');
END;

-- 4. Block venue double-booking on UPDATE
CREATE TRIGGER IF NOT EXISTS trg_block_venue_double_booking_upd
BEFORE UPDATE OF venue_id, match_date, start_time ON "MATCH"
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM "MATCH"
  WHERE venue_id = NEW.venue_id
    AND match_date = NEW.match_date
    AND start_time = NEW.start_time
    AND match_id <> NEW.match_id
    AND status <> 'CANCELLED'
)
BEGIN
  SELECT RAISE(ABORT, 'Venue Conflict: Selected venue is already booked at this date and start time.');
END;

-- 5. Block duplicate fixtures in the same tournament
CREATE TRIGGER IF NOT EXISTS trg_block_duplicate_fixture
BEFORE INSERT ON "MATCH"
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM "MATCH"
  WHERE tournament_id = NEW.tournament_id
    AND home_team_id = NEW.home_team_id
    AND away_team_id = NEW.away_team_id
)
BEGIN
  SELECT RAISE(ABORT, 'Fixture Conflict: This home vs away matchup already exists in this tournament.');
END;

-- 6. Block submitting a result for a match that is not SCHEDULED
CREATE TRIGGER IF NOT EXISTS trg_block_non_scheduled_result
BEFORE INSERT ON MATCH_RESULT
FOR EACH ROW
WHEN (
  SELECT status FROM "MATCH" WHERE match_id = NEW.match_id
) <> 'SCHEDULED'
BEGIN
  SELECT RAISE(ABORT, 'Match State Constraint: Results can only be submitted for SCHEDULED matches. Use Correct Result to edit completed scores.');
END;

-- 7. Auto-suspend player on RED card or when accumulating 3 YELLOW cards in a tournament
CREATE TRIGGER IF NOT EXISTS trg_auto_suspend_on_cards
AFTER INSERT ON DISCIPLINARY_RECORD
FOR EACH ROW
BEGIN
  UPDATE PLAYER
  SET status = 'SUSPENDED'
  WHERE player_id = NEW.player_id
    AND status IN ('ACTIVE', 'INJURED')
    AND (
      NEW.card_type = 'RED'
      OR (
        NEW.card_type = 'YELLOW'
        AND (
          SELECT COUNT(*)
          FROM DISCIPLINARY_RECORD dr
          INNER JOIN "MATCH" m ON dr.match_id = m.match_id
          WHERE dr.player_id = NEW.player_id
            AND dr.card_type = 'YELLOW'
            AND m.tournament_id = (SELECT tournament_id FROM "MATCH" WHERE match_id = NEW.match_id)
        ) >= COALESCE(
          (SELECT CAST(setting_value AS INTEGER) FROM LEAGUE_SETTINGS WHERE setting_key = 'yellow_card_threshold'),
          3
        )
      )
    );
END;

-- 8. Automatically log initial submission into RESULT_AUDIT
CREATE TRIGGER IF NOT EXISTS trg_audit_result_insert
AFTER INSERT ON MATCH_RESULT
FOR EACH ROW
BEGIN
  INSERT INTO RESULT_AUDIT (
    match_id,
    old_home_score,
    old_away_score,
    new_home_score,
    new_away_score,
    changed_at,
    action
  ) VALUES (
    NEW.match_id,
    NULL,
    NULL,
    NEW.home_score,
    NEW.away_score,
    COALESCE(NEW.submitted_at, datetime('now')),
    'SUBMIT'
  );
END;

-- 9. Automatically log score corrections into RESULT_AUDIT
CREATE TRIGGER IF NOT EXISTS trg_audit_result_update
AFTER UPDATE OF home_score, away_score ON MATCH_RESULT
FOR EACH ROW
WHEN OLD.home_score <> NEW.home_score OR OLD.away_score <> NEW.away_score
BEGIN
  INSERT INTO RESULT_AUDIT (
    match_id,
    old_home_score,
    old_away_score,
    new_home_score,
    new_away_score,
    changed_at,
    action
  ) VALUES (
    NEW.match_id,
    OLD.home_score,
    OLD.away_score,
    NEW.home_score,
    NEW.away_score,
    datetime('now'),
    'CORRECT'
  );
END;


-- Sports League & Tournament Management System - Seed Data
PRAGMA foreign_keys = ON;

-- Configurable Points & Discipline Rules
INSERT INTO LEAGUE_SETTINGS (setting_key, setting_value) VALUES ('points_win', '3');
INSERT INTO LEAGUE_SETTINGS (setting_key, setting_value) VALUES ('points_draw', '1');
INSERT INTO LEAGUE_SETTINGS (setting_key, setting_value) VALUES ('points_loss', '0');
INSERT INTO LEAGUE_SETTINGS (setting_key, setting_value) VALUES ('yellow_card_threshold', '3');

-- 1. Sports (2)
INSERT INTO SPORT (sport_id, name, players_per_team) VALUES (1, 'Football', 11);
INSERT INTO SPORT (sport_id, name, players_per_team) VALUES (2, 'Cricket', 11);

-- 2. Leagues (2)
INSERT INTO LEAGUE (league_id, sport_id, name, country, level) VALUES (1, 1, 'USA Premier Football League', 'United States', 'Tier 1 National');
INSERT INTO LEAGUE (league_id, sport_id, name, country, level) VALUES (2, 2, 'North American Cricket League', 'United States', 'Division 1');

-- 3. Seasons (2)
INSERT INTO SEASON (season_id, league_id, name, start_date, end_date) VALUES (1, 1, '2026', '2026-01-01', '2026-12-22');
INSERT INTO SEASON (season_id, league_id, name, start_date, end_date) VALUES (2, 2, '2025', '2025-02-01', '2025-11-30');

-- 4. Tournaments (3)
INSERT INTO TOURNAMENT (tournament_id, season_id, name, format, registration_fee, status) VALUES (1, 1, 'USA Premier Cup 2026', 'LEAGUE', 650.00, 'ONGOING');
INSERT INTO TOURNAMENT (tournament_id, season_id, name, format, registration_fee, status) VALUES (2, 1, 'National Challenge Trophy 2026', 'GROUP_KNOCKOUT', 450.00, 'ONGOING');
INSERT INTO TOURNAMENT (tournament_id, season_id, name, format, registration_fee, status) VALUES (3, 2, 'T20 Heritage Championship 2025', 'LEAGUE', 500.00, 'COMPLETED');

-- 5. Teams (24)
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (1, 'Eagles FC', 'Chicago', 'Marcus Vance', 2012, '#0B3D91', 'Senior', '2026-01-08');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (2, 'Lions FC', 'New York', 'Elena Rostova', 2010, '#D97706', 'Senior', '2026-01-14');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (3, 'Tigers FC', 'Los Angeles', 'Devon Brooks', 2014, '#EA580C', 'Senior', '2026-01-21');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (4, 'Raptors FC', 'Seattle', 'Carlos Mendez', 2015, '#DC2626', 'Senior', '2026-01-28');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (5, 'Sharks FC', 'Miami', 'Liam OConnor', 2011, '#0284C7', 'Senior', '2026-02-04');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (6, 'Warriors FC', 'Dallas', 'Andre Silva', 2013, '#4F46E5', 'Senior', '2026-02-11');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (7, 'Falcons United', 'Atlanta', 'Nadia Patel', 2016, '#B91C1C', 'Women', '2026-02-18');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (8, 'Valkyries SC', 'Portland', 'Hannah Lin', 2017, '#7C3AED', 'Women', '2026-02-24');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (9, 'Aurora Athletic', 'Denver', 'Claire Bennett', 2018, '#0D9488', 'Women', '2026-03-03');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (10, 'Phoenix Ladies FC', 'Phoenix', 'Sofia Morales', 2019, '#E11D48', 'Women', '2026-03-09');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (11, 'Harbor Sirens', 'San Diego', 'Rachel Kim', 2017, '#0369A1', 'Women', '2026-03-14');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (12, 'Metro Stars WFC', 'Boston', 'Olivia Grant', 2016, '#6D28D9', 'Women', '2026-03-20');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (13, 'Mavericks SC', 'Austin', 'Tyler Reed', 2018, '#1D4ED8', 'Amateur', '2026-03-25');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (14, 'Titans FC', 'Houston', 'Omar Hassan', 2015, '#334155', 'Amateur', '2026-03-29');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (15, 'Wolves United', 'Minneapolis', 'Jonas Berg', 2019, '#475569', 'Amateur', '2026-04-04');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (16, 'Panthers FC', 'Charlotte', 'Malik Carter', 2016, '#1E293B', 'Amateur', '2026-04-10');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (17, 'Coastal Strikers', 'Tampa', 'Lucas Ferreira', 2020, '#059669', 'Amateur', '2026-04-16');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (18, 'Capital Rovers', 'Washington DC', 'Owen Walsh', 2017, '#991B1B', 'Amateur', '2026-04-22');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (19, 'Summit Academy', 'Salt Lake City', 'Ethan Clark', 2021, '#15803D', 'Youth', '2026-04-28');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (20, 'Valley Colts', 'San Jose', 'Mateo Ruiz', 2020, '#2563EB', 'Youth', '2026-05-03');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (21, 'Dynamo Juniors', 'Columbus', 'Noah Weber', 2022, '#C2410C', 'Youth', '2026-05-08');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (22, 'Bayou Youth FC', 'New Orleans', 'Jaden Cole', 2021, '#4338CA', 'Youth', '2026-05-14');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (23, 'Cascade Cadets', 'Tacoma', 'Caleb Ross', 2022, '#0F766E', 'Youth', '2026-05-19');
INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (24, 'Heartland Rising', 'Kansas City', 'Samira Ali', 2021, '#BE123C', 'Youth', '2026-05-24');

-- 6. Venues (12)
INSERT INTO VENUE (venue_id, name, city, capacity, surface_type) VALUES (1, 'Soldier Memorial Field', 'Chicago', 34500, 'Hybrid Turf');
INSERT INTO VENUE (venue_id, name, city, capacity, surface_type) VALUES (2, 'Empire Sports Arena', 'New York', 28000, 'Natural Grass');
INSERT INTO VENUE (venue_id, name, city, capacity, surface_type) VALUES (3, 'Pacific Bowl Stadium', 'Los Angeles', 38000, 'Bermuda Grass');
INSERT INTO VENUE (venue_id, name, city, capacity, surface_type) VALUES (4, 'Emerald Pitch Park', 'Seattle', 25500, 'FieldTurf Pro');
INSERT INTO VENUE (venue_id, name, city, capacity, surface_type) VALUES (5, 'Biscayne Bay Complex', 'Miami', 22000, 'Natural Grass');
INSERT INTO VENUE (venue_id, name, city, capacity, surface_type) VALUES (6, 'Lone Star Athletic Field', 'Dallas', 24000, 'Hybrid Turf');
INSERT INTO VENUE (venue_id, name, city, capacity, surface_type) VALUES (7, 'Piedmont Commons Ground', 'Atlanta', 18500, 'Natural Grass');
INSERT INTO VENUE (venue_id, name, city, capacity, surface_type) VALUES (8, 'Rose City Stadium', 'Portland', 21000, 'FieldTurf Pro');
INSERT INTO VENUE (venue_id, name, city, capacity, surface_type) VALUES (9, 'Mile High Pitch', 'Denver', 16500, 'Hybrid Turf');
INSERT INTO VENUE (venue_id, name, city, capacity, surface_type) VALUES (10, 'Capitol Oval Park', 'Washington DC', 15000, 'Natural Grass');
INSERT INTO VENUE (venue_id, name, city, capacity, surface_type) VALUES (11, 'Silicon Valley Grounds', 'San Jose', 12500, 'FieldTurf Pro');
INSERT INTO VENUE (venue_id, name, city, capacity, surface_type) VALUES (12, 'Heartland Sports Center', 'Kansas City', 14000, 'Bermuda Grass');

-- 7. Officials (15)
INSERT INTO OFFICIAL (official_id, full_name, role, license_no, phone) VALUES (1, 'Arthur Pendelton', 'Referee', 'USA-REF-1001', '+1-312-555-0101');
INSERT INTO OFFICIAL (official_id, full_name, role, license_no, phone) VALUES (2, 'Gabriela Torres', 'Referee', 'USA-REF-1002', '+1-212-555-0102');
INSERT INTO OFFICIAL (official_id, full_name, role, license_no, phone) VALUES (3, 'Derrick Coleman', 'Referee', 'USA-REF-1003', '+1-310-555-0103');
INSERT INTO OFFICIAL (official_id, full_name, role, license_no, phone) VALUES (4, 'Martin Lindqvist', 'Referee', 'USA-REF-1004', '+1-206-555-0104');
INSERT INTO OFFICIAL (official_id, full_name, role, license_no, phone) VALUES (5, 'Priya Nair', 'Referee', 'USA-REF-1005', '+1-305-555-0105');
INSERT INTO OFFICIAL (official_id, full_name, role, license_no, phone) VALUES (6, 'Victor Alvarez', 'Referee', 'USA-REF-1006', '+1-214-555-0106');
INSERT INTO OFFICIAL (official_id, full_name, role, license_no, phone) VALUES (7, 'Kenneth Brooks', 'Referee', 'USA-REF-1007', '+1-404-555-0107');
INSERT INTO OFFICIAL (official_id, full_name, role, license_no, phone) VALUES (8, 'Lauren Fitzgerald', 'Referee', 'USA-REF-1008', '+1-503-555-0108');
INSERT INTO OFFICIAL (official_id, full_name, role, license_no, phone) VALUES (9, 'Sanjay Kapoor', 'Referee', 'USA-REF-1009', '+1-303-555-0109');
INSERT INTO OFFICIAL (official_id, full_name, role, license_no, phone) VALUES (10, 'Trevor Hayes', 'Linesman', 'USA-LIN-2001', '+1-617-555-0110');
INSERT INTO OFFICIAL (official_id, full_name, role, license_no, phone) VALUES (11, 'Mei-Ling Zhou', 'Linesman', 'USA-LIN-2002', '+1-619-555-0111');
INSERT INTO OFFICIAL (official_id, full_name, role, license_no, phone) VALUES (12, 'Benjamin Ortiz', 'Linesman', 'USA-LIN-2003', '+1-512-555-0112');
INSERT INTO OFFICIAL (official_id, full_name, role, license_no, phone) VALUES (13, 'Fiona McAllister', 'Linesman', 'USA-LIN-2004', '+1-713-555-0113');
INSERT INTO OFFICIAL (official_id, full_name, role, license_no, phone) VALUES (14, 'Raymond Vance', 'Match Commissioner', 'USA-COM-3001', '+1-202-555-0114');
INSERT INTO OFFICIAL (official_id, full_name, role, license_no, phone) VALUES (15, 'Patricia Morales', 'Match Commissioner', 'USA-COM-3002', '+1-816-555-0115');

-- 8. Players (480) and Team Roster
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (1, 'Asher Hernandez', '1996-01-02', 'Goalkeeper', 1, 'asher.hernandez.1@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (1, 1, 1, 1, 1, '2026-01-03');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (2, 1, 1, 3, 1, '2025-02-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (2, 'Mason Scott', '1997-04-04', 'Defender', 2, 'mason.scott.2@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (3, 1, 2, 1, 2, '2026-01-04');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (4, 1, 2, 3, 2, '2025-02-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (3, 'Sebastian Nelson', '1998-07-06', 'Defender', 3, 'sebastian.nelson.3@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (5, 1, 3, 1, 3, '2026-01-05');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (6, 1, 3, 3, 3, '2025-02-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (4, 'Owen Turner', '1999-10-08', 'Defender', 4, 'owen.turner.4@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (7, 1, 4, 1, 4, '2026-01-06');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (8, 1, 4, 3, 4, '2025-02-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (5, 'Wyatt Edwards', '2000-01-10', 'Defender', 5, 'wyatt.edwards.5@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (9, 1, 5, 1, 5, '2026-01-07');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (10, 1, 5, 3, 5, '2025-02-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (6, 'Grayson Rogers', '2001-04-12', 'Defender', 6, 'grayson.rogers.6@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (11, 1, 6, 1, 6, '2026-01-08');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (12, 1, 6, 3, 6, '2025-02-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (7, 'Gabriel Murphy', '2002-07-14', 'Defender', 7, 'gabriel.murphy.7@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (13, 1, 7, 1, 7, '2026-01-09');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (14, 1, 7, 3, 7, '2025-02-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (8, 'Jayden Cox', '2003-10-16', 'Midfielder', 8, 'jayden.cox.8@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (15, 1, 8, 1, 8, '2026-01-10');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (16, 1, 8, 3, 8, '2025-02-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (9, 'Nathan Gray', '2004-01-18', 'Midfielder', 9, 'nathan.gray.9@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (17, 1, 9, 1, 9, '2026-01-11');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (18, 1, 9, 3, 9, '2025-02-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (10, 'Tariq Sanders', '1995-04-20', 'Midfielder', 10, 'tariq.sanders.10@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (19, 1, 10, 1, 10, '2026-01-12');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (20, 1, 10, 3, 10, '2025-02-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (11, 'Marco Martinez', '1996-07-22', 'Midfielder', 11, 'marco.martinez.11@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (21, 1, 11, 1, 11, '2026-01-13');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (22, 1, 11, 3, 11, '2025-02-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (12, 'Liam Lee', '1997-10-24', 'Midfielder', 12, 'liam.lee.12@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (23, 1, 12, 1, 12, '2026-01-14');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (24, 1, 12, 3, 12, '2025-02-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (13, 'Elijah Hernandez', '1998-01-26', 'Midfielder', 13, 'elijah.hernandez.13@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (25, 1, 13, 1, 13, '2026-01-15');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (26, 1, 13, 3, 13, '2025-02-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (14, 'Levi Scott', '1999-04-01', 'Forward', 14, 'levi.scott.14@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (27, 1, 14, 1, 14, '2026-01-16');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (28, 1, 14, 3, 14, '2025-02-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (15, 'Leo Nelson', '2000-07-03', 'Forward', 15, 'leo.nelson.15@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (29, 1, 15, 1, 15, '2026-01-17');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (30, 1, 15, 3, 15, '2025-02-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (16, 'Logan Turner', '2001-10-05', 'Forward', 16, 'logan.turner.16@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (31, 1, 16, 1, 16, '2026-01-18');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (32, 1, 16, 3, 16, '2025-02-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (17, 'Aiden Edwards', '2002-01-07', 'Forward', 17, 'aiden.edwards.17@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (33, 1, 17, 1, 17, '2026-01-19');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (34, 1, 17, 3, 17, '2025-02-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (18, 'Jacob Rogers', '2003-04-09', 'Forward', 18, 'jacob.rogers.18@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (35, 1, 18, 1, 18, '2026-01-20');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (36, 1, 18, 3, 18, '2025-02-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (19, 'Hudson Murphy', '2004-07-11', 'Midfielder', 19, 'hudson.murphy.19@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (37, 1, 19, 1, 19, '2026-01-21');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (38, 1, 19, 3, 19, '2025-02-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (20, 'Caleb Cox', '1995-10-13', 'Goalkeeper', 20, 'caleb.cox.20@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (39, 1, 20, 1, 20, '2026-01-22');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (40, 1, 20, 3, 20, '2025-02-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (21, 'Jack Carter', '1997-01-03', 'Goalkeeper', 1, 'jack.carter.21@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (41, 2, 21, 1, 1, '2026-01-23');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (42, 2, 21, 3, 1, '2025-02-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (22, 'Samuel Phillips', '1998-04-05', 'Defender', 2, 'samuel.phillips.22@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (43, 2, 22, 1, 2, '2026-01-24');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (44, 2, 22, 3, 2, '2025-02-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (23, 'Julian Collins', '1999-07-07', 'Defender', 3, 'julian.collins.23@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (45, 2, 23, 1, 3, '2026-01-25');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (46, 2, 23, 3, 3, '2025-02-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (24, 'Ezra Reed', '2000-10-09', 'Defender', 4, 'ezra.reed.24@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (47, 2, 24, 1, 4, '2026-01-26');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (48, 2, 24, 3, 4, '2025-02-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (25, 'Isaac Bailey', '2001-01-11', 'Defender', 5, 'isaac.bailey.25@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (49, 2, 25, 1, 5, '2026-01-27');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (50, 2, 25, 3, 5, '2025-02-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (26, 'Dylan Howard', '2002-04-13', 'Defender', 6, 'dylan.howard.26@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (51, 2, 26, 1, 6, '2026-01-03');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (52, 2, 26, 3, 6, '2025-02-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (27, 'Rohan Ramirez', '2003-07-15', 'Defender', 7, 'rohan.ramirez.27@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (53, 2, 27, 1, 7, '2026-01-04');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (54, 2, 27, 3, 7, '2025-02-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (28, 'Kieran Price', '2004-10-17', 'Midfielder', 8, 'kieran.price.28@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (55, 2, 28, 1, 8, '2026-01-05');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (56, 2, 28, 3, 8, '2025-02-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (29, 'Rafael Robinson', '1995-01-19', 'Midfielder', 9, 'rafael.robinson.29@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (57, 2, 29, 1, 9, '2026-01-06');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (58, 2, 29, 3, 9, '2025-02-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (30, 'Noah Walker', '1996-04-21', 'Midfielder', 10, 'noah.walker.30@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (59, 2, 30, 1, 10, '2026-01-07');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (60, 2, 30, 3, 10, '2025-02-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (31, 'Mateo King', '1997-07-23', 'Midfielder', 11, 'mateo.king.31@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (61, 2, 31, 1, 11, '2026-01-08');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (62, 2, 31, 3, 11, '2025-02-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (32, 'Asher Green', '1998-10-25', 'Midfielder', 12, 'asher.green.32@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (63, 2, 32, 1, 12, '2026-01-09');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (64, 2, 32, 3, 12, '2025-02-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (33, 'Mason Carter', '1999-01-27', 'Midfielder', 13, 'mason.carter.33@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (65, 2, 33, 1, 13, '2026-01-10');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (66, 2, 33, 3, 13, '2025-02-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (34, 'Sebastian Phillips', '2000-04-02', 'Forward', 14, 'sebastian.phillips.34@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (67, 2, 34, 1, 14, '2026-01-11');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (68, 2, 34, 3, 14, '2025-02-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (35, 'Owen Collins', '2001-07-04', 'Forward', 15, 'owen.collins.35@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (69, 2, 35, 1, 15, '2026-01-12');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (70, 2, 35, 3, 15, '2025-02-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (36, 'Wyatt Reed', '2002-10-06', 'Forward', 16, 'wyatt.reed.36@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (71, 2, 36, 1, 16, '2026-01-13');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (72, 2, 36, 3, 16, '2025-02-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (37, 'Grayson Bailey', '2003-01-08', 'Forward', 17, 'grayson.bailey.37@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (73, 2, 37, 1, 17, '2026-01-14');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (74, 2, 37, 3, 17, '2025-02-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (38, 'Gabriel Howard', '2004-04-10', 'Forward', 18, 'gabriel.howard.38@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (75, 2, 38, 1, 18, '2026-01-15');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (76, 2, 38, 3, 18, '2025-02-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (39, 'Jayden Ramirez', '1995-07-12', 'Midfielder', 19, 'jayden.ramirez.39@usapremierleague.org', 'INJURED');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (77, 2, 39, 1, 19, '2026-01-16');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (78, 2, 39, 3, 19, '2025-02-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (40, 'Nathan Price', '1996-10-14', 'Goalkeeper', 20, 'nathan.price.40@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (79, 2, 40, 1, 20, '2026-01-17');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (80, 2, 40, 3, 20, '2025-02-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (41, 'Hudson Stewart', '1998-01-04', 'Goalkeeper', 1, 'hudson.stewart.41@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (81, 3, 41, 1, 1, '2026-01-18');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (82, 3, 41, 3, 1, '2025-02-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (42, 'Caleb Cook', '1999-04-06', 'Defender', 2, 'caleb.cook.42@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (83, 3, 42, 1, 2, '2026-01-19');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (84, 3, 42, 3, 2, '2025-02-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (43, 'Carter Rivera', '2000-07-08', 'Defender', 3, 'carter.rivera.43@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (85, 3, 43, 1, 3, '2026-01-20');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (86, 3, 43, 3, 3, '2025-02-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (44, 'Adrian Ward', '2001-10-10', 'Defender', 4, 'adrian.ward.44@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (87, 3, 44, 1, 4, '2026-01-21');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (88, 3, 44, 3, 4, '2025-02-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (45, 'Arjun Watson', '2002-01-12', 'Defender', 5, 'arjun.watson.45@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (89, 3, 45, 1, 5, '2026-01-22');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (90, 3, 45, 3, 5, '2025-02-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (46, 'Declan Bennett', '2003-04-14', 'Defender', 6, 'declan.bennett.46@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (91, 3, 46, 1, 6, '2026-01-23');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (92, 3, 46, 3, 6, '2025-02-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (47, 'Soren Clark', '2004-07-16', 'Defender', 7, 'soren.clark.47@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (93, 3, 47, 1, 7, '2026-01-24');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (94, 3, 47, 3, 7, '2025-02-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (48, 'Oliver Hall', '1995-10-18', 'Midfielder', 8, 'oliver.hall.48@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (95, 3, 48, 1, 8, '2026-01-25');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (96, 3, 48, 3, 8, '2025-02-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (49, 'Lucas Wright', '1996-01-20', 'Midfielder', 9, 'lucas.wright.49@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (97, 3, 49, 1, 9, '2026-01-26');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (98, 3, 49, 3, 9, '2025-02-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (50, 'James Adams', '1997-04-22', 'Midfielder', 10, 'james.adams.50@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (99, 3, 50, 1, 10, '2026-01-27');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (100, 3, 50, 3, 10, '2025-02-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (51, 'Ethan Mitchell', '1998-07-24', 'Midfielder', 11, 'ethan.mitchell.51@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (101, 3, 51, 1, 11, '2026-01-03');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (102, 3, 51, 3, 11, '2025-02-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (52, 'Jack Campbell', '1999-10-26', 'Midfielder', 12, 'jack.campbell.52@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (103, 3, 52, 1, 12, '2026-01-04');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (104, 3, 52, 3, 12, '2025-02-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (53, 'Samuel Stewart', '2000-01-01', 'Midfielder', 13, 'samuel.stewart.53@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (105, 3, 53, 1, 13, '2026-01-05');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (106, 3, 53, 3, 13, '2025-02-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (54, 'Julian Cook', '2001-04-03', 'Forward', 14, 'julian.cook.54@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (107, 3, 54, 1, 14, '2026-01-06');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (108, 3, 54, 3, 14, '2025-02-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (55, 'Ezra Rivera', '2002-07-05', 'Forward', 15, 'ezra.rivera.55@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (109, 3, 55, 1, 15, '2026-01-07');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (110, 3, 55, 3, 15, '2025-02-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (56, 'Isaac Ward', '2003-10-07', 'Forward', 16, 'isaac.ward.56@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (111, 3, 56, 1, 16, '2026-01-08');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (112, 3, 56, 3, 16, '2025-02-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (57, 'Dylan Watson', '2004-01-09', 'Forward', 17, 'dylan.watson.57@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (113, 3, 57, 1, 17, '2026-01-09');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (114, 3, 57, 3, 17, '2025-02-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (58, 'Rohan Bennett', '1995-04-11', 'Forward', 18, 'rohan.bennett.58@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (115, 3, 58, 1, 18, '2026-01-10');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (116, 3, 58, 3, 18, '2025-02-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (59, 'Kieran Clark', '1996-07-13', 'Midfielder', 19, 'kieran.clark.59@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (117, 3, 59, 1, 19, '2026-01-11');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (118, 3, 59, 3, 19, '2025-02-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (60, 'Rafael Hall', '1997-10-15', 'Goalkeeper', 20, 'rafael.hall.60@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (119, 3, 60, 1, 20, '2026-01-12');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (120, 3, 60, 3, 20, '2025-02-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (61, 'Jayden Cooper', '1999-01-05', 'Goalkeeper', 1, 'jayden.cooper.61@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (121, 4, 61, 1, 1, '2026-01-13');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (122, 4, 61, 3, 1, '2025-02-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (62, 'Nathan Torres', '2000-04-07', 'Defender', 2, 'nathan.torres.62@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (123, 4, 62, 1, 2, '2026-01-14');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (124, 4, 62, 3, 2, '2025-02-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (63, 'Tariq Brooks', '2001-07-09', 'Defender', 3, 'tariq.brooks.63@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (125, 4, 63, 1, 3, '2026-01-15');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (126, 4, 63, 3, 3, '2025-02-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (64, 'Marco Wood', '2002-10-11', 'Defender', 4, 'marco.wood.64@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (127, 4, 64, 1, 4, '2026-01-16');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (128, 4, 64, 3, 4, '2025-02-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (65, 'Liam Rodriguez', '2003-01-13', 'Defender', 5, 'liam.rodriguez.65@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (129, 4, 65, 1, 5, '2026-01-17');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (130, 4, 65, 3, 5, '2025-02-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (66, 'Elijah Allen', '2004-04-15', 'Defender', 6, 'elijah.allen.66@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (131, 4, 66, 1, 6, '2026-01-18');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (132, 4, 66, 3, 6, '2025-02-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (67, 'Levi Lopez', '1995-07-17', 'Defender', 7, 'levi.lopez.67@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (133, 4, 67, 1, 7, '2026-01-19');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (134, 4, 67, 3, 7, '2025-02-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (68, 'Leo Baker', '1996-10-19', 'Midfielder', 8, 'leo.baker.68@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (135, 4, 68, 1, 8, '2026-01-20');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (136, 4, 68, 3, 8, '2025-02-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (69, 'Logan Perez', '1997-01-21', 'Midfielder', 9, 'logan.perez.69@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (137, 4, 69, 1, 9, '2026-01-21');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (138, 4, 69, 3, 9, '2025-02-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (70, 'Aiden Parker', '1998-04-23', 'Midfielder', 10, 'aiden.parker.70@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (139, 4, 70, 1, 10, '2026-01-22');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (140, 4, 70, 3, 10, '2025-02-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (71, 'Jacob Sanchez', '1999-07-25', 'Midfielder', 11, 'jacob.sanchez.71@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (141, 4, 71, 1, 11, '2026-01-23');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (142, 4, 71, 3, 11, '2025-02-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (72, 'Hudson Morgan', '2000-10-27', 'Midfielder', 12, 'hudson.morgan.72@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (143, 4, 72, 1, 12, '2026-01-24');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (144, 4, 72, 3, 12, '2025-02-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (73, 'Caleb Cooper', '2001-01-02', 'Midfielder', 13, 'caleb.cooper.73@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (145, 4, 73, 1, 13, '2026-01-25');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (146, 4, 73, 3, 13, '2025-02-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (74, 'Carter Torres', '2002-04-04', 'Forward', 14, 'carter.torres.74@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (147, 4, 74, 1, 14, '2026-01-26');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (148, 4, 74, 3, 14, '2025-02-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (75, 'Adrian Brooks', '2003-07-06', 'Forward', 15, 'adrian.brooks.75@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (149, 4, 75, 1, 15, '2026-01-27');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (150, 4, 75, 3, 15, '2025-02-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (76, 'Arjun Wood', '2004-10-08', 'Forward', 16, 'arjun.wood.76@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (151, 4, 76, 1, 16, '2026-01-03');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (152, 4, 76, 3, 16, '2025-02-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (77, 'Declan Rodriguez', '1995-01-10', 'Forward', 17, 'declan.rodriguez.77@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (153, 4, 77, 1, 17, '2026-01-04');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (154, 4, 77, 3, 17, '2025-02-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (78, 'Soren Allen', '1996-04-12', 'Forward', 18, 'soren.allen.78@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (155, 4, 78, 1, 18, '2026-01-05');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (156, 4, 78, 3, 18, '2025-02-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (79, 'Oliver Lopez', '1997-07-14', 'Midfielder', 19, 'oliver.lopez.79@usapremierleague.org', 'INJURED');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (157, 4, 79, 1, 19, '2026-01-06');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (158, 4, 79, 3, 19, '2025-02-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (80, 'Lucas Baker', '1998-10-16', 'Goalkeeper', 20, 'lucas.baker.80@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (159, 4, 80, 1, 20, '2026-01-07');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (160, 4, 80, 3, 20, '2025-02-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (81, 'Kieran Kelly', '2000-01-06', 'Goalkeeper', 1, 'kieran.kelly.81@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (161, 5, 81, 1, 1, '2026-02-02');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (162, 5, 81, 3, 1, '2025-02-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (82, 'Rafael Anderson', '2001-04-08', 'Defender', 2, 'rafael.anderson.82@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (163, 5, 82, 1, 2, '2026-02-03');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (164, 5, 82, 3, 2, '2025-02-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (83, 'Noah Lewis', '2002-07-10', 'Defender', 3, 'noah.lewis.83@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (165, 5, 83, 1, 3, '2026-02-04');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (166, 5, 83, 3, 3, '2025-02-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (84, 'Mateo Young', '2003-10-12', 'Defender', 4, 'mateo.young.84@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (167, 5, 84, 1, 4, '2026-02-05');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (168, 5, 84, 3, 4, '2025-02-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (85, 'Asher Hill', '2004-01-14', 'Defender', 5, 'asher.hill.85@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (169, 5, 85, 1, 5, '2026-02-06');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (170, 5, 85, 3, 5, '2025-02-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (86, 'Mason Gonzalez', '1995-04-16', 'Defender', 6, 'mason.gonzalez.86@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (171, 5, 86, 1, 6, '2026-02-07');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (172, 5, 86, 3, 6, '2025-02-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (87, 'Sebastian Roberts', '1996-07-18', 'Defender', 7, 'sebastian.roberts.87@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (173, 5, 87, 1, 7, '2026-02-08');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (174, 5, 87, 3, 7, '2025-02-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (88, 'Owen Evans', '1997-10-20', 'Midfielder', 8, 'owen.evans.88@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (175, 5, 88, 1, 8, '2026-02-09');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (176, 5, 88, 3, 8, '2025-02-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (89, 'Wyatt Morris', '1998-01-22', 'Midfielder', 9, 'wyatt.morris.89@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (177, 5, 89, 1, 9, '2026-02-10');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (178, 5, 89, 3, 9, '2025-02-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (90, 'Grayson Bell', '1999-04-24', 'Midfielder', 10, 'grayson.bell.90@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (179, 5, 90, 1, 10, '2026-02-11');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (180, 5, 90, 3, 10, '2025-02-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (91, 'Gabriel Richardson', '2000-07-26', 'Midfielder', 11, 'gabriel.richardson.91@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (181, 5, 91, 1, 11, '2026-02-12');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (182, 5, 91, 3, 11, '2025-02-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (92, 'Jayden Peterson', '2001-10-01', 'Midfielder', 12, 'jayden.peterson.92@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (183, 5, 92, 1, 12, '2026-02-13');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (184, 5, 92, 3, 12, '2025-02-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (93, 'Nathan Kelly', '2002-01-03', 'Midfielder', 13, 'nathan.kelly.93@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (185, 5, 93, 1, 13, '2026-02-14');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (186, 5, 93, 3, 13, '2025-02-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (94, 'Tariq Anderson', '2003-04-05', 'Forward', 14, 'tariq.anderson.94@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (187, 5, 94, 1, 14, '2026-02-15');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (188, 5, 94, 3, 14, '2025-02-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (95, 'Marco Lewis', '2004-07-07', 'Forward', 15, 'marco.lewis.95@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (189, 5, 95, 1, 15, '2026-02-16');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (190, 5, 95, 3, 15, '2025-02-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (96, 'Liam Young', '1995-10-09', 'Forward', 16, 'liam.young.96@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (191, 5, 96, 1, 16, '2026-02-17');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (192, 5, 96, 3, 16, '2025-02-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (97, 'Elijah Hill', '1996-01-11', 'Forward', 17, 'elijah.hill.97@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (193, 5, 97, 1, 17, '2026-02-18');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (194, 5, 97, 3, 17, '2025-02-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (98, 'Levi Gonzalez', '1997-04-13', 'Forward', 18, 'levi.gonzalez.98@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (195, 5, 98, 1, 18, '2026-02-19');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (196, 5, 98, 3, 18, '2025-02-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (99, 'Leo Roberts', '1998-07-15', 'Midfielder', 19, 'leo.roberts.99@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (197, 5, 99, 1, 19, '2026-02-20');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (198, 5, 99, 3, 19, '2025-02-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (100, 'Logan Evans', '1999-10-17', 'Goalkeeper', 20, 'logan.evans.100@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (199, 5, 100, 1, 20, '2026-02-21');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (200, 5, 100, 3, 20, '2025-02-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (101, 'Oliver Lee', '2001-01-07', 'Goalkeeper', 1, 'oliver.lee.101@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (201, 6, 101, 1, 1, '2026-02-22');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (202, 6, 101, 3, 1, '2025-02-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (102, 'Lucas Hernandez', '2002-04-09', 'Defender', 2, 'lucas.hernandez.102@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (203, 6, 102, 1, 2, '2026-02-23');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (204, 6, 102, 3, 2, '2025-02-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (103, 'James Scott', '2003-07-11', 'Defender', 3, 'james.scott.103@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (205, 6, 103, 1, 3, '2026-02-24');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (206, 6, 103, 3, 3, '2025-02-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (104, 'Ethan Nelson', '2004-10-13', 'Defender', 4, 'ethan.nelson.104@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (207, 6, 104, 1, 4, '2026-02-25');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (208, 6, 104, 3, 4, '2025-02-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (105, 'Jack Turner', '1995-01-15', 'Defender', 5, 'jack.turner.105@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (209, 6, 105, 1, 5, '2026-02-26');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (210, 6, 105, 3, 5, '2025-02-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (106, 'Samuel Edwards', '1996-04-17', 'Defender', 6, 'samuel.edwards.106@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (211, 6, 106, 1, 6, '2026-02-02');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (212, 6, 106, 3, 6, '2025-02-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (107, 'Julian Rogers', '1997-07-19', 'Defender', 7, 'julian.rogers.107@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (213, 6, 107, 1, 7, '2026-02-03');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (214, 6, 107, 3, 7, '2025-02-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (108, 'Ezra Murphy', '1998-10-21', 'Midfielder', 8, 'ezra.murphy.108@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (215, 6, 108, 1, 8, '2026-02-04');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (216, 6, 108, 3, 8, '2025-02-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (109, 'Isaac Cox', '1999-01-23', 'Midfielder', 9, 'isaac.cox.109@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (217, 6, 109, 1, 9, '2026-02-05');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (218, 6, 109, 3, 9, '2025-02-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (110, 'Dylan Gray', '2000-04-25', 'Midfielder', 10, 'dylan.gray.110@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (219, 6, 110, 1, 10, '2026-02-06');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (220, 6, 110, 3, 10, '2025-02-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (111, 'Rohan Sanders', '2001-07-27', 'Midfielder', 11, 'rohan.sanders.111@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (221, 6, 111, 1, 11, '2026-02-07');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (222, 6, 111, 3, 11, '2025-02-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (112, 'Kieran Martinez', '2002-10-02', 'Midfielder', 12, 'kieran.martinez.112@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (223, 6, 112, 1, 12, '2026-02-08');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (224, 6, 112, 3, 12, '2025-02-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (113, 'Rafael Lee', '2003-01-04', 'Midfielder', 13, 'rafael.lee.113@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (225, 6, 113, 1, 13, '2026-02-09');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (226, 6, 113, 3, 13, '2025-02-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (114, 'Noah Hernandez', '2004-04-06', 'Forward', 14, 'noah.hernandez.114@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (227, 6, 114, 1, 14, '2026-02-10');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (228, 6, 114, 3, 14, '2025-02-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (115, 'Mateo Scott', '1995-07-08', 'Forward', 15, 'mateo.scott.115@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (229, 6, 115, 1, 15, '2026-02-11');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (230, 6, 115, 3, 15, '2025-02-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (116, 'Asher Nelson', '1996-10-10', 'Forward', 16, 'asher.nelson.116@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (231, 6, 116, 1, 16, '2026-02-12');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (232, 6, 116, 3, 16, '2025-02-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (117, 'Mason Turner', '1997-01-12', 'Forward', 17, 'mason.turner.117@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (233, 6, 117, 1, 17, '2026-02-13');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (234, 6, 117, 3, 17, '2025-02-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (118, 'Sebastian Edwards', '1998-04-14', 'Forward', 18, 'sebastian.edwards.118@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (235, 6, 118, 1, 18, '2026-02-14');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (236, 6, 118, 3, 18, '2025-02-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (119, 'Owen Rogers', '1999-07-16', 'Midfielder', 19, 'owen.rogers.119@usapremierleague.org', 'INJURED');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (237, 6, 119, 1, 19, '2026-02-15');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (238, 6, 119, 3, 19, '2025-02-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (120, 'Wyatt Murphy', '2000-10-18', 'Goalkeeper', 20, 'wyatt.murphy.120@usapremierleague.org', 'INACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (239, 6, 120, 1, 20, '2026-02-16');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (240, 6, 120, 3, 20, '2025-02-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (121, 'Chloe Green', '2002-01-08', 'Goalkeeper', 1, 'chloe.green.121@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (241, 7, 121, 1, 1, '2026-02-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (122, 'Eleanor Carter', '2003-04-10', 'Defender', 2, 'eleanor.carter.122@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (242, 7, 122, 1, 2, '2026-02-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (123, 'Riley Phillips', '2004-07-12', 'Defender', 3, 'riley.phillips.123@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (243, 7, 123, 1, 3, '2026-02-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (124, 'Lily Collins', '1995-10-14', 'Defender', 4, 'lily.collins.124@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (244, 7, 124, 1, 4, '2026-02-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (125, 'Emma Reed', '1996-01-16', 'Defender', 5, 'emma.reed.125@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (245, 7, 125, 1, 5, '2026-02-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (126, 'Sophia Bailey', '1997-04-18', 'Defender', 6, 'sophia.bailey.126@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (246, 7, 126, 1, 6, '2026-02-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (127, 'Ava Howard', '1998-07-20', 'Defender', 7, 'ava.howard.127@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (247, 7, 127, 1, 7, '2026-02-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (128, 'Harper Ramirez', '1999-10-22', 'Midfielder', 8, 'harper.ramirez.128@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (248, 7, 128, 1, 8, '2026-02-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (129, 'Abigail Price', '2000-01-24', 'Midfielder', 9, 'abigail.price.129@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (249, 7, 129, 1, 9, '2026-02-25');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (130, 'Scarlett Robinson', '2001-04-26', 'Midfielder', 10, 'scarlett.robinson.130@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (250, 7, 130, 1, 10, '2026-02-26');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (131, 'Chloe Walker', '2002-07-01', 'Midfielder', 11, 'chloe.walker.131@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (251, 7, 131, 1, 11, '2026-02-02');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (132, 'Eleanor King', '2003-10-03', 'Midfielder', 12, 'eleanor.king.132@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (252, 7, 132, 1, 12, '2026-02-03');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (133, 'Riley Green', '2004-01-05', 'Midfielder', 13, 'riley.green.133@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (253, 7, 133, 1, 13, '2026-02-04');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (134, 'Lily Carter', '1995-04-07', 'Forward', 14, 'lily.carter.134@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (254, 7, 134, 1, 14, '2026-02-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (135, 'Emma Phillips', '1996-07-09', 'Forward', 15, 'emma.phillips.135@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (255, 7, 135, 1, 15, '2026-02-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (136, 'Sophia Collins', '1997-10-11', 'Forward', 16, 'sophia.collins.136@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (256, 7, 136, 1, 16, '2026-02-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (137, 'Ava Reed', '1998-01-13', 'Forward', 17, 'ava.reed.137@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (257, 7, 137, 1, 17, '2026-02-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (138, 'Harper Bailey', '1999-04-15', 'Forward', 18, 'harper.bailey.138@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (258, 7, 138, 1, 18, '2026-02-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (139, 'Abigail Howard', '2000-07-17', 'Midfielder', 19, 'abigail.howard.139@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (259, 7, 139, 1, 19, '2026-02-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (140, 'Scarlett Ramirez', '2001-10-19', 'Goalkeeper', 20, 'scarlett.ramirez.140@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (260, 7, 140, 1, 20, '2026-02-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (141, 'Zoey Campbell', '2003-01-09', 'Goalkeeper', 1, 'zoey.campbell.141@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (261, 8, 141, 1, 1, '2026-02-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (142, 'Addison Stewart', '2004-04-11', 'Defender', 2, 'addison.stewart.142@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (262, 8, 142, 1, 2, '2026-02-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (143, 'Charlotte Cook', '1995-07-13', 'Defender', 3, 'charlotte.cook.143@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (263, 8, 143, 1, 3, '2026-02-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (144, 'Mia Rivera', '1996-10-15', 'Defender', 4, 'mia.rivera.144@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (264, 8, 144, 1, 4, '2026-02-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (145, 'Evelyn Ward', '1997-01-17', 'Defender', 5, 'evelyn.ward.145@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (265, 8, 145, 1, 5, '2026-02-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (146, 'Camila Watson', '1998-04-19', 'Defender', 6, 'camila.watson.146@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (266, 8, 146, 1, 6, '2026-02-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (147, 'Ella Bennett', '1999-07-21', 'Defender', 7, 'ella.bennett.147@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (267, 8, 147, 1, 7, '2026-02-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (148, 'Penelope Clark', '2000-10-23', 'Midfielder', 8, 'penelope.clark.148@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (268, 8, 148, 1, 8, '2026-02-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (149, 'Victoria Hall', '2001-01-25', 'Midfielder', 9, 'victoria.hall.149@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (269, 8, 149, 1, 9, '2026-02-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (150, 'Grace Wright', '2002-04-27', 'Midfielder', 10, 'grace.wright.150@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (270, 8, 150, 1, 10, '2026-02-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (151, 'Zoey Adams', '2003-07-02', 'Midfielder', 11, 'zoey.adams.151@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (271, 8, 151, 1, 11, '2026-02-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (152, 'Addison Mitchell', '2004-10-04', 'Midfielder', 12, 'addison.mitchell.152@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (272, 8, 152, 1, 12, '2026-02-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (153, 'Charlotte Campbell', '1995-01-06', 'Midfielder', 13, 'charlotte.campbell.153@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (273, 8, 153, 1, 13, '2026-02-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (154, 'Mia Stewart', '1996-04-08', 'Forward', 14, 'mia.stewart.154@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (274, 8, 154, 1, 14, '2026-02-25');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (155, 'Evelyn Cook', '1997-07-10', 'Forward', 15, 'evelyn.cook.155@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (275, 8, 155, 1, 15, '2026-02-26');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (156, 'Camila Rivera', '1998-10-12', 'Forward', 16, 'camila.rivera.156@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (276, 8, 156, 1, 16, '2026-02-02');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (157, 'Ella Ward', '1999-01-14', 'Forward', 17, 'ella.ward.157@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (277, 8, 157, 1, 17, '2026-02-03');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (158, 'Penelope Watson', '2000-04-16', 'Forward', 18, 'penelope.watson.158@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (278, 8, 158, 1, 18, '2026-02-04');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (159, 'Victoria Bennett', '2001-07-18', 'Midfielder', 19, 'victoria.bennett.159@usapremierleague.org', 'INJURED');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (279, 8, 159, 1, 19, '2026-02-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (160, 'Grace Clark', '2002-10-20', 'Goalkeeper', 20, 'grace.clark.160@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (280, 8, 160, 1, 20, '2026-02-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (161, 'Amelia Morgan', '2004-01-10', 'Goalkeeper', 1, 'amelia.morgan.161@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (281, 9, 161, 1, 1, '2026-02-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (162, 'Isabella Cooper', '1995-04-12', 'Defender', 2, 'isabella.cooper.162@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (282, 9, 162, 1, 2, '2026-02-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (163, 'Luna Torres', '1996-07-14', 'Defender', 3, 'luna.torres.163@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (283, 9, 163, 1, 3, '2026-02-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (164, 'Gianna Brooks', '1997-10-16', 'Defender', 4, 'gianna.brooks.164@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (284, 9, 164, 1, 4, '2026-02-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (165, 'Aria Wood', '1998-01-18', 'Defender', 5, 'aria.wood.165@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (285, 9, 165, 1, 5, '2026-02-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (166, 'Layla Rodriguez', '1999-04-20', 'Defender', 6, 'layla.rodriguez.166@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (286, 9, 166, 1, 6, '2026-02-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (167, 'Madison Allen', '2000-07-22', 'Defender', 7, 'madison.allen.167@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (287, 9, 167, 1, 7, '2026-02-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (168, 'Nora Lopez', '2001-10-24', 'Midfielder', 8, 'nora.lopez.168@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (288, 9, 168, 1, 8, '2026-02-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (169, 'Hannah Baker', '2002-01-26', 'Midfielder', 9, 'hannah.baker.169@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (289, 9, 169, 1, 9, '2026-02-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (170, 'Olivia Perez', '2003-04-01', 'Midfielder', 10, 'olivia.perez.170@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (290, 9, 170, 1, 10, '2026-02-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (171, 'Amelia Parker', '2004-07-03', 'Midfielder', 11, 'amelia.parker.171@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (291, 9, 171, 1, 11, '2026-02-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (172, 'Isabella Sanchez', '1995-10-05', 'Midfielder', 12, 'isabella.sanchez.172@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (292, 9, 172, 1, 12, '2026-02-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (173, 'Luna Morgan', '1996-01-07', 'Midfielder', 13, 'luna.morgan.173@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (293, 9, 173, 1, 13, '2026-03-02');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (174, 'Gianna Cooper', '1997-04-09', 'Forward', 14, 'gianna.cooper.174@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (294, 9, 174, 1, 14, '2026-03-03');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (175, 'Aria Torres', '1998-07-11', 'Forward', 15, 'aria.torres.175@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (295, 9, 175, 1, 15, '2026-03-04');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (176, 'Layla Brooks', '1999-10-13', 'Forward', 16, 'layla.brooks.176@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (296, 9, 176, 1, 16, '2026-03-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (177, 'Madison Wood', '2000-01-15', 'Forward', 17, 'madison.wood.177@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (297, 9, 177, 1, 17, '2026-03-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (178, 'Nora Rodriguez', '2001-04-17', 'Forward', 18, 'nora.rodriguez.178@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (298, 9, 178, 1, 18, '2026-03-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (179, 'Hannah Allen', '2002-07-19', 'Midfielder', 19, 'hannah.allen.179@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (299, 9, 179, 1, 19, '2026-03-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (180, 'Olivia Lopez', '2003-10-21', 'Goalkeeper', 20, 'olivia.lopez.180@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (300, 9, 180, 1, 20, '2026-03-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (181, 'Harper Peterson', '1995-01-11', 'Goalkeeper', 1, 'harper.peterson.181@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (301, 10, 181, 1, 1, '2026-03-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (182, 'Abigail Kelly', '1996-04-13', 'Defender', 2, 'abigail.kelly.182@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (302, 10, 182, 1, 2, '2026-03-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (183, 'Scarlett Anderson', '1997-07-15', 'Defender', 3, 'scarlett.anderson.183@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (303, 10, 183, 1, 3, '2026-03-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (184, 'Chloe Lewis', '1998-10-17', 'Defender', 4, 'chloe.lewis.184@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (304, 10, 184, 1, 4, '2026-03-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (185, 'Eleanor Young', '1999-01-19', 'Defender', 5, 'eleanor.young.185@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (305, 10, 185, 1, 5, '2026-03-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (186, 'Riley Hill', '2000-04-21', 'Defender', 6, 'riley.hill.186@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (306, 10, 186, 1, 6, '2026-03-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (187, 'Lily Gonzalez', '2001-07-23', 'Defender', 7, 'lily.gonzalez.187@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (307, 10, 187, 1, 7, '2026-03-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (188, 'Emma Roberts', '2002-10-25', 'Midfielder', 8, 'emma.roberts.188@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (308, 10, 188, 1, 8, '2026-03-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (189, 'Sophia Evans', '2003-01-27', 'Midfielder', 9, 'sophia.evans.189@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (309, 10, 189, 1, 9, '2026-03-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (190, 'Ava Morris', '2004-04-02', 'Midfielder', 10, 'ava.morris.190@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (310, 10, 190, 1, 10, '2026-03-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (191, 'Harper Bell', '1995-07-04', 'Midfielder', 11, 'harper.bell.191@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (311, 10, 191, 1, 11, '2026-03-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (192, 'Abigail Richardson', '1996-10-06', 'Midfielder', 12, 'abigail.richardson.192@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (312, 10, 192, 1, 12, '2026-03-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (193, 'Scarlett Peterson', '1997-01-08', 'Midfielder', 13, 'scarlett.peterson.193@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (313, 10, 193, 1, 13, '2026-03-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (194, 'Chloe Kelly', '1998-04-10', 'Forward', 14, 'chloe.kelly.194@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (314, 10, 194, 1, 14, '2026-03-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (195, 'Eleanor Anderson', '1999-07-12', 'Forward', 15, 'eleanor.anderson.195@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (315, 10, 195, 1, 15, '2026-03-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (196, 'Riley Lewis', '2000-10-14', 'Forward', 16, 'riley.lewis.196@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (316, 10, 196, 1, 16, '2026-03-25');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (197, 'Lily Young', '2001-01-16', 'Forward', 17, 'lily.young.197@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (317, 10, 197, 1, 17, '2026-03-26');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (198, 'Emma Hill', '2002-04-18', 'Forward', 18, 'emma.hill.198@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (318, 10, 198, 1, 18, '2026-03-27');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (199, 'Sophia Gonzalez', '2003-07-20', 'Midfielder', 19, 'sophia.gonzalez.199@usapremierleague.org', 'INJURED');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (319, 10, 199, 1, 19, '2026-03-28');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (200, 'Ava Roberts', '2004-10-22', 'Goalkeeper', 20, 'ava.roberts.200@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (320, 10, 200, 1, 20, '2026-03-02');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (201, 'Penelope Martinez', '1996-01-12', 'Goalkeeper', 1, 'penelope.martinez.201@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (321, 11, 201, 1, 1, '2026-03-03');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (202, 'Victoria Lee', '1997-04-14', 'Defender', 2, 'victoria.lee.202@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (322, 11, 202, 1, 2, '2026-03-04');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (203, 'Grace Hernandez', '1998-07-16', 'Defender', 3, 'grace.hernandez.203@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (323, 11, 203, 1, 3, '2026-03-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (204, 'Zoey Scott', '1999-10-18', 'Defender', 4, 'zoey.scott.204@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (324, 11, 204, 1, 4, '2026-03-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (205, 'Addison Nelson', '2000-01-20', 'Defender', 5, 'addison.nelson.205@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (325, 11, 205, 1, 5, '2026-03-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (206, 'Charlotte Turner', '2001-04-22', 'Defender', 6, 'charlotte.turner.206@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (326, 11, 206, 1, 6, '2026-03-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (207, 'Mia Edwards', '2002-07-24', 'Defender', 7, 'mia.edwards.207@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (327, 11, 207, 1, 7, '2026-03-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (208, 'Evelyn Rogers', '2003-10-26', 'Midfielder', 8, 'evelyn.rogers.208@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (328, 11, 208, 1, 8, '2026-03-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (209, 'Camila Murphy', '2004-01-01', 'Midfielder', 9, 'camila.murphy.209@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (329, 11, 209, 1, 9, '2026-03-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (210, 'Ella Cox', '1995-04-03', 'Midfielder', 10, 'ella.cox.210@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (330, 11, 210, 1, 10, '2026-03-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (211, 'Penelope Gray', '1996-07-05', 'Midfielder', 11, 'penelope.gray.211@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (331, 11, 211, 1, 11, '2026-03-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (212, 'Victoria Sanders', '1997-10-07', 'Midfielder', 12, 'victoria.sanders.212@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (332, 11, 212, 1, 12, '2026-03-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (213, 'Grace Martinez', '1998-01-09', 'Midfielder', 13, 'grace.martinez.213@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (333, 11, 213, 1, 13, '2026-03-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (214, 'Zoey Lee', '1999-04-11', 'Forward', 14, 'zoey.lee.214@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (334, 11, 214, 1, 14, '2026-03-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (215, 'Addison Hernandez', '2000-07-13', 'Forward', 15, 'addison.hernandez.215@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (335, 11, 215, 1, 15, '2026-03-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (216, 'Charlotte Scott', '2001-10-15', 'Forward', 16, 'charlotte.scott.216@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (336, 11, 216, 1, 16, '2026-03-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (217, 'Mia Nelson', '2002-01-17', 'Forward', 17, 'mia.nelson.217@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (337, 11, 217, 1, 17, '2026-03-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (218, 'Evelyn Turner', '2003-04-19', 'Forward', 18, 'evelyn.turner.218@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (338, 11, 218, 1, 18, '2026-03-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (219, 'Camila Edwards', '2004-07-21', 'Midfielder', 19, 'camila.edwards.219@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (339, 11, 219, 1, 19, '2026-03-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (220, 'Ella Rogers', '1995-10-23', 'Goalkeeper', 20, 'ella.rogers.220@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (340, 11, 220, 1, 20, '2026-03-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (221, 'Nora King', '1997-01-13', 'Goalkeeper', 1, 'nora.king.221@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (341, 12, 221, 1, 1, '2026-03-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (222, 'Hannah Green', '1998-04-15', 'Defender', 2, 'hannah.green.222@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (342, 12, 222, 1, 2, '2026-03-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (223, 'Olivia Carter', '1999-07-17', 'Defender', 3, 'olivia.carter.223@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (343, 12, 223, 1, 3, '2026-03-25');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (224, 'Amelia Phillips', '2000-10-19', 'Defender', 4, 'amelia.phillips.224@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (344, 12, 224, 1, 4, '2026-03-26');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (225, 'Isabella Collins', '2001-01-21', 'Defender', 5, 'isabella.collins.225@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (345, 12, 225, 1, 5, '2026-03-27');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (226, 'Luna Reed', '2002-04-23', 'Defender', 6, 'luna.reed.226@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (346, 12, 226, 1, 6, '2026-03-28');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (227, 'Gianna Bailey', '2003-07-25', 'Defender', 7, 'gianna.bailey.227@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (347, 12, 227, 1, 7, '2026-03-02');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (228, 'Aria Howard', '2004-10-27', 'Midfielder', 8, 'aria.howard.228@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (348, 12, 228, 1, 8, '2026-03-03');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (229, 'Layla Ramirez', '1995-01-02', 'Midfielder', 9, 'layla.ramirez.229@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (349, 12, 229, 1, 9, '2026-03-04');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (230, 'Madison Price', '1996-04-04', 'Midfielder', 10, 'madison.price.230@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (350, 12, 230, 1, 10, '2026-03-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (231, 'Nora Robinson', '1997-07-06', 'Midfielder', 11, 'nora.robinson.231@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (351, 12, 231, 1, 11, '2026-03-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (232, 'Hannah Walker', '1998-10-08', 'Midfielder', 12, 'hannah.walker.232@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (352, 12, 232, 1, 12, '2026-03-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (233, 'Olivia King', '1999-01-10', 'Midfielder', 13, 'olivia.king.233@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (353, 12, 233, 1, 13, '2026-03-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (234, 'Amelia Green', '2000-04-12', 'Forward', 14, 'amelia.green.234@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (354, 12, 234, 1, 14, '2026-03-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (235, 'Isabella Carter', '2001-07-14', 'Forward', 15, 'isabella.carter.235@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (355, 12, 235, 1, 15, '2026-03-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (236, 'Luna Phillips', '2002-10-16', 'Forward', 16, 'luna.phillips.236@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (356, 12, 236, 1, 16, '2026-03-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (237, 'Gianna Collins', '2003-01-18', 'Forward', 17, 'gianna.collins.237@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (357, 12, 237, 1, 17, '2026-03-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (238, 'Aria Reed', '2004-04-20', 'Forward', 18, 'aria.reed.238@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (358, 12, 238, 1, 18, '2026-03-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (239, 'Layla Bailey', '1995-07-22', 'Midfielder', 19, 'layla.bailey.239@usapremierleague.org', 'INJURED');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (359, 12, 239, 1, 19, '2026-03-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (240, 'Madison Howard', '1996-10-24', 'Goalkeeper', 20, 'madison.howard.240@usapremierleague.org', 'INACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (360, 12, 240, 1, 20, '2026-03-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (241, 'Ethan Mitchell', '1998-01-14', 'Goalkeeper', 1, 'ethan.mitchell.241@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (361, 13, 241, 2, 1, '2026-03-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (242, 'Jack Campbell', '1999-04-16', 'Defender', 2, 'jack.campbell.242@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (362, 13, 242, 2, 2, '2026-03-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (243, 'Samuel Stewart', '2000-07-18', 'Defender', 3, 'samuel.stewart.243@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (363, 13, 243, 2, 3, '2026-03-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (244, 'Julian Cook', '2001-10-20', 'Defender', 4, 'julian.cook.244@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (364, 13, 244, 2, 4, '2026-03-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (245, 'Ezra Rivera', '2002-01-22', 'Defender', 5, 'ezra.rivera.245@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (365, 13, 245, 2, 5, '2026-03-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (246, 'Isaac Ward', '2003-04-24', 'Defender', 6, 'isaac.ward.246@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (366, 13, 246, 2, 6, '2026-03-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (247, 'Dylan Watson', '2004-07-26', 'Defender', 7, 'dylan.watson.247@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (367, 13, 247, 2, 7, '2026-03-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (248, 'Rohan Bennett', '1995-10-01', 'Midfielder', 8, 'rohan.bennett.248@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (368, 13, 248, 2, 8, '2026-03-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (249, 'Kieran Clark', '1996-01-03', 'Midfielder', 9, 'kieran.clark.249@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (369, 13, 249, 2, 9, '2026-03-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (250, 'Rafael Hall', '1997-04-05', 'Midfielder', 10, 'rafael.hall.250@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (370, 13, 250, 2, 10, '2026-03-25');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (251, 'Noah Wright', '1998-07-07', 'Midfielder', 11, 'noah.wright.251@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (371, 13, 251, 2, 11, '2026-03-26');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (252, 'Mateo Adams', '1999-10-09', 'Midfielder', 12, 'mateo.adams.252@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (372, 13, 252, 2, 12, '2026-03-27');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (253, 'Asher Mitchell', '2000-01-11', 'Midfielder', 13, 'asher.mitchell.253@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (373, 13, 253, 2, 13, '2026-03-28');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (254, 'Mason Campbell', '2001-04-13', 'Forward', 14, 'mason.campbell.254@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (374, 13, 254, 2, 14, '2026-03-02');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (255, 'Sebastian Stewart', '2002-07-15', 'Forward', 15, 'sebastian.stewart.255@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (375, 13, 255, 2, 15, '2026-03-03');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (256, 'Owen Cook', '2003-10-17', 'Forward', 16, 'owen.cook.256@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (376, 13, 256, 2, 16, '2026-03-04');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (257, 'Wyatt Rivera', '2004-01-19', 'Forward', 17, 'wyatt.rivera.257@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (377, 13, 257, 2, 17, '2026-03-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (258, 'Grayson Ward', '1995-04-21', 'Forward', 18, 'grayson.ward.258@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (378, 13, 258, 2, 18, '2026-03-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (259, 'Gabriel Watson', '1996-07-23', 'Midfielder', 19, 'gabriel.watson.259@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (379, 13, 259, 2, 19, '2026-03-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (260, 'Jayden Bennett', '1997-10-25', 'Goalkeeper', 20, 'jayden.bennett.260@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (380, 13, 260, 2, 20, '2026-03-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (261, 'Jacob Sanchez', '1999-01-15', 'Goalkeeper', 1, 'jacob.sanchez.261@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (381, 14, 261, 2, 1, '2026-03-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (262, 'Hudson Morgan', '2000-04-17', 'Defender', 2, 'hudson.morgan.262@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (382, 14, 262, 2, 2, '2026-03-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (263, 'Caleb Cooper', '2001-07-19', 'Defender', 3, 'caleb.cooper.263@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (383, 14, 263, 2, 3, '2026-03-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (264, 'Carter Torres', '2002-10-21', 'Defender', 4, 'carter.torres.264@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (384, 14, 264, 2, 4, '2026-03-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (265, 'Adrian Brooks', '2003-01-23', 'Defender', 5, 'adrian.brooks.265@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (385, 14, 265, 2, 5, '2026-03-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (266, 'Arjun Wood', '2004-04-25', 'Defender', 6, 'arjun.wood.266@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (386, 14, 266, 2, 6, '2026-03-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (267, 'Declan Rodriguez', '1995-07-27', 'Defender', 7, 'declan.rodriguez.267@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (387, 14, 267, 2, 7, '2026-03-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (268, 'Soren Allen', '1996-10-02', 'Midfielder', 8, 'soren.allen.268@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (388, 14, 268, 2, 8, '2026-03-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (269, 'Oliver Lopez', '1997-01-04', 'Midfielder', 9, 'oliver.lopez.269@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (389, 14, 269, 2, 9, '2026-03-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (270, 'Lucas Baker', '1998-04-06', 'Midfielder', 10, 'lucas.baker.270@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (390, 14, 270, 2, 10, '2026-03-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (271, 'James Perez', '1999-07-08', 'Midfielder', 11, 'james.perez.271@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (391, 14, 271, 2, 11, '2026-03-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (272, 'Ethan Parker', '2000-10-10', 'Midfielder', 12, 'ethan.parker.272@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (392, 14, 272, 2, 12, '2026-03-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (273, 'Jack Sanchez', '2001-01-12', 'Midfielder', 13, 'jack.sanchez.273@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (393, 14, 273, 2, 13, '2026-03-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (274, 'Samuel Morgan', '2002-04-14', 'Forward', 14, 'samuel.morgan.274@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (394, 14, 274, 2, 14, '2026-03-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (275, 'Julian Cooper', '2003-07-16', 'Forward', 15, 'julian.cooper.275@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (395, 14, 275, 2, 15, '2026-03-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (276, 'Ezra Torres', '2004-10-18', 'Forward', 16, 'ezra.torres.276@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (396, 14, 276, 2, 16, '2026-03-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (277, 'Isaac Brooks', '1995-01-20', 'Forward', 17, 'isaac.brooks.277@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (397, 14, 277, 2, 17, '2026-03-25');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (278, 'Dylan Wood', '1996-04-22', 'Forward', 18, 'dylan.wood.278@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (398, 14, 278, 2, 18, '2026-03-26');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (279, 'Rohan Rodriguez', '1997-07-24', 'Midfielder', 19, 'rohan.rodriguez.279@usapremierleague.org', 'INJURED');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (399, 14, 279, 2, 19, '2026-03-27');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (280, 'Kieran Allen', '1998-10-26', 'Goalkeeper', 20, 'kieran.allen.280@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (400, 14, 280, 2, 20, '2026-03-28');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (281, 'Gabriel Richardson', '2000-01-16', 'Goalkeeper', 1, 'gabriel.richardson.281@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (401, 15, 281, 2, 1, '2026-04-02');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (282, 'Jayden Peterson', '2001-04-18', 'Defender', 2, 'jayden.peterson.282@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (402, 15, 282, 2, 2, '2026-04-03');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (283, 'Nathan Kelly', '2002-07-20', 'Defender', 3, 'nathan.kelly.283@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (403, 15, 283, 2, 3, '2026-04-04');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (284, 'Tariq Anderson', '2003-10-22', 'Defender', 4, 'tariq.anderson.284@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (404, 15, 284, 2, 4, '2026-04-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (285, 'Marco Lewis', '2004-01-24', 'Defender', 5, 'marco.lewis.285@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (405, 15, 285, 2, 5, '2026-04-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (286, 'Liam Young', '1995-04-26', 'Defender', 6, 'liam.young.286@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (406, 15, 286, 2, 6, '2026-04-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (287, 'Elijah Hill', '1996-07-01', 'Defender', 7, 'elijah.hill.287@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (407, 15, 287, 2, 7, '2026-04-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (288, 'Levi Gonzalez', '1997-10-03', 'Midfielder', 8, 'levi.gonzalez.288@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (408, 15, 288, 2, 8, '2026-04-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (289, 'Leo Roberts', '1998-01-05', 'Midfielder', 9, 'leo.roberts.289@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (409, 15, 289, 2, 9, '2026-04-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (290, 'Logan Evans', '1999-04-07', 'Midfielder', 10, 'logan.evans.290@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (410, 15, 290, 2, 10, '2026-04-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (291, 'Aiden Morris', '2000-07-09', 'Midfielder', 11, 'aiden.morris.291@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (411, 15, 291, 2, 11, '2026-04-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (292, 'Jacob Bell', '2001-10-11', 'Midfielder', 12, 'jacob.bell.292@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (412, 15, 292, 2, 12, '2026-04-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (293, 'Hudson Richardson', '2002-01-13', 'Midfielder', 13, 'hudson.richardson.293@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (413, 15, 293, 2, 13, '2026-04-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (294, 'Caleb Peterson', '2003-04-15', 'Forward', 14, 'caleb.peterson.294@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (414, 15, 294, 2, 14, '2026-04-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (295, 'Carter Kelly', '2004-07-17', 'Forward', 15, 'carter.kelly.295@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (415, 15, 295, 2, 15, '2026-04-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (296, 'Adrian Anderson', '1995-10-19', 'Forward', 16, 'adrian.anderson.296@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (416, 15, 296, 2, 16, '2026-04-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (297, 'Arjun Lewis', '1996-01-21', 'Forward', 17, 'arjun.lewis.297@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (417, 15, 297, 2, 17, '2026-04-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (298, 'Declan Young', '1997-04-23', 'Forward', 18, 'declan.young.298@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (418, 15, 298, 2, 18, '2026-04-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (299, 'Soren Hill', '1998-07-25', 'Midfielder', 19, 'soren.hill.299@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (419, 15, 299, 2, 19, '2026-04-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (300, 'Oliver Gonzalez', '1999-10-27', 'Goalkeeper', 20, 'oliver.gonzalez.300@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (420, 15, 300, 2, 20, '2026-04-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (301, 'Rohan Sanders', '2001-01-17', 'Goalkeeper', 1, 'rohan.sanders.301@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (421, 16, 301, 2, 1, '2026-04-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (302, 'Kieran Martinez', '2002-04-19', 'Defender', 2, 'kieran.martinez.302@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (422, 16, 302, 2, 2, '2026-04-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (303, 'Rafael Lee', '2003-07-21', 'Defender', 3, 'rafael.lee.303@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (423, 16, 303, 2, 3, '2026-04-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (304, 'Noah Hernandez', '2004-10-23', 'Defender', 4, 'noah.hernandez.304@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (424, 16, 304, 2, 4, '2026-04-25');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (305, 'Mateo Scott', '1995-01-25', 'Defender', 5, 'mateo.scott.305@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (425, 16, 305, 2, 5, '2026-04-26');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (306, 'Asher Nelson', '1996-04-27', 'Defender', 6, 'asher.nelson.306@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (426, 16, 306, 2, 6, '2026-04-27');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (307, 'Mason Turner', '1997-07-02', 'Defender', 7, 'mason.turner.307@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (427, 16, 307, 2, 7, '2026-04-02');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (308, 'Sebastian Edwards', '1998-10-04', 'Midfielder', 8, 'sebastian.edwards.308@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (428, 16, 308, 2, 8, '2026-04-03');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (309, 'Owen Rogers', '1999-01-06', 'Midfielder', 9, 'owen.rogers.309@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (429, 16, 309, 2, 9, '2026-04-04');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (310, 'Wyatt Murphy', '2000-04-08', 'Midfielder', 10, 'wyatt.murphy.310@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (430, 16, 310, 2, 10, '2026-04-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (311, 'Grayson Cox', '2001-07-10', 'Midfielder', 11, 'grayson.cox.311@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (431, 16, 311, 2, 11, '2026-04-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (312, 'Gabriel Gray', '2002-10-12', 'Midfielder', 12, 'gabriel.gray.312@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (432, 16, 312, 2, 12, '2026-04-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (313, 'Jayden Sanders', '2003-01-14', 'Midfielder', 13, 'jayden.sanders.313@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (433, 16, 313, 2, 13, '2026-04-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (314, 'Nathan Martinez', '2004-04-16', 'Forward', 14, 'nathan.martinez.314@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (434, 16, 314, 2, 14, '2026-04-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (315, 'Tariq Lee', '1995-07-18', 'Forward', 15, 'tariq.lee.315@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (435, 16, 315, 2, 15, '2026-04-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (316, 'Marco Hernandez', '1996-10-20', 'Forward', 16, 'marco.hernandez.316@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (436, 16, 316, 2, 16, '2026-04-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (317, 'Liam Scott', '1997-01-22', 'Forward', 17, 'liam.scott.317@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (437, 16, 317, 2, 17, '2026-04-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (318, 'Elijah Nelson', '1998-04-24', 'Forward', 18, 'elijah.nelson.318@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (438, 16, 318, 2, 18, '2026-04-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (319, 'Levi Turner', '1999-07-26', 'Midfielder', 19, 'levi.turner.319@usapremierleague.org', 'INJURED');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (439, 16, 319, 2, 19, '2026-04-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (320, 'Leo Edwards', '2000-10-01', 'Goalkeeper', 20, 'leo.edwards.320@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (440, 16, 320, 2, 20, '2026-04-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (321, 'Soren Walker', '2002-01-18', 'Goalkeeper', 1, 'soren.walker.321@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (441, 17, 321, 2, 1, '2026-04-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (322, 'Oliver King', '2003-04-20', 'Defender', 2, 'oliver.king.322@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (442, 17, 322, 2, 2, '2026-04-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (323, 'Lucas Green', '2004-07-22', 'Defender', 3, 'lucas.green.323@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (443, 17, 323, 2, 3, '2026-04-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (324, 'James Carter', '1995-10-24', 'Defender', 4, 'james.carter.324@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (444, 17, 324, 2, 4, '2026-04-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (325, 'Ethan Phillips', '1996-01-26', 'Defender', 5, 'ethan.phillips.325@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (445, 17, 325, 2, 5, '2026-04-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (326, 'Jack Collins', '1997-04-01', 'Defender', 6, 'jack.collins.326@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (446, 17, 326, 2, 6, '2026-04-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (327, 'Samuel Reed', '1998-07-03', 'Defender', 7, 'samuel.reed.327@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (447, 17, 327, 2, 7, '2026-04-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (328, 'Julian Bailey', '1999-10-05', 'Midfielder', 8, 'julian.bailey.328@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (448, 17, 328, 2, 8, '2026-04-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (329, 'Ezra Howard', '2000-01-07', 'Midfielder', 9, 'ezra.howard.329@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (449, 17, 329, 2, 9, '2026-04-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (330, 'Isaac Ramirez', '2001-04-09', 'Midfielder', 10, 'isaac.ramirez.330@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (450, 17, 330, 2, 10, '2026-04-25');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (331, 'Dylan Price', '2002-07-11', 'Midfielder', 11, 'dylan.price.331@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (451, 17, 331, 2, 11, '2026-04-26');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (332, 'Rohan Robinson', '2003-10-13', 'Midfielder', 12, 'rohan.robinson.332@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (452, 17, 332, 2, 12, '2026-04-27');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (333, 'Kieran Walker', '2004-01-15', 'Midfielder', 13, 'kieran.walker.333@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (453, 17, 333, 2, 13, '2026-04-02');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (334, 'Rafael King', '1995-04-17', 'Forward', 14, 'rafael.king.334@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (454, 17, 334, 2, 14, '2026-04-03');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (335, 'Noah Green', '1996-07-19', 'Forward', 15, 'noah.green.335@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (455, 17, 335, 2, 15, '2026-04-04');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (336, 'Mateo Carter', '1997-10-21', 'Forward', 16, 'mateo.carter.336@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (456, 17, 336, 2, 16, '2026-04-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (337, 'Asher Phillips', '1998-01-23', 'Forward', 17, 'asher.phillips.337@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (457, 17, 337, 2, 17, '2026-04-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (338, 'Mason Collins', '1999-04-25', 'Forward', 18, 'mason.collins.338@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (458, 17, 338, 2, 18, '2026-04-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (339, 'Sebastian Reed', '2000-07-27', 'Midfielder', 19, 'sebastian.reed.339@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (459, 17, 339, 2, 19, '2026-04-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (340, 'Owen Bailey', '2001-10-02', 'Goalkeeper', 20, 'owen.bailey.340@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (460, 17, 340, 2, 20, '2026-04-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (341, 'Levi Adams', '2003-01-19', 'Goalkeeper', 1, 'levi.adams.341@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (461, 18, 341, 2, 1, '2026-04-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (342, 'Leo Mitchell', '2004-04-21', 'Defender', 2, 'leo.mitchell.342@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (462, 18, 342, 2, 2, '2026-04-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (343, 'Logan Campbell', '1995-07-23', 'Defender', 3, 'logan.campbell.343@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (463, 18, 343, 2, 3, '2026-04-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (344, 'Aiden Stewart', '1996-10-25', 'Defender', 4, 'aiden.stewart.344@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (464, 18, 344, 2, 4, '2026-04-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (345, 'Jacob Cook', '1997-01-27', 'Defender', 5, 'jacob.cook.345@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (465, 18, 345, 2, 5, '2026-04-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (346, 'Hudson Rivera', '1998-04-02', 'Defender', 6, 'hudson.rivera.346@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (466, 18, 346, 2, 6, '2026-04-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (347, 'Caleb Ward', '1999-07-04', 'Defender', 7, 'caleb.ward.347@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (467, 18, 347, 2, 7, '2026-04-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (348, 'Carter Watson', '2000-10-06', 'Midfielder', 8, 'carter.watson.348@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (468, 18, 348, 2, 8, '2026-04-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (349, 'Adrian Bennett', '2001-01-08', 'Midfielder', 9, 'adrian.bennett.349@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (469, 18, 349, 2, 9, '2026-04-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (350, 'Arjun Clark', '2002-04-10', 'Midfielder', 10, 'arjun.clark.350@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (470, 18, 350, 2, 10, '2026-04-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (351, 'Declan Hall', '2003-07-12', 'Midfielder', 11, 'declan.hall.351@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (471, 18, 351, 2, 11, '2026-04-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (352, 'Soren Wright', '2004-10-14', 'Midfielder', 12, 'soren.wright.352@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (472, 18, 352, 2, 12, '2026-04-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (353, 'Oliver Adams', '1995-01-16', 'Midfielder', 13, 'oliver.adams.353@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (473, 18, 353, 2, 13, '2026-04-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (354, 'Lucas Mitchell', '1996-04-18', 'Forward', 14, 'lucas.mitchell.354@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (474, 18, 354, 2, 14, '2026-04-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (355, 'James Campbell', '1997-07-20', 'Forward', 15, 'james.campbell.355@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (475, 18, 355, 2, 15, '2026-04-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (356, 'Ethan Stewart', '1998-10-22', 'Forward', 16, 'ethan.stewart.356@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (476, 18, 356, 2, 16, '2026-04-25');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (357, 'Jack Cook', '1999-01-24', 'Forward', 17, 'jack.cook.357@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (477, 18, 357, 2, 17, '2026-04-26');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (358, 'Samuel Rivera', '2000-04-26', 'Forward', 18, 'samuel.rivera.358@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (478, 18, 358, 2, 18, '2026-04-27');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (359, 'Julian Ward', '2001-07-01', 'Midfielder', 19, 'julian.ward.359@usapremierleague.org', 'INJURED');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (479, 18, 359, 2, 19, '2026-04-02');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (360, 'Ezra Watson', '2002-10-03', 'Goalkeeper', 20, 'ezra.watson.360@usapremierleague.org', 'INACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (480, 18, 360, 2, 20, '2026-04-03');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (361, 'Sebastian Parker', '2008-01-20', 'Goalkeeper', 1, 'sebastian.parker.361@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (481, 19, 361, 2, 1, '2026-04-04');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (362, 'Owen Sanchez', '2009-04-22', 'Defender', 2, 'owen.sanchez.362@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (482, 19, 362, 2, 2, '2026-04-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (363, 'Wyatt Morgan', '2010-07-24', 'Defender', 3, 'wyatt.morgan.363@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (483, 19, 363, 2, 3, '2026-04-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (364, 'Grayson Cooper', '2008-10-26', 'Defender', 4, 'grayson.cooper.364@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (484, 19, 364, 2, 4, '2026-04-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (365, 'Gabriel Torres', '2009-01-01', 'Defender', 5, 'gabriel.torres.365@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (485, 19, 365, 2, 5, '2026-04-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (366, 'Jayden Brooks', '2010-04-03', 'Defender', 6, 'jayden.brooks.366@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (486, 19, 366, 2, 6, '2026-04-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (367, 'Nathan Wood', '2008-07-05', 'Defender', 7, 'nathan.wood.367@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (487, 19, 367, 2, 7, '2026-04-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (368, 'Tariq Rodriguez', '2009-10-07', 'Midfielder', 8, 'tariq.rodriguez.368@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (488, 19, 368, 2, 8, '2026-04-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (369, 'Marco Allen', '2010-01-09', 'Midfielder', 9, 'marco.allen.369@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (489, 19, 369, 2, 9, '2026-04-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (370, 'Liam Lopez', '2008-04-11', 'Midfielder', 10, 'liam.lopez.370@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (490, 19, 370, 2, 10, '2026-04-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (371, 'Elijah Baker', '2009-07-13', 'Midfielder', 11, 'elijah.baker.371@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (491, 19, 371, 2, 11, '2026-04-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (372, 'Levi Perez', '2010-10-15', 'Midfielder', 12, 'levi.perez.372@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (492, 19, 372, 2, 12, '2026-04-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (373, 'Leo Parker', '2008-01-17', 'Midfielder', 13, 'leo.parker.373@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (493, 19, 373, 2, 13, '2026-04-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (374, 'Logan Sanchez', '2009-04-19', 'Forward', 14, 'logan.sanchez.374@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (494, 19, 374, 2, 14, '2026-04-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (375, 'Aiden Morgan', '2010-07-21', 'Forward', 15, 'aiden.morgan.375@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (495, 19, 375, 2, 15, '2026-04-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (376, 'Jacob Cooper', '2008-10-23', 'Forward', 16, 'jacob.cooper.376@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (496, 19, 376, 2, 16, '2026-04-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (377, 'Hudson Torres', '2009-01-25', 'Forward', 17, 'hudson.torres.377@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (497, 19, 377, 2, 17, '2026-04-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (378, 'Caleb Brooks', '2010-04-27', 'Forward', 18, 'caleb.brooks.378@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (498, 19, 378, 2, 18, '2026-04-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (379, 'Carter Wood', '2008-07-02', 'Midfielder', 19, 'carter.wood.379@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (499, 19, 379, 2, 19, '2026-05-02');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (380, 'Adrian Rodriguez', '2009-10-04', 'Goalkeeper', 20, 'adrian.rodriguez.380@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (500, 19, 380, 2, 20, '2026-05-03');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (381, 'Julian Bell', '2008-01-21', 'Goalkeeper', 1, 'julian.bell.381@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (501, 20, 381, 2, 1, '2026-05-04');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (382, 'Ezra Richardson', '2009-04-23', 'Defender', 2, 'ezra.richardson.382@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (502, 20, 382, 2, 2, '2026-05-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (383, 'Isaac Peterson', '2010-07-25', 'Defender', 3, 'isaac.peterson.383@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (503, 20, 383, 2, 3, '2026-05-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (384, 'Dylan Kelly', '2008-10-27', 'Defender', 4, 'dylan.kelly.384@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (504, 20, 384, 2, 4, '2026-05-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (385, 'Rohan Anderson', '2009-01-02', 'Defender', 5, 'rohan.anderson.385@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (505, 20, 385, 2, 5, '2026-05-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (386, 'Kieran Lewis', '2010-04-04', 'Defender', 6, 'kieran.lewis.386@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (506, 20, 386, 2, 6, '2026-05-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (387, 'Rafael Young', '2008-07-06', 'Defender', 7, 'rafael.young.387@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (507, 20, 387, 2, 7, '2026-05-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (388, 'Noah Hill', '2009-10-08', 'Midfielder', 8, 'noah.hill.388@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (508, 20, 388, 2, 8, '2026-05-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (389, 'Mateo Gonzalez', '2010-01-10', 'Midfielder', 9, 'mateo.gonzalez.389@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (509, 20, 389, 2, 9, '2026-05-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (390, 'Asher Roberts', '2008-04-12', 'Midfielder', 10, 'asher.roberts.390@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (510, 20, 390, 2, 10, '2026-05-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (391, 'Mason Evans', '2009-07-14', 'Midfielder', 11, 'mason.evans.391@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (511, 20, 391, 2, 11, '2026-05-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (392, 'Sebastian Morris', '2010-10-16', 'Midfielder', 12, 'sebastian.morris.392@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (512, 20, 392, 2, 12, '2026-05-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (393, 'Owen Bell', '2008-01-18', 'Midfielder', 13, 'owen.bell.393@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (513, 20, 393, 2, 13, '2026-05-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (394, 'Wyatt Richardson', '2009-04-20', 'Forward', 14, 'wyatt.richardson.394@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (514, 20, 394, 2, 14, '2026-05-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (395, 'Grayson Peterson', '2010-07-22', 'Forward', 15, 'grayson.peterson.395@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (515, 20, 395, 2, 15, '2026-05-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (396, 'Gabriel Kelly', '2008-10-24', 'Forward', 16, 'gabriel.kelly.396@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (516, 20, 396, 2, 16, '2026-05-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (397, 'Jayden Anderson', '2009-01-26', 'Forward', 17, 'jayden.anderson.397@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (517, 20, 397, 2, 17, '2026-05-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (398, 'Nathan Lewis', '2010-04-01', 'Forward', 18, 'nathan.lewis.398@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (518, 20, 398, 2, 18, '2026-05-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (399, 'Tariq Young', '2008-07-03', 'Midfielder', 19, 'tariq.young.399@usapremierleague.org', 'INJURED');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (519, 20, 399, 2, 19, '2026-05-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (400, 'Marco Hill', '2009-10-05', 'Goalkeeper', 20, 'marco.hill.400@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (520, 20, 400, 2, 20, '2026-05-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (401, 'Carter Gray', '2008-01-22', 'Goalkeeper', 1, 'carter.gray.401@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (521, 21, 401, 2, 1, '2026-05-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (402, 'Adrian Sanders', '2009-04-24', 'Defender', 2, 'adrian.sanders.402@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (522, 21, 402, 2, 2, '2026-05-25');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (403, 'Arjun Martinez', '2010-07-26', 'Defender', 3, 'arjun.martinez.403@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (523, 21, 403, 2, 3, '2026-05-26');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (404, 'Declan Lee', '2008-10-01', 'Defender', 4, 'declan.lee.404@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (524, 21, 404, 2, 4, '2026-05-27');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (405, 'Soren Hernandez', '2009-01-03', 'Defender', 5, 'soren.hernandez.405@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (525, 21, 405, 2, 5, '2026-05-28');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (406, 'Oliver Scott', '2010-04-05', 'Defender', 6, 'oliver.scott.406@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (526, 21, 406, 2, 6, '2026-05-02');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (407, 'Lucas Nelson', '2008-07-07', 'Defender', 7, 'lucas.nelson.407@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (527, 21, 407, 2, 7, '2026-05-03');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (408, 'James Turner', '2009-10-09', 'Midfielder', 8, 'james.turner.408@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (528, 21, 408, 2, 8, '2026-05-04');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (409, 'Ethan Edwards', '2010-01-11', 'Midfielder', 9, 'ethan.edwards.409@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (529, 21, 409, 2, 9, '2026-05-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (410, 'Jack Rogers', '2008-04-13', 'Midfielder', 10, 'jack.rogers.410@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (530, 21, 410, 2, 10, '2026-05-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (411, 'Samuel Murphy', '2009-07-15', 'Midfielder', 11, 'samuel.murphy.411@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (531, 21, 411, 2, 11, '2026-05-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (412, 'Julian Cox', '2010-10-17', 'Midfielder', 12, 'julian.cox.412@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (532, 21, 412, 2, 12, '2026-05-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (413, 'Ezra Gray', '2008-01-19', 'Midfielder', 13, 'ezra.gray.413@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (533, 21, 413, 2, 13, '2026-05-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (414, 'Isaac Sanders', '2009-04-21', 'Forward', 14, 'isaac.sanders.414@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (534, 21, 414, 2, 14, '2026-05-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (415, 'Dylan Martinez', '2010-07-23', 'Forward', 15, 'dylan.martinez.415@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (535, 21, 415, 2, 15, '2026-05-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (416, 'Rohan Lee', '2008-10-25', 'Forward', 16, 'rohan.lee.416@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (536, 21, 416, 2, 16, '2026-05-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (417, 'Kieran Hernandez', '2009-01-27', 'Forward', 17, 'kieran.hernandez.417@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (537, 21, 417, 2, 17, '2026-05-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (418, 'Rafael Scott', '2010-04-02', 'Forward', 18, 'rafael.scott.418@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (538, 21, 418, 2, 18, '2026-05-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (419, 'Noah Nelson', '2008-07-04', 'Midfielder', 19, 'noah.nelson.419@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (539, 21, 419, 2, 19, '2026-05-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (420, 'Mateo Turner', '2009-10-06', 'Goalkeeper', 20, 'mateo.turner.420@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (540, 21, 420, 2, 20, '2026-05-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (421, 'Tariq Robinson', '2008-01-23', 'Goalkeeper', 1, 'tariq.robinson.421@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (541, 22, 421, 2, 1, '2026-05-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (422, 'Marco Walker', '2009-04-25', 'Defender', 2, 'marco.walker.422@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (542, 22, 422, 2, 2, '2026-05-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (423, 'Liam King', '2010-07-27', 'Defender', 3, 'liam.king.423@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (543, 22, 423, 2, 3, '2026-05-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (424, 'Elijah Green', '2008-10-02', 'Defender', 4, 'elijah.green.424@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (544, 22, 424, 2, 4, '2026-05-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (425, 'Levi Carter', '2009-01-04', 'Defender', 5, 'levi.carter.425@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (545, 22, 425, 2, 5, '2026-05-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (426, 'Leo Phillips', '2010-04-06', 'Defender', 6, 'leo.phillips.426@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (546, 22, 426, 2, 6, '2026-05-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (427, 'Logan Collins', '2008-07-08', 'Defender', 7, 'logan.collins.427@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (547, 22, 427, 2, 7, '2026-05-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (428, 'Aiden Reed', '2009-10-10', 'Midfielder', 8, 'aiden.reed.428@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (548, 22, 428, 2, 8, '2026-05-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (429, 'Jacob Bailey', '2010-01-12', 'Midfielder', 9, 'jacob.bailey.429@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (549, 22, 429, 2, 9, '2026-05-25');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (430, 'Hudson Howard', '2008-04-14', 'Midfielder', 10, 'hudson.howard.430@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (550, 22, 430, 2, 10, '2026-05-26');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (431, 'Caleb Ramirez', '2009-07-16', 'Midfielder', 11, 'caleb.ramirez.431@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (551, 22, 431, 2, 11, '2026-05-27');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (432, 'Carter Price', '2010-10-18', 'Midfielder', 12, 'carter.price.432@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (552, 22, 432, 2, 12, '2026-05-28');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (433, 'Adrian Robinson', '2008-01-20', 'Midfielder', 13, 'adrian.robinson.433@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (553, 22, 433, 2, 13, '2026-05-02');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (434, 'Arjun Walker', '2009-04-22', 'Forward', 14, 'arjun.walker.434@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (554, 22, 434, 2, 14, '2026-05-03');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (435, 'Declan King', '2010-07-24', 'Forward', 15, 'declan.king.435@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (555, 22, 435, 2, 15, '2026-05-04');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (436, 'Soren Green', '2008-10-26', 'Forward', 16, 'soren.green.436@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (556, 22, 436, 2, 16, '2026-05-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (437, 'Oliver Carter', '2009-01-01', 'Forward', 17, 'oliver.carter.437@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (557, 22, 437, 2, 17, '2026-05-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (438, 'Lucas Phillips', '2010-04-03', 'Forward', 18, 'lucas.phillips.438@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (558, 22, 438, 2, 18, '2026-05-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (439, 'James Collins', '2008-07-05', 'Midfielder', 19, 'james.collins.439@usapremierleague.org', 'INJURED');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (559, 22, 439, 2, 19, '2026-05-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (440, 'Ethan Reed', '2009-10-07', 'Goalkeeper', 20, 'ethan.reed.440@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (560, 22, 440, 2, 20, '2026-05-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (441, 'Noah Wright', '2008-01-24', 'Goalkeeper', 1, 'noah.wright.441@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (561, 23, 441, 2, 1, '2026-05-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (442, 'Mateo Adams', '2009-04-26', 'Defender', 2, 'mateo.adams.442@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (562, 23, 442, 2, 2, '2026-05-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (443, 'Asher Mitchell', '2010-07-01', 'Defender', 3, 'asher.mitchell.443@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (563, 23, 443, 2, 3, '2026-05-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (444, 'Mason Campbell', '2008-10-03', 'Defender', 4, 'mason.campbell.444@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (564, 23, 444, 2, 4, '2026-05-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (445, 'Sebastian Stewart', '2009-01-05', 'Defender', 5, 'sebastian.stewart.445@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (565, 23, 445, 2, 5, '2026-05-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (446, 'Owen Cook', '2010-04-07', 'Defender', 6, 'owen.cook.446@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (566, 23, 446, 2, 6, '2026-05-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (447, 'Wyatt Rivera', '2008-07-09', 'Defender', 7, 'wyatt.rivera.447@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (567, 23, 447, 2, 7, '2026-05-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (448, 'Grayson Ward', '2009-10-11', 'Midfielder', 8, 'grayson.ward.448@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (568, 23, 448, 2, 8, '2026-05-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (449, 'Gabriel Watson', '2010-01-13', 'Midfielder', 9, 'gabriel.watson.449@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (569, 23, 449, 2, 9, '2026-05-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (450, 'Jayden Bennett', '2008-04-15', 'Midfielder', 10, 'jayden.bennett.450@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (570, 23, 450, 2, 10, '2026-05-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (451, 'Nathan Clark', '2009-07-17', 'Midfielder', 11, 'nathan.clark.451@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (571, 23, 451, 2, 11, '2026-05-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (452, 'Tariq Hall', '2010-10-19', 'Midfielder', 12, 'tariq.hall.452@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (572, 23, 452, 2, 12, '2026-05-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (453, 'Marco Wright', '2008-01-21', 'Midfielder', 13, 'marco.wright.453@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (573, 23, 453, 2, 13, '2026-05-22');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (454, 'Liam Adams', '2009-04-23', 'Forward', 14, 'liam.adams.454@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (574, 23, 454, 2, 14, '2026-05-23');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (455, 'Elijah Mitchell', '2010-07-25', 'Forward', 15, 'elijah.mitchell.455@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (575, 23, 455, 2, 15, '2026-05-24');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (456, 'Levi Campbell', '2008-10-27', 'Forward', 16, 'levi.campbell.456@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (576, 23, 456, 2, 16, '2026-05-25');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (457, 'Leo Stewart', '2009-01-02', 'Forward', 17, 'leo.stewart.457@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (577, 23, 457, 2, 17, '2026-05-26');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (458, 'Logan Cook', '2010-04-04', 'Forward', 18, 'logan.cook.458@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (578, 23, 458, 2, 18, '2026-05-27');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (459, 'Aiden Rivera', '2008-07-06', 'Midfielder', 19, 'aiden.rivera.459@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (579, 23, 459, 2, 19, '2026-05-28');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (460, 'Jacob Ward', '2009-10-08', 'Goalkeeper', 20, 'jacob.ward.460@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (580, 23, 460, 2, 20, '2026-05-02');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (461, 'James Perez', '2008-01-25', 'Goalkeeper', 1, 'james.perez.461@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (581, 24, 461, 2, 1, '2026-05-03');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (462, 'Ethan Parker', '2009-04-27', 'Defender', 2, 'ethan.parker.462@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (582, 24, 462, 2, 2, '2026-05-04');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (463, 'Jack Sanchez', '2010-07-02', 'Defender', 3, 'jack.sanchez.463@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (583, 24, 463, 2, 3, '2026-05-05');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (464, 'Samuel Morgan', '2008-10-04', 'Defender', 4, 'samuel.morgan.464@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (584, 24, 464, 2, 4, '2026-05-06');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (465, 'Julian Cooper', '2009-01-06', 'Defender', 5, 'julian.cooper.465@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (585, 24, 465, 2, 5, '2026-05-07');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (466, 'Ezra Torres', '2010-04-08', 'Defender', 6, 'ezra.torres.466@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (586, 24, 466, 2, 6, '2026-05-08');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (467, 'Isaac Brooks', '2008-07-10', 'Defender', 7, 'isaac.brooks.467@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (587, 24, 467, 2, 7, '2026-05-09');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (468, 'Dylan Wood', '2009-10-12', 'Midfielder', 8, 'dylan.wood.468@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (588, 24, 468, 2, 8, '2026-05-10');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (469, 'Rohan Rodriguez', '2010-01-14', 'Midfielder', 9, 'rohan.rodriguez.469@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (589, 24, 469, 2, 9, '2026-05-11');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (470, 'Kieran Allen', '2008-04-16', 'Midfielder', 10, 'kieran.allen.470@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (590, 24, 470, 2, 10, '2026-05-12');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (471, 'Rafael Lopez', '2009-07-18', 'Midfielder', 11, 'rafael.lopez.471@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (591, 24, 471, 2, 11, '2026-05-13');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (472, 'Noah Baker', '2010-10-20', 'Midfielder', 12, 'noah.baker.472@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (592, 24, 472, 2, 12, '2026-05-14');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (473, 'Mateo Perez', '2008-01-22', 'Midfielder', 13, 'mateo.perez.473@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (593, 24, 473, 2, 13, '2026-05-15');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (474, 'Asher Parker', '2009-04-24', 'Forward', 14, 'asher.parker.474@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (594, 24, 474, 2, 14, '2026-05-16');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (475, 'Mason Sanchez', '2010-07-26', 'Forward', 15, 'mason.sanchez.475@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (595, 24, 475, 2, 15, '2026-05-17');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (476, 'Sebastian Morgan', '2008-10-01', 'Forward', 16, 'sebastian.morgan.476@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (596, 24, 476, 2, 16, '2026-05-18');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (477, 'Owen Cooper', '2009-01-03', 'Forward', 17, 'owen.cooper.477@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (597, 24, 477, 2, 17, '2026-05-19');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (478, 'Wyatt Torres', '2010-04-05', 'Forward', 18, 'wyatt.torres.478@usapremierleague.org', 'ACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (598, 24, 478, 2, 18, '2026-05-20');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (479, 'Grayson Brooks', '2008-07-07', 'Midfielder', 19, 'grayson.brooks.479@usapremierleague.org', 'INJURED');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (599, 24, 479, 2, 19, '2026-05-21');
INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (480, 'Gabriel Wood', '2009-10-09', 'Goalkeeper', 20, 'gabriel.wood.480@usapremierleague.org', 'INACTIVE');
INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (600, 24, 480, 2, 20, '2026-05-22');

-- 9. Player Availability Records
INSERT INTO PLAYER_AVAILABILITY (availability_id, player_id, from_date, to_date, reason) VALUES (1, 39, '2026-11-10', '2026-12-05', 'Hamstring rehabilitation');
INSERT INTO PLAYER_AVAILABILITY (availability_id, player_id, from_date, to_date, reason) VALUES (2, 79, '2026-11-10', '2026-12-05', 'Hamstring rehabilitation');
INSERT INTO PLAYER_AVAILABILITY (availability_id, player_id, from_date, to_date, reason) VALUES (3, 119, '2026-11-10', '2026-12-05', 'Hamstring rehabilitation');
INSERT INTO PLAYER_AVAILABILITY (availability_id, player_id, from_date, to_date, reason) VALUES (4, 159, '2026-11-10', '2026-12-05', 'Hamstring rehabilitation');
INSERT INTO PLAYER_AVAILABILITY (availability_id, player_id, from_date, to_date, reason) VALUES (5, 199, '2026-11-10', '2026-12-05', 'Hamstring rehabilitation');
INSERT INTO PLAYER_AVAILABILITY (availability_id, player_id, from_date, to_date, reason) VALUES (6, 239, '2026-11-10', '2026-12-05', 'Hamstring rehabilitation');
INSERT INTO PLAYER_AVAILABILITY (availability_id, player_id, from_date, to_date, reason) VALUES (7, 279, '2026-11-10', '2026-12-05', 'Hamstring rehabilitation');
INSERT INTO PLAYER_AVAILABILITY (availability_id, player_id, from_date, to_date, reason) VALUES (8, 319, '2026-11-10', '2026-12-05', 'Hamstring rehabilitation');
INSERT INTO PLAYER_AVAILABILITY (availability_id, player_id, from_date, to_date, reason) VALUES (9, 359, '2026-11-10', '2026-12-05', 'Hamstring rehabilitation');
INSERT INTO PLAYER_AVAILABILITY (availability_id, player_id, from_date, to_date, reason) VALUES (10, 399, '2026-11-10', '2026-12-05', 'Hamstring rehabilitation');
INSERT INTO PLAYER_AVAILABILITY (availability_id, player_id, from_date, to_date, reason) VALUES (11, 439, '2026-11-10', '2026-12-05', 'Hamstring rehabilitation');
INSERT INTO PLAYER_AVAILABILITY (availability_id, player_id, from_date, to_date, reason) VALUES (12, 479, '2026-11-10', '2026-12-05', 'Hamstring rehabilitation');

-- 10. Matches (72: 36 Completed, 36 Scheduled)
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (1, 1, 12, 1, 12, 1, '2026-09-05', '14:00', 1, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (2, 1, 11, 2, 11, 2, '2026-09-06', '16:30', 1, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (3, 1, 10, 3, 10, 3, '2026-09-12', '19:00', 1, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (4, 1, 9, 4, 9, 4, '2026-09-13', '20:30', 1, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (5, 1, 8, 5, 8, 5, '2026-09-19', '14:00', 1, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (6, 1, 7, 6, 7, 6, '2026-09-20', '16:30', 1, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (7, 1, 1, 11, 1, 7, '2026-10-03', '19:00', 2, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (8, 1, 12, 10, 12, 8, '2026-10-04', '20:30', 2, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (9, 1, 2, 9, 2, 9, '2026-10-10', '14:00', 2, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (10, 1, 3, 8, 3, 1, '2026-10-11', '16:30', 2, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (11, 1, 4, 7, 4, 2, '2026-10-17', '19:00', 2, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (12, 1, 5, 6, 5, 3, '2026-10-18', '20:30', 2, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (13, 1, 10, 1, 10, 4, '2026-11-01', '14:00', 3, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (14, 1, 9, 11, 9, 5, '2026-11-02', '16:30', 3, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (15, 1, 8, 12, 8, 6, '2026-11-07', '19:00', 3, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (16, 1, 7, 2, 7, 7, '2026-11-08', '20:30', 3, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (17, 1, 6, 3, 6, 8, '2026-11-14', '14:00', 3, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (18, 1, 5, 4, 5, 9, '2026-11-15', '16:30', 3, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (19, 1, 1, 9, 1, 1, '2026-11-25', '19:00', 4, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (20, 1, 10, 8, 10, 2, '2026-11-26', '20:30', 4, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (21, 1, 11, 7, 11, 3, '2026-11-28', '14:00', 4, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (22, 1, 12, 6, 12, 4, '2026-11-29', '16:30', 4, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (23, 1, 2, 5, 2, 5, '2026-12-01', '19:00', 4, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (24, 1, 3, 4, 3, 6, '2026-12-02', '20:30', 4, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (25, 1, 8, 1, 8, 7, '2026-12-05', '14:00', 5, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (26, 1, 7, 9, 7, 8, '2026-12-06', '16:30', 5, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (27, 1, 6, 10, 6, 9, '2026-12-08', '19:00', 5, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (28, 1, 5, 11, 5, 1, '2026-12-09', '20:30', 5, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (29, 1, 4, 12, 4, 2, '2026-12-12', '14:00', 5, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (30, 1, 3, 2, 3, 3, '2026-12-13', '16:30', 5, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (31, 1, 1, 7, 1, 4, '2026-12-15', '19:00', 6, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (32, 1, 8, 6, 8, 5, '2026-12-16', '20:30', 6, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (33, 1, 9, 5, 9, 6, '2026-12-18', '14:00', 6, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (34, 1, 10, 4, 10, 7, '2026-12-19', '16:30', 6, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (35, 1, 11, 3, 11, 8, '2026-12-20', '19:00', 6, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (36, 1, 12, 2, 12, 9, '2026-12-21', '20:30', 6, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (37, 2, 24, 13, 12, 4, '2026-10-24', '16:30', 1, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (38, 2, 23, 14, 11, 5, '2026-10-25', '19:00', 1, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (39, 2, 22, 15, 10, 6, '2026-11-03', '20:30', 1, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (40, 2, 21, 16, 9, 7, '2026-11-09', '14:00', 1, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (41, 2, 20, 17, 8, 8, '2026-11-16', '16:30', 1, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (42, 2, 19, 18, 7, 9, '2026-11-17', '19:00', 1, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (43, 2, 13, 23, 1, 1, '2026-11-27', '20:30', 2, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (44, 2, 24, 22, 12, 2, '2026-11-27', '14:00', 2, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (45, 2, 14, 21, 2, 3, '2026-11-30', '16:30', 2, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (46, 2, 15, 20, 3, 4, '2026-11-30', '19:00', 2, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (47, 2, 16, 19, 4, 5, '2026-12-03', '20:30', 2, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (48, 2, 17, 18, 5, 6, '2026-12-03', '14:00', 2, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (49, 2, 22, 13, 10, 7, '2026-12-04', '16:30', 3, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (50, 2, 21, 23, 9, 8, '2026-12-07', '19:00', 3, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (51, 2, 20, 24, 8, 9, '2026-12-10', '20:30', 3, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (52, 2, 19, 14, 7, 1, '2026-12-11', '14:00', 3, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (53, 2, 18, 15, 6, 2, '2026-12-14', '16:30', 3, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (54, 2, 17, 16, 5, 3, '2026-12-14', '19:00', 3, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (55, 2, 13, 21, 1, 4, '2026-12-17', '20:30', 4, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (56, 2, 22, 20, 10, 5, '2026-12-17', '14:00', 4, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (57, 2, 23, 19, 11, 6, '2026-12-18', '16:30', 4, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (58, 2, 24, 18, 12, 7, '2026-12-19', '19:00', 4, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (59, 2, 14, 17, 2, 8, '2026-12-20', '20:30', 4, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (60, 2, 15, 16, 3, 9, '2026-12-21', '14:00', 4, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (61, 3, 6, 1, 11, 3, '2025-04-10', '14:00', 1, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (62, 3, 5, 2, 10, 4, '2025-04-17', '16:30', 1, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (63, 3, 4, 3, 9, 5, '2025-04-24', '19:00', 1, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (64, 3, 1, 5, 6, 6, '2025-05-10', '20:30', 2, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (65, 3, 6, 4, 11, 7, '2025-05-17', '14:00', 2, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (66, 3, 2, 3, 7, 8, '2025-05-24', '16:30', 2, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (67, 3, 4, 1, 9, 9, '2025-06-10', '19:00', 3, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (68, 3, 3, 5, 8, 1, '2025-06-17', '20:30', 3, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (69, 3, 2, 6, 7, 2, '2025-06-24', '14:00', 3, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (70, 3, 1, 3, 6, 3, '2025-07-10', '16:30', 4, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (71, 3, 4, 2, 9, 4, '2025-07-17', '19:00', 4, 'SCHEDULED');
INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (72, 3, 5, 6, 10, 5, '2025-07-24', '20:30', 4, 'SCHEDULED');

-- 11. Match Results, Player Statistics, Disciplinary Records & Standings
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (1, 1, 0, 2, 1, '2026-09-05 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 1;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (1, 1, 234, 12, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (2, 1, 235, 12, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (3, 1, 236, 12, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (4, 1, 237, 12, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (5, 1, 14, 1, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (6, 1, 15, 1, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (7, 1, 16, 1, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (8, 1, 17, 1, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (2, 2, 2, 2, NULL, '2026-09-06 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 2;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (9, 2, 214, 11, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (10, 2, 215, 11, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (11, 2, 216, 11, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (12, 2, 217, 11, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (13, 2, 34, 2, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (14, 2, 35, 2, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (15, 2, 36, 2, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (16, 2, 37, 2, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (3, 3, 0, 2, 3, '2026-09-12 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 3;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (17, 3, 194, 10, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (18, 3, 195, 10, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (19, 3, 196, 10, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (20, 3, 197, 10, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (21, 3, 54, 3, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (22, 3, 55, 3, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (23, 3, 56, 3, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (24, 3, 57, 3, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (4, 4, 2, 2, NULL, '2026-09-13 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 4;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (25, 4, 174, 9, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (26, 4, 175, 9, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (27, 4, 176, 9, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (28, 4, 177, 9, 0, 0, 1, 0, 90);
INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (1, 177, 4, 'Reckless tactical foul', 'YELLOW', 0, '2026-09-13');
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (29, 4, 74, 4, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (30, 4, 75, 4, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (31, 4, 76, 4, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (32, 4, 77, 4, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (5, 5, 0, 2, 5, '2026-09-19 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 5;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (33, 5, 154, 8, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (34, 5, 155, 8, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (35, 5, 156, 8, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (36, 5, 157, 8, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (37, 5, 94, 5, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (38, 5, 95, 5, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (39, 5, 96, 5, 0, 0, 1, 0, 90);
INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (2, 96, 5, 'Unsporting dissent', 'YELLOW', 0, '2026-09-19');
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (40, 5, 97, 5, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (6, 6, 2, 2, NULL, '2026-09-20 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 6;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (41, 6, 134, 7, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (42, 6, 135, 7, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (43, 6, 136, 7, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (44, 6, 137, 7, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (45, 6, 114, 6, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (46, 6, 115, 6, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (47, 6, 116, 6, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (48, 6, 117, 6, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (7, 7, 2, 1, 1, '2026-10-03 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 7;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (49, 7, 14, 1, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (50, 7, 15, 1, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (51, 7, 16, 1, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (52, 7, 17, 1, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (53, 7, 214, 11, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (54, 7, 215, 11, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (55, 7, 216, 11, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (56, 7, 217, 11, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (8, 8, 3, 0, 12, '2026-10-04 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 8;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (57, 8, 234, 12, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (58, 8, 235, 12, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (59, 8, 236, 12, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (60, 8, 237, 12, 0, 0, 1, 0, 90);
INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (3, 237, 8, 'Reckless tactical foul', 'YELLOW', 0, '2026-10-04');
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (61, 8, 194, 10, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (62, 8, 195, 10, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (63, 8, 196, 10, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (64, 8, 197, 10, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (9, 9, 3, 2, 2, '2026-10-10 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 9;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (65, 9, 34, 2, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (66, 9, 35, 2, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (67, 9, 36, 2, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (68, 9, 37, 2, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (69, 9, 174, 9, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (70, 9, 175, 9, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (71, 9, 176, 9, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (72, 9, 177, 9, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (10, 10, 3, 1, 3, '2026-10-11 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 10;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (73, 10, 54, 3, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (74, 10, 55, 3, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (75, 10, 56, 3, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (76, 10, 57, 3, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (77, 10, 154, 8, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (78, 10, 155, 8, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (79, 10, 156, 8, 0, 0, 1, 0, 90);
INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (4, 156, 10, 'Unsporting dissent', 'YELLOW', 0, '2026-10-11');
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (80, 10, 157, 8, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (11, 11, 3, 0, 4, '2026-10-17 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 11;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (81, 11, 74, 4, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (82, 11, 75, 4, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (83, 11, 76, 4, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (84, 11, 77, 4, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (85, 11, 134, 7, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (86, 11, 135, 7, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (87, 11, 136, 7, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (88, 11, 137, 7, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (12, 12, 2, 2, NULL, '2026-10-18 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 12;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (89, 12, 94, 5, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (90, 12, 95, 5, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (91, 12, 96, 5, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (92, 12, 97, 5, 0, 0, 1, 1, 90);
INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (5, 97, 12, 'Reckless tactical foul', 'YELLOW', 0, '2026-10-18');
INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (6, 97, 12, 'Serious foul play', 'RED', 2, '2026-10-18');
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (93, 12, 114, 6, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (94, 12, 115, 6, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (95, 12, 116, 6, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (96, 12, 117, 6, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (13, 13, 2, 2, NULL, '2026-11-01 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 13;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (97, 13, 194, 10, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (98, 13, 195, 10, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (99, 13, 196, 10, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (100, 13, 197, 10, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (101, 13, 14, 1, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (102, 13, 15, 1, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (103, 13, 16, 1, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (104, 13, 17, 1, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (14, 14, 0, 2, 11, '2026-11-02 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 14;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (105, 14, 174, 9, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (106, 14, 175, 9, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (107, 14, 176, 9, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (108, 14, 177, 9, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (109, 14, 214, 11, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (110, 14, 215, 11, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (111, 14, 216, 11, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (112, 14, 217, 11, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (15, 15, 2, 2, NULL, '2026-11-07 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 15;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (113, 15, 154, 8, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (114, 15, 155, 8, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (115, 15, 156, 8, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (116, 15, 157, 8, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (117, 15, 234, 12, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (118, 15, 235, 12, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (119, 15, 236, 12, 0, 0, 1, 0, 90);
INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (7, 236, 15, 'Unsporting dissent', 'YELLOW', 0, '2026-11-07');
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (120, 15, 237, 12, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (16, 16, 0, 1, 2, '2026-11-08 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 16;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (121, 16, 134, 7, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (122, 16, 135, 7, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (123, 16, 136, 7, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (124, 16, 137, 7, 0, 0, 1, 0, 90);
INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (8, 137, 16, 'Reckless tactical foul', 'YELLOW', 0, '2026-11-08');
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (125, 16, 34, 2, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (126, 16, 35, 2, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (127, 16, 36, 2, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (128, 16, 37, 2, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (17, 17, 2, 1, 6, '2026-11-14 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 17;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (129, 17, 114, 6, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (130, 17, 115, 6, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (131, 17, 116, 6, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (132, 17, 117, 6, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (133, 17, 54, 3, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (134, 17, 55, 3, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (135, 17, 56, 3, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (136, 17, 57, 3, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (18, 18, 0, 1, 4, '2026-11-15 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 18;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (137, 18, 94, 5, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (138, 18, 95, 5, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (139, 18, 96, 5, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (140, 18, 88, 5, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (141, 18, 74, 4, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (142, 18, 75, 4, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (143, 18, 76, 4, 0, 0, 0, 1, 90);
INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (9, 76, 18, 'Violent conduct', 'RED', 2, '2026-11-15');
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (144, 18, 77, 4, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (19, 37, 1, 1, NULL, '2026-10-24 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 37;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (145, 37, 474, 24, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (146, 37, 475, 24, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (147, 37, 476, 24, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (148, 37, 477, 24, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (149, 37, 254, 13, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (150, 37, 255, 13, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (151, 37, 256, 13, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (152, 37, 257, 13, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (20, 38, 1, 1, NULL, '2026-10-25 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 38;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (153, 38, 454, 23, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (154, 38, 455, 23, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (155, 38, 456, 23, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (156, 38, 457, 23, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (157, 38, 274, 14, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (158, 38, 275, 14, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (159, 38, 276, 14, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (160, 38, 277, 14, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (21, 39, 1, 1, NULL, '2026-11-03 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 39;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (161, 39, 434, 22, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (162, 39, 435, 22, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (163, 39, 436, 22, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (164, 39, 437, 22, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (165, 39, 294, 15, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (166, 39, 295, 15, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (167, 39, 296, 15, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (168, 39, 297, 15, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (22, 40, 1, 1, NULL, '2026-11-09 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 40;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (169, 40, 414, 21, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (170, 40, 415, 21, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (171, 40, 416, 21, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (172, 40, 417, 21, 0, 0, 1, 0, 90);
INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (10, 417, 40, 'Reckless tactical foul', 'YELLOW', 0, '2026-11-09');
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (173, 40, 314, 16, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (174, 40, 315, 16, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (175, 40, 316, 16, 0, 0, 1, 0, 90);
INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (11, 316, 40, 'Unsporting dissent', 'YELLOW', 0, '2026-11-09');
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (176, 40, 317, 16, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (23, 41, 1, 1, NULL, '2026-11-16 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 41;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (177, 41, 394, 20, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (178, 41, 395, 20, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (179, 41, 396, 20, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (180, 41, 397, 20, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (181, 41, 334, 17, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (182, 41, 335, 17, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (183, 41, 336, 17, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (184, 41, 337, 17, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (24, 42, 1, 1, NULL, '2026-11-17 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 42;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (185, 42, 374, 19, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (186, 42, 375, 19, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (187, 42, 376, 19, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (188, 42, 377, 19, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (189, 42, 354, 18, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (190, 42, 355, 18, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (191, 42, 356, 18, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (192, 42, 357, 18, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (25, 61, 1, 1, NULL, '2025-04-10 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 61;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (193, 61, 114, 6, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (194, 61, 115, 6, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (195, 61, 116, 6, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (196, 61, 117, 6, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (197, 61, 14, 1, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (198, 61, 15, 1, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (199, 61, 16, 1, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (200, 61, 17, 1, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (26, 62, 4, 0, 5, '2025-04-17 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 62;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (201, 62, 94, 5, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (202, 62, 95, 5, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (203, 62, 96, 5, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (204, 62, 88, 5, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (205, 62, 34, 2, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (206, 62, 35, 2, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (207, 62, 36, 2, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (208, 62, 37, 2, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (27, 63, 3, 2, 4, '2025-04-24 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 63;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (209, 63, 74, 4, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (210, 63, 75, 4, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (211, 63, 77, 4, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (212, 63, 68, 4, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (213, 63, 54, 3, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (214, 63, 55, 3, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (215, 63, 56, 3, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (216, 63, 57, 3, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (28, 64, 2, 2, NULL, '2025-05-10 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 64;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (217, 64, 14, 1, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (218, 64, 15, 1, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (219, 64, 16, 1, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (220, 64, 17, 1, 0, 0, 1, 0, 90);
INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (12, 17, 64, 'Reckless tactical foul', 'YELLOW', 0, '2025-05-10');
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (221, 64, 94, 5, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (222, 64, 95, 5, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (223, 64, 96, 5, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (224, 64, 88, 5, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (29, 65, 1, 2, 4, '2025-05-17 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 65;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (225, 65, 114, 6, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (226, 65, 115, 6, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (227, 65, 116, 6, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (228, 65, 117, 6, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (229, 65, 74, 4, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (230, 65, 75, 4, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (231, 65, 77, 4, 0, 0, 1, 0, 90);
INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (13, 77, 65, 'Unsporting dissent', 'YELLOW', 0, '2025-05-17');
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (232, 65, 68, 4, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (30, 66, 2, 2, NULL, '2025-05-24 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 66;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (233, 66, 34, 2, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (234, 66, 35, 2, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (235, 66, 36, 2, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (236, 66, 37, 2, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (237, 66, 54, 3, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (238, 66, 55, 3, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (239, 66, 56, 3, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (240, 66, 57, 3, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (31, 67, 3, 1, 4, '2025-06-10 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 67;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (241, 67, 74, 4, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (242, 67, 75, 4, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (243, 67, 77, 4, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (244, 67, 68, 4, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (245, 67, 14, 1, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (246, 67, 15, 1, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (247, 67, 16, 1, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (248, 67, 17, 1, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (32, 68, 2, 0, 3, '2025-06-17 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 68;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (249, 68, 54, 3, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (250, 68, 55, 3, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (251, 68, 56, 3, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (252, 68, 57, 3, 0, 0, 1, 0, 90);
INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (14, 57, 68, 'Reckless tactical foul', 'YELLOW', 0, '2025-06-17');
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (253, 68, 94, 5, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (254, 68, 95, 5, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (255, 68, 96, 5, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (256, 68, 88, 5, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (33, 69, 1, 2, 6, '2025-06-24 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 69;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (257, 69, 34, 2, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (258, 69, 35, 2, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (259, 69, 36, 2, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (260, 69, 37, 2, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (261, 69, 114, 6, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (262, 69, 115, 6, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (263, 69, 116, 6, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (264, 69, 117, 6, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (34, 70, 4, 0, 1, '2025-07-10 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 70;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (265, 70, 14, 1, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (266, 70, 15, 1, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (267, 70, 16, 1, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (268, 70, 17, 1, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (269, 70, 54, 3, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (270, 70, 55, 3, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (271, 70, 56, 3, 0, 0, 1, 0, 90);
INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (15, 56, 70, 'Unsporting dissent', 'YELLOW', 0, '2025-07-10');
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (272, 70, 57, 3, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (35, 71, 3, 0, 4, '2025-07-17 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 71;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (273, 71, 74, 4, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (274, 71, 75, 4, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (275, 71, 77, 4, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (276, 71, 68, 4, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (277, 71, 34, 2, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (278, 71, 35, 2, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (279, 71, 36, 2, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (280, 71, 37, 2, 0, 0, 0, 0, 90);
INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (36, 72, 2, 2, NULL, '2025-07-24 22:15:00', 1);
UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = 72;
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (281, 72, 94, 5, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (282, 72, 95, 5, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (283, 72, 96, 5, 0, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (284, 72, 88, 5, 0, 0, 1, 0, 90);
INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (16, 88, 72, 'Reckless tactical foul', 'YELLOW', 0, '2025-07-24');
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (285, 72, 114, 6, 1, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (286, 72, 115, 6, 1, 1, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (287, 72, 116, 6, 0, 0, 0, 0, 90);
INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (288, 72, 117, 6, 0, 0, 0, 0, 90);

-- Sample Result Correction to demonstrate RESULT_AUDIT before/after history
UPDATE MATCH_RESULT SET home_score = home_score + 1, version = 2, submitted_at = '2026-10-05 10:00:00' WHERE match_id = 7;

-- 12. Standings (synchronized with all completed match results)
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (1, 1, 3, 2, 1, 0, 7, 3, 4, 7);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (3, 1, 4, 1, 2, 1, 8, 6, 2, 5);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (1, 2, 3, 2, 1, 0, 6, 4, 2, 7);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (3, 2, 4, 0, 1, 3, 3, 11, -8, 1);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (1, 3, 3, 2, 0, 1, 6, 3, 3, 6);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (3, 3, 4, 1, 1, 2, 6, 9, -3, 4);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (1, 4, 3, 2, 1, 0, 6, 2, 4, 7);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (3, 4, 4, 4, 0, 0, 11, 4, 7, 12);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (1, 5, 3, 1, 1, 1, 4, 3, 1, 4);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (3, 5, 4, 1, 2, 1, 8, 6, 2, 5);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (1, 6, 3, 1, 2, 0, 6, 5, 1, 5);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (3, 6, 4, 1, 2, 1, 6, 6, 0, 5);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (1, 7, 3, 0, 1, 2, 2, 6, -4, 1);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (1, 8, 3, 0, 1, 2, 3, 7, -4, 1);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (1, 9, 3, 0, 1, 2, 4, 7, -3, 1);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (1, 10, 3, 0, 1, 2, 2, 7, -5, 1);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (1, 11, 3, 1, 1, 1, 5, 5, 0, 4);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (1, 12, 3, 1, 1, 1, 5, 4, 1, 4);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (2, 13, 1, 0, 1, 0, 1, 1, 0, 1);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (2, 14, 1, 0, 1, 0, 1, 1, 0, 1);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (2, 15, 1, 0, 1, 0, 1, 1, 0, 1);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (2, 16, 1, 0, 1, 0, 1, 1, 0, 1);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (2, 17, 1, 0, 1, 0, 1, 1, 0, 1);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (2, 18, 1, 0, 1, 0, 1, 1, 0, 1);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (2, 19, 1, 0, 1, 0, 1, 1, 0, 1);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (2, 20, 1, 0, 1, 0, 1, 1, 0, 1);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (2, 21, 1, 0, 1, 0, 1, 1, 0, 1);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (2, 22, 1, 0, 1, 0, 1, 1, 0, 1);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (2, 23, 1, 0, 1, 0, 1, 1, 0, 1);
INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (2, 24, 1, 0, 1, 0, 1, 1, 0, 1);

-- 13. Payments (Total = $18,560.00 across 4 categories)
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (1, 1, 1, 500.00, 'Registration', '2026-01-15');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (2, 2, 1, 500.00, 'Registration', '2026-01-15');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (3, 3, 1, 500.00, 'Registration', '2026-01-15');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (4, 4, 1, 500.00, 'Registration', '2026-02-15');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (5, 5, 1, 500.00, 'Registration', '2026-02-15');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (6, 6, 1, 500.00, 'Registration', '2026-02-15');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (7, 7, 1, 500.00, 'Registration', '2026-03-15');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (8, 8, 1, 500.00, 'Registration', '2026-03-15');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (9, 9, 1, 500.00, 'Registration', '2026-03-15');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (10, 10, 1, 500.00, 'Registration', '2026-04-15');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (11, 11, 1, 500.00, 'Registration', '2026-04-15');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (12, 12, 1, 500.00, 'Registration', '2026-04-15');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (13, 13, 2, 300.00, 'Registration', '2026-01-20');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (14, 14, 2, 300.00, 'Registration', '2026-01-20');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (15, 15, 2, 300.00, 'Registration', '2026-01-20');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (16, 16, 2, 300.00, 'Registration', '2026-02-20');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (17, 17, 2, 300.00, 'Registration', '2026-02-20');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (18, 18, 2, 300.00, 'Registration', '2026-02-20');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (19, 19, 2, 300.00, 'Registration', '2026-03-20');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (20, 20, 2, 300.00, 'Registration', '2026-03-20');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (21, 21, 2, 300.00, 'Registration', '2026-03-20');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (22, 22, 2, 300.00, 'Registration', '2026-04-20');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (23, 23, 2, 300.00, 'Registration', '2026-04-20');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (24, 24, 2, 300.00, 'Registration', '2026-04-20');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (25, 1, 1, 1500.00, 'Sponsorship', '2026-02-10');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (26, 2, 1, 1200.00, 'Sponsorship', '2026-03-05');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (27, 7, 1, 1100.00, 'Sponsorship', '2026-04-12');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (28, 3, 3, 1400.00, 'Sponsorship', '2025-03-18');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (29, 4, 1, 860.00, 'Merchandise', '2026-03-22');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (30, 5, 1, 700.00, 'Merchandise', '2026-04-28');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (31, 13, 2, 450.00, 'Merchandise', '2026-05-11');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (32, 1, 3, 450.00, 'Merchandise', '2025-05-04');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (33, 6, 1, 550.00, 'Other', '2026-05-15');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (34, 15, 2, 400.00, 'Other', '2026-05-21');
INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (35, 2, 3, 350.00, 'Other', '2025-06-12');

-- 14. Communications
INSERT INTO COMMUNICATION (comm_id, title, message, category, target_audience, sent_by, sent_at) VALUES (1, 'Matchday 4 Venue Allocations Confirmed', 'All Round 4 fixtures for USA Premier Cup 2026 have verified stadium slots with zero venue conflicts.', 'Schedule Notice', 'All Senior & Women Coaches', 'John Doe', '2026-11-20 09:30:00');
INSERT INTO COMMUNICATION (comm_id, title, message, category, target_audience, sent_by, sent_at) VALUES (2, 'Disciplinary Notice: 3-Yellow Accumulation Rule', 'Players accumulating 3 yellow cards in a single tournament are automatically suspended by database trigger enforcement.', 'Disciplinary', 'Team Managers & Referees', 'John Doe', '2026-11-18 14:15:00');
INSERT INTO COMMUNICATION (comm_id, title, message, category, target_audience, sent_by, sent_at) VALUES (3, '2026 Registration Fee Settlement Window', 'Final sponsorship and merchandise fee invoices for Challenge Trophy clubs are due prior to Round 3.', 'Registration', 'Club Treasurers', 'John Doe', '2026-11-15 11:00:00');
INSERT INTO COMMUNICATION (comm_id, title, message, category, target_audience, sent_by, sent_at) VALUES (4, 'Official Referee Briefing & Match Reporting', 'Match officials must submit verified score sheets within 2 hours of full time for transactional standings updates.', 'General', 'Match Officials', 'John Doe', '2026-11-12 16:45:00');
