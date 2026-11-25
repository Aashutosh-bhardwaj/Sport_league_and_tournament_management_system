import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  BarChart3,
  Bell,
  Calendar,
  Code2,
  CreditCard,
  Database,
  Download,
  FileArchive,
  FileSpreadsheet,
  GitBranch,
  HelpCircle,
  LayoutDashboard,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Settings,
  Shield,
  Trophy,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportCompleteSqlScript, runQuery } from '../services/db';
import { downloadTextFile } from './DataHelpers';
import { Modal } from './Modal';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/teams', label: 'Teams', icon: Shield },
  { to: '/players', label: 'Players', icon: Users },
  { to: '/games', label: 'Games', icon: Trophy },
  { to: '/schedule', label: 'Schedule', icon: Calendar },
  { to: '/standings', label: 'Standings', icon: Award },
  { to: '/statistics', label: 'Statistics', icon: BarChart3 },
  { to: '/venues', label: 'Venues', icon: MapPin },
  { to: '/officials', label: 'Officials', icon: UserCheck },
  { to: '/leagues', label: 'Leagues & Seasons', icon: Trophy },
  { to: '/communications', label: 'Communications', icon: MessageSquare },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/reports', label: 'Reports', icon: FileSpreadsheet },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const DBMS_NAV: NavItem[] = [
  { to: '/sql-console', label: 'SQL Console', icon: Database },
  { to: '/er-diagram', label: 'ER Diagram', icon: GitBranch },
  { to: '/plsql', label: 'PL/SQL Code', icon: Code2 },
];

