

PRAGMA foreign_keys = ON;


CREATE TABLE IF NOT EXISTS SPORT (
  sport_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  players_per_team INTEGER NOT NULL CHECK (players_per_team > 0)
);

CREATE TABLE IF NOT EXISTS LEAGUE (
  league_id INTEGER PRIMARY KEY AUTOINCREMENT,
  sport_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  level TEXT NOT NULL,
  FOREIGN KEY (sport_id) REFERENCES SPORT(sport_id) ON DELETE RESTRICT
);


CREATE TABLE IF NOT EXISTS SEASON (
  season_id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  CHECK (end_date > start_date),
  FOREIGN KEY (league_id) REFERENCES LEAGUE(league_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS TOURNAMENT (
  tournament_id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('LEAGUE', 'KNOCKOUT', 'GROUP_KNOCKOUT')),
  registration_fee REAL NOT NULL DEFAULT 0 CHECK (registration_fee >= 0),
  status TEXT NOT NULL CHECK (status IN ('UPCOMING', 'ONGOING', 'COMPLETED')),
  FOREIGN KEY (season_id) REFERENCES SEASON(season_id) ON DELETE RESTRICT
);


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


CREATE TABLE IF NOT EXISTS PLAYER (
  player_id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  dob TEXT NOT NULL,
  position TEXT NOT NULL,
  jersey_no INTEGER NOT NULL CHECK (jersey_no > 0 AND jersey_no <= 99),
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INJURED', 'SUSPENDED', 'INACTIVE'))
);


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


CREATE TABLE IF NOT EXISTS VENUE (
  venue_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  surface_type TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS OFFICIAL (
  official_id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Referee', 'Linesman', 'Match Commissioner')),
  license_no TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL
);


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


CREATE TABLE IF NOT EXISTS PLAYER_AVAILABILITY (
  availability_id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  CHECK (to_date >= from_date),
  FOREIGN KEY (player_id) REFERENCES PLAYER(player_id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS LEAGUE_SETTINGS (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS COMMUNICATION (
  comm_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Schedule Notice', 'Disciplinary', 'Registration', 'General')),
  target_audience TEXT NOT NULL,
  sent_by TEXT NOT NULL DEFAULT 'John Doe',
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);


CREATE INDEX IF NOT EXISTS idx_match_date ON "MATCH"(match_date, start_time);
CREATE INDEX IF NOT EXISTS idx_match_tournament ON "MATCH"(tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_roster_team ON TEAM_ROSTER(team_id);
CREATE INDEX IF NOT EXISTS idx_roster_tournament ON TEAM_ROSTER(tournament_id);
CREATE INDEX IF NOT EXISTS idx_standings_tournament ON STANDINGS(tournament_id, points DESC, goal_diff DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_match ON PLAYER_STATISTICS(match_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON PLAYER_STATISTICS(player_id);
CREATE INDEX IF NOT EXISTS idx_discipline_player ON DISCIPLINARY_RECORD(player_id);
CREATE INDEX IF NOT EXISTS idx_payment_tournament ON PAYMENT(tournament_id, category);
