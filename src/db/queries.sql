
SELECT
  rank_pos AS Rank,
  team_name AS Team,
  played AS P,
  won AS W,
  drawn AS D,
  lost AS L,
  goals_for AS GF,
  goals_against AS GA,
  goal_diff AS GD,
  points AS PTS
FROM v_points_table
WHERE tournament_id = 1
ORDER BY rank_pos ASC;

-- Q2. Top Scorers with Assists & Minutes Per Goal (Aggregates + Window Function)
SELECT
  scorer_rank AS Rank,
  full_name AS Player,
  team_name AS Team,
  matches_played AS Apps,
  total_goals AS Goals,
  total_assists AS Assists,
  ROUND(CAST(total_minutes AS REAL) / NULLIF(total_goals, 0), 1) AS MinsPerGoal
FROM v_top_scorers
WHERE total_goals > 0
ORDER BY total_goals DESC, total_assists DESC
LIMIT 15;

-- Q3. Multi-Season Player Career Summary (JOINs + GROUP BY + Subquery)
SELECT
  p.player_id,
  p.full_name,
  p.position,
  COUNT(DISTINCT tr.tournament_id) AS tournaments_entered,
  COALESCE(SUM(ps.goals), 0) AS career_goals,
  COALESCE(SUM(ps.assists), 0) AS career_assists,
  (SELECT COUNT(*) FROM DISCIPLINARY_RECORD dr WHERE dr.player_id = p.player_id) AS total_cards
FROM PLAYER p
LEFT JOIN TEAM_ROSTER tr ON p.player_id = tr.player_id
LEFT JOIN PLAYER_STATISTICS ps ON p.player_id = ps.player_id
GROUP BY p.player_id
HAVING career_goals >= 2 OR career_assists >= 2
ORDER BY career_goals DESC, career_assists DESC;

-- Q4. Venue Utilization & Average Scoring Rate (LEFT JOIN + Aggregates)
SELECT
  venue_name AS Venue,
  city AS City,
  capacity AS Capacity,
  total_matches AS Scheduled_Total,
  completed_matches AS Completed,
  avg_goals_per_match AS Avg_Goals
FROM v_venue_utilization
ORDER BY total_matches DESC, capacity DESC;

-- Q5. Teams with Above-Average Goal Scoring (Correlated Subquery)
SELECT
  t.name AS Team,
  t.category AS Category,
  s.goals_for AS Goals_For,
  s.points AS Points
FROM STANDINGS s
INNER JOIN TEAM t ON s.team_id = t.team_id
WHERE s.goals_for > (
  SELECT AVG(s2.goals_for)
  FROM STANDINGS s2
  WHERE s2.tournament_id = s.tournament_id
)
ORDER BY s.points DESC;

-- Q6. Referee Workload & Disciplinary Strictness (JOIN + GROUP BY + HAVING)
SELECT
  o.full_name AS Referee,
  o.license_no AS License,
  COUNT(DISTINCT m.match_id) AS Matches_Officiated,
  COUNT(dr.record_id) AS Cards_Issued
FROM OFFICIAL o
INNER JOIN "MATCH" m ON o.official_id = m.referee_id
LEFT JOIN DISCIPLINARY_RECORD dr ON m.match_id = dr.match_id
WHERE o.role = 'Referee'
GROUP BY o.official_id
HAVING Matches_Officiated >= 1
ORDER BY Matches_Officiated DESC, Cards_Issued DESC;

-- Q7. Payment Revenue Breakdown by Category & Running Percentage
SELECT
  category AS Category,
  COUNT(*) AS Transactions,
  ROUND(SUM(amount), 2) AS Revenue_USD,
  ROUND(SUM(amount) * 100.0 / (SELECT SUM(amount) FROM PAYMENT), 1) AS Share_Pct
FROM PAYMENT
GROUP BY category
ORDER BY Revenue_USD DESC;
