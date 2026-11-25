import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { runQuery } from '../services/db';
import { TeamBadge } from '../components/TeamBadge';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

export function StandingsPage() {
  const { dbReady, dbVersion, seasonFilter } = useApp();
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');

  const tournaments = useMemo(() => {
    if (!dbReady) return [];
    const isAll = seasonFilter === 'ALL';
    return runQuery<{ tournament_id: number; name: string; season_name: string; format: string; status: string }>(
      `SELECT t.tournament_id, t.name, s.name AS season_name, t.format, t.status
       FROM TOURNAMENT t INNER JOIN SEASON s ON t.season_id = s.season_id
       ${isAll ? '' : 'WHERE s.name = ?'}
       ORDER BY s.name DESC, t.tournament_id ASC`,
      isAll ? [] : [seasonFilter]
    );
  }, [dbReady, dbVersion, seasonFilter]);

  const activeTid = useMemo(() => {
    if (selectedTournamentId && tournaments.some((t) => String(t.tournament_id) === selectedTournamentId)) {
      return Number(selectedTournamentId);
    }
    return tournaments[0]?.tournament_id ?? 1;
  }, [selectedTournamentId, tournaments]);

  const rows = useMemo(() => {
    if (!dbReady) return [];
    const ptsRows = runQuery<{
      rank_pos: number;
      team_id: number;
      team_name: string;
      city: string;
      logo_color: string;
      category: string;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goals_for: number;
      goals_against: number;
      goal_diff: number;
      points: number;
    }>(
      `SELECT rank_pos, team_id, team_name, city, logo_color, category, played, won, drawn, lost, goals_for, goals_against, goal_diff, points
       FROM v_points_table WHERE tournament_id = ? ORDER BY rank_pos ASC`,
      [activeTid]
    );

    const formRows = runQuery<{ team_id: number; form_string: string }>(
      `SELECT team_id, form_string FROM v_team_form WHERE tournament_id = ?`,
      [activeTid]
    );
    const formMap = new Map(formRows.map((f) => [f.team_id, f.form_string]));

    return ptsRows.map((r) => ({
      ...r,
      form: formMap.get(r.team_id) ?? '',
    }));
  }, [dbReady, dbVersion, activeTid]);

  return (
    <div className="space-y-5">
      <DbmsConceptBanner
        concept="SQL View & Window Function (ROW_NUMBER)"
        description="Rankings are computed dynamically via v_points_table using ROW_NUMBER() OVER (PARTITION BY tournament_id ORDER BY points DESC, goal_diff DESC, goals_for DESC)."
        sqlHint="SELECT * FROM v_points_table"
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="st-trn" className="text-xs font-semibold text-slate-700">
            Tournament:
          </label>
          <select
            id="st-trn"
            value={String(activeTid)}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg bg-white"
          >
            {tournaments.map((t) => (
              <option key={t.tournament_id} value={t.tournament_id}>
                {t.name} ({t.season_name})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" aria-hidden="true" />
            Top 2: Championship Qualification
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500" aria-hidden="true" />
            Bottom 2: Relegation Zone
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 text-left font-semibold">#</th>
                <th className="py-3 px-4 text-left font-semibold">Team</th>
                <th className="py-3 px-3 text-right font-semibold">P</th>
                <th className="py-3 px-3 text-right font-semibold">W</th>
                <th className="py-3 px-3 text-right font-semibold">D</th>
                <th className="py-3 px-3 text-right font-semibold">L</th>
                <th className="py-3 px-3 text-right font-semibold">GF</th>
                <th className="py-3 px-3 text-right font-semibold">GA</th>
                <th className="py-3 px-3 text-right font-semibold">GD</th>
                <th className="py-3 px-4 text-right font-semibold">PTS</th>
                <th className="py-3 px-4 text-left font-semibold">Form (Last 5)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {rows.map((r, idx) => {
                const isTop = idx < 2;
                const isBottom = rows.length >= 6 && idx >= rows.length - 2;
                const zoneLabel = isTop ? 'Q' : isBottom ? 'R' : '';
                return (
                  <tr
                    key={r.team_id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isTop ? 'bg-emerald-50/35' : isBottom ? 'bg-red-50/35' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-700">
                      <span className="inline-flex items-center gap-1.5">
                        {r.rank_pos}
                        {zoneLabel && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isTop ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {zoneLabel}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link to={`/teams/${r.team_id}`} className="flex items-center gap-2.5 group">
                        <TeamBadge name={r.team_name} color={r.logo_color} size="xs" />
                        <span className="font-semibold text-slate-900 group-hover:text-[#0B3D91]">
                          {r.team_name}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">{r.played}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{r.won}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{r.drawn}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{r.lost}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{r.goals_for}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{r.goals_against}</td>
                    <td
                      className={`py-3 px-3 text-right font-semibold ${
                        r.goal_diff > 0 ? 'text-emerald-700' : r.goal_diff < 0 ? 'text-red-600' : 'text-slate-600'
                      }`}
                    >
                      {r.goal_diff > 0 ? `+${r.goal_diff}` : r.goal_diff}
                    </td>
                    <td className="py-3 px-4 text-right font-display font-bold text-slate-900">{r.points}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {r.form
                          ? r.form.split('-').map((res, i) => (
                              <span
                                key={i}
                                className={`w-5 h-5 rounded text-[10px] font-bold inline-flex items-center justify-center ${
                                  res === 'W'
                                    ? 'bg-emerald-600 text-white'
                                    : res === 'D'
                                    ? 'bg-slate-300 text-slate-800'
                                    : 'bg-red-500 text-white'
                                }`}
                              >
                                {res}
                              </span>
                            ))
                          : <span className="text-xs text-slate-400">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
