import React, { useEffect, useState } from 'react';
import { Database, Download, FileArchive, HardDriveUpload, RefreshCw, RotateCcw, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  exportDatabaseBytes,
  getDbRunner,
  resetDatabase,
  runExec,
  runTransaction,
  syncDatabaseToLocalServer,
} from '../services/db';
import { getPointsRules } from '../services/leagueLogic';
import {
  exportMysqlCompleteSql,
  exportPostgresCompleteSql,
  exportSqliteCompleteSql,
} from '../db/sqlDialects';
import { downloadBinaryFile, downloadTextFile } from '../components/DataHelpers';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

interface DiskDbInfo {
  exists: boolean;
  path: string;
  sizeBytes: number;
  lastModified: string | null;
  tablesCount: number;
  teamsCount: number;
  playersCount: number;
  matchesCount: number;
}

export function SettingsPage() {
  const { dbReady, dbVersion, addToast, requestConfirm } = useApp();
  const [winPts, setWinPts] = useState('3');
  const [drawPts, setDrawPts] = useState('1');
  const [lossPts, setLossPts] = useState('0');
  const [yellowThresh, setYellowThresh] = useState('3');
  const [zipLoading, setZipLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [diskInfo, setDiskInfo] = useState<DiskDbInfo | null>(null);

  const fetchDiskInfo = async () => {
    try {
      const res = await fetch('/api/db/status');
      if (res.ok) {
        const data = (await res.json()) as DiskDbInfo;
        setDiskInfo(data);
      }
    } catch {
      // Ignore if running in static-only mode without backend
    }
  };

  useEffect(() => {
    if (!dbReady) return;
    const rules = getPointsRules(getDbRunner());
    setWinPts(String(rules.win));
    setDrawPts(String(rules.draw));
    setLossPts(String(rules.loss));
    setYellowThresh(String(rules.yellowCardThreshold));
    void fetchDiskInfo();
  }, [dbReady, dbVersion]);

  const handleSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      runTransaction(() => {
        runExec(`INSERT OR REPLACE INTO LEAGUE_SETTINGS (setting_key, setting_value) VALUES ('points_win', ?)`, [winPts]);
        runExec(`INSERT OR REPLACE INTO LEAGUE_SETTINGS (setting_key, setting_value) VALUES ('points_draw', ?)`, [drawPts]);
        runExec(`INSERT OR REPLACE INTO LEAGUE_SETTINGS (setting_key, setting_value) VALUES ('points_loss', ?)`, [lossPts]);
        runExec(
          `INSERT OR REPLACE INTO LEAGUE_SETTINGS (setting_key, setting_value) VALUES ('yellow_card_threshold', ?)`,
          [yellowThresh]
        );
      });
      addToast('success', 'Rules Saved', 'Updated LEAGUE_SETTINGS table in SQLite.');
    } catch (err) {
      addToast('error', 'Failed to Save', err instanceof Error ? err.message : String(err));
    }
  };

  const handleDownloadProjectZip = async () => {
    if (zipLoading) return;
    setZipLoading(true);
    try {
      // Sync latest browser SQLite state to disk before zipping so the ZIP includes live edits
      try {
        await syncDatabaseToLocalServer();
      } catch {
        // Proceed with server disk copy if sync is skipped
      }
      const res = await fetch('/api/export-project.zip');
      if (!res.ok) {
        throw new Error('Could not build project ZIP archive.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sports-league-management-system.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast(
        'success',
        'Complete Project ZIP Ready',
        'Downloaded sports-league-management-system.zip with source code, sports_league.db, and SQL scripts.'
      );
      void fetchDiskInfo();
    } catch (err) {
      addToast('error', 'ZIP Download Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setZipLoading(false);
    }
  };

  const handleDownloadSqliteBinary = () => {
    const bytes = exportDatabaseBytes();
    downloadBinaryFile('sports_league.db', bytes, 'application/x-sqlite3');
    addToast('success', 'SQLite Database Exported', 'Open sports_league.db in DB Browser for SQLite, DBeaver, or VS Code.');
  };

  const handleSyncToDisk = async () => {
    setSyncLoading(true);
    try {
      const res = await syncDatabaseToLocalServer();
      if (res.status) {
        setDiskInfo(res.status);
      }
      addToast('success', 'Synced to Local Disk', 'Updated database/sports_league.db with your current browser data.');
    } catch (err) {
      addToast('error', 'Sync Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setSyncLoading(false);
    }
  };

  const handleReloadSample = () => {
    requestConfirm({
      title: 'Reload Sample Database?',
      message: 'This will wipe any local edits and restore the original seeded dataset (24 teams, 480 players, 72 matches, $18,560 payments).',
      confirmLabel: 'Reload Sample Data',
      danger: false,
      onConfirm: async () => {
        await resetDatabase(true);
        addToast('success', 'Sample Data Restored', 'Database re-initialized and persisted to IndexedDB.');
      },
    });
  };

  const handleEmptyReset = () => {
    requestConfirm({
      title: 'Reset to Empty Schema?',
      message: 'This will drop all rows and recreate an empty 3NF schema (with default points rules). Use Reload Sample Data to restore sample data.',
      confirmLabel: 'Reset Empty DB',
      danger: true,
      onConfirm: async () => {
        await resetDatabase(false);
        runTransaction(() => {
          runExec(`INSERT OR REPLACE INTO LEAGUE_SETTINGS VALUES ('points_win', '3')`);
          runExec(`INSERT OR REPLACE INTO LEAGUE_SETTINGS VALUES ('points_draw', '1')`);
          runExec(`INSERT OR REPLACE INTO LEAGUE_SETTINGS VALUES ('points_loss', '0')`);
          runExec(`INSERT OR REPLACE INTO LEAGUE_SETTINGS VALUES ('yellow_card_threshold', '3')`);
        });
        addToast('info', 'Database Cleared', 'Recreated empty relational schema.');
      },
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <DbmsConceptBanner
        concept="Configurable Rules, Project ZIP Export & Local SQL Connectivity"
        description="Download the complete project ZIP to run locally, export a real .db SQLite file or MySQL/PostgreSQL/SQLite scripts, and manage LEAGUE_SETTINGS."
        sqlHint="SQLite / MySQL / PostgreSQL"
      />

      {/* Complete Project ZIP & Local SQL Export */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Download Complete Project ZIP & Local SQL Databases
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Download the full source project as a ready-to-extract ZIP including <code>server.ts</code>,{' '}
              <code>database/sports_league.db</code>, and SQL scripts for SQLite, MySQL (XAMPP/Workbench), PostgreSQL, and Oracle.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadProjectZip}
            disabled={zipLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg transition-colors disabled:opacity-60 shrink-0"
          >
            <FileArchive className="w-4 h-4" />
            {zipLoading ? 'Building ZIP...' : 'Download Project ZIP'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={handleDownloadSqliteBinary}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-left rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <Database className="w-4 h-4 text-[#0B3D91] shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">SQLite File (.db)</p>
              <p className="text-[11px] text-slate-500 truncate">DB Browser / DBeaver</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              downloadTextFile('sqlite_complete.sql', exportSqliteCompleteSql(), 'application/sql;charset=utf-8');
              addToast('success', 'SQLite SQL Exported', 'Downloaded sqlite_complete.sql.');
            }}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-left rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-700 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">SQLite Script (.sql)</p>
              <p className="text-[11px] text-slate-500 truncate">Schema + Views + Triggers</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              downloadTextFile('mysql_complete.sql', exportMysqlCompleteSql(), 'application/sql;charset=utf-8');
              addToast('success', 'MySQL SQL Exported', 'Import mysql_complete.sql in MySQL Workbench or phpMyAdmin.');
            }}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-left rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <Download className="w-4 h-4 text-amber-700 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">MySQL / XAMPP (.sql)</p>
              <p className="text-[11px] text-slate-500 truncate">MySQL 8+ & MariaDB</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              downloadTextFile('postgresql_complete.sql', exportPostgresCompleteSql(), 'application/sql;charset=utf-8');
              addToast('success', 'PostgreSQL SQL Exported', 'Import postgresql_complete.sql in pgAdmin or psql.');
            }}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-left rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <Download className="w-4 h-4 text-indigo-700 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">PostgreSQL (.sql)</p>
              <p className="text-[11px] text-slate-500 truncate">pgAdmin / psql / Neon</p>
            </div>
          </button>
        </div>

        {/* Local Disk SQLite File Sync */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-900">
                Local Disk Database: <code className="font-mono text-[#0B3D91]">database/sports_league.db</code>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                {diskInfo?.exists
                  ? `${diskInfo.tablesCount} tables · ${diskInfo.teamsCount} teams · ${diskInfo.playersCount} players · ${diskInfo.matchesCount} matches · ${(diskInfo.sizeBytes / 1024).toFixed(1)} KB`
                  : 'Generated automatically on local server startup (npm run dev or npm run db:init).'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSyncToDisk}
              disabled={syncLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors disabled:opacity-60"
            >
              <HardDriveUpload className="w-3.5 h-3.5 text-[#0B3D91]" />
              {syncLoading ? 'Syncing...' : 'Sync Browser DB to Disk'}
            </button>
          </div>

          <div className="bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-[11px] leading-relaxed overflow-x-auto">
            <div># After extracting sports-league-management-system.zip locally:</div>
            <div>npm install</div>
            <div>npm run db:init &nbsp;&nbsp;# Creates database/sports_league.db &amp; SQL dumps</div>
            <div>npm run dev &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Starts app + SQL API on http://localhost:3000</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveRules} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">League Points & Disciplinary Rules</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Applied automatically on subsequent result submissions, corrections, and yellow-card accumulation triggers.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label htmlFor="s-win" className="block text-xs font-semibold text-slate-700 mb-1">Win Points</label>
            <input
              id="s-win"
              type="number"
              min={0}
              value={winPts}
              onChange={(e) => setWinPts(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="s-draw" className="block text-xs font-semibold text-slate-700 mb-1">Draw Points</label>
            <input
              id="s-draw"
              type="number"
              min={0}
              value={drawPts}
              onChange={(e) => setDrawPts(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="s-loss" className="block text-xs font-semibold text-slate-700 mb-1">Loss Points</label>
            <input
              id="s-loss"
              type="number"
              min={0}
              value={lossPts}
              onChange={(e) => setLossPts(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="s-yc" className="block text-xs font-semibold text-slate-700 mb-1">Yellow Susp. Limit</label>
            <input
              id="s-yc"
              type="number"
              min={1}
              value={yellowThresh}
              onChange={(e) => setYellowThresh(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg tabular-nums"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">Database Lifecycle & Reset</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Restore the full seeded demo dataset or wipe to an empty 3NF schema.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleReloadSample}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Sample Data
          </button>
          <button
            type="button"
            onClick={handleEmptyReset}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Database (Empty)
          </button>
        </div>
      </div>
    </div>
  );
}