function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/teams/')) return 'Team Profile';
  if (pathname.startsWith('/players/')) return 'Player Profile';
  if (pathname.startsWith('/matches/')) return 'Match Center';
  const found = [...PRIMARY_NAV, ...DBMS_NAV].find((item) => item.to === pathname);
  return found ? found.label : 'League Console';
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { dbReady, dbVersion, seasonFilter, setSeasonFilter, addToast } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    setMobileOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  const seasons = useMemo(() => {
    if (!dbReady) return ['2026', '2025'];
    return runQuery<{ name: string }>(`SELECT DISTINCT name FROM SEASON ORDER BY name DESC`).map(
      (r) => r.name
    );
  }, [dbReady, dbVersion]);

  const notifications = useMemo(() => {
    if (!dbReady) return [];
    return runQuery<{
      audit_id: number;
      match_id: number;
      action: string;
      old_home_score: number | null;
      old_away_score: number | null;
      new_home_score: number;
      new_away_score: number;
      changed_at: string;
      home_name: string;
      away_name: string;
    }>(`
      SELECT
        ra.audit_id, ra.match_id, ra.action,
        ra.old_home_score, ra.old_away_score,
        ra.new_home_score, ra.new_away_score, ra.changed_at,
        ht.name AS home_name, at.name AS away_name
      FROM RESULT_AUDIT ra
      INNER JOIN "MATCH" m ON ra.match_id = m.match_id
      INNER JOIN TEAM ht ON m.home_team_id = ht.team_id
      INNER JOIN TEAM at ON m.away_team_id = at.team_id
      ORDER BY ra.audit_id DESC
      LIMIT 5
    `);
  }, [dbReady, dbVersion]);

  const commCount = useMemo(() => {
    if (!dbReady) return 0;
    return runQuery<{ c: number }>(`SELECT COUNT(*) AS c FROM COMMUNICATION`)[0]?.c ?? 0;
  }, [dbReady, dbVersion]);

  const [zipDownloading, setZipDownloading] = useState(false);

  const handleDownloadSql = () => {
    const script = exportCompleteSqlScript();
    downloadTextFile('sports_league_db_complete.sql', script, 'application/sql;charset=utf-8');
    addToast('success', 'SQL Script Exported', 'Downloaded complete schema, views, triggers, and seed SQL.');
  };

  const handleDownloadProjectZip = async () => {
    if (zipDownloading) return;
    setZipDownloading(true);
    try {
      const res = await fetch('/api/export-project.zip');
      if (!res.ok) {
        throw new Error('Failed to generate project ZIP archive.');
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
        'Project ZIP Downloaded',
        'Extract locally and follow README.md / LOCAL_SQL_SETUP.md to connect SQL.'
      );
    } catch (err) {
      addToast('error', 'ZIP Export Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setZipDownloading(false);
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B3D91] text-white select-none">
      {/* Brand Logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 32 32" className="w-5 h-5" aria-hidden="true">
              <path
                d="M16 3 L28 7.5 V16 C28 22.8 22.8 27.6 16 29.5 C9.2 27.6 4 22.8 4 16 V7.5 L16 3 Z"
                fill="#FFFFFF"
                fillOpacity="0.92"
              />
              <path
                d="M16 8 L20.5 14 H17.5 V23 H14.5 V14 H11.5 L16 8 Z"
                fill="#0B3D91"
              />
            </svg>
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="font-display font-bold text-sm tracking-tight text-white truncate">
                USA Football League
              </p>
              <p className="text-[11px] text-blue-200 truncate">Tournament & DBMS Admin</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10"
          aria-label="Close navigation menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" aria-label="Primary Navigation">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1D5FD6] text-white font-semibold shadow-xs'
                    : 'text-blue-100/85 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}

        <div className="pt-3 mt-3 border-t border-white/15">
          {!sidebarCollapsed && (
            <p className="px-3 pb-1.5 text-[11px] font-medium text-blue-200/80">
              Database Architecture
            </p>
          )}
          {DBMS_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1D5FD6] text-white font-semibold shadow-xs'
                      : 'text-blue-100/85 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Bottom Export + Need Help */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <button
          type="button"
          onClick={handleDownloadProjectZip}
          disabled={zipDownloading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white text-[#0B3D91] hover:bg-blue-50 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-60"
          title="Download complete source code + SQLite/MySQL/PostgreSQL files as .zip"
        >
          <FileArchive className="w-3.5 h-3.5 shrink-0" />
          {!sidebarCollapsed && <span>{zipDownloading ? 'Preparing ZIP...' : 'Download Project ZIP'}</span>}
        </button>

        <button
          type="button"
          onClick={handleDownloadSql}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors whitespace-nowrap"
          title="Download complete schema, views, triggers, and seed data as .sql"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          {!sidebarCollapsed && <span>Download SQL Script</span>}
        </button>

        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#072B6B] hover:bg-[#062357] text-left transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-blue-200 shrink-0" />
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white">Need Help?</p>
              <p className="text-[11px] text-blue-200 truncate">Contact Support</p>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F4F6FA] text-slate-900">
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-all duration-200 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[252px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[80vw] h-full z-50">{sidebarContent}</aside>
        </div>
      )}

      {/* Main Column */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[252px]'
        }`}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-3 sm:px-4 lg:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileOpen((v) => !v);
                } else {
                  setSidebarCollapsed((v) => !v);
                }
              }}
              aria-label="Toggle navigation menu"
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display text-base sm:text-lg lg:text-xl font-bold text-slate-900 truncate">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Global Season Filter */}
            <label htmlFor="global-season-select" className="sr-only">
              Filter by season
            </label>
            <select
              id="global-season-select"
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0B3D91]/30"
            >
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s} Season
                </option>
              ))}
              <option value="ALL">All Seasons</option>
            </select>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Recent database audit notifications"
                className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#0B3D91]" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-40 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">Recent Result Audits</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate('/sql-console');
                      }}
                      className="text-[11px] font-medium text-[#0B3D91] hover:underline"
                    >
                      Open Audit Log
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-xs text-slate-500">No result audits recorded yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.audit_id}
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            navigate(`/matches/${n.match_id}`);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors"
                        >
                          <p className="text-xs font-medium text-slate-900">
                            {n.action}: {n.home_name} vs {n.away_name}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                            {n.old_home_score !== null
                              ? `${n.old_home_score}-${n.old_away_score} -> ${n.new_home_score}-${n.new_away_score}`
                              : `Recorded ${n.new_home_score}-${n.new_away_score}`}{' '}
                            · {n.changed_at}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mail / Communications shortcut */}
            <button
              type="button"
              onClick={() => navigate('/communications')}
              aria-label={`League communications (${commCount} notices)`}
              className="hidden sm:inline-flex relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Mail className="w-4 h-4" />
            </button>

            {/* Admin Profile */}
            <div className="flex items-center gap-2.5 pl-1.5 sm:pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-[#0B3D91] text-white flex items-center justify-center text-xs font-bold shrink-0">
                JD
              </div>
              <div className="hidden md:block leading-tight">
                <p className="text-xs font-semibold text-slate-900 whitespace-nowrap">John Doe</p>
                <p className="text-[11px] text-slate-500 whitespace-nowrap">League Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto">{children}</main>

        {/* Clean Footer */}
        <footer className="px-6 py-4 border-t border-slate-200 bg-white text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>© 2026 USA Football League Management System · Relational SQLite DBMS</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="hover:text-slate-800 transition-colors"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => navigate('/er-diagram')}
              className="hover:text-slate-800 transition-colors"
            >
              Schema & ER Diagram
            </button>
          </div>
        </footer>
      </div>

      {/* Help / Support Modal */}
      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="League Operations & DBMS Support Guide"
        subtitle="Quick walkthrough of transactional workflows and relational constraints"
      >
        <div className="space-y-4 text-sm text-slate-700">
          <div>
            <h3 className="font-semibold text-slate-900">1. Transactional Match Result & Correction</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Open any match in <strong>Games</strong> or <strong>Schedule</strong>. Submitting a result runs an atomic{' '}
              <code>BEGIN ... COMMIT</code> transaction updating <code>MATCH_RESULT</code>, <code>STANDINGS</code>,{' '}
              <code>PLAYER_STATISTICS</code>, and <code>DISCIPLINARY_RECORD</code>. Use <strong>Correct Result</strong>{' '}
              on completed matches to reverse old standings and view the audit diff.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">2. Automatic Triggers & Constraints</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              SQLite enforces foreign keys, prevents double-rostering a player in the same tournament, blocks venue
              double-booking, blocks stats for <code>SUSPENDED</code> players, and auto-suspends players on a red card
              or 3 accumulated yellow cards.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">3. SQL Console, ER Diagram & Oracle PL/SQL</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Use <strong>SQL Console</strong> to run live <code>SELECT</code> queries, inspect DDL/views/triggers, view
              the full ER Diagram, or inspect the Oracle PL/SQL stored procedures in <strong>PL/SQL Code</strong>.
            </p>
          </div>
        </div>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Privacy Policy & Local Persistence"
        maxWidth="md"
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          All league records, player profiles, financial ledgers, and match results in this Sports League and
          Tournament Management System are stored locally inside your browser using an in-browser SQLite WASM engine
          persisted to IndexedDB. No personal records leave your device. You may reset or export the complete SQL
          database at any time from Settings or the sidebar export button.
        </p>
      </Modal>
    </div>
  );
}
