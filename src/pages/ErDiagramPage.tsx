import React, { useState } from 'react';
import { DbmsConceptBanner } from '../components/DbmsConceptBanner';

interface EntityBox {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  fields: Array<{ name: string; tag?: 'PK' | 'FK' | 'UQ'; type: string }>;
}

interface RelationEdge {
  from: string;
  to: string;
  label: string;
  card: string;
}

const ENTITIES: EntityBox[] = [
  {
    id: 'SPORT',
    title: 'SPORT',
    x: 30,
    y: 30,
    w: 200,
    fields: [
      { name: 'sport_id', tag: 'PK', type: 'INT' },
      { name: 'name', tag: 'UQ', type: 'TEXT' },
      { name: 'players_per_team', type: 'INT' },
    ],
  },
  {
    id: 'LEAGUE',
    title: 'LEAGUE',
    x: 290,
    y: 30,
    w: 210,
    fields: [
      { name: 'league_id', tag: 'PK', type: 'INT' },
      { name: 'sport_id', tag: 'FK', type: 'INT' },
      { name: 'name, country, level', type: 'TEXT' },
    ],
  },
  {
    id: 'SEASON',
    title: 'SEASON',
    x: 560,
    y: 30,
    w: 215,
    fields: [
      { name: 'season_id', tag: 'PK', type: 'INT' },
      { name: 'league_id', tag: 'FK', type: 'INT' },
      { name: 'name, start_date, end_date', type: 'TEXT' },
    ],
  },
  {
    id: 'TOURNAMENT',
    title: 'TOURNAMENT',
    x: 840,
    y: 30,
    w: 230,
    fields: [
      { name: 'tournament_id', tag: 'PK', type: 'INT' },
      { name: 'season_id', tag: 'FK', type: 'INT' },
      { name: 'name, format, status', type: 'TEXT' },
      { name: 'registration_fee', type: 'REAL' },
    ],
  },
  {
    id: 'TEAM',
    title: 'TEAM',
    x: 30,
    y: 230,
    w: 215,
    fields: [
      { name: 'team_id', tag: 'PK', type: 'INT' },
      { name: 'name', tag: 'UQ', type: 'TEXT' },
      { name: 'city, coach_name', type: 'TEXT' },
      { name: 'category, logo_color', type: 'TEXT' },
    ],
  },
  {
    id: 'TEAM_ROSTER',
    title: 'TEAM_ROSTER',
    x: 300,
    y: 210,
    w: 230,
    fields: [
      { name: 'roster_id', tag: 'PK', type: 'INT' },
      { name: 'team_id', tag: 'FK', type: 'INT' },
      { name: 'player_id', tag: 'FK', type: 'INT' },
      { name: 'tournament_id', tag: 'FK', type: 'INT' },
      { name: 'jersey_no, joined_on', tag: 'UQ', type: 'MIX' },
    ],
  },
  {
    id: 'PLAYER',
    title: 'PLAYER',
    x: 30,
    y: 440,
    w: 215,
    fields: [
      { name: 'player_id', tag: 'PK', type: 'INT' },
      { name: 'full_name, dob, position', type: 'TEXT' },
      { name: 'email', tag: 'UQ', type: 'TEXT' },
      { name: 'status (ACTIVE/SUSPENDED)', type: 'TEXT' },
    ],
  },
  {
    id: 'PLAYER_AVAILABILITY',
    title: 'PLAYER_AVAILABILITY',
    x: 30,
    y: 640,
    w: 215,
    fields: [
      { name: 'availability_id', tag: 'PK', type: 'INT' },
      { name: 'player_id', tag: 'FK', type: 'INT' },
      { name: 'from_date, to_date, reason', type: 'TEXT' },
    ],
  },
  {
    id: 'MATCH',
    title: 'MATCH',
    x: 590,
    y: 240,
    w: 235,
    fields: [
      { name: 'match_id', tag: 'PK', type: 'INT' },
      { name: 'tournament_id', tag: 'FK', type: 'INT' },
      { name: 'home_team_id, away_team_id', tag: 'FK', type: 'INT' },
      { name: 'venue_id, referee_id', tag: 'FK', type: 'INT' },
      { name: 'match_date, start_time, status', type: 'TEXT' },
    ],
  },
  {
    id: 'VENUE',
    title: 'VENUE',
    x: 890,
    y: 230,
    w: 205,
    fields: [
      { name: 'venue_id', tag: 'PK', type: 'INT' },
      { name: 'name, city', type: 'TEXT' },
      { name: 'capacity, surface_type', type: 'MIX' },
    ],
  },
  {
    id: 'OFFICIAL',
    title: 'OFFICIAL',
    x: 890,
    y: 390,
    w: 205,
    fields: [
      { name: 'official_id', tag: 'PK', type: 'INT' },
      { name: 'full_name, role', type: 'TEXT' },
      { name: 'license_no', tag: 'UQ', type: 'TEXT' },
    ],
  },
  {
    id: 'MATCH_RESULT',
    title: 'MATCH_RESULT',
    x: 590,
    y: 470,
    w: 225,
    fields: [
      { name: 'result_id', tag: 'PK', type: 'INT' },
      { name: 'match_id', tag: 'FK', type: 'INT (UQ)' },
      { name: 'home_score, away_score', type: 'INT' },
      { name: 'winner_team_id, version', type: 'INT' },
    ],
  },
  {
    id: 'RESULT_AUDIT',
    title: 'RESULT_AUDIT',
    x: 880,
    y: 550,
    w: 215,
    fields: [
      { name: 'audit_id', tag: 'PK', type: 'INT' },
      { name: 'match_id', tag: 'FK', type: 'INT' },
      { name: 'old_home/away, new_home/away', type: 'INT' },
      { name: 'action (SUBMIT/CORRECT)', type: 'TEXT' },
    ],
  },
  {
    id: 'PLAYER_STATISTICS',
    title: 'PLAYER_STATISTICS',
    x: 310,
    y: 450,
    w: 225,
    fields: [
      { name: 'stat_id', tag: 'PK', type: 'INT' },
      { name: 'match_id, player_id, team_id', tag: 'FK', type: 'INT' },
      { name: 'goals, assists, yc, rc, mins', type: 'INT' },
    ],
  },
  {
    id: 'DISCIPLINARY_RECORD',
    title: 'DISCIPLINARY_RECORD',
    x: 310,
    y: 630,
    w: 225,
    fields: [
      { name: 'record_id', tag: 'PK', type: 'INT' },
      { name: 'player_id, match_id', tag: 'FK', type: 'INT' },
      { name: 'offence, card_type, susp', type: 'MIX' },
    ],
  },
  {
    id: 'STANDINGS',
    title: 'STANDINGS',
    x: 880,
    y: 690,
    w: 215,
    fields: [
      { name: 'tournament_id, team_id', tag: 'PK', type: 'INT' },
      { name: 'played, won, drawn, lost', type: 'INT' },
      { name: 'gf, ga, gd, points', type: 'INT' },
    ],
  },
  {
    id: 'PAYMENT',
    title: 'PAYMENT',
    x: 590,
    y: 660,
    w: 225,
    fields: [
      { name: 'payment_id', tag: 'PK', type: 'INT' },
      { name: 'team_id, tournament_id', tag: 'FK', type: 'INT' },
      { name: 'amount, category, paid_on', type: 'MIX' },
    ],
  },
];

