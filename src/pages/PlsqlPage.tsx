import React, { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { ORACLE_PLSQL_SQL } from '../db/sqlDefinitions';
import { downloadTextFile } from '../components/DataHelpers';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';
import { useApp } from '../context/AppContext';

export function PlsqlPage() {
  const { addToast } = useApp();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ORACLE_PLSQL_SQL);
      setCopied(true);
      addToast('success', 'Copied PL/SQL', 'Oracle PL/SQL script copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('info', 'Clipboard Unavailable', 'Use Download oracle_plsql.sql to save the file.');
    }
  };

  return (
    <div className="space-y-5">
      <DbmsConceptBanner
        concept="Oracle PL/SQL Equivalent (Stored Procedures, Triggers & Exception Handling)"
        description="Complete Oracle 19c+ script featuring sequences, MERGE standings trigger, submit_match_result, and correct_match_result with SAVEPOINT, COMMIT, and ROLLBACK."
        sqlHint="oracle_plsql.sql"
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">oracle_plsql.sql</h2>
          <p className="text-xs text-slate-500">
            Includes DDL, 14 Sequences, trg_update_standings_after_result, submit_match_result, and correct_match_result
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Code'}
          </button>
          <button
            type="button"
            onClick={() => {
              downloadTextFile('oracle_plsql.sql', ORACLE_PLSQL_SQL, 'application/sql;charset=utf-8');
              addToast('success', 'Downloaded', 'Saved oracle_plsql.sql.');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg"
          >
            <Download className="w-3.5 h-3.5" />
            Download oracle_plsql.sql
          </button>
        </div>
      </div>

      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
        <pre className="p-5 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-[680px]">
          {ORACLE_PLSQL_SQL}
        </pre>
      </div>
    </div>
  );
}
