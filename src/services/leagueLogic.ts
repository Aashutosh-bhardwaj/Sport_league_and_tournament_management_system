import { DbRunner } from './db';

export interface PlayerStatInput {
  playerId: number;
  teamId: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
}

export interface CardInput {
  playerId: number;
  offence: string;
  cardType: 'YELLOW' | 'RED';
  suspensionMatches: number;
}

export interface SubmitResultInput {
  matchId: number;
  homeScore: number;
  awayScore: number;
  playerStats: PlayerStatInput[];
  cards: CardInput[];
}

export interface PointsRules {
  win: number;
  draw: number;
  loss: number;
  yellowCardThreshold: number;
}

export interface CorrectionDiff {
  matchId: number;
  homeTeamName: string;
  awayTeamName: string;
  oldHomeScore: number;
  oldAwayScore: number;
  newHomeScore: number;
  newAwayScore: number;
  oldVersion: number;
  newVersion: number;
  homePointsDelta: number;
  awayPointsDelta: number;
}

export function getPointsRules(db: DbRunner): PointsRules {
  const rows = db.runQuery<{ setting_key: string; setting_value: string }>(
    `SELECT setting_key, setting_value FROM LEAGUE_SETTINGS`
  );
  const map = new Map(rows.map((r) => [r.setting_key, Number(r.setting_value)]));
  return {
    win: Number.isFinite(map.get('points_win')) ? map.get('points_win')! : 3,
    draw: Number.isFinite(map.get('points_draw')) ? map.get('points_draw')! : 1,
    loss: Number.isFinite(map.get('points_loss')) ? map.get('points_loss')! : 0,
    yellowCardThreshold: Number.isFinite(map.get('yellow_card_threshold'))
      ? map.get('yellow_card_threshold')!
      : 3,
  };
}

function computeOutcomeDelta(
  goalsFor: number,
  goalsAgainst: number,
  rules: PointsRules
): { w: number; d: number; l: number; pts: number } {
  if (goalsFor > goalsAgainst) {
    return { w: 1, d: 0, l: 0, pts: rules.win };
  }
  if (goalsFor < goalsAgainst) {
    return { w: 0, d: 0, l: 1, pts: rules.loss };
  }
  return { w: 0, d: 1, l: 0, pts: rules.draw };
}