const RELATIONS: RelationEdge[] = [
  { from: 'SPORT', to: 'LEAGUE', label: 'has', card: '1 : N' },
  { from: 'LEAGUE', to: 'SEASON', label: 'runs', card: '1 : N' },
  { from: 'SEASON', to: 'TOURNAMENT', label: 'hosts', card: '1 : N' },
  { from: 'TEAM', to: 'TEAM_ROSTER', label: 'registers', card: '1 : N' },
  { from: 'PLAYER', to: 'TEAM_ROSTER', label: 'joins', card: '1 : N' },
  { from: 'TOURNAMENT', to: 'TEAM_ROSTER', label: 'scopes', card: '1 : N' },
  { from: 'PLAYER', to: 'PLAYER_AVAILABILITY', label: 'logs', card: '1 : N' },
  { from: 'TOURNAMENT', to: 'MATCH', label: 'schedules', card: '1 : N' },
  { from: 'TEAM', to: 'MATCH', label: 'home/away', card: '1 : N' },
  { from: 'VENUE', to: 'MATCH', label: 'hosts', card: '1 : N' },
  { from: 'OFFICIAL', to: 'MATCH', label: 'officiates', card: '1 : N' },
  { from: 'MATCH', to: 'MATCH_RESULT', label: 'records', card: '1 : 1' },
  { from: 'MATCH', to: 'RESULT_AUDIT', label: 'audits', card: '1 : N' },
  { from: 'MATCH', to: 'PLAYER_STATISTICS', label: 'tracks', card: '1 : N' },
  { from: 'PLAYER', to: 'PLAYER_STATISTICS', label: 'earns', card: '1 : N' },
  { from: 'PLAYER', to: 'DISCIPLINARY_RECORD', label: 'receives', card: '1 : N' },
  { from: 'MATCH', to: 'DISCIPLINARY_RECORD', label: 'issues', card: '1 : N' },
  { from: 'TOURNAMENT', to: 'STANDINGS', label: 'ranks', card: '1 : N' },
  { from: 'TEAM', to: 'PAYMENT', label: 'pays', card: '1 : N' },
];

