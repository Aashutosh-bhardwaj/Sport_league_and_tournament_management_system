import React, { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { runQuery } from '../services/db';
import { downloadTextFile } from '../components/DataHelpers';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

type ReportKey = 'points' | 'scorers' | 'discipline' | 'venues' | 'team_history' | 'revenue';

const REPORT_META: Record<ReportKey, { title: string; sqlNote: string; sql: string }> = {
  points: {
    title: 'Tournament Points Table',
    sqlNote: 'Window Function ROW_NUMBER() OVER (PARTITION BY tournament_id ...)',
    sql: `SELECT tournament_name AS Tournament, rank_pos AS Rank, team_name AS Team, played AS P, won AS W, drawn AS D, lost AS L, goals_for AS GF, goals_against AS GA, goal_diff AS GD, points AS PTS FROM v_points_table ORDER BY tournament_id ASC, rank_pos ASC`,
  },
  scorers: {
    title: 'Top Scorers & Attacking Leaders',
    sqlNote: 'Aggregates + RANK() Window Function',
    sql: `SELECT scorer_rank AS Rank, full_name AS Player, team_name AS Team, tournament_name AS Tournament, matches_played AS Apps, total_goals AS Goals, total_assists AS Assists, total_minutes AS Minutes FROM v_top_scorers WHERE total_goals > 0 ORDER BY total_goals DESC, total_assists DESC`,
  },
  discipline: {
    title: 'Disciplinary & Suspension Report',
    sqlNote: 'GROUP BY + HAVING COUNT(record_id) > 0',
    sql: `SELECT full_name AS Player, team_name AS Team, player_status AS Status, tournament_name AS Tournament, yellow_cards AS Yellow, red_cards AS Red, total_suspension_matches AS Susp_Matches, last_card_date AS Last_Card FROM v_player_discipline_summary ORDER BY red_cards DESC, yellow_cards DESC`,
  },
  venues: {
    title: 'Venue Utilization & Scoring Average',
    sqlNote: 'LEFT JOIN + Conditional Aggregation',
    sql: `SELECT venue_name AS Venue, city AS City, surface_type AS Surface, capacity AS Capacity, total_matches AS Total_Matches, completed_matches AS Completed, scheduled_matches AS Scheduled, COALESCE(avg_goals_per_match, 0) AS Avg_Goals FROM v_venue_utilization ORDER BY total_matches DESC`,
  },
  team_history: {
    title: 'Team Performance History (Above-Average Subquery)',
    sqlNote: 'Correlated Subquery + Multi-table JOIN across Seasons',
    sql: `SELECT se.name AS Season, trn.name AS Tournament, tm.name AS Team, tm.category AS Category, s.played AS Played, s.won AS Won, s.drawn AS Drawn, s.lost AS Lost, s.goals_for AS GF, s.goal_diff AS GD, s.points AS Points FROM STANDINGS s INNER JOIN TEAM tm ON s.team_id = tm.team_id INNER JOIN TOURNAMENT trn ON s.tournament_id = trn.tournament_id INNER JOIN SEASON se ON trn.season_id = se.season_id ORDER BY se.name DESC, s.points DESC, s.goal_diff DESC`,
  },
  revenue: {
    title: 'Tournament Revenue Breakdown',
    sqlNote: 'GROUP BY + SUM(CASE WHEN category = ...)',
    sql: `SELECT tournament_name AS Tournament, season_name AS Season, payment_count AS Transactions, registration_revenue AS Registration_USD, sponsorship_revenue AS Sponsorship_USD, merchandise_revenue AS Merchandise_USD, other_revenue AS Other_USD, total_revenue AS Total_USD FROM v_tournament_revenue ORDER BY total_revenue DESC`,
  },
};

export function ReportsPage() {
  const { dbReady, dbVersion, addToast } = useApp();
  const [activeKey, setActiveKey] = useState<ReportKey>('points');

  const meta = REPORT_META[activeKey];

  const rows = useMemo(() => {
    if (!dbReady) return [];
    return runQuery<Record<string, unknown>>(meta.sql);
  }, [dbReady, dbVersion, meta.sql]);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const handleExportCsv = () => {
    if (rows.length === 0) return;
    const escapeCsv = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [columns.join(','), ...rows.map((r) => columns.map((c) => escapeCsv(r[c])).join(','))].join('\n');
    downloadTextFile(`report_${activeKey}.csv`, csv, 'text/csv;charset=utf-8');
    addToast('success', 'CSV Exported', `Downloaded report_${activeKey}.csv (${rows.length} rows).`);
  };

  return (
    <div className="space-y-5">
      <DbmsConceptBanner
        concept="Analytical Reporting (Joins, Subqueries & Window Functions)"
        description={meta.sqlNote}
        sqlHint={`${rows.length} rows`}
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(REPORT_META) as ReportKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveKey(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeKey === key
                  ? 'bg-[#0B3D91] text-white font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {REPORT_META[key].title}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">{meta.title}</h2>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate max-w-3xl">{meta.sql}</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 tabular-nums">{rows.length} rows</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                {columns.map((col) => (
                  <th key={col} className="py-2.5 px-4 text-left font-semibold whitespace-nowrap">
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  {columns.map((col) => (
                    <td key={col} className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                      {r[col] === null || r[col] === undefined ? '—' : String(r[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
