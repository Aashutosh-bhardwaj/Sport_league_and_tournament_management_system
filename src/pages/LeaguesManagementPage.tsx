import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { runExec, runQuery } from '../services/db';
import { StatusLabel } from '../components/DataHelpers';
import { Modal } from '../components/Modal';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

export function LeaguesManagementPage() {
  const { dbReady, dbVersion, addToast, requestConfirm } = useApp();
  const [modalType, setModalType] = useState<'sport' | 'league' | 'season' | 'tournament' | null>(null);

  const [sportForm, setSportForm] = useState({ name: '', players_per_team: '11' });
  const [leagueForm, setLeagueForm] = useState({ sport_id: '1', name: '', country: 'United States', level: 'Division 2' });
  const [seasonForm, setSeasonForm] = useState({ league_id: '1', name: '2027', start_date: '2027-01-10', end_date: '2027-11-30' });
  const [trnForm, setTrnForm] = useState({
    season_id: '1',
    name: '',
    format: 'LEAGUE' as 'LEAGUE' | 'KNOCKOUT' | 'GROUP_KNOCKOUT',
    registration_fee: '500',
    status: 'UPCOMING' as 'UPCOMING' | 'ONGOING' | 'COMPLETED',
  });

  const data = useMemo(() => {
    if (!dbReady) return { sports: [], leagues: [], seasons: [], tournaments: [] };
    return {
      sports: runQuery<{ sport_id: number; name: string; players_per_team: number }>(`SELECT * FROM SPORT ORDER BY sport_id`),
      leagues: runQuery<{ league_id: number; sport_id: number; sport_name: string; name: string; country: string; level: string }>(
        `SELECT l.*, s.name AS sport_name FROM LEAGUE l JOIN SPORT s ON l.sport_id = s.sport_id ORDER BY l.league_id`
      ),
      seasons: runQuery<{ season_id: number; league_id: number; league_name: string; name: string; start_date: string; end_date: string }>(
        `SELECT se.*, l.name AS league_name FROM SEASON se JOIN LEAGUE l ON se.league_id = l.league_id ORDER BY se.name DESC`
      ),
      tournaments: runQuery<{
        tournament_id: number;
        season_id: number;
        season_name: string;
        league_name: string;
        name: string;
        format: string;
        registration_fee: number;
        status: string;
      }>(
        `SELECT t.*, se.name AS season_name, l.name AS league_name
         FROM TOURNAMENT t
         JOIN SEASON se ON t.season_id = se.season_id
         JOIN LEAGUE l ON se.league_id = l.league_id
         ORDER BY se.name DESC, t.tournament_id ASC`
      ),
    };
  }, [dbReady, dbVersion]);

  const handleSaveSport = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      runExec(`INSERT INTO SPORT (name, players_per_team) VALUES (?, ?)`, [
        sportForm.name.trim(),
        Number(sportForm.players_per_team),
      ]);
      addToast('success', 'Sport Created', `${sportForm.name.trim()} added.`);
      setModalType(null);
    } catch (err) {
      addToast('error', 'Constraint Error', err instanceof Error ? err.message : String(err));
    }
  };

  const handleSaveLeague = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      runExec(`INSERT INTO LEAGUE (sport_id, name, country, level) VALUES (?, ?, ?, ?)`, [
        Number(leagueForm.sport_id),
        leagueForm.name.trim(),
        leagueForm.country.trim(),
        leagueForm.level.trim(),
      ]);
      addToast('success', 'League Created', `${leagueForm.name.trim()} added.`);
      setModalType(null);
    } catch (err) {
      addToast('error', 'Constraint Error', err instanceof Error ? err.message : String(err));
    }
  };

  const handleSaveSeason = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      runExec(`INSERT INTO SEASON (league_id, name, start_date, end_date) VALUES (?, ?, ?, ?)`, [
        Number(seasonForm.league_id),
        seasonForm.name.trim(),
        seasonForm.start_date,
        seasonForm.end_date,
      ]);
      addToast('success', 'Season Created', `${seasonForm.name.trim()} added.`);
      setModalType(null);
    } catch (err) {
      addToast('error', 'Check Constraint Failed', err instanceof Error ? err.message : String(err));
    }
  };

  const handleSaveTournament = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      runExec(`INSERT INTO TOURNAMENT (season_id, name, format, registration_fee, status) VALUES (?, ?, ?, ?, ?)`, [
        Number(trnForm.season_id),
        trnForm.name.trim(),
        trnForm.format,
        Number(trnForm.registration_fee),
        trnForm.status,
      ]);
      addToast('success', 'Tournament Created', `${trnForm.name.trim()} added.`);
      setModalType(null);
    } catch (err) {
      addToast('error', 'Constraint Error', err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = (table: string, idCol: string, idVal: number, label: string) => {
    requestConfirm({
      title: `Delete ${label}?`,
      message: `Attempting to delete from ${table}. Foreign key constraints (ON DELETE RESTRICT) prevent deleting parent entities that still have child records.`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        try {
          runExec(`DELETE FROM ${table} WHERE ${idCol} = ?`, [idVal]);
          addToast('success', 'Deleted', `${label} removed.`);
        } catch (err) {
          addToast('error', 'Foreign Key Constraint', err instanceof Error ? err.message : String(err));
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <DbmsConceptBanner
        concept="3NF Entity Hierarchy (Sport → League → Season → Tournament)"
        description="Demonstrates normalized parent-child FK relationships with CHECK(end_date > start_date) and ON DELETE RESTRICT integrity."
        sqlHint="SPORT < LEAGUE < SEASON < TOURNAMENT"
      />

      {/* Sports & Leagues Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">1. Sports</h2>
            <button
              type="button"
              onClick={() => {
                setSportForm({ name: '', players_per_team: '11' });
                setModalType('sport');
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#0B3D91] rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" /> Add Sport
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {data.sports.map((s) => (
              <div key={s.sport_id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-500 tabular-nums">{s.players_per_team} players per side</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete('SPORT', 'sport_id', s.sport_id, s.name)}
                  aria-label={`Delete ${s.name}`}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">2. Leagues</h2>
            <button
              type="button"
              onClick={() => {
                setLeagueForm({ sport_id: String(data.sports[0]?.sport_id ?? 1), name: '', country: 'United States', level: 'Division 1' });
                setModalType('league');
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#0B3D91] rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" /> Add League
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {data.leagues.map((l) => (
              <div key={l.league_id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{l.name}</p>
                  <p className="text-xs text-slate-500">
                    {l.sport_name} · {l.country} · {l.level}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete('LEAGUE', 'league_id', l.league_id, l.name)}
                  aria-label={`Delete ${l.name}`}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seasons */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-slate-900">3. Seasons</h2>
          <button
            type="button"
            onClick={() => {
              setSeasonForm({ league_id: String(data.leagues[0]?.league_id ?? 1), name: '2027', start_date: '2027-01-10', end_date: '2027-11-30' });
              setModalType('season');
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#0B3D91] rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> Add Season
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                <th className="py-2.5 px-4 text-left font-semibold">Season</th>
                <th className="py-2.5 px-4 text-left font-semibold">League</th>
                <th className="py-2.5 px-4 text-left font-semibold">Start Date</th>
                <th className="py-2.5 px-4 text-left font-semibold">End Date</th>
                <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {data.seasons.map((se) => (
                <tr key={se.season_id}>
                  <td className="py-2.5 px-4 font-bold text-slate-900">{se.name}</td>
                  <td className="py-2.5 px-4 text-slate-700">{se.league_name}</td>
                  <td className="py-2.5 px-4 text-slate-600">{se.start_date}</td>
                  <td className="py-2.5 px-4 text-slate-600">{se.end_date}</td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete('SEASON', 'season_id', se.season_id, `${se.name} Season`)}
                      aria-label={`Delete ${se.name} season`}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tournaments */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-slate-900">4. Tournaments</h2>
          <button
            type="button"
            onClick={() => {
              setTrnForm({
                season_id: String(data.seasons[0]?.season_id ?? 1),
                name: '',
                format: 'LEAGUE',
                registration_fee: '500',
                status: 'UPCOMING',
              });
              setModalType('tournament');
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#0B3D91] rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> Add Tournament
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                <th className="py-2.5 px-4 text-left font-semibold">Tournament</th>
                <th className="py-2.5 px-4 text-left font-semibold">League / Season</th>
                <th className="py-2.5 px-4 text-left font-semibold">Format</th>
                <th className="py-2.5 px-4 text-right font-semibold">Reg. Fee</th>
                <th className="py-2.5 px-4 text-left font-semibold">Status</th>
                <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {data.tournaments.map((tr) => (
                <tr key={tr.tournament_id}>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{tr.name}</td>
                  <td className="py-2.5 px-4 text-xs text-slate-600">
                    {tr.league_name} ({tr.season_name})
                  </td>
                  <td className="py-2.5 px-4 font-mono text-xs text-slate-700">{tr.format}</td>
                  <td className="py-2.5 px-4 text-right font-semibold">${tr.registration_fee.toFixed(2)}</td>
                  <td className="py-2.5 px-4">
                    <StatusLabel status={tr.status} />
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete('TOURNAMENT', 'tournament_id', tr.tournament_id, tr.name)}
                      aria-label={`Delete ${tr.name}`}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <Modal open={modalType === 'sport'} onClose={() => setModalType(null)} title="Add Sport" maxWidth="sm">
        <form onSubmit={handleSaveSport} className="space-y-4">
          <div>
            <label htmlFor="sp-name" className="block text-xs font-semibold text-slate-700 mb-1">Sport Name</label>
            <input id="sp-name" required value={sportForm.name} onChange={(e) => setSportForm({ ...sportForm, name: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label htmlFor="sp-ppt" className="block text-xs font-semibold text-slate-700 mb-1">Players Per Team (&gt; 0)</label>
            <input id="sp-ppt" type="number" required value={sportForm.players_per_team} onChange={(e) => setSportForm({ ...sportForm, players_per_team: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 text-sm bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-[#0B3D91] rounded-lg">Save Sport</button>
          </div>
        </form>
      </Modal>

      <Modal open={modalType === 'league'} onClose={() => setModalType(null)} title="Add League" maxWidth="md">
        <form onSubmit={handleSaveLeague} className="space-y-4">
          <div>
            <label htmlFor="lg-sport" className="block text-xs font-semibold text-slate-700 mb-1">Sport</label>
            <select id="lg-sport" value={leagueForm.sport_id} onChange={(e) => setLeagueForm({ ...leagueForm, sport_id: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
              {data.sports.map((s) => <option key={s.sport_id} value={s.sport_id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="lg-name" className="block text-xs font-semibold text-slate-700 mb-1">League Name</label>
            <input id="lg-name" required value={leagueForm.name} onChange={(e) => setLeagueForm({ ...leagueForm, name: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="lg-country" className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
              <input id="lg-country" required value={leagueForm.country} onChange={(e) => setLeagueForm({ ...leagueForm, country: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label htmlFor="lg-level" className="block text-xs font-semibold text-slate-700 mb-1">Level</label>
              <input id="lg-level" required value={leagueForm.level} onChange={(e) => setLeagueForm({ ...leagueForm, level: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 text-sm bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-[#0B3D91] rounded-lg">Save League</button>
          </div>
        </form>
      </Modal>

      <Modal open={modalType === 'season'} onClose={() => setModalType(null)} title="Add Season" subtitle="Enforces CHECK(end_date > start_date)" maxWidth="md">
        <form onSubmit={handleSaveSeason} className="space-y-4">
          <div>
            <label htmlFor="se-lg" className="block text-xs font-semibold text-slate-700 mb-1">League</label>
            <select id="se-lg" value={seasonForm.league_id} onChange={(e) => setSeasonForm({ ...seasonForm, league_id: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
              {data.leagues.map((l) => <option key={l.league_id} value={l.league_id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="se-name" className="block text-xs font-semibold text-slate-700 mb-1">Season Name</label>
            <input id="se-name" required value={seasonForm.name} onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="se-start" className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <input id="se-start" type="date" required value={seasonForm.start_date} onChange={(e) => setSeasonForm({ ...seasonForm, start_date: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label htmlFor="se-end" className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
              <input id="se-end" type="date" required value={seasonForm.end_date} onChange={(e) => setSeasonForm({ ...seasonForm, end_date: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 text-sm bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-[#0B3D91] rounded-lg">Save Season</button>
          </div>
        </form>
      </Modal>

      <Modal open={modalType === 'tournament'} onClose={() => setModalType(null)} title="Add Tournament" maxWidth="md">
        <form onSubmit={handleSaveTournament} className="space-y-4">
          <div>
            <label htmlFor="tr-se" className="block text-xs font-semibold text-slate-700 mb-1">Season</label>
            <select id="tr-se" value={trnForm.season_id} onChange={(e) => setTrnForm({ ...trnForm, season_id: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
              {data.seasons.map((se) => <option key={se.season_id} value={se.season_id}>{se.name} - {se.league_name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tr-name" className="block text-xs font-semibold text-slate-700 mb-1">Tournament Name</label>
            <input id="tr-name" required value={trnForm.name} onChange={(e) => setTrnForm({ ...trnForm, name: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="tr-fmt" className="block text-xs font-semibold text-slate-700 mb-1">Format</label>
              <select id="tr-fmt" value={trnForm.format} onChange={(e) => setTrnForm({ ...trnForm, format: e.target.value as 'LEAGUE' | 'KNOCKOUT' | 'GROUP_KNOCKOUT' })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                <option value="LEAGUE">LEAGUE</option>
                <option value="KNOCKOUT">KNOCKOUT</option>
                <option value="GROUP_KNOCKOUT">GROUP_KNOCKOUT</option>
              </select>
            </div>
            <div>
              <label htmlFor="tr-fee" className="block text-xs font-semibold text-slate-700 mb-1">Fee ($)</label>
              <input id="tr-fee" type="number" min={0} step="0.01" required value={trnForm.registration_fee} onChange={(e) => setTrnForm({ ...trnForm, registration_fee: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label htmlFor="tr-st" className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select id="tr-st" value={trnForm.status} onChange={(e) => setTrnForm({ ...trnForm, status: e.target.value as 'UPCOMING' | 'ONGOING' | 'COMPLETED' })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                <option value="UPCOMING">UPCOMING</option>
                <option value="ONGOING">ONGOING</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 text-sm bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-[#0B3D91] rounded-lg">Save Tournament</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
