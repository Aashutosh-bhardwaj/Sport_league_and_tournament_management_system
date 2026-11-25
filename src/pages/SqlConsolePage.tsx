import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, GitBranch, Play } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getSchemaOverview, runQuery, runReadOnlySelect } from '../services/db';
import { Modal } from '../components/Modal';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

const PRESET_QUERIES = [
  {
    label: 'Points Table (View + Window)',
    sql: `SELECT rank_pos, team_name, played, won, drawn, lost, goal_diff, points\nFROM v_points_table\nWHERE tournament_id = 1\nORDER BY rank_pos ASC;`,
  },
  {
    label: 'Top Scorers (GROUP BY)',
    sql: `SELECT full_name, team_name, matches_played, total_goals, total_assists\nFROM v_top_scorers\nWHERE total_goals > 0\nORDER BY total_goals DESC, total_assists DESC\nLIMIT 15;`,
  },
  {
    label: 'Above-Average Scorers (Subquery)',
    sql: `SELECT t.name AS team, s.goals_for, s.points\nFROM STANDINGS s\nJOIN TEAM t ON s.team_id = t.team_id\nWHERE s.tournament_id = 1\n  AND s.goals_for > (SELECT AVG(goals_for) FROM STANDINGS WHERE tournament_id = 1)\nORDER BY s.points DESC;`,
  },
  {
    label: 'Venue Utilization (LEFT JOIN)',
    sql: `SELECT venue_name, city, capacity, total_matches, completed_matches, avg_goals_per_match\nFROM v_venue_utilization\nORDER BY total_matches DESC;`,
  },
  {
    label: 'Result Audit Log',
    sql: `SELECT ra.audit_id, ra.action, ht.name || ' vs ' || at.name AS fixture,\n       ra.old_home_score, ra.old_away_score, ra.new_home_score, ra.new_away_score, ra.changed_at\nFROM RESULT_AUDIT ra\nJOIN "MATCH" m ON ra.match_id = m.match_id\nJOIN TEAM ht ON m.home_team_id = ht.team_id\nJOIN TEAM at ON m.away_team_id = at.team_id\nORDER BY ra.audit_id DESC;`,
  },
];

