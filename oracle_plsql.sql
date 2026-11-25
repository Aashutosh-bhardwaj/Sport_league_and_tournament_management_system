-- ============================================================================
-- Sports League & Tournament Management System
-- Oracle PL/SQL Equivalent Implementation
-- Includes: Tables, Sequences, Triggers, and Transactional Stored Procedures
-- ============================================================================

-- 1. SEQUENCES
CREATE SEQUENCE seq_sport START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_league START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_season START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_tournament START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_team START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_player START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_roster START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_venue START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_official START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_match START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_result START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_player_stat START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_discipline START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_audit START WITH 1 INCREMENT BY 1;

-- 2. CORE TABLES (Oracle 3NF DDL)
CREATE TABLE SPORT (
  sport_id NUMBER PRIMARY KEY,
  name VARCHAR2(100) NOT NULL UNIQUE,
  players_per_team NUMBER NOT NULL CHECK (players_per_team > 0)
);

CREATE TABLE LEAGUE (
  league_id NUMBER PRIMARY KEY,
  sport_id NUMBER NOT NULL REFERENCES SPORT(sport_id),
  name VARCHAR2(150) NOT NULL,
  country VARCHAR2(100) NOT NULL,
  level_name VARCHAR2(80) NOT NULL
);

CREATE TABLE SEASON (
  season_id NUMBER PRIMARY KEY,
  league_id NUMBER NOT NULL REFERENCES LEAGUE(league_id),
  name VARCHAR2(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  CONSTRAINT chk_season_dates CHECK (end_date > start_date)
);

CREATE TABLE TOURNAMENT (
  tournament_id NUMBER PRIMARY KEY,
  season_id NUMBER NOT NULL REFERENCES SEASON(season_id),
  name VARCHAR2(150) NOT NULL,
  format VARCHAR2(30) CHECK (format IN ('LEAGUE', 'KNOCKOUT', 'GROUP_KNOCKOUT')),
  registration_fee NUMBER(10, 2) DEFAULT 0 CHECK (registration_fee >= 0),
  status VARCHAR2(20) CHECK (status IN ('UPCOMING', 'ONGOING', 'COMPLETED'))
);

CREATE TABLE TEAM (
  team_id NUMBER PRIMARY KEY,
  name VARCHAR2(120) NOT NULL UNIQUE,
  city VARCHAR2(100) NOT NULL,
  coach_name VARCHAR2(120) NOT NULL,
  founded_year NUMBER(4) NOT NULL,
  logo_color VARCHAR2(16) DEFAULT '#0B3D91',
  category VARCHAR2(20) CHECK (category IN ('Youth', 'Amateur', 'Women', 'Senior'))
);

CREATE TABLE PLAYER (
  player_id NUMBER PRIMARY KEY,
  full_name VARCHAR2(120) NOT NULL,
  dob DATE NOT NULL,
  position VARCHAR2(50) NOT NULL,
  jersey_no NUMBER(2) NOT NULL,
  email VARCHAR2(150) NOT NULL UNIQUE,
  status VARCHAR2(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INJURED', 'SUSPENDED', 'INACTIVE'))
);

CREATE TABLE MATCH_FIXTURE (
  match_id NUMBER PRIMARY KEY,
  tournament_id NUMBER NOT NULL REFERENCES TOURNAMENT(tournament_id),
  home_team_id NUMBER NOT NULL REFERENCES TEAM(team_id),
  away_team_id NUMBER NOT NULL REFERENCES TEAM(team_id),
  venue_id NUMBER NOT NULL,
  referee_id NUMBER NOT NULL,
  match_date DATE NOT NULL,
  start_time VARCHAR2(10) NOT NULL,
  round_no NUMBER NOT NULL,
  status VARCHAR2(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'POSTPONED', 'CANCELLED')),
  CONSTRAINT chk_diff_teams CHECK (home_team_id <> away_team_id),
  CONSTRAINT uq_fixture UNIQUE (tournament_id, home_team_id, away_team_id),
  CONSTRAINT uq_venue_slot UNIQUE (venue_id, match_date, start_time)
);

CREATE TABLE MATCH_RESULT (
  result_id NUMBER PRIMARY KEY,
  match_id NUMBER NOT NULL UNIQUE REFERENCES MATCH_FIXTURE(match_id),
  home_score NUMBER NOT NULL CHECK (home_score >= 0),
  away_score NUMBER NOT NULL CHECK (away_score >= 0),
  winner_team_id NUMBER NULL REFERENCES TEAM(team_id),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  version NUMBER DEFAULT 1
);

CREATE TABLE STANDINGS (
  tournament_id NUMBER NOT NULL REFERENCES TOURNAMENT(tournament_id),
  team_id NUMBER NOT NULL REFERENCES TEAM(team_id),
  played NUMBER DEFAULT 0,
  won NUMBER DEFAULT 0,
  drawn NUMBER DEFAULT 0,
  lost NUMBER DEFAULT 0,
  goals_for NUMBER DEFAULT 0,
  goals_against NUMBER DEFAULT 0,
  goal_diff NUMBER DEFAULT 0,
  points NUMBER DEFAULT 0,
  CONSTRAINT pk_standings PRIMARY KEY (tournament_id, team_id)
);

CREATE TABLE RESULT_AUDIT (
  audit_id NUMBER PRIMARY KEY,
  match_id NUMBER NOT NULL REFERENCES MATCH_FIXTURE(match_id),
  old_home_score NUMBER NULL,
  old_away_score NUMBER NULL,
  new_home_score NUMBER NOT NULL,
  new_away_score NUMBER NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  action VARCHAR2(20) CHECK (action IN ('SUBMIT', 'CORRECT'))
);

-- 3. TRIGGER: Automatic Standings & Audit Update on MATCH_RESULT Insert
CREATE OR REPLACE TRIGGER trg_update_standings_after_result
AFTER INSERT ON MATCH_RESULT
FOR EACH ROW
DECLARE
  v_tournament_id NUMBER;
  v_home_team_id  NUMBER;
  v_away_team_id  NUMBER;
  v_home_pts      NUMBER := 0;
  v_away_pts      NUMBER := 0;
  v_home_w        NUMBER := 0;
  v_home_d        NUMBER := 0;
  v_home_l        NUMBER := 0;
  v_away_w        NUMBER := 0;
  v_away_d        NUMBER := 0;
  v_away_l        NUMBER := 0;
BEGIN
  SELECT tournament_id, home_team_id, away_team_id
    INTO v_tournament_id, v_home_team_id, v_away_team_id
    FROM MATCH_FIXTURE
   WHERE match_id = :NEW.match_id;

  IF :NEW.home_score > :NEW.away_score THEN
    v_home_pts := 3; v_home_w := 1; v_away_l := 1;
  ELSIF :NEW.home_score < :NEW.away_score THEN
    v_away_pts := 3; v_away_w := 1; v_home_l := 1;
  ELSE
    v_home_pts := 1; v_away_pts := 1; v_home_d := 1; v_away_d := 1;
  END IF;

  -- Upsert Home Standings
  MERGE INTO STANDINGS s
  USING (SELECT v_tournament_id AS tid, v_home_team_id AS team_id FROM DUAL) src
  ON (s.tournament_id = src.tid AND s.team_id = src.team_id)
  WHEN MATCHED THEN
    UPDATE SET
      s.played = s.played + 1,
      s.won = s.won + v_home_w,
      s.drawn = s.drawn + v_home_d,
      s.lost = s.lost + v_home_l,
      s.goals_for = s.goals_for + :NEW.home_score,
      s.goals_against = s.goals_against + :NEW.away_score,
      s.goal_diff = (s.goals_for + :NEW.home_score) - (s.goals_against + :NEW.away_score),
      s.points = s.points + v_home_pts
  WHEN NOT MATCHED THEN
    INSERT (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points)
    VALUES (v_tournament_id, v_home_team_id, 1, v_home_w, v_home_d, v_home_l,
            :NEW.home_score, :NEW.away_score, :NEW.home_score - :NEW.away_score, v_home_pts);

  -- Upsert Away Standings
  MERGE INTO STANDINGS s
  USING (SELECT v_tournament_id AS tid, v_away_team_id AS team_id FROM DUAL) src
  ON (s.tournament_id = src.tid AND s.team_id = src.team_id)
  WHEN MATCHED THEN
    UPDATE SET
      s.played = s.played + 1,
      s.won = s.won + v_away_w,
      s.drawn = s.drawn + v_away_d,
      s.lost = s.lost + v_away_l,
      s.goals_for = s.goals_for + :NEW.away_score,
      s.goals_against = s.goals_against + :NEW.home_score,
      s.goal_diff = (s.goals_for + :NEW.away_score) - (s.goals_against + :NEW.home_score),
      s.points = s.points + v_away_pts
  WHEN NOT MATCHED THEN
    INSERT (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points)
    VALUES (v_tournament_id, v_away_team_id, 1, v_away_w, v_away_d, v_away_l,
            :NEW.away_score, :NEW.home_score, :NEW.away_score - :NEW.home_score, v_away_pts);

  -- Log Audit Record
  INSERT INTO RESULT_AUDIT (audit_id, match_id, old_home_score, old_away_score, new_home_score, new_away_score, action)
  VALUES (seq_audit.NEXTVAL, :NEW.match_id, NULL, NULL, :NEW.home_score, :NEW.away_score, 'SUBMIT');
END;
/

-- 4. STORED PROCEDURE: submit_match_result (Atomic Transaction)
CREATE OR REPLACE PROCEDURE submit_match_result (
  p_match_id   IN NUMBER,
  p_home_score IN NUMBER,
  p_away_score IN NUMBER
) AS
  v_status         VARCHAR2(20);
  v_home_team_id   NUMBER;
  v_away_team_id   NUMBER;
  v_winner_team_id NUMBER := NULL;
BEGIN
  IF p_home_score < 0 OR p_away_score < 0 THEN
    RAISE_APPLICATION_ERROR(-20001, 'Scores cannot be negative.');
  END IF;

  SELECT status, home_team_id, away_team_id
    INTO v_status, v_home_team_id, v_away_team_id
    FROM MATCH_FIXTURE
   WHERE match_id = p_match_id
   FOR UPDATE;

  IF v_status <> 'SCHEDULED' THEN
    RAISE_APPLICATION_ERROR(-20002, 'Match is not SCHEDULED. Use correct_match_result instead.');
  END IF;

  IF p_home_score > p_away_score THEN
    v_winner_team_id := v_home_team_id;
  ELSIF p_away_score > p_home_score THEN
    v_winner_team_id := v_away_team_id;
  END IF;

  SAVEPOINT sp_before_submit;

  INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, version)
  VALUES (seq_result.NEXTVAL, p_match_id, p_home_score, p_away_score, v_winner_team_id, 1);

  UPDATE MATCH_FIXTURE
     SET status = 'COMPLETED'
   WHERE match_id = p_match_id;

  COMMIT;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    ROLLBACK;
    RAISE_APPLICATION_ERROR(-20003, 'Match ID not found.');
  WHEN OTHERS THEN
    ROLLBACK TO sp_before_submit;
    RAISE;