function upsertStandingsRow(
  db: DbRunner,
  tournamentId: number,
  teamId: number,
  playedDelta: number,
  wDelta: number,
  dDelta: number,
  lDelta: number,
  gfDelta: number,
  gaDelta: number,
  ptsDelta: number
): void {
  const existing = db.runQuery<{
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goals_for: number;
    goals_against: number;
    points: number;
  }>(`SELECT played, won, drawn, lost, goals_for, goals_against, points FROM STANDINGS WHERE tournament_id = ? AND team_id = ?`, [
    tournamentId,
    teamId,
  ]);

  if (existing.length === 0) {
    const gf = Math.max(0, gfDelta);
    const ga = Math.max(0, gaDelta);
    db.runExec(
      `INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tournamentId,
        teamId,
        Math.max(0, playedDelta),
        Math.max(0, wDelta),
        Math.max(0, dDelta),
        Math.max(0, lDelta),
        gf,
        ga,
        gf - ga,
        Math.max(0, ptsDelta),
      ]
    );
  } else {
    const cur = existing[0];
    const newPlayed = cur.played + playedDelta;
    const newWon = cur.won + wDelta;
    const newDrawn = cur.drawn + dDelta;
    const newLost = cur.lost + lDelta;
    const newGf = cur.goals_for + gfDelta;
    const newGa = cur.goals_against + gaDelta;
    const newGd = newGf - newGa;
    const newPts = cur.points + ptsDelta;

    db.runExec(
      `UPDATE STANDINGS
       SET played = ?, won = ?, drawn = ?, lost = ?, goals_for = ?, goals_against = ?, goal_diff = ?, points = ?
       WHERE tournament_id = ? AND team_id = ?`,
      [newPlayed, newWon, newDrawn, newLost, newGf, newGa, newGd, newPts, tournamentId, teamId]
    );
  }
}

/**
 * Atomically submits a match result, updates match status, recalculates standings,
 * records player statistics, logs disciplinary cards (triggering auto-suspension),
 * and writes RESULT_AUDIT via database trigger.
 */
export function submitResult(db: DbRunner, input: SubmitResultInput): { resultId: number; newlySuspendedIds: number[] } {
  const { matchId, homeScore, awayScore, playerStats, cards } = input;

  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
    throw new Error('Validation Error: Scores must be non-negative integers.');
  }

  return db.runTransaction(() => {
    const matches = db.runQuery<{
      match_id: number;
      tournament_id: number;
      home_team_id: number;
      away_team_id: number;
      match_date: string;
      status: string;
    }>(
      `SELECT match_id, tournament_id, home_team_id, away_team_id, match_date, status
       FROM "MATCH" WHERE match_id = ?`,
      [matchId]
    );

    if (matches.length === 0) {
      throw new Error(`Match #${matchId} not found.`);
    }

    const m = matches[0];
    const rules = getPointsRules(db);
    const winnerTeamId =
      homeScore > awayScore ? m.home_team_id : awayScore > homeScore ? m.away_team_id : null;

    // 1. Insert MATCH_RESULT (trigger checks status='SCHEDULED' and writes SUBMIT audit row)
    const resInsert = db.runExec(
      `INSERT INTO MATCH_RESULT (match_id, home_score, away_score, winner_team_id, submitted_at, version)
       VALUES (?, ?, ?, ?, datetime('now'), 1)`,
      [matchId, homeScore, awayScore, winnerTeamId]
    );

    // 2. Mark MATCH as COMPLETED
    db.runExec(`UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = ?`, [matchId]);

    // 3. Update STANDINGS for home and away teams
    const hDelta = computeOutcomeDelta(homeScore, awayScore, rules);
    const aDelta = computeOutcomeDelta(awayScore, homeScore, rules);

    upsertStandingsRow(db, m.tournament_id, m.home_team_id, 1, hDelta.w, hDelta.d, hDelta.l, homeScore, awayScore, hDelta.pts);
    upsertStandingsRow(db, m.tournament_id, m.away_team_id, 1, aDelta.w, aDelta.d, aDelta.l, awayScore, homeScore, aDelta.pts);

    // 4. Insert PLAYER_STATISTICS (trigger blocks SUSPENDED or INACTIVE players!)
    for (const st of playerStats) {
      db.runExec(
        `INSERT INTO PLAYER_STATISTICS (match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [matchId, st.playerId, st.teamId, st.goals, st.assists, st.yellowCards, st.redCards, st.minutesPlayed]
      );
    }

    // Track statuses before cards to report newly suspended players
    const preStatusMap = new Map<number, string>();
    if (cards.length > 0) {
      const ids = Array.from(new Set(cards.map((c) => c.playerId)));
      for (const pid of ids) {
        const pRow = db.runQuery<{ status: string }>(`SELECT status FROM PLAYER WHERE player_id = ?`, [pid]);
        if (pRow.length > 0) preStatusMap.set(pid, pRow[0].status);
      }
    }

    // 5. Insert DISCIPLINARY_RECORD (trigger auto-suspends on RED or >= 3 YELLOWs!)
    for (const card of cards) {
      db.runExec(
        `INSERT INTO DISCIPLINARY_RECORD (player_id, match_id, offence, card_type, suspension_matches, issued_on)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [card.playerId, matchId, card.offence.trim() || 'Match infraction', card.cardType, card.suspensionMatches, m.match_date]
      );
    }

    const newlySuspendedIds: number[] = [];
    for (const [pid, oldStatus] of preStatusMap.entries()) {
      const after = db.runQuery<{ status: string }>(`SELECT status FROM PLAYER WHERE player_id = ?`, [pid]);
      if (after.length > 0 && oldStatus !== 'SUSPENDED' && after[0].status === 'SUSPENDED') {
        newlySuspendedIds.push(pid);
      }
    }

    return {
      resultId: resInsert.lastInsertRowId,
      newlySuspendedIds,
    };
  });
}

/**
 * Atomically corrects a previously submitted match result:
 * Reverses the old outcome's effect on STANDINGS, applies the new outcome,
 * increments MATCH_RESULT.version, and logs before/after diff into RESULT_AUDIT.
 */
