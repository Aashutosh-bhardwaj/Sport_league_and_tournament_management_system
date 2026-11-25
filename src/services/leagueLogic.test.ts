import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInMemoryTestDatabase,
  getDbRunner,
  runExec,
  runQuery,
  setActiveDatabaseForTests,
} from './db';
import { correctResult, generateRoundRobinFixtures, submitResult } from './leagueLogic';

test('Seed data integrity, counts, payments total, and SQL views', async () => {
  const rawDb = await createInMemoryTestDatabase(true);
  setActiveDatabaseForTests(rawDb);

  const count = (table: string) =>
    runQuery<{ c: number }>(`SELECT COUNT(*) AS c FROM ${table}`)[0].c;

  assert.equal(count('SPORT'), 2);
  assert.equal(count('LEAGUE'), 2);
  assert.equal(count('SEASON'), 2);
  assert.equal(count('TOURNAMENT'), 3);
  assert.equal(count('TEAM'), 24);
  assert.equal(count('PLAYER'), 480);
  assert.equal(count('VENUE'), 12);
  assert.equal(count('OFFICIAL'), 15);
  assert.equal(count('"MATCH"'), 72);
  assert.equal(count('MATCH_RESULT'), 36);

  const totalPayments = runQuery<{ total: number }>(`SELECT ROUND(SUM(amount), 2) AS total FROM PAYMENT`)[0].total;
  assert.equal(totalPayments, 18560);

  // Verify all 7 SQL views return valid structured rows
  const views = [
    'v_points_table',
    'v_top_scorers',
    'v_team_form',
    'v_upcoming_matches',
    'v_player_discipline_summary',
    'v_venue_utilization',
    'v_tournament_revenue',
  ];
  for (const v of views) {
    const rows = runQuery(`SELECT * FROM ${v} LIMIT 5`);
    assert.ok(rows.length > 0, `Expected view ${v} to return rows`);
  }
});

test('submitResult commits atomically, updates standings, auto-suspends on RED card, and writes audit', async () => {
  const rawDb = await createInMemoryTestDatabase(true);
  setActiveDatabaseForTests(rawDb);
  const runner = getDbRunner();

  // Pick a SCHEDULED match
  const scheduled = runQuery<{
    match_id: number;
    tournament_id: number;
    home_team_id: number;
    away_team_id: number;
  }>(`SELECT match_id, tournament_id, home_team_id, away_team_id FROM "MATCH" WHERE status = 'SCHEDULED' LIMIT 1`)[0];

  const beforeHome = runQuery<{ played: number; won: number; points: number; goals_for: number }>(
    `SELECT played, won, points, goals_for FROM STANDINGS WHERE tournament_id = ? AND team_id = ?`,
    [scheduled.tournament_id, scheduled.home_team_id]
  )[0];

  // Get an ACTIVE player from home team and away team
  const homePlayer = runQuery<{ player_id: number }>(
    `SELECT p.player_id FROM TEAM_ROSTER tr JOIN PLAYER p ON tr.player_id = p.player_id
     WHERE tr.team_id = ? AND tr.tournament_id = ? AND p.status = 'ACTIVE' LIMIT 1`,
    [scheduled.home_team_id, scheduled.tournament_id]
  )[0].player_id;

  const awayPlayer = runQuery<{ player_id: number }>(
    `SELECT p.player_id FROM TEAM_ROSTER tr JOIN PLAYER p ON tr.player_id = p.player_id
     WHERE tr.team_id = ? AND tr.tournament_id = ? AND p.status = 'ACTIVE' LIMIT 1`,
    [scheduled.away_team_id, scheduled.tournament_id]
  )[0].player_id;

  const res = submitResult(runner, {
    matchId: scheduled.match_id,
    homeScore: 3,
    awayScore: 1,
    playerStats: [
      { playerId: homePlayer, teamId: scheduled.home_team_id, goals: 2, assists: 1, yellowCards: 0, redCards: 0, minutesPlayed: 90 },
      { playerId: awayPlayer, teamId: scheduled.away_team_id, goals: 1, assists: 0, yellowCards: 0, redCards: 1, minutesPlayed: 75 },
    ],
    cards: [
      { playerId: awayPlayer, offence: 'Last-man denial', cardType: 'RED', suspensionMatches: 2 },
    ],
  });

  assert.ok(res.resultId > 0);
  assert.ok(res.newlySuspendedIds.includes(awayPlayer));

  const matchAfter = runQuery<{ status: string }>(`SELECT status FROM "MATCH" WHERE match_id = ?`, [scheduled.match_id])[0];
  assert.equal(matchAfter.status, 'COMPLETED');

  const afterHome = runQuery<{ played: number; won: number; points: number; goals_for: number }>(
    `SELECT played, won, points, goals_for FROM STANDINGS WHERE tournament_id = ? AND team_id = ?`,
    [scheduled.tournament_id, scheduled.home_team_id]
  )[0];
  assert.equal(afterHome.played, beforeHome.played + 1);
  assert.equal(afterHome.won, beforeHome.won + 1);
  assert.equal(afterHome.points, beforeHome.points + 3);
  assert.equal(afterHome.goals_for, beforeHome.goals_for + 3);

  const awayPlayerStatus = runQuery<{ status: string }>(`SELECT status FROM PLAYER WHERE player_id = ?`, [awayPlayer])[0].status;
  assert.equal(awayPlayerStatus, 'SUSPENDED');

  const auditRows = runQuery<{ action: string; new_home_score: number; new_away_score: number }>(
    `SELECT action, new_home_score, new_away_score FROM RESULT_AUDIT WHERE match_id = ?`,
    [scheduled.match_id]
  );
  assert.equal(auditRows.length, 1);
  assert.equal(auditRows[0].action, 'SUBMIT');
  assert.equal(auditRows[0].new_home_score, 3);
  assert.equal(auditRows[0].new_away_score, 1);
});

