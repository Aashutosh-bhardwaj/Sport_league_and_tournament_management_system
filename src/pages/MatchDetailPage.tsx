import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Edit3, History, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getDbRunner, runQuery } from '../services/db';
import { CardInput, CorrectionDiff, correctResult, PlayerStatInput, submitResult } from '../services/leagueLogic';
import { TeamBadge } from '../components/TeamBadge';
import { StatusLabel } from '../components/DataHelpers';
import { Modal } from '../components/Modal';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

export function MatchDetailPage() {
  const { id } = useParams();
  const matchId = Number(id);
  const navigate = useNavigate();
  const { dbReady, dbVersion, addToast } = useApp();

  const [homeScore, setHomeScore] = useState('2');
  const [awayScore, setAwayScore] = useState('1');
  const [statRows, setStatRows] = useState<PlayerStatInput[]>([]);
  const [cardRows, setCardRows] = useState<CardInput[]>([]);

  const [correctOpen, setCorrectOpen] = useState(false);
  const [corrHome, setCorrHome] = useState('0');
  const [corrAway, setCorrAway] = useState('0');
  const [lastDiff, setLastDiff] = useState<CorrectionDiff | null>(null);

  const data = useMemo(() => {
    if (!dbReady || !Number.isFinite(matchId)) return null;

    const match = runQuery<{
      match_id: number;
      tournament_id: number;
      tournament_name: string;
      season_name: string;
      round: number;
      match_date: string;
      start_time: string;
      status: string;
      home_team_id: number;
      home_name: string;
      home_color: string;
      away_team_id: number;
      away_name: string;
      away_color: string;
      venue_name: string;
      venue_city: string;
      referee_name: string;
      result_id: number | null;
      home_score: number | null;
      away_score: number | null;
      version: number | null;
      submitted_at: string | null;
    }>(
      `SELECT
         m.match_id, m.tournament_id, trn.name AS tournament_name, s.name AS season_name,
         m.round, m.match_date, m.start_time, m.status,
         m.home_team_id, ht.name AS home_name, ht.logo_color AS home_color,
         m.away_team_id, at.name AS away_name, at.logo_color AS away_color,
         v.name AS venue_name, v.city AS venue_city,
         o.full_name AS referee_name,
         mr.result_id, mr.home_score, mr.away_score, mr.version, mr.submitted_at
       FROM "MATCH" m
       INNER JOIN TOURNAMENT trn ON m.tournament_id = trn.tournament_id
       INNER JOIN SEASON s ON trn.season_id = s.season_id
       INNER JOIN TEAM ht ON m.home_team_id = ht.team_id
       INNER JOIN TEAM at ON m.away_team_id = at.team_id
       INNER JOIN VENUE v ON m.venue_id = v.venue_id
       INNER JOIN OFFICIAL o ON m.referee_id = o.official_id
       LEFT JOIN MATCH_RESULT mr ON m.match_id = mr.match_id
       WHERE m.match_id = ?`,
      [matchId]
    )[0];

    if (!match) return null;

    const rosteredPlayers = runQuery<{
      player_id: number;
      full_name: string;
      team_id: number;
      team_name: string;
      jersey_no: number;
      position: string;
      status: string;
    }>(
      `SELECT
         p.player_id, p.full_name, tr.team_id, tm.name AS team_name,
         tr.jersey_no, p.position, p.status
       FROM TEAM_ROSTER tr
       INNER JOIN PLAYER p ON tr.player_id = p.player_id
       INNER JOIN TEAM tm ON tr.team_id = tm.team_id
       WHERE tr.tournament_id = ? AND tr.team_id IN (?, ?)
       ORDER BY tr.team_id ASC, tr.jersey_no ASC`,
      [match.tournament_id, match.home_team_id, match.away_team_id]
    );

    const recordedStats = runQuery<{
      stat_id: number;
      player_id: number;
      full_name: string;
      team_name: string;
      goals: number;
      assists: number;
      yellow_cards: number;
      red_cards: number;
      minutes_played: number;
    }>(
      `SELECT
         ps.stat_id, ps.player_id, p.full_name, t.name AS team_name,
         ps.goals, ps.assists, ps.yellow_cards, ps.red_cards, ps.minutes_played
       FROM PLAYER_STATISTICS ps
       INNER JOIN PLAYER p ON ps.player_id = p.player_id
       INNER JOIN TEAM t ON ps.team_id = t.team_id
       WHERE ps.match_id = ?
       ORDER BY ps.goals DESC, ps.assists DESC`,
      [matchId]
    );

    const auditHistory = runQuery<{
      audit_id: number;
      old_home_score: number | null;
      old_away_score: number | null;
      new_home_score: number;
      new_away_score: number;
      changed_at: string;
      action: string;
    }>(
      `SELECT audit_id, old_home_score, old_away_score, new_home_score, new_away_score, changed_at, action
       FROM RESULT_AUDIT WHERE match_id = ? ORDER BY audit_id DESC`,
      [matchId]
    );

    const cardsHistory = runQuery<{
      record_id: number;
      player_id: number;
      full_name: string;
      offence: string;
      card_type: string;
      suspension_matches: number;
      issued_on: string;
    }>(
      `SELECT dr.record_id, dr.player_id, p.full_name, dr.offence, dr.card_type, dr.suspension_matches, dr.issued_on
       FROM DISCIPLINARY_RECORD dr
       INNER JOIN PLAYER p ON dr.player_id = p.player_id
       WHERE dr.match_id = ?`,
      [matchId]
    );

    return { match, rosteredPlayers, recordedStats, auditHistory, cardsHistory };
  }, [dbReady, dbVersion, matchId]);

  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-sm font-semibold text-slate-800">Match not found</p>
        <Link to="/games" className="inline-block mt-3 text-xs font-semibold text-[#0B3D91] hover:underline">
          Back to Games
        </Link>
      </div>
    );
  }

  const { match, rosteredPlayers, recordedStats, auditHistory, cardsHistory } = data;

  const addStatLine = () => {
    const first = rosteredPlayers[0];
    if (!first) return;
    setStatRows((prev) => [
      ...prev,
      {
        playerId: first.player_id,
        teamId: first.team_id,
        goals: 1,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        minutesPlayed: 90,
      },
    ]);
  };

  const addCardLine = () => {
    const first = rosteredPlayers[0];
    if (!first) return;
    setCardRows((prev) => [
      ...prev,
      {
        playerId: first.player_id,
        offence: 'Tactical foul',
        cardType: 'YELLOW',
        suspensionMatches: 0,
      },
    ]);
  };

  const handleSubmitResult = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = submitResult(getDbRunner(), {
        matchId: match.match_id,
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        playerStats: statRows,
        cards: cardRows,
      });
      const suspMsg =
        res.newlySuspendedIds.length > 0
          ? ` Trigger auto-suspended ${res.newlySuspendedIds.length} player(s).`
          : '';
      addToast('success', 'Match Result Committed', `Transaction committed and standings updated.${suspMsg}`);
      setStatRows([]);
      setCardRows([]);
    } catch (err) {
      addToast(
        'error',
        'Transaction Rolled Back',
        err instanceof Error ? err.message : String(err)
      );
    }
  };

  const openCorrectModal = () => {
    setCorrHome(String(match.home_score ?? 0));
    setCorrAway(String(match.away_score ?? 0));
    setCorrectOpen(true);
  };

  const handleCorrectResult = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const diff = correctResult(getDbRunner(), match.match_id, Number(corrHome), Number(corrAway));
      setLastDiff(diff);
      setCorrectOpen(false);
      addToast(
        'success',
        'Result Corrected Atomically',
        `Reversed old standings & applied ${diff.newHomeScore}-${diff.newAwayScore} (v${diff.newVersion}).`
      );
    } catch (err) {
      addToast('error', 'Correction Rolled Back', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => navigate('/games')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Games
      </button>

      <DbmsConceptBanner
        concept="Transaction (BEGIN / COMMIT / ROLLBACK) & Audit"
        description="Submitting or correcting a match result executes atomically across MATCH_RESULT, MATCH, STANDINGS, PLAYER_STATISTICS, DISCIPLINARY_RECORD, and RESULT_AUDIT."
        sqlHint="correctResult() reverses & reapplies standings"
      />

      {/* Match Scoreboard Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-4">
          <span>
            {match.tournament_name} ({match.season_name}) · Round {match.round} · {match.match_date} at{' '}
            {match.start_time}
          </span>
          <div className="flex items-center gap-2">
            {match.version && (
              <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                Result v{match.version}
              </span>
            )}
            <StatusLabel status={match.status} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
          <Link to={`/teams/${match.home_team_id}`} className="flex items-center gap-3 flex-1 justify-center sm:justify-end">
            <span className="font-display text-lg sm:text-xl font-bold text-slate-900 text-right">
              {match.home_name}
            </span>
            <TeamBadge name={match.home_name} color={match.home_color} size="lg" />
          </Link>

          <div className="flex flex-col items-center shrink-0 px-4">
            {match.status === 'COMPLETED' && match.home_score !== null ? (
              <div className="px-6 py-2.5 rounded-xl bg-[#0B3D91] text-white font-display text-3xl font-bold tabular-nums">
                {match.home_score} - {match.away_score}
              </div>
            ) : (
              <div className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 font-display text-lg font-bold">
                VS
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-2">
              {match.venue_name}, {match.venue_city} · Ref: {match.referee_name}
            </p>
          </div>

          <Link to={`/teams/${match.away_team_id}`} className="flex items-center gap-3 flex-1 justify-center sm:justify-start">
            <TeamBadge name={match.away_name} color={match.away_color} size="lg" />
            <span className="font-display text-lg sm:text-xl font-bold text-slate-900">
              {match.away_name}
            </span>
          </Link>
        </div>

        {match.status === 'COMPLETED' && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Submitted at: <span className="font-mono">{match.submitted_at}</span>
            </p>
            <button
              type="button"
              onClick={openCorrectModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Correct Result
            </button>
          </div>
        )}
      </div>

      {/* Before / After Diff Panel after correction */}
      {lastDiff && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-emerald-200 flex items-center gap-2 text-sm font-bold text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Before / After Correction Diff (Transaction Committed)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-emerald-200 bg-white text-xs">
            <div className="p-3.5">
              <p className="text-slate-500">Previous Score (v{lastDiff.oldVersion})</p>
              <p className="font-display text-lg font-bold text-slate-700 line-through tabular-nums mt-0.5">
                {lastDiff.oldHomeScore} - {lastDiff.oldAwayScore}
              </p>
            </div>
            <div className="p-3.5">
              <p className="text-slate-500">Corrected Score (v{lastDiff.newVersion})</p>
              <p className="font-display text-lg font-bold text-emerald-700 tabular-nums mt-0.5">
                {lastDiff.newHomeScore} - {lastDiff.newAwayScore}
              </p>
            </div>
            <div className="p-3.5 tabular-nums">
              <p className="text-slate-500">Standings Points Delta</p>
              <p className="font-semibold text-slate-900 mt-1">
                {lastDiff.homeTeamName}: {lastDiff.homePointsDelta >= 0 ? '+' : ''}
                {lastDiff.homePointsDelta} pts · {lastDiff.awayTeamName}:{' '}
                {lastDiff.awayPointsDelta >= 0 ? '+' : ''}
                {lastDiff.awayPointsDelta} pts
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submit Result Form (for SCHEDULED matches) */}
      {match.status === 'SCHEDULED' && (
        <form onSubmit={handleSubmitResult} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Submit Official Match Result (Atomic Transaction)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Inserts MATCH_RESULT, marks MATCH as COMPLETED, updates STANDINGS, logs PLAYER_STATISTICS & cards.
              Any trigger violation (e.g., stats for a SUSPENDED player) rolls back the entire transaction.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <label htmlFor="sub-home" className="block text-xs font-semibold text-slate-700 mb-1">
                {match.home_name} Score
              </label>
              <input
                id="sub-home"
                type="number"
                min={0}
                required
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-full px-3 py-2 text-base font-bold border border-slate-200 rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="sub-away" className="block text-xs font-semibold text-slate-700 mb-1">
                {match.away_name} Score
              </label>
              <input
                id="sub-away"
                type="number"
                min={0}
                required
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-full px-3 py-2 text-base font-bold border border-slate-200 rounded-lg tabular-nums"
              />
            </div>
          </div>

          {/* Player Statistics Lines */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Player Match Statistics ({statRows.length})
              </h4>
              <button
                type="button"
                onClick={addStatLine}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#0B3D91] bg-blue-50 hover:bg-blue-100 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Player Stat
              </button>
            </div>
            {statRows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 items-end">
                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Player</label>
                  <select
                    value={row.playerId}
                    onChange={(e) => {
                      const pid = Number(e.target.value);
                      const pl = rosteredPlayers.find((p) => p.player_id === pid);
                      setStatRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, playerId: pid, teamId: pl?.team_id ?? r.teamId } : r))
                      );
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white"
                  >
                    {rosteredPlayers.map((p) => (
                      <option key={p.player_id} value={p.player_id}>
                        {p.full_name} ({p.team_name}) [{p.status}]
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Goals</label>
                  <input
                    type="number"
                    min={0}
                    value={row.goals}
                    onChange={(e) =>
                      setStatRows((prev) => prev.map((r, i) => (i === idx ? { ...r, goals: Number(e.target.value) } : r)))
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Assists</label>
                  <input
                    type="number"
                    min={0}
                    value={row.assists}
                    onChange={(e) =>
                      setStatRows((prev) => prev.map((r, i) => (i === idx ? { ...r, assists: Number(e.target.value) } : r)))
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Mins</label>
                  <input
                    type="number"
                    min={0}
                    max={130}
                    value={row.minutesPlayed}
                    onChange={(e) =>
                      setStatRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, minutesPlayed: Number(e.target.value) } : r))
                      )
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white tabular-nums"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setStatRows((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label="Remove stat line"
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded justify-self-end"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Disciplinary Cards Lines */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Disciplinary Cards ({cardRows.length})
              </h4>
              <button
                type="button"
                onClick={addCardLine}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Card
              </button>
            </div>
            {cardRows.map((c, idx) => (
              <div key={idx} className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 items-end">
                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Player</label>
                  <select
                    value={c.playerId}
                    onChange={(e) =>
                      setCardRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, playerId: Number(e.target.value) } : r))
                      )
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white"
                  >
                    {rosteredPlayers.map((p) => (
                      <option key={p.player_id} value={p.player_id}>
                        {p.full_name} ({p.team_name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Card Type</label>
                  <select
                    value={c.cardType}
                    onChange={(e) => {
                      const ct = e.target.value as 'YELLOW' | 'RED';
                      setCardRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, cardType: ct, suspensionMatches: ct === 'RED' ? 2 : 0 } : r
                        )
                      );
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white"
                  >
                    <option value="YELLOW">YELLOW</option>
                    <option value="RED">RED (Auto-Suspend)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Offence</label>
                  <input
                    type="text"
                    value={c.offence}
                    onChange={(e) =>
                      setCardRows((prev) => prev.map((r, i) => (i === idx ? { ...r, offence: e.target.value } : r)))
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setCardRows((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label="Remove card line"
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded justify-self-end"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg transition-colors"
            >
              Commit Result Transaction
            </button>
          </div>
        </form>
      )}

      {/* Recorded Match Stats + Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-display text-base font-bold text-slate-900">Recorded Player Statistics</h3>
          </div>
          {recordedStats.length === 0 ? (
            <p className="p-6 text-xs text-slate-500">No player statistics recorded for this match yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 px-4 text-left font-semibold">Player</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Team</th>
                    <th className="py-2.5 px-3 text-right font-semibold">G</th>
                    <th className="py-2.5 px-3 text-right font-semibold">A</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Min</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {recordedStats.map((s) => (
                    <tr key={s.stat_id}>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        <Link to={`/players/${s.player_id}`} className="hover:text-[#0B3D91]">
                          {s.full_name}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{s.team_name}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{s.goals}</td>
                      <td className="py-2.5 px-3 text-right">{s.assists}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{s.minutes_played}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-[#0B3D91]" />
            <h3 className="font-display text-base font-bold text-slate-900">RESULT_AUDIT & Discipline</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {auditHistory.length === 0 ? (
              <p className="p-6 text-xs text-slate-500">No audit entries yet (match not completed).</p>
            ) : (
              auditHistory.map((a) => (
                <div key={a.audit_id} className="px-5 py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{a.action}</span>
                    <span className="text-slate-500 ml-2 font-mono">{a.changed_at}</span>
                  </div>
                  <div className="font-mono font-semibold tabular-nums">
                    {a.old_home_score !== null ? (
                      <span>
                        <span className="text-slate-400 line-through mr-2">
                          {a.old_home_score}-{a.old_away_score}
                        </span>
                        <span className="text-emerald-700">
                          {a.new_home_score}-{a.new_away_score}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[#0B3D91]">
                        {a.new_home_score}-{a.new_away_score}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
            {cardsHistory.map((c) => (
              <div key={c.record_id} className="px-5 py-2.5 bg-slate-50 flex items-center justify-between text-xs">
                <span className="text-slate-700">
                  Card: <strong>{c.full_name}</strong> ({c.offence})
                </span>
                <span className={`font-bold ${c.card_type === 'RED' ? 'text-red-600' : 'text-amber-700'}`}>
                  {c.card_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Correct Result Modal */}
      <Modal
        open={correctOpen}
        onClose={() => setCorrectOpen(false)}
        title="Correct Match Result"
        subtitle="Reverses old standings contribution, applies new scores, increments version, and writes RESULT_AUDIT"
        maxWidth="sm"
      >
        <form onSubmit={handleCorrectResult} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="corr-home" className="block text-xs font-semibold text-slate-700 mb-1">
                {match.home_name}
              </label>
              <input
                id="corr-home"
                type="number"
                min={0}
                required
                value={corrHome}
                onChange={(e) => setCorrHome(e.target.value)}
                className="w-full px-3 py-2 text-base font-bold border border-slate-200 rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="corr-away" className="block text-xs font-semibold text-slate-700 mb-1">
                {match.away_name}
              </label>
              <input
                id="corr-away"
                type="number"
                min={0}
                required
                value={corrAway}
                onChange={(e) => setCorrAway(e.target.value)}
                className="w-full px-3 py-2 text-base font-bold border border-slate-200 rounded-lg tabular-nums"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setCorrectOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#0B3D91] rounded-lg"
            >
              Apply Correction
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
