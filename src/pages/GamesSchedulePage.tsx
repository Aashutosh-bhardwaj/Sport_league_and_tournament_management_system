import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, List, Plus, Search, Sparkles, Trash2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getDbRunner, runExec, runQuery } from '../services/db';
import { generateRoundRobinFixtures } from '../services/leagueLogic';
import { TeamBadge } from '../components/TeamBadge';
import { EmptyState, Pagination, StatusLabel } from '../components/DataHelpers';
import { Modal } from '../components/Modal';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

interface MatchRow {
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
  venue_id: number;
  venue_name: string;
  referee_id: number;
  referee_name: string;
  home_score: number | null;
  away_score: number | null;
}

export function GamesSchedulePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { dbReady, dbVersion, seasonFilter, addToast, requestConfirm } = useApp();

  const defaultMode = location.pathname === '/schedule' ? 'calendar' : 'list';
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(defaultMode);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tournamentFilter, setTournamentFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [createOpen, setCreateOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const [fixtureForm, setFixtureForm] = useState({
    tournament_id: '1',
    home_team_id: '1',
    away_team_id: '2',
    venue_id: '1',
    referee_id: '1',
    match_date: '2026-12-24',
    start_time: '19:00',
    round: '7',
  });

  const [wizardForm, setWizardForm] = useState({
    tournamentId: '1',
    selectedTeams: [] as number[],
    startDate: '2026-12-26',
    doubleRoundRobin: false,
    daysBetweenRounds: '7',
  });

  const lookups = useMemo(() => {
    if (!dbReady) return { tournaments: [], teams: [], venues: [], referees: [] };
    return {
      tournaments: runQuery<{ tournament_id: number; name: string; season_name: string }>(
        `SELECT t.tournament_id, t.name, s.name AS season_name
         FROM TOURNAMENT t INNER JOIN SEASON s ON t.season_id = s.season_id
         ORDER BY s.name DESC, t.tournament_id ASC`
      ),
      teams: runQuery<{ team_id: number; name: string; category: string }>(
        `SELECT team_id, name, category FROM TEAM ORDER BY name ASC`
      ),
      venues: runQuery<{ venue_id: number; name: string; city: string }>(
        `SELECT venue_id, name, city FROM VENUE ORDER BY name ASC`
      ),
      referees: runQuery<{ official_id: number; full_name: string }>(
        `SELECT official_id, full_name FROM OFFICIAL WHERE role = 'Referee' ORDER BY full_name ASC`
      ),
    };
  }, [dbReady, dbVersion]);

  const matches = useMemo(() => {
    if (!dbReady) return [];
    const isAll = seasonFilter === 'ALL';
    return runQuery<MatchRow>(
      `SELECT
         m.match_id, m.tournament_id, trn.name AS tournament_name, s.name AS season_name,
         m.round, m.match_date, m.start_time, m.status,
         m.home_team_id, ht.name AS home_name, ht.logo_color AS home_color,
         m.away_team_id, at.name AS away_name, at.logo_color AS away_color,
         m.venue_id, v.name AS venue_name,
         m.referee_id, o.full_name AS referee_name,
         mr.home_score, mr.away_score
       FROM "MATCH" m
       INNER JOIN TOURNAMENT trn ON m.tournament_id = trn.tournament_id
       INNER JOIN SEASON s ON trn.season_id = s.season_id
       INNER JOIN TEAM ht ON m.home_team_id = ht.team_id
       INNER JOIN TEAM at ON m.away_team_id = at.team_id
       INNER JOIN VENUE v ON m.venue_id = v.venue_id
       INNER JOIN OFFICIAL o ON m.referee_id = o.official_id
       LEFT JOIN MATCH_RESULT mr ON m.match_id = mr.match_id
       WHERE 1=1 ${isAll ? '' : 'AND s.name = ?'}
       ORDER BY m.match_date DESC, m.start_time DESC`,
      isAll ? [] : [seasonFilter]
    );
  }, [dbReady, dbVersion, seasonFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return matches.filter((m) => {
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
      if (tournamentFilter !== 'ALL' && String(m.tournament_id) !== tournamentFilter) return false;
      if (!q) return true;
      return (
        m.home_name.toLowerCase().includes(q) ||
        m.away_name.toLowerCase().includes(q) ||
        m.venue_name.toLowerCase().includes(q) ||
        m.referee_name.toLowerCase().includes(q)
      );
    });
  }, [matches, search, statusFilter, tournamentFilter]);

  // Live SQL conflict pre-check for Create Fixture Modal
  const liveConflicts = useMemo(() => {
    if (!dbReady || !createOpen) return [];
    const warnings: string[] = [];
    if (fixtureForm.home_team_id === fixtureForm.away_team_id) {
      warnings.push('Home and Away teams must be different (CHECK home_team_id <> away_team_id).');
    }
    const dupPair = runQuery<{ c: number }>(
      `SELECT COUNT(*) AS c FROM "MATCH" WHERE tournament_id = ? AND home_team_id = ? AND away_team_id = ?`,
      [Number(fixtureForm.tournament_id), Number(fixtureForm.home_team_id), Number(fixtureForm.away_team_id)]
    )[0]?.c;
    if (dupPair > 0) {
      warnings.push('Duplicate Fixture Warning: This exact home vs away pairing already exists in the tournament.');
    }
    const venueBusy = runQuery<{ c: number }>(
      `SELECT COUNT(*) AS c FROM "MATCH" WHERE venue_id = ? AND match_date = ? AND start_time = ? AND status <> 'CANCELLED'`,
      [Number(fixtureForm.venue_id), fixtureForm.match_date, fixtureForm.start_time]
    )[0]?.c;
    if (venueBusy > 0) {
      warnings.push('Venue Double-Booking Warning: Venue already has a fixture at this date and start time.');
    }
    return warnings;
  }, [dbReady, createOpen, fixtureForm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, MatchRow[]>();
    for (const m of filtered) {
      const arr = map.get(m.match_date) ?? [];
      arr.push(m);
      map.set(m.match_date, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const handleCreateFixture = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      runExec(
        `INSERT INTO "MATCH" (tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')`,
        [
          Number(fixtureForm.tournament_id),
          Number(fixtureForm.home_team_id),
          Number(fixtureForm.away_team_id),
          Number(fixtureForm.venue_id),
          Number(fixtureForm.referee_id),
          fixtureForm.match_date,
          fixtureForm.start_time,
          Number(fixtureForm.round),
        ]
      );
      addToast('success', 'Fixture Scheduled', 'Match created with zero venue or pairing conflicts.');
      setCreateOpen(false);
    } catch (err) {
      addToast('error', 'SQL Constraint / Trigger Blocked', err instanceof Error ? err.message : String(err));
    }
  };

  const handleRunWizard = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = generateRoundRobinFixtures(getDbRunner(), {
        tournamentId: Number(wizardForm.tournamentId),
        teamIds: wizardForm.selectedTeams,
        startDate: wizardForm.startDate,
        doubleRoundRobin: wizardForm.doubleRoundRobin,
        daysBetweenRounds: Number(wizardForm.daysBetweenRounds) || 7,
      });
      addToast(
        'success',
        'Round-Robin Fixtures Generated',
        `Created ${res.createdCount} conflict-free fixtures (${res.skippedDuplicates} already scheduled skipped).`
      );
      setWizardOpen(false);
    } catch (err) {
      addToast('error', 'Fixture Generation Failed', err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteMatch = (m: MatchRow) => {
    requestConfirm({
      title: `Delete Match #${m.match_id}?`,
      message: `Delete ${m.home_name} vs ${m.away_name} (${m.match_date})? Any linked match result and stats will cascade delete.`,
      confirmLabel: 'Delete Match',
      onConfirm: () => {
        try {
          runExec(`DELETE FROM "MATCH" WHERE match_id = ?`, [m.match_id]);
          addToast('success', 'Match Deleted', `Fixture #${m.match_id} removed.`);
        } catch (err) {
          addToast('error', 'Delete Failed', err instanceof Error ? err.message : String(err));
        }
      },
    });
  };

  const openWizard = () => {
    const defaultIds = lookups.teams.slice(0, 6).map((t) => t.team_id);
    setWizardForm({
      tournamentId: String(lookups.tournaments[0]?.tournament_id ?? '1'),
      selectedTeams: defaultIds,
      startDate: '2026-12-26',
      doubleRoundRobin: false,
      daysBetweenRounds: '7',
    });
    setWizardOpen(true);
  };

  const toggleWizardTeam = (tid: number) => {
    setWizardForm((prev) => ({
      ...prev,
      selectedTeams: prev.selectedTeams.includes(tid)
        ? prev.selectedTeams.filter((id) => id !== tid)
        : [...prev.selectedTeams, tid],
    }));
  };

  return (
    <div className="space-y-5">
      <DbmsConceptBanner
        concept="Composite UNIQUE Constraints & Conflict Triggers"
        description="MATCH enforces CHECK(home <> away), UNIQUE(tournament_id, home_team_id, away_team_id), and UNIQUE(venue_id, match_date, start_time) with live pre-validation."
        sqlHint="trg_block_venue_double_booking"
      />

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search teams, venue, referee..."
              aria-label="Search matches"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <select
            aria-label="Filter by tournament"
            value={tournamentFilter}
            onChange={(e) => {
              setTournamentFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="ALL">All Tournaments</option>
            {lookups.tournaments.map((t) => (
              <option key={t.tournament_id} value={String(t.tournament_id)}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by match status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">SCHEDULED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="POSTPONED">POSTPONED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md ${
                viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Calendar
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openWizard}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0B3D91] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate Fixtures
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Match
          </button>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            title="No matches found"
            description="Adjust filters or schedule new fixtures using the Round-Robin generator."
            actionLabel="Add Match"
            onAction={() => setCreateOpen(true)}
          />
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 text-left font-semibold">Date & Time</th>
                  <th className="py-3 px-4 text-left font-semibold">Fixture</th>
                  <th className="py-3 px-4 text-left font-semibold">Tournament</th>
                  <th className="py-3 px-4 text-left font-semibold">Venue & Referee</th>
                  <th className="py-3 px-4 text-left font-semibold">Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {paged.map((m) => (
                  <tr key={m.match_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-semibold text-slate-900 text-xs">{m.match_date}</p>
                      <p className="text-[11px] text-slate-500">
                        {m.start_time} · R{m.round}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <Link to={`/matches/${m.match_id}`} className="flex items-center gap-2.5 group">
                        <TeamBadge name={m.home_name} color={m.home_color} size="xs" />
                        <span className="font-semibold text-slate-900 group-hover:text-[#0B3D91]">
                          {m.home_name}
                        </span>
                        {m.home_score !== null ? (
                          <span className="px-2 py-0.5 rounded bg-[#0B3D91] text-white text-xs font-bold">
                            {m.home_score} - {m.away_score}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold">vs</span>
                        )}
                        <span className="font-semibold text-slate-900 group-hover:text-[#0B3D91]">
                          {m.away_name}
                        </span>
                        <TeamBadge name={m.away_name} color={m.away_color} size="xs" />
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{m.tournament_name}</td>
                    <td className="py-3 px-4 text-xs">
                      <p className="font-medium text-slate-800">{m.venue_name}</p>
                      <p className="text-[11px] text-slate-500">Ref: {m.referee_name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <StatusLabel status={m.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/matches/${m.match_id}`)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#0B3D91] bg-blue-50 hover:bg-blue-100 rounded-md"
                        >
                          {m.status === 'SCHEDULED' ? 'Submit Result' : 'Match Center'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMatch(m)}
                          aria-label={`Delete match ${m.match_id}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(([dateStr, dayMatches]) => (
            <div key={dateStr} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 tabular-nums">{dateStr}</span>
                <span className="text-xs text-slate-500 tabular-nums">{dayMatches.length} fixtures</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {dayMatches.map((m) => (
                  <Link
                    key={m.match_id}
                    to={`/matches/${m.match_id}`}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-[#0B3D91] hover:shadow-xs transition-all"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                      <span className="tabular-nums font-semibold">
                        {m.start_time} · R{m.round}
                      </span>
                      <StatusLabel status={m.status} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <TeamBadge name={m.home_name} color={m.home_color} size="xs" />
                        <span className="text-xs font-semibold text-slate-900 truncate">{m.home_name}</span>
                      </div>
                      <span className="text-xs font-bold text-[#0B3D91] tabular-nums shrink-0">
                        {m.home_score !== null ? `${m.home_score}-${m.away_score}` : 'vs'}
                      </span>
                      <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1">
                        <span className="text-xs font-semibold text-slate-900 truncate">{m.away_name}</span>
                        <TeamBadge name={m.away_name} color={m.away_color} size="xs" />
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500 truncate">{m.venue_name}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Single Fixture Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Schedule New Match"
        subtitle="Enforces duplicate fixture & venue double-booking constraints"
      >
        <form onSubmit={handleCreateFixture} className="space-y-4">
          {liveConflicts.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Live SQL Conflict Detection
              </div>
              {liveConflicts.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="fx-trn" className="block text-xs font-semibold text-slate-700 mb-1">
                Tournament
              </label>
              <select
                id="fx-trn"
                value={fixtureForm.tournament_id}
                onChange={(e) => setFixtureForm({ ...fixtureForm, tournament_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                {lookups.tournaments.map((t) => (
                  <option key={t.tournament_id} value={t.tournament_id}>
                    {t.name} ({t.season_name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fx-home" className="block text-xs font-semibold text-slate-700 mb-1">
                Home Team
              </label>
              <select
                id="fx-home"
                value={fixtureForm.home_team_id}
                onChange={(e) => setFixtureForm({ ...fixtureForm, home_team_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                {lookups.teams.map((t) => (
                  <option key={t.team_id} value={t.team_id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fx-away" className="block text-xs font-semibold text-slate-700 mb-1">
                Away Team
              </label>
              <select
                id="fx-away"
                value={fixtureForm.away_team_id}
                onChange={(e) => setFixtureForm({ ...fixtureForm, away_team_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                {lookups.teams.map((t) => (
                  <option key={t.team_id} value={t.team_id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fx-venue" className="block text-xs font-semibold text-slate-700 mb-1">
                Venue
              </label>
              <select
                id="fx-venue"
                value={fixtureForm.venue_id}
                onChange={(e) => setFixtureForm({ ...fixtureForm, venue_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                {lookups.venues.map((v) => (
                  <option key={v.venue_id} value={v.venue_id}>
                    {v.name} ({v.city})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fx-ref" className="block text-xs font-semibold text-slate-700 mb-1">
                Referee
              </label>
              <select
                id="fx-ref"
                value={fixtureForm.referee_id}
                onChange={(e) => setFixtureForm({ ...fixtureForm, referee_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                {lookups.referees.map((r) => (
                  <option key={r.official_id} value={r.official_id}>
                    {r.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fx-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Match Date
              </label>
              <input
                id="fx-date"
                type="date"
                required
                value={fixtureForm.match_date}
                onChange={(e) => setFixtureForm({ ...fixtureForm, match_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="fx-time" className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Time
                </label>
                <input
                  id="fx-time"
                  type="time"
                  required
                  value={fixtureForm.start_time}
                  onChange={(e) => setFixtureForm({ ...fixtureForm, start_time: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="fx-round" className="block text-xs font-semibold text-slate-700 mb-1">
                  Round
                </label>
                <input
                  id="fx-round"
                  type="number"
                  min={1}
                  required
                  value={fixtureForm.round}
                  onChange={(e) => setFixtureForm({ ...fixtureForm, round: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#0B3D91] rounded-lg"
            >
              Schedule Match
            </button>
          </div>
        </form>
      </Modal>

      {/* Round-Robin Fixture Generator Wizard */}
      <Modal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="Round-Robin Fixture Generator Wizard"
        subtitle="Automatically schedules pairings, venues, referees, and dates inside a single transaction"
        maxWidth="xl"
      >
        <form onSubmit={handleRunWizard} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="wiz-trn" className="block text-xs font-semibold text-slate-700 mb-1">
                Target Tournament
              </label>
              <select
                id="wiz-trn"
                value={wizardForm.tournamentId}
                onChange={(e) => setWizardForm({ ...wizardForm, tournamentId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                {lookups.tournaments.map((t) => (
                  <option key={t.tournament_id} value={t.tournament_id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wiz-start" className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date
              </label>
              <input
                id="wiz-start"
                type="date"
                required
                value={wizardForm.startDate}
                onChange={(e) => setWizardForm({ ...wizardForm, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="wiz-days" className="block text-xs font-semibold text-slate-700 mb-1">
                Days Between Rounds
              </label>
              <input
                id="wiz-days"
                type="number"
                min={1}
                max={30}
                value={wizardForm.daysBetweenRounds}
                onChange={(e) => setWizardForm({ ...wizardForm, daysBetweenRounds: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={wizardForm.doubleRoundRobin}
              onChange={(e) => setWizardForm({ ...wizardForm, doubleRoundRobin: e.target.checked })}
              className="rounded border-slate-300"
            />
            Double Round-Robin (Home & Away reverse legs)
          </label>

          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2">
              Select Participating Teams ({wizardForm.selectedTeams.length} selected)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-3 border border-slate-200 rounded-lg bg-slate-50">
              {lookups.teams.map((t) => {
                const checked = wizardForm.selectedTeams.includes(t.team_id);
                return (
                  <label
                    key={t.team_id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs cursor-pointer ${
                      checked ? 'bg-blue-50 border-blue-300 text-slate-900 font-semibold' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleWizardTeam(t.team_id)}
                    />
                    <span className="truncate">{t.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setWizardOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#0B3D91] rounded-lg"
            >
              Generate Conflict-Free Schedule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