export function correctResult(
  db: DbRunner,
  matchId: number,
  newHomeScore: number,
  newAwayScore: number
): CorrectionDiff {
  if (!Number.isInteger(newHomeScore) || !Number.isInteger(newAwayScore) || newHomeScore < 0 || newAwayScore < 0) {
    throw new Error('Validation Error: Corrected scores must be non-negative integers.');
  }

  return db.runTransaction(() => {
    const rows = db.runQuery<{
      match_id: number;
      tournament_id: number;
      home_team_id: number;
      away_team_id: number;
      home_team_name: string;
      away_team_name: string;
      status: string;
      old_home_score: number;
      old_away_score: number;
      version: number;
    }>(
      `SELECT
         m.match_id, m.tournament_id, m.home_team_id, m.away_team_id,
         ht.name AS home_team_name, at.name AS away_team_name,
         m.status, mr.home_score AS old_home_score, mr.away_score AS old_away_score, mr.version
       FROM "MATCH" m
       INNER JOIN MATCH_RESULT mr ON m.match_id = mr.match_id
       INNER JOIN TEAM ht ON m.home_team_id = ht.team_id
       INNER JOIN TEAM at ON m.away_team_id = at.team_id
       WHERE m.match_id = ?`,
      [matchId]
    );

    if (rows.length === 0) {
      throw new Error(`Completed result for Match #${matchId} not found.`);
    }

    const r = rows[0];
    if (r.old_home_score === newHomeScore && r.old_away_score === newAwayScore) {
      throw new Error('No Changes: Corrected scores match the existing recorded scores.');
    }

    const rules = getPointsRules(db);
    const oldHomeDelta = computeOutcomeDelta(r.old_home_score, r.old_away_score, rules);
    const oldAwayDelta = computeOutcomeDelta(r.old_away_score, r.old_home_score, rules);
    const newHomeDelta = computeOutcomeDelta(newHomeScore, newAwayScore, rules);
    const newAwayDelta = computeOutcomeDelta(newAwayScore, newHomeScore, rules);

    // Reverse old + apply new in single atomic update per team
    upsertStandingsRow(
      db,
      r.tournament_id,
      r.home_team_id,
      0,
      newHomeDelta.w - oldHomeDelta.w,
      newHomeDelta.d - oldHomeDelta.d,
      newHomeDelta.l - oldHomeDelta.l,
      newHomeScore - r.old_home_score,
      newAwayScore - r.old_away_score,
      newHomeDelta.pts - oldHomeDelta.pts
    );

    upsertStandingsRow(
      db,
      r.tournament_id,
      r.away_team_id,
      0,
      newAwayDelta.w - oldAwayDelta.w,
      newAwayDelta.d - oldAwayDelta.d,
      newAwayDelta.l - oldAwayDelta.l,
      newAwayScore - r.old_away_score,
      newHomeScore - r.old_home_score,
      newAwayDelta.pts - oldAwayDelta.pts
    );

    const newWinnerTeamId =
      newHomeScore > newAwayScore ? r.home_team_id : newAwayScore > newHomeScore ? r.away_team_id : null;
    const newVersion = r.version + 1;

    // Trigger trg_audit_result_update automatically inserts old vs new into RESULT_AUDIT
    db.runExec(
      `UPDATE MATCH_RESULT
       SET home_score = ?, away_score = ?, winner_team_id = ?, submitted_at = datetime('now'), version = ?
       WHERE match_id = ?`,
      [newHomeScore, newAwayScore, newWinnerTeamId, newVersion, matchId]
    );

    return {
      matchId,
      homeTeamName: r.home_team_name,
      awayTeamName: r.away_team_name,
      oldHomeScore: r.old_home_score,
      oldAwayScore: r.old_away_score,
      newHomeScore,
      newAwayScore,
      oldVersion: r.version,
      newVersion,
      homePointsDelta: newHomeDelta.pts - oldHomeDelta.pts,
      awayPointsDelta: newAwayDelta.pts - oldAwayDelta.pts,
    };
  });
}

