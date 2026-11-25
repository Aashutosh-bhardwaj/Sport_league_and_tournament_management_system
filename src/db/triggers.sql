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
