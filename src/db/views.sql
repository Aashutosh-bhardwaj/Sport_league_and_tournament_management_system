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