export interface GenerateFixturesOptions {
  tournamentId: number;
  teamIds: number[];
  startDate: string;
  doubleRoundRobin: boolean;
  daysBetweenRounds?: number;
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/**
 * Generates conflict-free round-robin fixtures for a tournament inside a single transaction.
 */
export function generateRoundRobinFixtures(
  db: DbRunner,
  options: GenerateFixturesOptions
): { createdCount: number; skippedDuplicates: number } {
  const { tournamentId, teamIds, startDate, doubleRoundRobin, daysBetweenRounds = 7 } = options;
  const uniqueTeams = Array.from(new Set(teamIds));
  if (uniqueTeams.length < 2) {
    throw new Error('Select at least 2 teams to generate round-robin fixtures.');
  }

  return db.runTransaction(() => {
    const venues = db.runQuery<{ venue_id: number }>(`SELECT venue_id FROM VENUE ORDER BY venue_id`);
    const referees = db.runQuery<{ official_id: number }>(
      `SELECT official_id FROM OFFICIAL WHERE role = 'Referee' ORDER BY official_id`
    );
    if (venues.length === 0 || referees.length === 0) {
      throw new Error('At least one venue and one Referee official are required to schedule matches.');
    }

    const existingFixtures = db.runQuery<{ home_team_id: number; away_team_id: number; round: number }>(
      `SELECT home_team_id, away_team_id, round FROM "MATCH" WHERE tournament_id = ?`,
      [tournamentId]
    );
    const existingPairSet = new Set(existingFixtures.map((f) => `${f.home_team_id}-${f.away_team_id}`));
    const maxExistingRound = existingFixtures.reduce((acc, f) => Math.max(acc, f.round), 0);

    const bookedSlots = db.runQuery<{ venue_id: number; match_date: string; start_time: string }>(
      `SELECT venue_id, match_date, start_time FROM "MATCH" WHERE status <> 'CANCELLED'`
    );
    const bookedSlotSet = new Set(bookedSlots.map((b) => `${b.venue_id}-${b.match_date}-${b.start_time}`));

    // Ensure every selected team has an initial STANDINGS row in this tournament
    for (const tid of uniqueTeams) {
      db.runExec(
        `INSERT OR IGNORE INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points)
         VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0)`,
        [tournamentId, tid]
      );
    }

    // Berger round-robin algorithm (null represents BYE if odd count)
    const list: Array<number | null> = [...uniqueTeams];
    if (list.length % 2 !== 0) {
      list.push(null);
    }
    const n = list.length;
    const totalRounds = n - 1;
    const firstLeg: Array<{ round: number; home: number; away: number }> = [];

    for (let r = 1; r <= totalRounds; r++) {
      for (let i = 0; i < n / 2; i++) {
        const a = list[i];
        const b = list[n - 1 - i];
        if (a !== null && b !== null) {
          const home = r % 2 === 1 ? a : b;
          const away = r % 2 === 1 ? b : a;
          firstLeg.push({ round: r, home, away });
        }
      }
      const tail = list.pop()!;
      list.splice(1, 0, tail);
    }

    const allPlanned = [...firstLeg];
    if (doubleRoundRobin) {
      for (const f of firstLeg) {
        allPlanned.push({
          round: f.round + totalRounds,
          home: f.away,
          away: f.home,
        });
      }
    }

    const timeSlots = ['14:00', '16:30', '19:00', '20:30'];
    let createdCount = 0;
    let skippedDuplicates = 0;
    let slotCursor = 0;

    for (const pair of allPlanned) {
      const pairKey = `${pair.home}-${pair.away}`;
      if (existingPairSet.has(pairKey)) {
        skippedDuplicates++;
        continue;
      }

      const roundOffsetDays = (pair.round - 1) * daysBetweenRounds;
      let matchDate = addDays(startDate, roundOffsetDays);
      let assignedVenue = venues[0].venue_id;
      let assignedTime = timeSlots[0];
      let foundSlot = false;

      // Search across dates/venues/times until a conflict-free slot is found
      for (let dayShift = 0; dayShift < 14 && !foundSlot; dayShift++) {
        const candidateDate = addDays(matchDate, dayShift);
        for (const t of timeSlots) {
          for (let vIdx = 0; vIdx < venues.length; vIdx++) {
            const vId = venues[(slotCursor + vIdx) % venues.length].venue_id;
            const slotKey = `${vId}-${candidateDate}-${t}`;
            if (!bookedSlotSet.has(slotKey)) {
              matchDate = candidateDate;
              assignedVenue = vId;
              assignedTime = t;
              bookedSlotSet.add(slotKey);
              foundSlot = true;
              break;
            }
          }
          if (foundSlot) break;
        }
      }

      const refId = referees[slotCursor % referees.length].official_id;
      slotCursor++;

      db.runExec(
        `INSERT INTO "MATCH" (tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')`,
        [
          tournamentId,
          pair.home,
          pair.away,
          assignedVenue,
          refId,
          matchDate,
          assignedTime,
          maxExistingRound + pair.round,
        ]
      );

      existingPairSet.add(pairKey);
      createdCount++;
    }

    return { createdCount, skippedDuplicates };
  });
}
