import React, { useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { runExec, runQuery } from '../services/db';
import { TeamBadge } from '../components/TeamBadge';
import { Pagination } from '../components/DataHelpers';
import { Modal } from '../components/Modal';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

interface PaymentRow {
  payment_id: number;
  team_id: number;
  team_name: string;
  logo_color: string;
  tournament_id: number;
  tournament_name: string;
  season_name: string;
  amount: number;
  category: 'Registration' | 'Sponsorship' | 'Merchandise' | 'Other';
  paid_on: string;
}

export function PaymentsPage() {
  const { dbReady, dbVersion, seasonFilter, addToast, requestConfirm } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    team_id: '1',
    tournament_id: '1',
    amount: '450',
    category: 'Registration' as PaymentRow['category'],
    paid_on: '2026-11-23',
  });

  const lookups = useMemo(() => {
    if (!dbReady) return { teams: [], tournaments: [] };
    return {
      teams: runQuery<{ team_id: number; name: string }>(`SELECT team_id, name FROM TEAM ORDER BY name ASC`),
      tournaments: runQuery<{ tournament_id: number; name: string }>(`SELECT tournament_id, name FROM TOURNAMENT ORDER BY tournament_id ASC`),
    };
  }, [dbReady, dbVersion]);

  const data = useMemo(() => {
    if (!dbReady) return { rows: [], breakdown: [], total: 0 };
    const isAll = seasonFilter === 'ALL';
    const params = isAll ? [] : [seasonFilter];

    const rows = runQuery<PaymentRow>(
      `SELECT
         p.payment_id, p.team_id, tm.name AS team_name, tm.logo_color,
         p.tournament_id, trn.name AS tournament_name, s.name AS season_name,
         p.amount, p.category, p.paid_on
       FROM PAYMENT p
       INNER JOIN TEAM tm ON p.team_id = tm.team_id
       INNER JOIN TOURNAMENT trn ON p.tournament_id = trn.tournament_id
       INNER JOIN SEASON s ON trn.season_id = s.season_id
       WHERE 1=1 ${isAll ? '' : 'AND s.name = ?'}
       ORDER BY p.paid_on DESC, p.payment_id DESC`,
      params
    );

    const breakdown = runQuery<{ category: string; total: number; cnt: number }>(
      `SELECT p.category, ROUND(SUM(p.amount), 2) AS total, COUNT(*) AS cnt
       FROM PAYMENT p
       INNER JOIN TOURNAMENT trn ON p.tournament_id = trn.tournament_id
       INNER JOIN SEASON s ON trn.season_id = s.season_id
       WHERE 1=1 ${isAll ? '' : 'AND s.name = ?'}
       GROUP BY p.category`,
      params
    );

    const total = rows.reduce((acc, r) => acc + r.amount, 0);
    return { rows, breakdown, total };
  }, [dbReady, dbVersion, seasonFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.rows.filter((r) => {
      if (category !== 'ALL' && r.category !== category) return false;
      if (!q) return true;
      return r.team_name.toLowerCase().includes(q) || r.tournament_name.toLowerCase().includes(q);
    });
  }, [data.rows, search, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      runExec(
        `INSERT INTO PAYMENT (team_id, tournament_id, amount, category, paid_on) VALUES (?, ?, ?, ?, ?)`,
        [Number(form.team_id), Number(form.tournament_id), Number(form.amount), form.category, form.paid_on]
      );
      addToast('success', 'Payment Recorded', `Recorded $${Number(form.amount).toFixed(2)} (${form.category}).`);
      setModalOpen(false);
    } catch (err) {
      addToast('error', 'Constraint Error', err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = (p: PaymentRow) => {
    requestConfirm({
      title: `Delete Payment #${p.payment_id}?`,
      message: `Remove $${p.amount.toFixed(2)} payment from ${p.team_name}?`,
      confirmLabel: 'Delete Payment',
      onConfirm: () => {
        runExec(`DELETE FROM PAYMENT WHERE payment_id = ?`, [p.payment_id]);
        addToast('success', 'Payment Removed', 'Ledger updated.');
      },
    });
  };

  return (
    <div className="space-y-5">
      <DbmsConceptBanner
        concept="Conditional Aggregation (v_tournament_revenue)"
        description="Payment categories are validated by CHECK(category IN ('Registration','Sponsorship','Merchandise','Other')) and aggregated via GROUP BY."
        sqlHint="CHECK(amount > 0)"
      />

      {/* Category Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Total Revenue</p>
          <p className="font-display text-2xl font-bold text-[#0B3D91] tabular-nums mt-1">
            ${data.total.toLocaleString()}
          </p>
        </div>
        {['Registration', 'Sponsorship', 'Merchandise', 'Other'].map((cat) => {
          const match = data.breakdown.find((b) => b.category === cat);
          return (
            <div key={cat} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{cat}</p>
              <p className="font-display text-xl font-bold text-slate-900 tabular-nums mt-1">
                ${(match?.total ?? 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 tabular-nums">{match?.cnt ?? 0} transactions</p>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
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
              placeholder="Search team or tournament..."
              aria-label="Search payments"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="ALL">All Categories</option>
            <option value="Registration">Registration</option>
            <option value="Sponsorship">Sponsorship</option>
            <option value="Merchandise">Merchandise</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                <th className="py-3 px-4 text-left font-semibold">Date</th>
                <th className="py-3 px-4 text-left font-semibold">Team</th>
                <th className="py-3 px-4 text-left font-semibold">Tournament</th>
                <th className="py-3 px-4 text-left font-semibold">Category</th>
                <th className="py-3 px-4 text-right font-semibold">Amount</th>
                <th className="py-3 px-4 text-right font-semibold">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {paged.map((p) => (
                <tr key={p.payment_id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 text-xs text-slate-600">{p.paid_on}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <TeamBadge name={p.team_name} color={p.logo_color} size="xs" />
                      <span className="font-semibold text-slate-900">{p.team_name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-slate-600">{p.tournament_name}</td>
                  <td className="py-2.5 px-4 text-xs font-medium text-slate-700">{p.category}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900">${p.amount.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      aria-label={`Delete payment ${p.payment_id}`}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record League Payment">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pay-team" className="block text-xs font-semibold text-slate-700 mb-1">Team</label>
              <select
                id="pay-team"
                value={form.team_id}
                onChange={(e) => setForm({ ...form, team_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                {lookups.teams.map((t) => <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pay-trn" className="block text-xs font-semibold text-slate-700 mb-1">Tournament</label>
              <select
                id="pay-trn"
                value={form.tournament_id}
                onChange={(e) => setForm({ ...form, tournament_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                {lookups.tournaments.map((t) => <option key={t.tournament_id} value={t.tournament_id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pay-cat" className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                id="pay-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as PaymentRow['category'] })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                <option value="Registration">Registration</option>
                <option value="Sponsorship">Sponsorship</option>
                <option value="Merchandise">Merchandise</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="pay-amt" className="block text-xs font-semibold text-slate-700 mb-1">Amount ($)</label>
              <input
                id="pay-amt"
                type="number"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="pay-date" className="block text-xs font-semibold text-slate-700 mb-1">Paid On</label>
              <input
                id="pay-date"
                type="date"
                required
                value={form.paid_on}
                onChange={(e) => setForm({ ...form, paid_on: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2.5">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-[#0B3D91] rounded-lg">
              Record Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
