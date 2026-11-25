import React, { useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { runExec, runQuery } from '../services/db';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/DataHelpers';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

interface VenueRow {
  venue_id: number;
  venue_name: string;
  city: string;
  capacity: number;
  surface_type: string;
  total_matches: number;
  completed_matches: number;
  scheduled_matches: number;
  avg_goals_per_match: number | null;
}

export function VenuesPage() {
  const { dbReady, dbVersion, addToast, requestConfirm } = useApp();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VenueRow | null>(null);
  const [form, setForm] = useState({
    name: '',
    city: '',
    capacity: '15000',
    surface_type: 'Hybrid Turf',
  });

  const venues = useMemo(() => {
    if (!dbReady) return [];
    return runQuery<VenueRow>(`SELECT * FROM v_venue_utilization ORDER BY total_matches DESC, venue_name ASC`);
  }, [dbReady, dbVersion]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter(
      (v) =>
        v.venue_name.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.surface_type.toLowerCase().includes(q)
    );
  }, [venues, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', city: '', capacity: '18000', surface_type: 'Hybrid Turf' });
    setModalOpen(true);
  };

  const openEdit = (v: VenueRow) => {
    setEditing(v);
    setForm({
      name: v.venue_name,
      city: v.city,
      capacity: String(v.capacity),
      surface_type: v.surface_type,
    });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cap = Number(form.capacity);
      if (editing) {
        runExec(`UPDATE VENUE SET name = ?, city = ?, capacity = ?, surface_type = ? WHERE venue_id = ?`, [
          form.name.trim(),
          form.city.trim(),
          cap,
          form.surface_type.trim(),
          editing.venue_id,
        ]);
        addToast('success', 'Venue Updated', `${form.name.trim()} updated.`);
      } else {
        runExec(`INSERT INTO VENUE (name, city, capacity, surface_type) VALUES (?, ?, ?, ?)`, [
          form.name.trim(),
          form.city.trim(),
          cap,
          form.surface_type.trim(),
        ]);
        addToast('success', 'Venue Created', `${form.name.trim()} added.`);
      }
      setModalOpen(false);
    } catch (err) {
      addToast('error', 'Constraint Error', err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = (v: VenueRow) => {
    requestConfirm({
      title: `Delete ${v.venue_name}?`,
      message: `Deleting a venue referenced by scheduled or completed matches will be blocked by FOREIGN KEY (ON DELETE RESTRICT).`,
      confirmLabel: 'Delete Venue',
      onConfirm: () => {
        try {
          runExec(`DELETE FROM VENUE WHERE venue_id = ?`, [v.venue_id]);
          addToast('success', 'Venue Deleted', `${v.venue_name} removed.`);
        } catch (err) {
          addToast('error', 'Foreign Key Constraint', err instanceof Error ? err.message : String(err));
        }
      },
    });
  };

  return (
    <div className="space-y-5">
      <DbmsConceptBanner
        concept="LEFT JOIN Utilization View (v_venue_utilization)"
        description="Combines VENUE with MATCH and MATCH_RESULT via LEFT JOIN to compute scheduled/completed counts and average goals per stadium."
        sqlHint="CHECK(capacity > 0)"
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search stadium, city, surface..."
            aria-label="Search venues"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
          />
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add Venue
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                <th className="py-3 px-4 text-left font-semibold">Venue</th>
                <th className="py-3 px-4 text-left font-semibold">City</th>
                <th className="py-3 px-4 text-left font-semibold">Surface</th>
                <th className="py-3 px-4 text-right font-semibold">Capacity</th>
                <th className="py-3 px-4 text-right font-semibold">Matches</th>
                <th className="py-3 px-4 text-right font-semibold">Completed / Sched</th>
                <th className="py-3 px-4 text-right font-semibold">Avg Goals</th>
                <th className="py-3 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {paged.map((v) => (
                <tr key={v.venue_id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{v.venue_name}</td>
                  <td className="py-3 px-4 text-slate-600">{v.city}</td>
                  <td className="py-3 px-4 text-xs text-slate-700">{v.surface_type}</td>
                  <td className="py-3 px-4 text-right font-medium">{v.capacity.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-bold text-[#0B3D91]">{v.total_matches}</td>
                  <td className="py-3 px-4 text-right text-xs text-slate-600">
                    {v.completed_matches} / {v.scheduled_matches}
                  </td>
                  <td className="py-3 px-4 text-right">{v.avg_goals_per_match ?? '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(v)}
                        aria-label={`Edit ${v.venue_name}`}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(v)}
                        aria-label={`Delete ${v.venue_name}`}
                        className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50"
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.venue_name}` : 'Add New Venue'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="v-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Venue Name
              </label>
              <input
                id="v-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="v-city" className="block text-xs font-semibold text-slate-700 mb-1">
                City
              </label>
              <input
                id="v-city"
                type="text"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="v-cap" className="block text-xs font-semibold text-slate-700 mb-1">
                Capacity (&gt; 0)
              </label>
              <input
                id="v-cap"
                type="number"
                required
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="v-surf" className="block text-xs font-semibold text-slate-700 mb-1">
                Surface Type
              </label>
              <select
                id="v-surf"
                value={form.surface_type}
                onChange={(e) => setForm({ ...form, surface_type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                <option value="Hybrid Turf">Hybrid Turf</option>
                <option value="Natural Grass">Natural Grass</option>
                <option value="FieldTurf Pro">FieldTurf Pro</option>
                <option value="Bermuda Grass">Bermuda Grass</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-[#0B3D91] rounded-lg">
              {editing ? 'Save Changes' : 'Create Venue'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
