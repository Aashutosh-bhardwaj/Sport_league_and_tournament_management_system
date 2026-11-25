import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { runExec, runQuery } from '../services/db';
import { TeamBadge } from '../components/TeamBadge';
import { StatusLabel } from '../components/DataHelpers';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

export function PlayerDetailPage() {
  const { id } = useParams();
  const playerId = Number(id);
  const navigate = useNavigate();
  const { dbReady, dbVersion, addToast } = useApp();

  const [availForm, setAvailForm] = useState({
    from_date: '2026-11-25',
    to_date: '2026-12-05',
    reason: 'Recovery protocol',
  });

  const data = useMemo(() => {
    if (!dbReady || !Number.isFinite(playerId)) return null;

    const player = runQuery<{
      player_id: number;
      full_name: string;
      dob: string;
      position: string;
      jersey_no: number;
      email: string;
      status: string;
    }>(`SELECT * FROM PLAYER WHERE player_id = ?`, [playerId])[0];
    if (!player) return null;

    const seasonHistory = runQuery<{
      roster_id: number;
      season_name: string;
      tournament_id: number;
      tournament_name: string;
      team_id: number;
      team_name: string;
      logo_color: string;
      jersey_no: number;
      joined_on: string;
      matches_played: number;
      goals: number;
      assists: number;
      yellow_cards: number;
      red_cards: number;
      minutes_played: number;
    }>(
      `SELECT
         tr.roster_id, se.name AS season_name, trn.tournament_id, trn.name AS tournament_name,
         tm.team_id, tm.name AS team_name, tm.logo_color, tr.jersey_no, tr.joined_on,
         COUNT(DISTINCT ps.match_id) AS matches_played,
         COALESCE(SUM(ps.goals), 0) AS goals,
         COALESCE(SUM(ps.assists), 0) AS assists,
         COALESCE(SUM(ps.yellow_cards), 0) AS yellow_cards,
         COALESCE(SUM(ps.red_cards), 0) AS red_cards,
         COALESCE(SUM(ps.minutes_played), 0) AS minutes_played
       FROM TEAM_ROSTER tr
       INNER JOIN TEAM tm ON tr.team_id = tm.team_id
       INNER JOIN TOURNAMENT trn ON tr.tournament_id = trn.tournament_id
       INNER JOIN SEASON se ON trn.season_id = se.season_id
       LEFT JOIN "MATCH" m ON m.tournament_id = trn.tournament_id
       LEFT JOIN PLAYER_STATISTICS ps ON ps.match_id = m.match_id AND ps.player_id = tr.player_id
       WHERE tr.player_id = ?
       GROUP BY tr.roster_id
       ORDER BY se.name DESC, trn.tournament_id ASC`,
      [playerId]
    );

    const discipline = runQuery<{
      record_id: number;
      match_id: number;
      offence: string;
      card_type: string;
      suspension_matches: number;
      issued_on: string;
      tournament_name: string;
    }>(
      `SELECT
         dr.record_id, dr.match_id, dr.offence, dr.card_type, dr.suspension_matches, dr.issued_on,
         trn.name AS tournament_name
       FROM DISCIPLINARY_RECORD dr
       INNER JOIN "MATCH" m ON dr.match_id = m.match_id
       INNER JOIN TOURNAMENT trn ON m.tournament_id = trn.tournament_id
       WHERE dr.player_id = ?
       ORDER BY dr.issued_on DESC`,
      [playerId]
    );

    const availability = runQuery<{
      availability_id: number;
      from_date: string;
      to_date: string;
      reason: string;
    }>(
      `SELECT availability_id, from_date, to_date, reason FROM PLAYER_AVAILABILITY WHERE player_id = ? ORDER BY from_date DESC`,
      [playerId]
    );

    return { player, seasonHistory, discipline, availability };
  }, [dbReady, dbVersion, playerId]);

  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-sm font-semibold text-slate-800">Player not found</p>
        <Link to="/players" className="inline-block mt-3 text-xs font-semibold text-[#0B3D91] hover:underline">
          Back to Players
        </Link>
      </div>
    );
  }

  const totals = data.seasonHistory.reduce(
    (acc, r) => ({
      apps: acc.apps + r.matches_played,
      goals: acc.goals + r.goals,
      assists: acc.assists + r.assists,
      mins: acc.mins + r.minutes_played,
    }),
    { apps: 0, goals: 0, assists: 0, mins: 0 }
  );

  const handleAddAvailability = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      runExec(
        `INSERT INTO PLAYER_AVAILABILITY (player_id, from_date, to_date, reason) VALUES (?, ?, ?, ?)`,
        [playerId, availForm.from_date, availForm.to_date, availForm.reason.trim()]
      );
      addToast('success', 'Availability Saved', 'Added unavailability window.');
    } catch (err) {
      addToast('error', 'Constraint Error', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => navigate('/players')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Players
      </button>

      <DbmsConceptBanner
        concept="Multi-Season Historical Performance (3NF Join)"
        description="Career performance joins PLAYER, TEAM_ROSTER, TOURNAMENT, SEASON, and PLAYER_STATISTICS without duplicating team history inside PLAYER."
        sqlHint="TEAM_ROSTER JOIN PLAYER_STATISTICS"
      />

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#0B3D91] text-white font-display font-bold text-xl flex items-center justify-center tabular-nums">
            #{data.player.jersey_no}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-bold text-slate-900">{data.player.full_name}</h2>
              <StatusLabel status={data.player.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {data.player.position} · DOB: {data.player.dob} · {data.player.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[11px] text-slate-500">Appearances</p>
            <p className="font-display text-lg font-bold text-slate-900 tabular-nums">{totals.apps}</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[11px] text-slate-500">Goals</p>
            <p className="font-display text-lg font-bold text-slate-900 tabular-nums">{totals.goals}</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[11px] text-slate-500">Assists</p>
            <p className="font-display text-lg font-bold text-slate-900 tabular-nums">{totals.assists}</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[11px] text-slate-500">Minutes</p>
            <p className="font-display text-lg font-bold text-slate-900 tabular-nums">{totals.mins}</p>
          </div>
        </div>
      </div>

      {/* Career Stats by Season/Tournament */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-display text-base font-bold text-slate-900">Career Performance Across Seasons</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                <th className="py-2.5 px-4 text-left font-semibold">Season</th>
                <th className="py-2.5 px-4 text-left font-semibold">Tournament</th>
                <th className="py-2.5 px-4 text-left font-semibold">Team</th>
                <th className="py-2.5 px-4 text-right font-semibold">Apps</th>
                <th className="py-2.5 px-4 text-right font-semibold">Goals</th>
                <th className="py-2.5 px-4 text-right font-semibold">Assists</th>
                <th className="py-2.5 px-4 text-right font-semibold">YC / RC</th>
                <th className="py-2.5 px-4 text-right font-semibold">Minutes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {data.seasonHistory.map((h) => (
                <tr key={h.roster_id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{h.season_name}</td>
                  <td className="py-2.5 px-4 text-slate-700">{h.tournament_name}</td>
                  <td className="py-2.5 px-4">
                    <Link to={`/teams/${h.team_id}`} className="inline-flex items-center gap-2 hover:underline">
                      <TeamBadge name={h.team_name} color={h.logo_color} size="xs" />
                      <span className="font-medium text-slate-900">{h.team_name}</span>
                    </Link>
                  </td>
                  <td className="py-2.5 px-4 text-right">{h.matches_played}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900">{h.goals}</td>
                  <td className="py-2.5 px-4 text-right">{h.assists}</td>
                  <td className="py-2.5 px-4 text-right">
                    {h.yellow_cards} / {h.red_cards}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-600">{h.minutes_played}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Disciplinary History */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-display text-base font-bold text-slate-900">Disciplinary Record</h3>
          </div>
          {data.discipline.length === 0 ? (
            <p className="p-6 text-xs text-slate-500">Clean disciplinary record — no yellow or red cards issued.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.discipline.map((d) => (
                <div key={d.record_id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{d.offence}</p>
                    <p className="text-[11px] text-slate-500">
                      {d.tournament_name} · Match #{d.match_id} · {d.issued_on}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                      d.card_type === 'RED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {d.card_type} ({d.suspension_matches}m)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Availability Log */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-display text-base font-bold text-slate-900">Availability & Injury Tracking</h3>
          <form onSubmit={handleAddAvailability} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="date"
              required
              aria-label="Unavailable from date"
              value={availForm.from_date}
              onChange={(e) => setAvailForm({ ...availForm, from_date: e.target.value })}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
            <input
              type="date"
              required
              aria-label="Unavailable to date"
              value={availForm.to_date}
              onChange={(e) => setAvailForm({ ...availForm, to_date: e.target.value })}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Reason..."
                aria-label="Unavailability reason"
                value={availForm.reason}
                onChange={(e) => setAvailForm({ ...availForm, reason: e.target.value })}
                className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
              <button
                type="submit"
                aria-label="Add availability record"
                className="px-3 py-1.5 bg-[#0B3D91] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </form>

          <div className="divide-y divide-slate-100">
            {data.availability.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No unavailability windows logged.</p>
            ) : (
              data.availability.map((a) => (
                <div key={a.availability_id} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800">{a.reason}</span>
                  <span className="text-slate-500 tabular-nums">
                    {a.from_date} → {a.to_date}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
