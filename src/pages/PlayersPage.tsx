import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Edit2, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { runExec, runQuery, runTransaction } from '../services/db';
import { TeamBadge } from '../components/TeamBadge';
import { EmptyState, Pagination, StatusLabel } from '../components/DataHelpers';
import { Modal } from '../components/Modal';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

interface PlayerRow {
  player_id: number;
  full_name: string;
  dob: string;
  position: string;
  jersey_no: number;
  email: string;
  status: 'ACTIVE' | 'INJURED' | 'SUSPENDED' | 'INACTIVE';
  team_id: number | null;
  team_name: string | null;
  logo_color: string | null;
  career_goals: number;
  career_assists: number;
}

export function PlayersPage() {
  const { dbReady, dbVersion, seasonFilter, addToast, requestConfirm } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlayerRow | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    dob: '2000-05-15',
    position: 'Forward',
    jersey_no: '9',
    email: '',
    status: 'ACTIVE' as PlayerRow['status'],
    team_id: '',
    tournament_id: '1',
  });

  const [availPlayer, setAvailPlayer] = useState<PlayerRow | null>(null);
  const [availForm, setAvailForm] = useState({
    from_date: '2026-11-24',
    to_date: '2026-12-08',
    reason: 'Minor muscle strain',
  });

  const teams = useMemo(() => {
    if (!dbReady) return [];
    return runQuery<{ team_id: number; name: string }>(`SELECT team_id, name FROM TEAM ORDER BY name ASC`);
  }, [dbReady, dbVersion]);

  const tournaments = useMemo(() => {
    if (!dbReady) return [];
    return runQuery<{ tournament_id: number; name: string }>(`SELECT tournament_id, name FROM TOURNAMENT ORDER BY tournament_id ASC`);
  }, [dbReady, dbVersion]);

  const players = useMemo(() => {
    if (!dbReady) return [];
    const isAll = seasonFilter === 'ALL';
    return runQuery<PlayerRow>(
      `SELECT
         p.player_id, p.full_name, p.dob, p.position, p.jersey_no, p.email, p.status,
         MAX(tm.team_id) AS team_id,
         MAX(tm.name) AS team_name,
         MAX(tm.logo_color) AS logo_color,
         COALESCE(SUM(ps.goals), 0) AS career_goals,
         COALESCE(SUM(ps.assists), 0) AS career_assists
       FROM PLAYER p
       LEFT JOIN TEAM_ROSTER tr ON p.player_id = tr.player_id
       LEFT JOIN TEAM tm ON tr.team_id = tm.team_id
       LEFT JOIN TOURNAMENT trn ON tr.tournament_id = trn.tournament_id
       LEFT JOIN SEASON s ON trn.season_id = s.season_id
       LEFT JOIN PLAYER_STATISTICS ps ON p.player_id = ps.player_id
       WHERE 1=1 ${isAll ? '' : 'AND (s.name = ? OR tr.roster_id IS NULL)'}
       GROUP BY p.player_id
       ORDER BY p.player_id ASC`,
      isAll ? [] : [seasonFilter]
    );
  }, [dbReady, dbVersion, seasonFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (positionFilter !== 'ALL' && p.position !== positionFilter) return false;
      if (!q) return true;
      return (
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.team_name ?? '').toLowerCase().includes(q)
      );
    });
  }, [players, search, statusFilter, positionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openAdd = () => {
    setEditing(null);
    setForm({
      full_name: '',
      dob: '2001-04-12',
      position: 'Midfielder',
      jersey_no: '21',
      email: '',
      status: 'ACTIVE',
      team_id: String(teams[0]?.team_id ?? ''),
      tournament_id: String(tournaments[0]?.tournament_id ?? '1'),
    });
    setModalOpen(true);
  };

  const openEdit = (p: PlayerRow) => {
    setEditing(p);
    setForm({
      full_name: p.full_name,
      dob: p.dob,
      position: p.position,
      jersey_no: String(p.jersey_no),
      email: p.email,
      status: p.status,
      team_id: p.team_id ? String(p.team_id) : '',
      tournament_id: String(tournaments[0]?.tournament_id ?? '1'),
    });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) {
      addToast('error', 'Validation Error', 'Full name and email are required.');
      return;
    }
    const jersey = Number(form.jersey_no);
    if (!Number.isInteger(jersey) || jersey < 1 || jersey > 99) {
      addToast('error', 'Validation Error', 'Jersey number must be between 1 and 99.');
      return;
    }

    try {
      if (editing) {
        runExec(
          `UPDATE PLAYER SET full_name = ?, dob = ?, position = ?, jersey_no = ?, email = ?, status = ? WHERE player_id = ?`,
          [form.full_name.trim(), form.dob, form.position, jersey, form.email.trim(), form.status, editing.player_id]
        );
        addToast('success', 'Player Updated', `${form.full_name.trim()} updated.`);
      } else {
        runTransaction(() => {
          const ins = runExec(
            `INSERT INTO PLAYER (full_name, dob, position, jersey_no, email, status) VALUES (?, ?, ?, ?, ?, ?)`,
            [form.full_name.trim(), form.dob, form.position, jersey, form.email.trim(), form.status]
          );
          if (form.team_id) {
            runExec(
              `INSERT INTO TEAM_ROSTER (team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (?, ?, ?, ?, date('now'))`,
              [Number(form.team_id), ins.lastInsertRowId, Number(form.tournament_id), jersey]
            );
          }
        });
        addToast('success', 'Player Registered', `${form.full_name.trim()} added to PLAYER and TEAM_ROSTER.`);
      }
      setModalOpen(false);
    } catch (err) {
      addToast('error', 'Constraint Violation', err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = (p: PlayerRow) => {
    requestConfirm({
      title: `Delete ${p.full_name}?`,
      message: 'This will remove the player and cascade delete roster and availability records.',
      confirmLabel: 'Delete Player',
      onConfirm: () => {
        try {
          runExec(`DELETE FROM PLAYER WHERE player_id = ?`, [p.player_id]);
          addToast('success', 'Player Removed', `${p.full_name} deleted.`);
        } catch (err) {
          addToast('error', 'Constraint Error', err instanceof Error ? err.message : String(err));
        }
      },
    });
  };

  const handleSaveAvailability = (e: React.FormEvent) => {
    e.preventDefault();
    if (!availPlayer) return;
    try {
      runExec(
        `INSERT INTO PLAYER_AVAILABILITY (player_id, from_date, to_date, reason) VALUES (?, ?, ?, ?)`,
        [availPlayer.player_id, availForm.from_date, availForm.to_date, availForm.reason.trim()]
      );
      addToast('success', 'Availability Logged', `Saved unavailability window for ${availPlayer.full_name}.`);
      setAvailPlayer(null);
    } catch (err) {
      addToast('error', 'Check Constraint Failed', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-5">
      <DbmsConceptBanner
        concept="Eligibility Triggers & CHECK Constraints"
        description="PLAYER.status enforces CHECK IN ('ACTIVE','INJURED','SUSPENDED','INACTIVE'). SUSPENDED players are automatically blocked by trigger from match statistics."
        sqlHint="trg_block_suspended_player_stats"
      />

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, email, or team..."
              aria-label="Search players"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D91]/30"
            />
          </div>

          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INJURED">INJURED</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>

          <select
            aria-label="Filter by position"
            value={positionFilter}
            onChange={(e) => {
              setPositionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="ALL">All Positions</option>
            <option value="Forward">Forward</option>
            <option value="Midfielder">Midfielder</option>
            <option value="Defender">Defender</option>
            <option value="Goalkeeper">Goalkeeper</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add Player
        </button>
      </div>

      {/* Players Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {paged.length === 0 ? (
          <EmptyState
            title="No players match your filters"
            description="Clear your search criteria or add a new player."
            actionLabel="Add Player"
            onAction={openAdd}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 text-left font-semibold">Player</th>
                    <th className="py-3 px-4 text-left font-semibold">Team</th>
                    <th className="py-3 px-4 text-left font-semibold">Position</th>
                    <th className="py-3 px-4 text-right font-semibold">#</th>
                    <th className="py-3 px-4 text-left font-semibold">Status</th>
                    <th className="py-3 px-4 text-right font-semibold">Goals / Ast</th>
                    <th className="py-3 px-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {paged.map((p) => (
                    <tr key={p.player_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4">
                        <Link to={`/players/${p.player_id}`} className="font-semibold text-slate-900 hover:text-[#0B3D91]">
                          {p.full_name}
                        </Link>
                        <p className="text-[11px] text-slate-500">{p.email}</p>
                      </td>
                      <td className="py-2.5 px-4">
                        {p.team_name ? (
                          <Link to={`/teams/${p.team_id}`} className="inline-flex items-center gap-2 hover:underline">
                            <TeamBadge name={p.team_name} color={p.logo_color ?? '#0B3D91'} size="xs" />
                            <span className="text-xs font-medium text-slate-800">{p.team_name}</span>
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">Free Agent</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 text-xs">{p.position}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-700">{p.jersey_no}</td>
                      <td className="py-2.5 px-4">
                        <StatusLabel status={p.status} />
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-slate-800">
                        {p.career_goals} / {p.career_assists}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/players/${p.player_id}`}
                            aria-label={`View ${p.full_name}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0B3D91] hover:bg-blue-50"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setAvailPlayer(p)}
                            aria-label={`Log availability for ${p.full_name}`}
                            title="Log unavailability window"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                          >
                            <CalendarPlus className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            aria-label={`Edit ${p.full_name}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            aria-label={`Delete ${p.full_name}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
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
          </>
        )}
      </div>

      {/* Add / Edit Player Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.full_name}` : 'Register New Player'}
        subtitle="Unique email & jersey per team/tournament enforced"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                id="p-name"
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="p-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email (UNIQUE)
              </label>
              <input
                id="p-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="p-dob" className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                id="p-dob"
                type="date"
                required
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="p-pos" className="block text-xs font-semibold text-slate-700 mb-1">
                Position
              </label>
              <select
                id="p-pos"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                <option value="Forward">Forward</option>
                <option value="Midfielder">Midfielder</option>
                <option value="Defender">Defender</option>
                <option value="Goalkeeper">Goalkeeper</option>
              </select>
            </div>
            <div>
              <label htmlFor="p-jersey" className="block text-xs font-semibold text-slate-700 mb-1">
                Jersey No (1-99)
              </label>
              <input
                id="p-jersey"
                type="number"
                min={1}
                max={99}
                required
                value={form.jersey_no}
                onChange={(e) => setForm({ ...form, jersey_no: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="p-status" className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                id="p-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as PlayerRow['status'] })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INJURED">INJURED</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            {!editing && (
              <>
                <div>
                  <label htmlFor="p-team" className="block text-xs font-semibold text-slate-700 mb-1">
                    Assign Team (Optional)
                  </label>
                  <select
                    id="p-team"
                    value={form.team_id}
                    onChange={(e) => setForm({ ...form, team_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  >
                    <option value="">Free Agent</option>
                    {teams.map((tm) => (
                      <option key={tm.team_id} value={tm.team_id}>
                        {tm.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="p-trn" className="block text-xs font-semibold text-slate-700 mb-1">
                    Roster Tournament
                  </label>
                  <select
                    id="p-trn"
                    value={form.tournament_id}
                    onChange={(e) => setForm({ ...form, tournament_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  >
                    {tournaments.map((tr) => (
                      <option key={tr.tournament_id} value={tr.tournament_id}>
                        {tr.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#0B3D91] rounded-lg"
            >
              {editing ? 'Save Changes' : 'Register Player'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Availability Modal */}
      <Modal
        open={Boolean(availPlayer)}
        onClose={() => setAvailPlayer(null)}
        title={`Log Availability: ${availPlayer?.full_name ?? ''}`}
        subtitle="Enforces CHECK(to_date >= from_date)"
        maxWidth="md"
      >
        <form onSubmit={handleSaveAvailability} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="av-from" className="block text-xs font-semibold text-slate-700 mb-1">
                From Date
              </label>
              <input
                id="av-from"
                type="date"
                required
                value={availForm.from_date}
                onChange={(e) => setAvailForm({ ...availForm, from_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="av-to" className="block text-xs font-semibold text-slate-700 mb-1">
                To Date
              </label>
              <input
                id="av-to"
                type="date"
                required
                value={availForm.to_date}
                onChange={(e) => setAvailForm({ ...availForm, to_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label htmlFor="av-reason" className="block text-xs font-semibold text-slate-700 mb-1">
              Reason
            </label>
            <input
              id="av-reason"
              type="text"
              required
              value={availForm.reason}
              onChange={(e) => setAvailForm({ ...availForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setAvailPlayer(null)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#0B3D91] rounded-lg"
            >
              Save Availability
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