export function ErDiagramPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const entityMap = new Map(ENTITIES.map((e) => [e.id, e]));

  const boxHeight = (e: EntityBox) => 30 + e.fields.length * 22 + 10;

  const centerOf = (e: EntityBox) => ({
    x: e.x + e.w / 2,
    y: e.y + boxHeight(e) / 2,
  });

  return (
    <div className="space-y-5">
      <DbmsConceptBanner
        concept="Third Normal Form (3NF) Entity-Relationship Diagram"
        description="Click any table node to highlight its foreign-key relationships and cardinalities across all 17 core & supporting entities."
        sqlHint="PRAGMA foreign_keys = ON"
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
        <svg viewBox="0 0 1130 820" className="w-full min-w-[960px] h-auto select-none">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#64748B" />
            </marker>
            <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#0B3D91" />
            </marker>
          </defs>

          {/* Relationship lines */}
          {RELATIONS.map((rel, i) => {
            const a = entityMap.get(rel.from);
            const b = entityMap.get(rel.to);
            if (!a || !b) return null;
            const ca = centerOf(a);
            const cb = centerOf(b);
            const isHighlighted = selectedId === rel.from || selectedId === rel.to;
            const mx = (ca.x + cb.x) / 2;
            const my = (ca.y + cb.y) / 2;

            return (
              <g key={`${rel.from}-${rel.to}-${i}`}>
                <line
                  x1={ca.x}
                  y1={ca.y}
                  x2={cb.x}
                  y2={cb.y}
                  stroke={isHighlighted ? '#0B3D91' : '#CBD5E1'}
                  strokeWidth={isHighlighted ? 2.2 : 1.3}
                  markerEnd={isHighlighted ? 'url(#arrow-active)' : 'url(#arrow)'}
                />
                {isHighlighted && (
                  <g transform={`translate(${mx - 22}, ${my - 10})`}>
                    <rect width="44" height="18" rx="4" fill="#0B3D91" />
                    <text
                      x="22"
                      y="12.5"
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="700"
                      fill="#FFFFFF"
                    >
                      {rel.card}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Entity Boxes */}
          {ENTITIES.map((ent) => {
            const h = boxHeight(ent);
            const isSelected = selectedId === ent.id;
            const isConnected =
              selectedId !== null &&
              RELATIONS.some(
                (r) => (r.from === selectedId && r.to === ent.id) || (r.to === selectedId && r.from === ent.id)
              );

            return (
              <g
                key={ent.id}
                transform={`translate(${ent.x}, ${ent.y})`}
                onClick={() => setSelectedId(isSelected ? null : ent.id)}
                className="cursor-pointer"
              >
                <rect
                  width={ent.w}
                  height={h}
                  rx="8"
                  fill="#FFFFFF"
                  stroke={isSelected ? '#0B3D91' : isConnected ? '#2563EB' : '#CBD5E1'}
                  strokeWidth={isSelected ? 2.5 : isConnected ? 1.8 : 1.2}
                />
                <rect
                  width={ent.w}
                  height="28"
                  rx="8"
                  fill={isSelected ? '#0B3D91' : '#0F172A'}
                />
                <rect y="18" width={ent.w} height="10" fill={isSelected ? '#0B3D91' : '#0F172A'} />
                <text x="12" y="18" fontSize="11" fontWeight="700" fill="#FFFFFF" fontFamily="Plus Jakarta Sans, sans-serif">
                  {ent.title}
                </text>

                {ent.fields.map((f, idx) => (
                  <g key={f.name} transform={`translate(10, ${44 + idx * 22})`}>
                    {f.tag && (
                      <rect
                        x="0"
                        y="-10"
                        width="22"
                        height="14"
                        rx="3"
                        fill={f.tag === 'PK' ? '#FEF3C7' : f.tag === 'FK' ? '#DBEAFE' : '#DCFCE7'}
                      />
                    )}
                    {f.tag && (
                      <text
                        x="11"
                        y="0"
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="700"
                        fill={f.tag === 'PK' ? '#92400E' : f.tag === 'FK' ? '#1E40AF' : '#166534'}
                      >
                        {f.tag}
                      </text>
                    )}
                    <text
                      x={f.tag ? 28 : 2}
                      y="0"
                      fontSize="10.5"
                      fill="#1E293B"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {f.name}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
