import React, { useMemo, useState } from 'react';
import { Plus, Send, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { runExec, runQuery } from '../services/db';
import { Modal } from '../components/Modal';

interface CommRow {
  comm_id: number;
  title: string;
  message: string;
  category: 'Schedule Notice' | 'Disciplinary' | 'Registration' | 'General';
  target_audience: string;
  sent_by: string;
  sent_at: string;
}

export function CommunicationsPage() {
  const { dbReady, dbVersion, addToast, requestConfirm } = useApp();
  const [catFilter, setCatFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    message: '',
    category: 'Schedule Notice' as CommRow['category'],
    target_audience: 'All Coaches & Team Managers',
  });

  const notices = useMemo(() => {
    if (!dbReady) return [];
    return runQuery<CommRow>(`SELECT * FROM COMMUNICATION ORDER BY comm_id DESC`);
  }, [dbReady, dbVersion]);

  const filtered = notices.filter((n) => catFilter === 'ALL' || n.category === catFilter);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      runExec(
        `INSERT INTO COMMUNICATION (title, message, category, target_audience, sent_by, sent_at)
         VALUES (?, ?, ?, ?, 'John Doe', datetime('now'))`,
        [form.title.trim(), form.message.trim(), form.category, form.target_audience.trim()]
      );
      addToast('success', 'Notice Broadcasted', 'Communication logged to SQLite COMMUNICATION table.');
      setModalOpen(false);
      setForm({ title: '', message: '', category: 'Schedule Notice', target_audience: 'All Coaches & Team Managers' });
    } catch (err) {
      addToast('error', 'Failed to Send', err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = (c: CommRow) => {
    requestConfirm({
      title: 'Delete Notice?',
      message: `Remove "${c.title}" from the league communications log?`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        runExec(`DELETE FROM COMMUNICATION WHERE comm_id = ?`, [c.comm_id]);
        addToast('success', 'Notice Deleted', 'Communication removed.');
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {['ALL', 'Schedule Notice', 'Disciplinary', 'Registration', 'General'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                catFilter === c ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {c === 'ALL' ? 'All Notices' : c}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0B3D91] hover:bg-[#093175] rounded-lg"
        >
          <Plus className="w-4 h-4" />
          New Announcement
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((n) => (
          <div key={n.comm_id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-[#0B3D91]">{n.category}</span>
                <span>·</span>
                <span>To: {n.target_audience}</span>
                <span>·</span>
                <span className="tabular-nums">{n.sent_at}</span>
              </div>
              <h3 className="font-display text-base font-bold text-slate-900">{n.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{n.message}</p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(n)}
              aria-label={`Delete notice ${n.title}`}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Broadcast League Announcement">
        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="c-cat" className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                id="c-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as CommRow['category'] })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                <option value="Schedule Notice">Schedule Notice</option>
                <option value="Disciplinary">Disciplinary</option>
                <option value="Registration">Registration</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label htmlFor="c-aud" className="block text-xs font-semibold text-slate-700 mb-1">Target Audience</label>
              <input
                id="c-aud"
                type="text"
                required
                value={form.target_audience}
                onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label htmlFor="c-title" className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
            <input
              id="c-title"
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="c-msg" className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
            <textarea
              id="c-msg"
              rows={4}
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2.5">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#0B3D91] rounded-lg">
              <Send className="w-3.5 h-3.5" />
              Send Notice
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
