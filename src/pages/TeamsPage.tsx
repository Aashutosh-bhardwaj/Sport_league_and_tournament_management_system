import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { runExec, runQuery } from '../services/db';
import { TeamBadge } from '../components/TeamBadge';
import { EmptyState, Pagination } from '../components/DataHelpers';
import { Modal } from '../components/Modal';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

interface TeamRow {
  team_id: number;
  name: string;
  city: string;
  coach_name: string;
  founded_year: number;
  logo_color: string;
  category: 'Youth' | 'Amateur' | 'Women' | 'Senior';
  registered_on: string;
  player_count: number;
}

const CATEGORIES = ['ALL', 'Senior', 'Women', 'Amateur', 'Youth'] as const;

export function TeamsPage() {
  const { dbReady, dbVersion, seasonFilter, addToast, requestConfirm } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamRow | null>(null);
  const [form, setForm] = useState({
    name: '',
    city: '',
    coach_name: '',
    founded_year: '2020',
    logo_color: '#0B3D91',
    category: 'Senior' as TeamRow['category'],
  });

  const teams = useMemo(() => {
    if (!dbReady) return [];
    const isAll = seasonFilter === 'ALL';
    return runQuery<TeamRow>(
      `SELECT
         t.team_id, t.name, t.city, t.coach_name, t.founded_year, t.logo_color, t.category, t.registered_on,
         COUNT(DISTINCT tr.player_id) AS player_count
       FROM TEAM t
       LEFT JOIN TEAM_ROSTER tr ON t.team_id = tr.team_id
       LEFT JOIN TOURNAMENT trn ON tr.tournament_id = trn.tournament_id
       LEFT JOIN SEASON s ON trn.season_id = s.season_id
       WHERE 1=1
       ${isAll ? '' : 'AND (s.name = ? OR tr.roster_id IS NULL)'}
       GROUP BY t.team_id
       ORDER BY t.name ASC`,
      isAll ? [] : [seasonFilter]
    );
  }, [dbReady, dbVersion, seasonFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teams.filter((t) => {
      if (category !== 'ALL' && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.coach_name.toLowerCase().includes(q)
      );
    });
  }, [teams, search, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openAdd = () => {
    setEditingTeam(null);
    setForm({
      name: '',
      city: '',
      coach_name: '',
      founded_year: '2024',
      logo_color: '#0B3D91',
      category: 'Senior',
    });
    setModalOpen(true);
  };

  const openEdit = (t: TeamRow) => {
    setEditingTeam(t);
    setForm({
      name: t.name,
      city: t.city,
      coach_name: t.coach_name,
      founded_year: String(t.founded_year),
      logo_color: t.logo_color,
      category: t.category,
    });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim() || !form.coach_name.trim()) {
      addToast('error', 'Validation Error', 'Team name, city, and coach name are required.');
      return;
    }
    const year = Number(form.founded_year);
    if (!Number.isInteger(year) || year < 1850 || year > 2100) {
      addToast('error', 'Validation Error', 'Founded year must be between 1850 and 2100.');
      return;
    }

    try {
      if (editingTeam) {
        runExec(
          `UPDATE TEAM SET name = ?, city = ?, coach_name = ?, founded_year = ?, logo_color = ?, category = ? WHERE team_id = ?`,
          [form.name.trim(), form.city.trim(), form.coach_name.trim(), year, form.logo_color, form.category, editingTeam.team_id]
        );
        addToast('success', 'Team Updated', `${form.name.trim()} updated in SQLite.`);
      } else {
        runExec(
          `INSERT INTO TEAM (name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (?, ?, ?, ?, ?, ?, date('now'))`,
          [form.name.trim(), form.city.trim(), form.coach_name.trim(), year, form.logo_color, form.category]
        );
        addToast('success', 'Team Created', `${form.name.trim()} added to TEAM table.`);
      }
      setModalOpen(false);
    } catch (err) {
      addToast('error', 'Database Constraint Error', err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = (t: TeamRow) => {
    requestConfirm({
      title: `Delete ${t.name}?`,
      message: `Attempting to delete "${t.name}". Note: Foreign key constraints (ON DELETE RESTRICT) will block deletion if matches or payments reference this team.`,
      confirmLabel: 'Delete Team',
      onConfirm: () => {
        try {
          runExec(`DELETE FROM TEAM WHERE team_id = ?`, [t.team_id]);
          addToast('success', 'Team Deleted', `${t.name} removed.`);
        } catch (err) {
          addToast('error', 'Foreign Key Constraint', err instanceof Error ? err.message : String(err));
        }
      },
    });
  };

  return (
    <div className="space-y-5">
      <DbmsConceptBanner
        concept="UNIQUE & Foreign Key Constraints"
        description="TEAM.name enforces UNIQUE constraint; deleting a team referenced by MATCH or PAYMENT triggers ON DELETE RESTRICT rollback."
        sqlHint="UNIQUE(name) · CHECK(category IN ...)"
      />

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search team, city, or coach..."
              aria-label="Search teams"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D91]/30"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  category === cat ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add Team
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {paged.length === 0 ? (
          <EmptyState
            title="No teams found"
            description="Adjust your search filter or register a new club in the league."
            actionLabel="Add Team"
            onAction={openAdd}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 text-left font-semibold">Team</th>
                    <th className="py-3 px-4 text-left font-semibold">City</th>
                    <th className="py-3 px-4 text-left font-semibold">Coach</th>
                    <th className="py-3 px-4 text-left font-semibold">Category</th>
                    <th className="py-3 px-4 text-right font-semibold">Founded</th>
                    <th className="py-3 px-4 text-right font-semibold">Rostered</th>
                    <th className="py-3 px-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {paged.map((t) => (
                    <tr key={t.team_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <Link to={`/teams/${t.team_id}`} className="flex items-center gap-3 group">
                          <TeamBadge name={t.name} color={t.logo_color} size="sm" />
                          <span className="font-semibold text-slate-900 group-hover:text-[#0B3D91] transition-colors">
                            {t.name}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{t.city}</td>
                      <td className="py-3 px-4 text-slate-700">{t.coach_name}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{t.category}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{t.founded_year}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">{t.player_count}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/teams/${t.team_id}`}
                            aria-label={`View ${t.name}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0B3D91] hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(t)}
                            aria-label={`Edit ${t.name}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t)}
                            aria-label={`Delete ${t.name}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
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

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTeam ? `Edit ${editingTeam.name}` : 'Register New Team'}
        subtitle="Persisted directly to SQLite TEAM table"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="team-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Team Name
              </label>
              <input
                id="team-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D91]/30"
              />
            </div>
            <div>
              <label htmlFor="team-city" className="block text-xs font-semibold text-slate-700 mb-1">
                City
              </label>
              <input
                id="team-city"
                type="text"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D91]/30"
              />
            </div>
            <div>
              <label htmlFor="team-coach" className="block text-xs font-semibold text-slate-700 mb-1">
                Head Coach
              </label>
              <input
                id="team-coach"
                type="text"
                required
                value={form.coach_name}
                onChange={(e) => setForm({ ...form, coach_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D91]/30"
              />
            </div>
            <div>
              <label htmlFor="team-category" className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                id="team-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as TeamRow['category'] })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D91]/30"
              >
                <option value="Senior">Senior</option>
                <option value="Women">Women</option>
                <option value="Amateur">Amateur</option>
                <option value="Youth">Youth</option>
              </select>
            </div>
            <div>
              <label htmlFor="team-year" className="block text-xs font-semibold text-slate-700 mb-1">
                Founded Year
              </label>
              <input
                id="team-year"
                type="number"
                required
                min={1850}
                max={2100}
                value={form.founded_year}
                onChange={(e) => setForm({ ...form, founded_year: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D91]/30"
              />
            </div>
            <div>
              <label htmlFor="team-color" className="block text-xs font-semibold text-slate-700 mb-1">
                Shield Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="team-color"
                  type="color"
                  value={form.logo_color}
                  onChange={(e) => setForm({ ...form, logo_color: e.target.value })}
                  className="h-9 w-14 rounded border border-slate-200 cursor-pointer"
                />
                <TeamBadge name={form.name || 'Club'} color={form.logo_color} size="sm" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg"
            >
              {editingTeam ? 'Save Changes' : 'Create Team'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
