import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Calendar, DollarSign, MapPin, Shield, Trophy, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { runQuery } from '../services/db';
import { TeamBadge } from '../components/TeamBadge';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

const PAYMENT_COLORS: Record<string, string> = {
  Registration: '#0B3D91',
  Sponsorship: '#16A34A',
  Merchandise: '#EA580C',
  Other: '#7C3AED',
};

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Aug',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dec',
};

export function DashboardPage() {
  const { dbReady, dbVersion, seasonFilter } = useApp();
  const navigate = useNavigate();

  const data = useMemo(() => {
    if (!dbReady) return null;

    const isAll = seasonFilter === 'ALL';
    const seasonParams = isAll ? [] : [seasonFilter];

    const teamCount = isAll
      ? runQuery<{ c: number }>(`SELECT COUNT(*) AS c FROM TEAM`)[0].c
      : runQuery<{ c: number }>(
          `SELECT COUNT(DISTINCT tr.team_id) AS c
           FROM TEAM_ROSTER tr
           INNER JOIN TOURNAMENT t ON tr.tournament_id = t.tournament_id
           INNER JOIN SEASON s ON t.season_id = s.season_id
           WHERE s.name = ?`,
          seasonParams
        )[0].c;

    const playerCount = isAll
      ? runQuery<{ c: number }>(`SELECT COUNT(*) AS c FROM PLAYER`)[0].c
      : runQuery<{ c: number }>(
          `SELECT COUNT(DISTINCT tr.player_id) AS c
           FROM TEAM_ROSTER tr
           INNER JOIN TOURNAMENT t ON tr.tournament_id = t.tournament_id
           INNER JOIN SEASON s ON t.season_id = s.season_id
           WHERE s.name = ?`,
          seasonParams
        )[0].c;

    const matchCount = isAll
      ? runQuery<{ c: number }>(`SELECT COUNT(*) AS c FROM "MATCH"`)[0].c
      : runQuery<{ c: number }>(
          `SELECT COUNT(*) AS c
           FROM "MATCH" m
           INNER JOIN TOURNAMENT t ON m.tournament_id = t.tournament_id
           INNER JOIN SEASON s ON t.season_id = s.season_id
           WHERE s.name = ?`,
          seasonParams
        )[0].c;

    const venueCount = runQuery<{ c: number }>(`SELECT COUNT(*) AS c FROM VENUE`)[0].c;

    const revenueTotal = isAll
      ? runQuery<{ total: number }>(`SELECT COALESCE(SUM(amount), 0) AS total FROM PAYMENT`)[0].total
      : runQuery<{ total: number }>(
          `SELECT COALESCE(SUM(p.amount), 0) AS total
           FROM PAYMENT p
           INNER JOIN TOURNAMENT t ON p.tournament_id = t.tournament_id
           INNER JOIN SEASON s ON t.season_id = s.season_id
           WHERE s.name = ?`,
          seasonParams
        )[0].total;

    const upcomingGames = runQuery<{
      match_id: number;
      match_date: string;
      start_time: string;
      home_team_name: string;
      home_logo_color: string;
      away_team_name: string;
      away_logo_color: string;
      venue_name: string;
    }>(
      `SELECT
         match_id, match_date, start_time,
         home_team_name, home_logo_color,
         away_team_name, away_logo_color,
         venue_name
       FROM v_upcoming_matches
       ${isAll ? '' : 'WHERE season_name = ?'}
       ORDER BY match_date ASC, start_time ASC
       LIMIT 5`,
      seasonParams
    );

    const primaryTournament = runQuery<{ tournament_id: number; name: string }>(
      `SELECT t.tournament_id, t.name
       FROM TOURNAMENT t
       INNER JOIN SEASON s ON t.season_id = s.season_id
       ${isAll ? '' : 'WHERE s.name = ?'}
       ORDER BY CASE t.status WHEN 'ONGOING' THEN 1 WHEN 'UPCOMING' THEN 2 ELSE 3 END, t.tournament_id ASC
       LIMIT 1`,
      seasonParams
    )[0];

    const standingsRows = primaryTournament
      ? runQuery<{
          rank_pos: number;
          team_id: number;
          team_name: string;
          logo_color: string;
          played: number;
          won: number;
          drawn: number;
          lost: number;
          points: number;
        }>(
          `SELECT rank_pos, team_id, team_name, logo_color, played, won, drawn, lost, points
           FROM v_points_table
           WHERE tournament_id = ?
           ORDER BY rank_pos ASC
           LIMIT 6`,
          [primaryTournament.tournament_id]
        )
      : [];

    const recentResults = runQuery<{
      match_id: number;
      match_date: string;
      home_name: string;
      home_color: string;
      away_name: string;
      away_color: string;
      home_score: number;
      away_score: number;
    }>(
      `SELECT
         m.match_id, m.match_date,
         ht.name AS home_name, ht.logo_color AS home_color,
         at.name AS away_name, at.logo_color AS away_color,
         mr.home_score, mr.away_score
       FROM "MATCH" m
       INNER JOIN MATCH_RESULT mr ON m.match_id = mr.match_id
       INNER JOIN TEAM ht ON m.home_team_id = ht.team_id
       INNER JOIN TEAM at ON m.away_team_id = at.team_id
       INNER JOIN TOURNAMENT t ON m.tournament_id = t.tournament_id
       INNER JOIN SEASON s ON t.season_id = s.season_id
       WHERE m.status = 'COMPLETED' ${isAll ? '' : 'AND s.name = ?'}
       ORDER BY m.match_date DESC, m.match_id DESC
       LIMIT 5`,
      seasonParams
    );

    const regByMonthRaw = runQuery<{ month_num: string; count: number }>(
      `SELECT strftime('%m', tr.joined_on) AS month_num, COUNT(DISTINCT tr.player_id) AS count
       FROM TEAM_ROSTER tr
       INNER JOIN TOURNAMENT t ON tr.tournament_id = t.tournament_id
       INNER JOIN SEASON s ON t.season_id = s.season_id
       WHERE 1=1 ${isAll ? '' : 'AND s.name = ?'}
       GROUP BY month_num
       ORDER BY month_num ASC`,
      seasonParams
    );

    const registrationsChart = regByMonthRaw.map((r) => ({
      month: MONTH_LABELS[r.month_num] ?? r.month_num,
      players: r.count,
    }));

    const paymentBreakdownRaw = runQuery<{ category: string; total: number }>(
      `SELECT p.category, ROUND(SUM(p.amount), 2) AS total
       FROM PAYMENT p
       INNER JOIN TOURNAMENT t ON p.tournament_id = t.tournament_id
       INNER JOIN SEASON s ON t.season_id = s.season_id
       WHERE 1=1 ${isAll ? '' : 'AND s.name = ?'}
       GROUP BY p.category`,
      seasonParams
    );

    const categoriesOrder = ['Registration', 'Sponsorship', 'Merchandise', 'Other'];
    const payMap = new Map(paymentBreakdownRaw.map((r) => [r.category, r.total]));
    const paymentChart = categoriesOrder.map((cat) => ({
      name: cat,
      value: payMap.get(cat) ?? 0,
      color: PAYMENT_COLORS[cat],
    }));

    const teamCategoryRaw = runQuery<{ category: string; count: number }>(
      isAll
        ? `SELECT category, COUNT(*) AS count FROM TEAM GROUP BY category`
        : `SELECT tm.category, COUNT(DISTINCT tm.team_id) AS count
           FROM TEAM tm
           INNER JOIN TEAM_ROSTER tr ON tm.team_id = tr.team_id
           INNER JOIN TOURNAMENT t ON tr.tournament_id = t.tournament_id
           INNER JOIN SEASON s ON t.season_id = s.season_id
           WHERE s.name = ?
           GROUP BY tm.category`,
      seasonParams
    );
    const catMap = new Map(teamCategoryRaw.map((r) => [r.category, r.count]));
    const teamCategories = [
      { label: 'Youth', count: catMap.get('Youth') ?? 0, color: '#0284C7' },
      { label: 'Amateur', count: catMap.get('Amateur') ?? 0, color: '#EA580C' },
      { label: 'Women', count: catMap.get('Women') ?? 0, color: '#7C3AED' },
      { label: 'Senior', count: catMap.get('Senior') ?? 0, color: '#0B3D91' },
    ];

    return {
      teamCount,
      playerCount,
      matchCount,
      venueCount,
      revenueTotal,
      upcomingGames,
      primaryTournament,
      standingsRows,
      recentResults,
      registrationsChart,
      paymentChart,
      teamCategories,
    };
  }, [dbReady, dbVersion, seasonFilter]);

  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
        ))}
      </div>
    );
  }

  const kpis = [
    {
      label: 'Teams',
      value: data.teamCount.toLocaleString(),
      icon: Shield,
      iconBg: 'bg-blue-600',
      to: '/teams',
    },
    {
      label: 'Players',
      value: data.playerCount.toLocaleString(),
      icon: Users,
      iconBg: 'bg-emerald-600',
      to: '/players',
    },
    {
      label: 'Games',
      value: data.matchCount.toLocaleString(),
      icon: Trophy,
      iconBg: 'bg-amber-500',
      to: '/games',
    },
    {
      label: 'Venues',
      value: data.venueCount.toLocaleString(),
      icon: MapPin,
      iconBg: 'bg-violet-600',
      to: '/venues',
    },
    {
      label: 'Revenue ($)',
      value: `$${data.revenueTotal.toLocaleString()}`,
      icon: DollarSign,
      iconBg: 'bg-sky-600',
      to: '/payments',
    },
  ];

  const maxCatCount = Math.max(1, ...data.teamCategories.map((c) => c.count));

  return (
    <div className="space-y-6">
      <DbmsConceptBanner
        concept="SQL Views & Live Aggregation"
        description="Every KPI, table, and chart below is computed live from SQLite using COUNT, SUM, GROUP BY, and SQL views (v_points_table, v_upcoming_matches)."
        sqlHint={seasonFilter === 'ALL' ? 'Scope: All Seasons' : `WHERE season = '${seasonFilter}'`}
      />

      {/* Row 1: Five KPI Cards */}
      <section aria-label="League key metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link
              key={k.label}
              to={k.to}
              className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 flex items-center gap-4 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className={`w-12 h-12 rounded-xl ${k.iconBg} text-white flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">{k.label}</p>
                <p className="font-display text-2xl font-bold text-slate-900 tabular-nums truncate">
                  {k.value}
                </p>
              </div>
            </Link>
          );
        })}
      </section>

      {/* Row 2: Upcoming Games | Standings | Recent Results */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Upcoming Games */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">Upcoming Games</h2>
            <Link
              to="/schedule"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B3D91] hover:underline whitespace-nowrap"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {data.upcomingGames.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No scheduled upcoming fixtures in this season filter.
              </div>
            ) : (
              data.upcomingGames.map((g) => (
                <button
                  key={g.match_id}
                  type="button"
                  onClick={() => navigate(`/matches/${g.match_id}`)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <TeamBadge name={g.home_team_name} color={g.home_logo_color} size="xs" />
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {g.home_team_name}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 px-1 shrink-0">vs</span>
                    <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1">
                      <span className="text-xs font-semibold text-slate-900 truncate text-right">
                        {g.away_team_name}
                      </span>
                      <TeamBadge name={g.away_team_name} color={g.away_logo_color} size="xs" />
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                    <span className="inline-flex items-center gap-1 truncate">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      {g.match_date} · {g.start_time}
                    </span>
                    <span className="truncate max-w-[140px]">{g.venue_name}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Standings Mini Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-slate-900">Standings</h2>
              {data.primaryTournament && (
                <p className="text-[11px] text-slate-500 truncate">{data.primaryTournament.name}</p>
              )}
            </div>
            <Link
              to="/standings"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B3D91] hover:underline whitespace-nowrap shrink-0"
            >
              View Full Table <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="py-2.5 pl-4 pr-2 text-left font-semibold">#</th>
                  <th className="py-2.5 px-2 text-left font-semibold">Team</th>
                  <th className="py-2.5 px-2 text-right font-semibold">P</th>
                  <th className="py-2.5 px-2 text-right font-semibold">W</th>
                  <th className="py-2.5 px-2 text-right font-semibold">D</th>
                  <th className="py-2.5 px-2 text-right font-semibold">L</th>
                  <th className="py-2.5 pl-2 pr-4 text-right font-semibold">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {data.standingsRows.map((row) => (
                  <tr
                    key={row.team_id}
                    onClick={() => navigate(`/teams/${row.team_id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 pl-4 pr-2 font-semibold text-slate-500">{row.rank_pos}</td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <TeamBadge name={row.team_name} color={row.logo_color} size="xs" />
                        <span className="font-medium text-slate-900 truncate max-w-[120px]">
                          {row.team_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-600">{row.played}</td>
                    <td className="py-2.5 px-2 text-right text-slate-600">{row.won}</td>
                    <td className="py-2.5 px-2 text-right text-slate-600">{row.drawn}</td>
                    <td className="py-2.5 px-2 text-right text-slate-600">{row.lost}</td>
                    <td className="py-2.5 pl-2 pr-4 text-right font-bold text-slate-900">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Results */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">Recent Results</h2>
            <Link
              to="/games"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B3D91] hover:underline whitespace-nowrap"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {data.recentResults.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No completed matches yet.</div>
            ) : (
              data.recentResults.map((r) => (
                <button
                  key={r.match_id}
                  type="button"
                  onClick={() => navigate(`/matches/${r.match_id}`)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <TeamBadge name={r.home_name} color={r.home_color} size="xs" />
                      <span className="text-xs font-semibold text-slate-900 truncate">{r.home_name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#0B3D91] text-white text-[11px] font-bold tabular-nums shrink-0">
                      {r.home_score}-{r.away_score}
                    </span>
                    <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1">
                      <span className="text-xs font-semibold text-slate-900 truncate text-right">
                        {r.away_name}
                      </span>
                      <TeamBadge name={r.away_name} color={r.away_color} size="xs" />
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 text-center tabular-nums">
                    Final · {r.match_date}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Row 3: Registrations Chart | Payments Overview Donut | Team Registrations */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Registrations Area/Line Chart */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">Registrations</h2>
              <p className="text-xs text-slate-500">Monthly player roster intake (SQL GROUP BY)</p>
            </div>
          </div>
          <div className="h-56 w-full">
            {data.registrationsChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No registration records for this season.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.registrationsChart} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="regFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0B3D91" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#0B3D91" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="players"
                    name="Players Registered"
                    stroke="#0B3D91"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#regFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payments Overview Donut */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">Payments Overview</h2>
              <p className="text-xs text-slate-500">Category distribution via SQL SUM</p>
            </div>
            <Link to="/payments" className="text-xs font-semibold text-[#0B3D91] hover:underline">
              Details
            </Link>
          </div>
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-44 h-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.paymentChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {data.paymentChart.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown) => `$${Number(val).toLocaleString()}`}
                    contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] text-slate-500">Total</span>
                <span className="font-display text-sm font-bold text-slate-900 tabular-nums">
                  ${data.revenueTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-2.5">
              {data.paymentChart.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: p.color }}
                      aria-hidden="true"
                    />
                    <span className="text-slate-700 font-medium">{p.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    ${p.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team Registrations Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">Team Registrations</h2>
              <p className="text-xs text-slate-500">Division breakdown by team category</p>
            </div>
            <Link to="/teams" className="text-xs font-semibold text-[#0B3D91] hover:underline">
              Manage
            </Link>
          </div>
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {data.teamCategories.map((cat) => {
              const pct = Math.round((cat.count / maxCatCount) * 100);
              return (
                <div key={cat.label}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-800">{cat.label}</span>
                    <span className="font-bold text-slate-900 tabular-nums">{cat.count} Teams</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
