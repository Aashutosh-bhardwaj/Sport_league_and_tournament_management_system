import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { runExec, runQuery } from '../services/db';
import { TeamBadge } from '../components/TeamBadge';
import { StatusLabel } from '../components/DataHelpers';
import { Modal } from '../components/Modal';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

export function TeamDetailPage() {
  const { id } = useParams();
  const teamId = Number(id);
  const navigate = useNavigate();
  const { dbReady, dbVersion, addToast, requestConfirm } = useApp();

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    playerId: '',
    tournamentId: '1',
    jerseyNo: '25',
  });

  const data = useMemo(() => {
    if (!dbReady || !Number.isFinite(teamId)) return null;

    const team = runQuery<{
      team_id: number;
      name: string;
      city: string;
      coach_name: string;
      founded_year: number;
      logo_color: string;
      category: string;
    }>(`SELECT * FROM TEAM WHERE team_id = ?`, [teamId])[0];

    if (!team) return null;

    const standings = runQuery<{
      tournament_id: number;
      tournament_name: string;
      season_name: string;
      rank_pos: number;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goals_for: number;
      goals_against: number;
      goal_diff: number;
      points: number;
    }>(
      `SELECT tournament_id, tournament_name, season_name, rank_pos, played, won, drawn, lost, goals_for, goals_against, goal_diff, points
       FROM v_points_table WHERE team_id = ? ORDER BY season_name DESC`,
      [teamId]
    );

    const forms = runQuery<{ tournament_id: number; form_string: string }>(
      `SELECT tournament_id, form_string FROM v_team_form WHERE team_id = ?`,
      [teamId]
    );

    const roster = runQuery<{
      roster_id: number;
      player_id: number;
      full_name: string;
      position: string;
      status: string;
      jersey_no: number;
      tournament_id: number;
      tournament_name: string;
      joined_on: string;
      goals: number;
      assists: number;
    }>(
      `SELECT
         tr.roster_id, p.player_id, p.full_name, p.position, p.status,
         tr.jersey_no, tr.tournament_id, trn.name AS tournament_name, tr.joined_on,
         COALESCE(SUM(ps.goals), 0) AS goals,
         COALESCE(SUM(ps.assists), 0) AS assists
       FROM TEAM_ROSTER tr
       INNER JOIN PLAYER p ON tr.player_id = p.player_id
       INNER JOIN TOURNAMENT trn ON tr.tournament_id = trn.tournament_id
       LEFT JOIN PLAYER_STATISTICS ps ON ps.player_id = p.player_id AND ps.team_id = tr.team_id
       WHERE tr.team_id = ?
       GROUP BY tr.roster_id
       ORDER BY trn.tournament_id ASC, tr.jersey_no ASC`,
      [teamId]
    );

    const matches = runQuery<{
      match_id: number;
      match_date: string;
      start_time: string;
      status: string;
      tournament_name: string;
      home_team_id: number;
      home_name: string;
      home_color: string;
      away_team_id: number;
      away_name: string;
      away_color: string;
      home_score: number | null;
      away_score: number | null;
      venue_name: string;
    }>(
      `SELECT
         m.match_id, m.match_date, m.start_time, m.status, trn.name AS tournament_name,
         m.home_team_id, ht.name AS home_name, ht.logo_color AS home_color,
         m.away_team_id, at.name AS away_name, at.logo_color AS away_color,
         mr.home_score, mr.away_score, v.name AS venue_name
       FROM "MATCH" m
       INNER JOIN TOURNAMENT trn ON m.tournament_id = trn.tournament_id
       INNER JOIN TEAM ht ON m.home_team_id = ht.team_id
       INNER JOIN TEAM at ON m.away_team_id = at.team_id
       INNER JOIN VENUE v ON m.venue_id = v.venue_id
       LEFT JOIN MATCH_RESULT mr ON m.match_id = mr.match_id
       WHERE m.home_team_id = ? OR m.away_team_id = ?
       ORDER BY m.match_date DESC, m.start_time DESC`,
      [teamId, teamId]
    );

    const allPlayers = runQuery<{ player_id: number; full_name: string; position: string }>(
      `SELECT player_id, full_name, position FROM PLAYER ORDER BY full_name ASC`
    );
    const tournaments = runQuery<{ tournament_id: number; name: string }>(
      `SELECT tournament_id, name FROM TOURNAMENT ORDER BY tournament_id ASC`
    );

    return { team, standings, forms, roster, matches, allPlayers, tournaments };
  }, [dbReady, dbVersion, teamId]);

  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-sm font-semibold text-slate-800">Team not found</p>
        <Link to="/teams" className="inline-block mt-3 text-xs font-semibold text-[#0B3D91] hover:underline">
          Back to Teams
        </Link>
      </div>
    );
  }

  const handleEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      runExec(
        `INSERT INTO TEAM_ROSTER (team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (?, ?, ?, ?, date('now'))`,
        [teamId, Number(enrollForm.playerId), Number(enrollForm.tournamentId), Number(enrollForm.jerseyNo)]
      );
      addToast('success', 'Player Enrolled', 'Added player to TEAM_ROSTER.');
      setEnrollOpen(false);
    } catch (err) {
      addToast('error', 'Roster Trigger / Constraint', err instanceof Error ? err.message : String(err));
    }
  };

  const handleRemoveRoster = (rosterId: number, playerName: string) => {
    requestConfirm({
      title: 'Remove from Roster?',
      message: `Remove ${playerName} from this tournament roster?`,
      confirmLabel: 'Remove',
      onConfirm: () => {
        runExec(`DELETE FROM TEAM_ROSTER WHERE roster_id = ?`, [rosterId]);
        addToast('success', 'Roster Updated', `${playerName} removed from roster.`);
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/teams')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </button>
      </div>

      <DbmsConceptBanner
        concept="Associative Entity (TEAM_ROSTER) & Trigger"
        description="TEAM_ROSTER maintains per-tournament membership and jersey numbers. trg_block_double_roster prevents a player from joining two teams in the same tournament."
        sqlHint="UNIQUE(player_id, tournament_id)"
      />

      {/* Team Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <TeamBadge name={data.team.name} color={data.team.logo_color} size="lg" />
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">{data.team.name}</h2>
            <p className="text-xs text-slate-500 mt-1">
              {data.team.city} · Coach: <strong className="text-slate-700">{data.team.coach_name}</strong> · Founded{' '}
              {data.team.founded_year} · {data.team.category} Division
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {data.standings.map((s) => {
            const formRow = data.forms.find((f) => f.tournament_id === s.tournament_id);
            return (
              <div key={s.tournament_id} className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <p className="font-semibold text-slate-900">{s.tournament_name}</p>
                <p className="text-slate-600 mt-0.5 tabular-nums">
                  Rank <strong>#{s.rank_pos}</strong> · {s.points} pts ({s.won}W-{s.drawn}D-{s.lost}L)
                  {formRow ? ` · Form: ${formRow.form_string}` : ''}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Roster */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Tournament Roster ({data.roster.length})
              </h3>
              <p className="text-xs text-slate-500">Historical & active tournament assignments</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEnrollForm({
                  playerId: String(data.allPlayers[0]?.player_id ?? ''),
                  tournamentId: String(data.tournaments[0]?.tournament_id ?? '1'),
                  jerseyNo: '25',
                });
                setEnrollOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              Assign Player
            </button>
          </div>
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2.5 px-3 text-left font-semibold">#</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Player</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Tournament</th>
                  <th className="py-2.5 px-3 text-right font-semibold">G / A</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Status</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {data.roster.map((r) => (
                  <tr key={r.roster_id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-700">{r.jersey_no}</td>
                    <td className="py-2.5 px-3">
                      <Link to={`/players/${r.player_id}`} className="font-semibold text-slate-900 hover:text-[#0B3D91]">
                        {r.full_name}
                      </Link>
                      <p className="text-[11px] text-slate-500">{r.position}</p>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{r.tournament_name}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                      {r.goals} / {r.assists}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusLabel status={r.status} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveRoster(r.roster_id, r.full_name)}
                        aria-label={`Remove ${r.full_name} from roster`}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Match History */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-display text-base font-bold text-slate-900">
              Match Schedule & Results ({data.matches.length})
            </h3>
            <p className="text-xs text-slate-500">Click any fixture to submit or correct results</p>
          </div>
          <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
            {data.matches.map((m) => (
              <Link
                key={m.match_id}
                to={`/matches/${m.match_id}`}
                className="block px-5 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <TeamBadge name={m.home_name} color={m.home_color} size="xs" />
                    <span className="text-xs font-semibold text-slate-900 truncate">{m.home_name}</span>
                  </div>
                  {m.home_score !== null ? (
                    <span className="px-2.5 py-0.5 rounded bg-[#0B3D91] text-white text-xs font-bold tabular-nums">
                      {m.home_score} - {m.away_score}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">vs</span>
                  )}
                  <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-900 truncate text-right">{m.away_name}</span>
                    <TeamBadge name={m.away_name} color={m.away_color} size="xs" />
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {m.match_date} · {m.start_time} · {m.venue_name}
                  </span>
                  <StatusLabel status={m.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Assign Player Modal */}
      <Modal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        title={`Assign Player to ${data.team.name}`}
        subtitle="Demonstrates UNIQUE(player_id, tournament_id) and trg_block_double_roster"
      >
        <form onSubmit={handleEnroll} className="space-y-4">
          <div>
            <label htmlFor="enroll-player" className="block text-xs font-semibold text-slate-700 mb-1">
              Select Player
            </label>
            <select
              id="enroll-player"
              value={enrollForm.playerId}
              onChange={(e) => setEnrollForm({ ...enrollForm, playerId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            >
              {data.allPlayers.map((p) => (
                <option key={p.player_id} value={p.player_id}>
                  {p.full_name} ({p.position})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="enroll-tournament" className="block text-xs font-semibold text-slate-700 mb-1">
                Tournament
              </label>
              <select
                id="enroll-tournament"
                value={enrollForm.tournamentId}
                onChange={(e) => setEnrollForm({ ...enrollForm, tournamentId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                {data.tournaments.map((tr) => (
                  <option key={tr.tournament_id} value={tr.tournament_id}>
                    {tr.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="enroll-jersey" className="block text-xs font-semibold text-slate-700 mb-1">
                Jersey No (1-99)
              </label>
              <input
                id="enroll-jersey"
                type="number"
                min={1}
                max={99}
                required
                value={enrollForm.jerseyNo}
                onChange={(e) => setEnrollForm({ ...enrollForm, jerseyNo: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setEnrollOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#0B3D91] rounded-lg"
            >
              Assign to Roster
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