export function SqlConsolePage() {
  const { dbReady, dbVersion } = useApp();
  const [sqlText, setSqlText] = useState(PRESET_QUERIES[0].sql);
  const [result, setResult] = useState<{ columns: string[]; rows: Record<string, unknown>[] } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'schema' | 'views' | 'triggers' | 'audit' | null>(null);

  const metadata = useMemo(() => {
    if (!dbReady) return null;
    return getSchemaOverview();
  }, [dbReady, dbVersion]);

  const auditRows = useMemo(() => {
    if (!dbReady || drawerTab !== 'audit') return [];
    return runQuery<{
      audit_id: number;
      match_id: number;
      action: string;
      fixture: string;
      old_home_score: number | null;
      old_away_score: number | null;
      new_home_score: number;
      new_away_score: number;
      changed_at: string;
    }>(
      `SELECT ra.audit_id, ra.match_id, ra.action, ht.name || ' vs ' || at.name AS fixture,
              ra.old_home_score, ra.old_away_score, ra.new_home_score, ra.new_away_score, ra.changed_at
       FROM RESULT_AUDIT ra
       JOIN "MATCH" m ON ra.match_id = m.match_id
       JOIN TEAM ht ON m.home_team_id = ht.team_id
       JOIN TEAM at ON m.away_team_id = at.team_id
       ORDER BY ra.audit_id DESC`
    );
  }, [dbReady, dbVersion, drawerTab]);

  const handleRun = () => {
    setErrorMsg(null);
    try {
      const res = runReadOnlySelect(sqlText);
      setResult(res);
    } catch (err) {
      setResult(null);
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-5">
      <DbmsConceptBanner
        concept="Live SQL Query Console & Data Dictionary"
        description="Execute live SELECT, WITH, or PRAGMA queries directly against the in-browser SQLite WASM database, or inspect DDL, Views, Triggers, and Audit History."
        sqlHint="sqlite_master"
      />

      {/* Inspection Action Buttons */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/er-diagram"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0B3D91] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg"
          >
            <GitBranch className="w-3.5 h-3.5" />
            View ER Diagram
          </Link>
          <button
            type="button"
            onClick={() => setDrawerTab('schema')}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            Schema / DDL ({metadata?.tables.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setDrawerTab('views')}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            Views List ({metadata?.views.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setDrawerTab('triggers')}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            Triggers List ({metadata?.triggers.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setDrawerTab('audit')}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            Audit Log
          </button>
        </div>
      </div>

      {/* Query Editor */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-1">Sample Queries:</span>
          {PRESET_QUERIES.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => setSqlText(q.sql)}
              className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
            >
              {q.label}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="sql-textarea" className="block text-xs font-semibold text-slate-700 mb-1.5">
            SQL SELECT Query (Read-Only)
          </label>
          <textarea
            id="sql-textarea"
            rows={5}
            value={sqlText}
            onChange={(e) => setSqlText(e.target.value)}
            className="w-full p-3.5 font-mono text-xs sm:text-sm bg-slate-950 text-emerald-300 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            spellCheck={false}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Note: Because MATCH is a SQLite keyword, quote it as <code>"MATCH"</code> (the console also auto-quotes bare FROM MATCH).
          </p>
          <button
            type="button"
            onClick={handleRun}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg shrink-0"
          >
            <Play className="w-4 h-4" />
            Run Query
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-mono">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Results Table */}
      {result && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-900">
              <Database className="w-4 h-4 text-[#0B3D91]" />
              Query Output
            </span>
            <span className="text-xs text-slate-500 tabular-nums">{result.rows.length} rows returned</span>
          </div>
          {result.rows.length === 0 ? (
            <p className="p-6 text-xs text-slate-500">Query executed successfully and returned 0 rows.</p>
          ) : (
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    {result.columns.map((c) => (
                      <th key={c} className="py-2.5 px-4 text-left font-semibold font-mono whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {result.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      {result.columns.map((c) => (
                        <td key={c} className="py-2 px-4 text-slate-800 whitespace-nowrap font-mono">
                          {row[c] === null || row[c] === undefined ? 'NULL' : String(row[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Metadata Modal */}
      <Modal
        open={drawerTab !== null}
        onClose={() => setDrawerTab(null)}
        title={
          drawerTab === 'schema'
            ? 'Relational Schema / DDL'
            : drawerTab === 'views'
            ? 'Defined SQL Views'
            : drawerTab === 'triggers'
            ? 'Active SQLite Triggers'
            : 'RESULT_AUDIT History'
        }
        maxWidth="2xl"
      >
        {drawerTab === 'schema' && metadata && (
          <div className="space-y-4">
            {metadata.tables.map((t) => (
              <div key={t.name} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-900 font-mono">
                  {t.name}
                </div>
                <pre className="p-3.5 text-[11px] font-mono text-slate-800 overflow-x-auto bg-white">
                  {t.sql}
                </pre>
              </div>
            ))}
          </div>
        )}

        {drawerTab === 'views' && metadata && (
          <div className="space-y-4">
            {metadata.views.map((v) => (
              <div key={v.name} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-[#0B3D91] font-mono">
                  {v.name}
                </div>
                <pre className="p-3.5 text-[11px] font-mono text-slate-800 overflow-x-auto bg-white">
                  {v.sql}
                </pre>
              </div>
            ))}
          </div>
        )}

        {drawerTab === 'triggers' && metadata && (
          <div className="space-y-4">
            {metadata.triggers.map((tr) => (
              <div key={tr.name} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-slate-900">{tr.name}</span>
                  <span className="text-slate-500">ON {tr.tbl_name}</span>
                </div>
                <pre className="p-3.5 text-[11px] font-mono text-slate-800 overflow-x-auto bg-white">
                  {tr.sql}
                </pre>
              </div>
            ))}
          </div>
        )}

        {drawerTab === 'audit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-2 px-3 text-left">Audit ID</th>
                  <th className="py-2 px-3 text-left">Action</th>
                  <th className="py-2 px-3 text-left">Fixture</th>
                  <th className="py-2 px-3 text-left">Old Score</th>
                  <th className="py-2 px-3 text-left">New Score</th>
                  <th className="py-2 px-3 text-left">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {auditRows.map((a) => (
                  <tr key={a.audit_id}>
                    <td className="py-2 px-3">#{a.audit_id}</td>
                    <td className="py-2 px-3 font-bold">{a.action}</td>
                    <td className="py-2 px-3 font-sans">{a.fixture}</td>
                    <td className="py-2 px-3">
                      {a.old_home_score !== null ? `${a.old_home_score}-${a.old_away_score}` : 'NULL'}
                    </td>
                    <td className="py-2 px-3 font-bold text-[#0B3D91]">
                      {a.new_home_score}-{a.new_away_score}
                    </td>
                    <td className="py-2 px-3 text-slate-500">{a.changed_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