test('submitResult rolls back completely if a SUSPENDED player stat is inserted', async () => {
  const rawDb = await createInMemoryTestDatabase(true);
  setActiveDatabaseForTests(rawDb);
  const runner = getDbRunner();

  const scheduled = runQuery<{
    match_id: number;
    tournament_id: number;
    home_team_id: number;
    away_team_id: number;
  }>(`SELECT match_id, tournament_id, home_team_id, away_team_id FROM "MATCH" WHERE status = 'SCHEDULED' LIMIT 1`)[0];

  const homePlayer = runQuery<{ player_id: number }>(
    `SELECT player_id FROM TEAM_ROSTER WHERE team_id = ? AND tournament_id = ? LIMIT 1`,
    [scheduled.home_team_id, scheduled.tournament_id]
  )[0].player_id;

  // Suspend player explicitly before match
  runExec(`UPDATE PLAYER SET status = 'SUSPENDED' WHERE player_id = ?`, [homePlayer]);

  const beforeMatchCount = runQuery<{ c: number }>(`SELECT COUNT(*) AS c FROM MATCH_RESULT`)[0].c;

  assert.throws(
    () =>
      submitResult(runner, {
        matchId: scheduled.match_id,
        homeScore: 2,
        awayScore: 0,
        playerStats: [
          { playerId: homePlayer, teamId: scheduled.home_team_id, goals: 2, assists: 0, yellowCards: 0, redCards: 0, minutesPlayed: 90 },
        ],
        cards: [],
      }),
    /Eligibility Constraint/
  );

  // Confirm full ROLLBACK occurred
  const afterMatchCount = runQuery<{ c: number }>(`SELECT COUNT(*) AS c FROM MATCH_RESULT`)[0].c;
  assert.equal(afterMatchCount, beforeMatchCount);
  const statusAfter = runQuery<{ status: string }>(`SELECT status FROM "MATCH" WHERE match_id = ?`, [scheduled.match_id])[0].status;
  assert.equal(statusAfter, 'SCHEDULED');
});

test('correctResult reverses old outcome and applies new outcome across Win -> Draw -> Loss -> Win', async () => {
  const rawDb = await createInMemoryTestDatabase(true);
  setActiveDatabaseForTests(rawDb);
  const runner = getDbRunner();

  const scheduled = runQuery<{
    match_id: number;
    tournament_id: number;
    home_team_id: number;
    away_team_id: number;
  }>(`SELECT match_id, tournament_id, home_team_id, away_team_id FROM "MATCH" WHERE status = 'SCHEDULED' LIMIT 1`)[0];

  const getSt = (teamId: number) =>
    runQuery<{ played: number; won: number; drawn: number; lost: number; goals_for: number; goals_against: number; goal_diff: number; points: number }>(
      `SELECT played, won, drawn, lost, goals_for, goals_against, goal_diff, points FROM STANDINGS WHERE tournament_id = ? AND team_id = ?`,
      [scheduled.tournament_id, teamId]
    )[0];

  const baseH = getSt(scheduled.home_team_id);
  const baseA = getSt(scheduled.away_team_id);

  // Step 1: Submit 2-0 (Home Win: +3 H, +0 A)
  submitResult(runner, { matchId: scheduled.match_id, homeScore: 2, awayScore: 0, playerStats: [], cards: [] });
  let h = getSt(scheduled.home_team_id);
  let a = getSt(scheduled.away_team_id);
  assert.equal(h.points, baseH.points + 3);
  assert.equal(h.won, baseH.won + 1);
  assert.equal(a.lost, baseA.lost + 1);

  // Step 2: Correct Win -> Draw (1-1)
  const diff1 = correctResult(runner, scheduled.match_id, 1, 1);
  assert.equal(diff1.newVersion, 2);
  assert.equal(diff1.homePointsDelta, -2);
  assert.equal(diff1.awayPointsDelta, 1);
  h = getSt(scheduled.home_team_id);
  a = getSt(scheduled.away_team_id);
  assert.equal(h.played, baseH.played + 1);
  assert.equal(h.won, baseH.won);
  assert.equal(h.drawn, baseH.drawn + 1);
  assert.equal(h.points, baseH.points + 1);
  assert.equal(a.lost, baseA.lost);
  assert.equal(a.drawn, baseA.drawn + 1);
  assert.equal(a.points, baseA.points + 1);

  // Step 3: Correct Draw -> Away Win (0-3)
  const diff2 = correctResult(runner, scheduled.match_id, 0, 3);
  assert.equal(diff2.newVersion, 3);
  h = getSt(scheduled.home_team_id);
  a = getSt(scheduled.away_team_id);
  assert.equal(h.lost, baseH.lost + 1);
  assert.equal(h.drawn, baseH.drawn);
  assert.equal(h.points, baseH.points);
  assert.equal(h.goals_for, baseH.goals_for);
  assert.equal(h.goals_against, baseH.goals_against + 3);
  assert.equal(a.won, baseA.won + 1);
  assert.equal(a.points, baseA.points + 3);

  // Step 4: Correct Away Win -> Home Win (4-2)
  correctResult(runner, scheduled.match_id, 4, 2);
  h = getSt(scheduled.home_team_id);
  a = getSt(scheduled.away_team_id);
  assert.equal(h.won, baseH.won + 1);
  assert.equal(h.lost, baseH.lost);
  assert.equal(h.points, baseH.points + 3);
  assert.equal(h.goals_for, baseH.goals_for + 4);
  assert.equal(h.goals_against, baseH.goals_against + 2);
  assert.equal(h.goal_diff, baseH.goal_diff + 2);
  assert.equal(a.points, baseA.points);

  const audits = runQuery<{ action: string }>(
    `SELECT action FROM RESULT_AUDIT WHERE match_id = ? ORDER BY audit_id ASC`,
    [scheduled.match_id]
  );
  assert.deepEqual(
    audits.map((x) => x.action),
    ['SUBMIT', 'CORRECT', 'CORRECT', 'CORRECT']
  );
});

