import React, { useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { runExec, runQuery } from '../services/db';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/DataHelpers';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

interface OfficialRow {
  official_id: number;
  full_name: string;
  role: 'Referee' | 'Linesman' | 'Match Commissioner';
  license_no: string;
  phone: string;
  matches_assigned: number;
}

export function OfficialsPage() {
  const { dbReady, dbVersion, addToast, requestConfirm } = useApp();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OfficialRow | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    role: 'Referee' as OfficialRow['role'],
    license_no: '',
    phone: '',
  });

  const officials = useMemo(() => {
    if (!dbReady) return [];
    return runQuery<OfficialRow>(
      `SELECT
         o.official_id, o.full_name, o.role, o.license_no, o.phone,
         COUNT(m.match_id) AS matches_assigned
       FROM OFFICIAL o
       LEFT JOIN "MATCH" m ON o.official_id = m.referee_id
       GROUP BY o.official_id
       ORDER BY matches_assigned DESC, o.full_name ASC`
    );
  }, [dbReady, dbVersion]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return officials.filter((o) => {
      if (roleFilter !== 'ALL' && o.role !== roleFilter) return false;
      if (!q) return true;
      return (
        o.full_name.toLowerCase().includes(q) ||
        o.license_no.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q)
      );
    });
  }, [officials, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openAdd = () => {
    setEditing(null);
    setForm({ full_name: '', role: 'Referee', license_no: 'USA-REF-', phone: '+1-555-' });
    setModalOpen(true);
  };

  const openEdit = (o: OfficialRow) => {
    setEditing(o);
    setForm({ full_name: o.full_name, role: o.role, license_no: o.license_no, phone: o.phone });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        runExec(`UPDATE OFFICIAL SET full_name = ?, role = ?, license_no = ?, phone = ? WHERE official_id = ?`, [
          form.full_name.trim(),
          form.role,
          form.license_no.trim(),
          form.phone.trim(),
          editing.official_id,
        ]);
        addToast('success', 'Official Updated', `${form.full_name.trim()} updated.`);
      } else {
        runExec(`INSERT INTO OFFICIAL (full_name, role, license_no, phone) VALUES (?, ?, ?, ?)`, [
          form.full_name.trim(),
          form.role,
          form.license_no.trim(),
          form.phone.trim(),
        ]);
        addToast('success', 'Official Registered', `${form.full_name.trim()} added.`);
      }
      setModalOpen(false);
    } catch (err) {
      addToast('error', 'Constraint Error', err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = (o: OfficialRow) => {
    requestConfirm({
      title: `Delete ${o.full_name}?`,
      message: `Officials assigned to matches are protected by FOREIGN KEY (ON DELETE RESTRICT).`,
      confirmLabel: 'Delete Official',
      onConfirm: () => {
        try {
          runExec(`DELETE FROM OFFICIAL WHERE official_id = ?`, [o.official_id]);
          addToast('success', 'Official Deleted', `${o.full_name} removed.`);
        } catch (err) {
          addToast('error', 'Foreign Key Constraint', err instanceof Error ? err.message : String(err));
        }
      },
    });
  };

  return (
    <div className="space-y-5">
      <DbmsConceptBanner
        concept="UNIQUE License & Role CHECK Constraint"
        description="OFFICIAL enforces UNIQUE(license_no) and CHECK(role IN ('Referee','Linesman','Match Commissioner')). Match assignments are aggregated via LEFT JOIN."
        sqlHint="UNIQUE(license_no)"
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search official or license..."
              aria-label="Search officials"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="ALL">All Roles</option>
            <option value="Referee">Referee</option>
            <option value="Linesman">Linesman</option>
            <option value="Match Commissioner">Match Commissioner</option>
          </select>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add Official
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                <th className="py-3 px-4 text-left font-semibold">Official Name</th>
                <th className="py-3 px-4 text-left font-semibold">Role</th>
                <th className="py-3 px-4 text-left font-semibold">License No</th>
                <th className="py-3 px-4 text-left font-semibold">Phone</th>
                <th className="py-3 px-4 text-right font-semibold">Matches Assigned</th>
                <th className="py-3 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {paged.map((o) => (
                <tr key={o.official_id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{o.full_name}</td>
                  <td className="py-3 px-4 text-xs font-medium text-slate-700">{o.role}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">{o.license_no}</td>
                  <td className="py-3 px-4 text-xs text-slate-600">{o.phone}</td>
                  <td className="py-3 px-4 text-right font-bold text-[#0B3D91]">{o.matches_assigned}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(o)}
                        aria-label={`Edit ${o.full_name}`}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(o)}
                        aria-label={`Delete ${o.full_name}`}
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
        title={editing ? `Edit ${editing.full_name}` : 'Register Official'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="o-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                id="o-name"
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="o-role" className="block text-xs font-semibold text-slate-700 mb-1">
                Role
              </label>
              <select
                id="o-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as OfficialRow['role'] })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                <option value="Referee">Referee</option>
                <option value="Linesman">Linesman</option>
                <option value="Match Commissioner">Match Commissioner</option>
              </select>
            </div>
            <div>
              <label htmlFor="o-lic" className="block text-xs font-semibold text-slate-700 mb-1">
                License No (UNIQUE)
              </label>
              <input
                id="o-lic"
                type="text"
                required
                value={form.license_no}
                onChange={(e) => setForm({ ...form, license_no: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="o-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Phone
              </label>
              <input
                id="o-phone"
                type="text"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
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
              {editing ? 'Save Changes' : 'Add Official'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