END submit_match_result;
/

-- 5. STORED PROCEDURE: correct_match_result (Reversal + Re-application + Audit Diff)
CREATE OR REPLACE PROCEDURE correct_match_result (
  p_match_id       IN NUMBER,
  p_new_home_score IN NUMBER,
  p_new_away_score IN NUMBER
) AS
  v_tournament_id  NUMBER;
  v_home_team_id   NUMBER;
  v_away_team_id   NUMBER;
  v_old_home       NUMBER;
  v_old_away       NUMBER;
  v_new_winner     NUMBER := NULL;
  v_old_h_pts      NUMBER := 0; v_old_a_pts NUMBER := 0;
  v_old_h_w        NUMBER := 0; v_old_h_d   NUMBER := 0; v_old_h_l NUMBER := 0;
  v_old_a_w        NUMBER := 0; v_old_a_d   NUMBER := 0; v_old_a_l NUMBER := 0;
  v_new_h_pts      NUMBER := 0; v_new_a_pts NUMBER := 0;
  v_new_h_w        NUMBER := 0; v_new_h_d   NUMBER := 0; v_new_h_l NUMBER := 0;
  v_new_a_w        NUMBER := 0; v_new_a_d   NUMBER := 0; v_new_a_l NUMBER := 0;
BEGIN
  IF p_new_home_score < 0 OR p_new_away_score < 0 THEN
    RAISE_APPLICATION_ERROR(-20004, 'Corrected scores cannot be negative.');
  END IF;

  SELECT m.tournament_id, m.home_team_id, m.away_team_id, r.home_score, r.away_score
    INTO v_tournament_id, v_home_team_id, v_away_team_id, v_old_home, v_old_away
    FROM MATCH_FIXTURE m
    JOIN MATCH_RESULT r ON m.match_id = r.match_id
   WHERE m.match_id = p_match_id
   FOR UPDATE;

  -- Compute old outcome contribution
  IF v_old_home > v_old_away THEN
    v_old_h_pts := 3; v_old_h_w := 1; v_old_a_l := 1;
  ELSIF v_old_home < v_old_away THEN
    v_old_a_pts := 3; v_old_a_w := 1; v_old_h_l := 1;
  ELSE
    v_old_h_pts := 1; v_old_a_pts := 1; v_old_h_d := 1; v_old_a_d := 1;
  END IF;

  -- Compute new outcome contribution
  IF p_new_home_score > p_new_away_score THEN
    v_new_h_pts := 3; v_new_h_w := 1; v_new_a_l := 1;
    v_new_winner := v_home_team_id;
  ELSIF p_new_home_score < p_new_away_score THEN
    v_new_a_pts := 3; v_new_a_w := 1; v_new_h_l := 1;
    v_new_winner := v_away_team_id;
  ELSE
    v_new_h_pts := 1; v_new_a_pts := 1; v_new_h_d := 1; v_new_a_d := 1;
  END IF;

  SAVEPOINT sp_before_correct;

  -- Reverse old and apply new standings atomically for home team
  UPDATE STANDINGS
     SET won           = won - v_old_h_w + v_new_h_w,
         drawn         = drawn - v_old_h_d + v_new_h_d,
         lost          = lost - v_old_h_l + v_new_h_l,
         goals_for     = goals_for - v_old_home + p_new_home_score,
         goals_against = goals_against - v_old_away + p_new_away_score,
         goal_diff     = (goals_for - v_old_home + p_new_home_score) - (goals_against - v_old_away + p_new_away_score),
         points        = points - v_old_h_pts + v_new_h_pts
   WHERE tournament_id = v_tournament_id AND team_id = v_home_team_id;

  -- Reverse old and apply new standings atomically for away team
  UPDATE STANDINGS
     SET won           = won - v_old_a_w + v_new_a_w,
         drawn         = drawn - v_old_a_d + v_new_a_d,
         lost          = lost - v_old_a_l + v_new_a_l,
         goals_for     = goals_for - v_old_away + p_new_away_score,
         goals_against = goals_against - v_old_home + p_new_home_score,
         goal_diff     = (goals_for - v_old_away + p_new_away_score) - (goals_against - v_old_home + p_new_home_score),
         points        = points - v_old_a_pts + v_new_a_pts
   WHERE tournament_id = v_tournament_id AND team_id = v_away_team_id;

  UPDATE MATCH_RESULT
     SET home_score     = p_new_home_score,
         away_score     = p_new_away_score,
         winner_team_id = v_new_winner,
         submitted_at   = CURRENT_TIMESTAMP,
         version        = version + 1
   WHERE match_id = p_match_id;

  INSERT INTO RESULT_AUDIT (audit_id, match_id, old_home_score, old_away_score, new_home_score, new_away_score, action)
  VALUES (seq_audit.NEXTVAL, p_match_id, v_old_home, v_old_away, p_new_home_score, p_new_away_score, 'CORRECT');

  COMMIT;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    ROLLBACK;
    RAISE_APPLICATION_ERROR(-20005, 'Completed match result not found.');
  WHEN OTHERS THEN
    ROLLBACK TO sp_before_correct;
    RAISE;
END correct_match_result;
/
