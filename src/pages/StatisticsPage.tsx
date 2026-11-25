import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../context/AppContext';
import { runQuery } from '../services/db';
import { TeamBadge } from '../components/TeamBadge';
import { StatusLabel } from '../components/DataHelpers';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

export function StatisticsPage() {
  const { dbReady, dbVersion, seasonFilter } = useApp();
  const [tab, setTab] = useState<'scorers' | 'assists' | 'discipline'>('scorers');

  const data = useMemo(() => {
    if (!dbReady) return null;
    const isAll = seasonFilter === 'ALL';
    const params = isAll ? [] : [seasonFilter];

    const scorers = runQuery<{
      player_id: number;
      full_name: string;
      position: string;
      status: string;
      team_id: number;
      team_name: string;
      logo_color: string;
      tournament_name: string;
      matches_played: number;
      total_goals: number;
      total_assists: number;
      total_minutes: number;
    }>(
      `SELECT
         player_id, full_name, position, status, team_id, team_name, logo_color,
         tournament_name, matches_played, total_goals, total_assists, total_minutes
       FROM v_top_scorers
       WHERE 1=1 ${isAll ? '' : 'AND season_name = ?'}
       ORDER BY total_goals DESC, total_assists DESC
       LIMIT 20`,
      params
    );

    const assisters = runQuery<{
      player_id: number;
      full_name: string;
      team_id: number;
      team_name: string;
      logo_color: string;
      tournament_name: string;
      matches_played: number;
      total_assists: number;
      total_goals: number;
    }>(
      `SELECT
         player_id, full_name, team_id, team_name, logo_color,
         tournament_name, matches_played, total_assists, total_goals
       FROM v_top_scorers
       WHERE total_assists > 0 ${isAll ? '' : 'AND season_name = ?'}
       ORDER BY total_assists DESC, total_goals DESC
       LIMIT 20`,
      params
    );

    const discipline = runQuery<{
      player_id: number;
      full_name: string;
      player_status: string;
      team_name: string;
      tournament_name: string;
      yellow_cards: number;
      red_cards: number;
      total_suspension_matches: number;
      last_card_date: string;
    }>(
      `SELECT
         player_id, full_name, player_status, team_name, tournament_name,
         yellow_cards, red_cards, total_suspension_matches, last_card_date
       FROM v_player_discipline_summary
       WHERE 1=1 ${isAll ? '' : 'AND season_name = ?'}
       ORDER BY red_cards DESC, yellow_cards DESC`,
      params
    );

    const chartData = scorers.slice(0, 8).map((s) => ({
      name: s.full_name.split(' ').slice(-1)[0],
      goals: s.total_goals,
      assists: s.total_assists,
    }));

    return { scorers, assisters, discipline, chartData };
  }, [dbReady, dbVersion, seasonFilter]);

  if (!data) return null;

  return (
    <div className="space-y-5">
      <DbmsConceptBanner
        concept="Aggregate Views & HAVING Clauses"
        description="Leaderboards are powered by v_top_scorers (SUM/COUNT + RANK window) and v_player_discipline_summary (GROUP BY + HAVING COUNT(record_id) > 0)."
        sqlHint="v_top_scorers · v_player_discipline_summary"
      />

      {/* Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-display text-base font-bold text-slate-900 mb-1">
          Top Attacking Contributors (Goals & Assists)
        </h2>
        <p className="text-xs text-slate-500 mb-4">Aggregated directly from PLAYER_STATISTICS</p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.chartData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="goals" name="Goals" fill="#0B3D91" radius={[6, 6, 0, 0]} />
              <Bar dataKey="assists" name="Assists" fill="#16A34A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs + Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setTab('scorers')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                tab === 'scorers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Top Scorers
            </button>
            <button
              type="button"
              onClick={() => setTab('assists')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                tab === 'assists' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Assist Leaders
            </button>
            <button
              type="button"
              onClick={() => setTab('discipline')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                tab === 'discipline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Disciplinary & Cards
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {tab === 'scorers' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="py-3 px-4 text-left font-semibold">#</th>
                  <th className="py-3 px-4 text-left font-semibold">Player</th>
                  <th className="py-3 px-4 text-left font-semibold">Team</th>
                  <th className="py-3 px-4 text-left font-semibold">Tournament</th>
                  <th className="py-3 px-3 text-right font-semibold">Apps</th>
                  <th className="py-3 px-3 text-right font-semibold">Goals</th>
                  <th className="py-3 px-3 text-right font-semibold">Assists</th>
                  <th className="py-3 px-4 text-right font-semibold">Mins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {data.scorers.map((s, idx) => (
                  <tr key={`${s.player_id}-${s.tournament_name}`} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-600">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      <Link to={`/players/${s.player_id}`} className="hover:text-[#0B3D91]">
                        {s.full_name}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4">
                      <Link to={`/teams/${s.team_id}`} className="inline-flex items-center gap-2 hover:underline">
                        <TeamBadge name={s.team_name} color={s.logo_color} size="xs" />
                        <span className="text-xs font-medium">{s.team_name}</span>
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600">{s.tournament_name}</td>
                    <td className="py-2.5 px-3 text-right">{s.matches_played}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#0B3D91]">{s.total_goals}</td>
                    <td className="py-2.5 px-3 text-right">{s.total_assists}</td>
                    <td className="py-2.5 px-4 text-right text-slate-500">{s.total_minutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'assists' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="py-3 px-4 text-left font-semibold">#</th>
                  <th className="py-3 px-4 text-left font-semibold">Player</th>
                  <th className="py-3 px-4 text-left font-semibold">Team</th>
                  <th className="py-3 px-4 text-left font-semibold">Tournament</th>
                  <th className="py-3 px-3 text-right font-semibold">Apps</th>
                  <th className="py-3 px-3 text-right font-semibold">Assists</th>
                  <th className="py-3 px-4 text-right font-semibold">Goals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {data.assisters.map((s, idx) => (
                  <tr key={`${s.player_id}-${s.tournament_name}`} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-600">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      <Link to={`/players/${s.player_id}`} className="hover:text-[#0B3D91]">
                        {s.full_name}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4">
                      <Link to={`/teams/${s.team_id}`} className="inline-flex items-center gap-2 hover:underline">
                        <TeamBadge name={s.team_name} color={s.logo_color} size="xs" />
                        <span className="text-xs font-medium">{s.team_name}</span>
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600">{s.tournament_name}</td>
                    <td className="py-2.5 px-3 text-right">{s.matches_played}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{s.total_assists}</td>
                    <td className="py-2.5 px-4 text-right">{s.total_goals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'discipline' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="py-3 px-4 text-left font-semibold">Player</th>
                  <th className="py-3 px-4 text-left font-semibold">Team</th>
                  <th className="py-3 px-4 text-left font-semibold">Status</th>
                  <th className="py-3 px-3 text-right font-semibold">Yellow</th>
                  <th className="py-3 px-3 text-right font-semibold">Red</th>
                  <th className="py-3 px-4 text-right font-semibold">Susp. Matches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {data.discipline.map((d) => (
                  <tr key={`${d.player_id}-${d.tournament_name}`} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      <Link to={`/players/${d.player_id}`} className="hover:text-[#0B3D91]">
                        {d.full_name}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-700">{d.team_name ?? '—'}</td>
                    <td className="py-2.5 px-4">
                      <StatusLabel status={d.player_status} />
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-amber-700">{d.yellow_cards}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-red-600">{d.red_cards}</td>
                    <td className="py-2.5 px-4 text-right">{d.total_suspension_matches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