test('SQL triggers & constraints block double roster, duplicate fixture, venue double booking, and 3-yellow suspension', async () => {
  const rawDb = await createInMemoryTestDatabase(true);
  setActiveDatabaseForTests(rawDb);
  const runner = getDbRunner();

  // 1. Double roster in same tournament
  assert.throws(
    () =>
      runExec(
        `INSERT INTO TEAM_ROSTER (team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (2, 1, 1, 99, '2026-06-01')`
      ),
    /Roster Constraint/
  );

  // 2. Duplicate fixture in same tournament
  const existingMatch = runQuery<{
    tournament_id: number;
    home_team_id: number;
    away_team_id: number;
    venue_id: number;
    match_date: string;
    start_time: string;
  }>(`SELECT tournament_id, home_team_id, away_team_id, venue_id, match_date, start_time FROM "MATCH" LIMIT 1`)[0];

  assert.throws(
    () =>
      runExec(
        `INSERT INTO "MATCH" (tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status)
         VALUES (?, ?, ?, 12, 1, '2026-12-28', '11:00', 10, 'SCHEDULED')`,
        [existingMatch.tournament_id, existingMatch.home_team_id, existingMatch.away_team_id]
      ),
    /Fixture Conflict/
  );

  // 3. Venue double-booking (using unplayed pairing 1 vs 13)
  assert.throws(
    () =>
      runExec(
        `INSERT INTO "MATCH" (tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status)
         VALUES (1, 1, 13, ?, 2, ?, ?, 10, 'SCHEDULED')`,
        [existingMatch.venue_id, existingMatch.match_date, existingMatch.start_time]
      ),
    /Venue Conflict/
  );

  // 4. 3 Yellow cards auto-suspension trigger
  const activePlayer = runQuery<{ player_id: number }>(
    `SELECT p.player_id FROM PLAYER p JOIN TEAM_ROSTER tr ON p.player_id = tr.player_id
     WHERE tr.tournament_id = 1 AND p.status = 'ACTIVE'
       AND p.player_id NOT IN (SELECT player_id FROM DISCIPLINARY_RECORD)
     LIMIT 1`
  )[0].player_id;

  const t1Matches = runQuery<{ match_id: number }>(`SELECT match_id FROM "MATCH" WHERE tournament_id = 1 LIMIT 3`);
  for (let i = 0; i < 3; i++) {
    runExec(
      `INSERT INTO DISCIPLINARY_RECORD (player_id, match_id, offence, card_type, suspension_matches, issued_on)
       VALUES (?, ?, 'Persistent foul', 'YELLOW', 0, '2026-11-20')`,
      [activePlayer, t1Matches[i].match_id]
    );
  }
  const pStatus = runQuery<{ status: string }>(`SELECT status FROM PLAYER WHERE player_id = ?`, [activePlayer])[0].status;
  assert.equal(pStatus, 'SUSPENDED');

  // 5. Round-robin fixture generator creates conflict-free fixtures
  const genRes = generateRoundRobinFixtures(runner, {
    tournamentId: 1,
    teamIds: [1, 2, 3, 4],
    startDate: '2026-12-23',
    doubleRoundRobin: false,
  });
  assert.ok(genRes.createdCount + genRes.skippedDuplicates === 6);
});
