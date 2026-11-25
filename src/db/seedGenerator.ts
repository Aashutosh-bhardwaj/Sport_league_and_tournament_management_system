// Deterministic SQL Seed Generator for Sports League & Tournament Management System
// Produces pure SQL INSERT statements matching all 3NF schema constraints & triggers.

export function generateSeedSql(): string {
  const lines: string[] = [];
  const push = (sql: string) => lines.push(sql);
  const esc = (s: string) => s.replace(/'/g, "''");

  push('-- Sports League & Tournament Management System - Seed Data');
  push('PRAGMA foreign_keys = ON;');
  push('');

  // 1. LEAGUE_SETTINGS
  push('-- Configurable Points & Discipline Rules');
  push(`INSERT INTO LEAGUE_SETTINGS (setting_key, setting_value) VALUES ('points_win', '3');`);
  push(`INSERT INTO LEAGUE_SETTINGS (setting_key, setting_value) VALUES ('points_draw', '1');`);
  push(`INSERT INTO LEAGUE_SETTINGS (setting_key, setting_value) VALUES ('points_loss', '0');`);
  push(`INSERT INTO LEAGUE_SETTINGS (setting_key, setting_value) VALUES ('yellow_card_threshold', '3');`);
  push('');

  // 2. SPORT (2)
  push('-- 1. Sports (2)');
  push(`INSERT INTO SPORT (sport_id, name, players_per_team) VALUES (1, 'Football', 11);`);
  push(`INSERT INTO SPORT (sport_id, name, players_per_team) VALUES (2, 'Cricket', 11);`);
  push('');

  // 3. LEAGUE (2)
  push('-- 2. Leagues (2)');
  push(`INSERT INTO LEAGUE (league_id, sport_id, name, country, level) VALUES (1, 1, 'USA Premier Football League', 'United States', 'Tier 1 National');`);
  push(`INSERT INTO LEAGUE (league_id, sport_id, name, country, level) VALUES (2, 2, 'North American Cricket League', 'United States', 'Division 1');`);
  push('');

  // 4. SEASON (2)
  push('-- 3. Seasons (2)');
  push(`INSERT INTO SEASON (season_id, league_id, name, start_date, end_date) VALUES (1, 1, '2026', '2026-01-01', '2026-12-22');`);
  push(`INSERT INTO SEASON (season_id, league_id, name, start_date, end_date) VALUES (2, 2, '2025', '2025-02-01', '2025-11-30');`);
  push('');

  // 5. TOURNAMENT (3)
  push('-- 4. Tournaments (3)');
  push(`INSERT INTO TOURNAMENT (tournament_id, season_id, name, format, registration_fee, status) VALUES (1, 1, 'USA Premier Cup 2026', 'LEAGUE', 650.00, 'ONGOING');`);
  push(`INSERT INTO TOURNAMENT (tournament_id, season_id, name, format, registration_fee, status) VALUES (2, 1, 'National Challenge Trophy 2026', 'GROUP_KNOCKOUT', 450.00, 'ONGOING');`);
  push(`INSERT INTO TOURNAMENT (tournament_id, season_id, name, format, registration_fee, status) VALUES (3, 2, 'T20 Heritage Championship 2025', 'LEAGUE', 500.00, 'COMPLETED');`);
  push('');

  // 6. TEAM (24 teams across Youth/Amateur/Women/Senior)
  const teamsData: Array<{
    id: number;
    name: string;
    city: string;
    coach: string;
    year: number;
    color: string;
    category: 'Youth' | 'Amateur' | 'Women' | 'Senior';
    regDate: string;
  }> = [
    { id: 1, name: 'Eagles FC', city: 'Chicago', coach: 'Marcus Vance', year: 2012, color: '#0B3D91', category: 'Senior', regDate: '2026-01-08' },
    { id: 2, name: 'Lions FC', city: 'New York', coach: 'Elena Rostova', year: 2010, color: '#D97706', category: 'Senior', regDate: '2026-01-14' },
    { id: 3, name: 'Tigers FC', city: 'Los Angeles', coach: 'Devon Brooks', year: 2014, color: '#EA580C', category: 'Senior', regDate: '2026-01-21' },
    { id: 4, name: 'Raptors FC', city: 'Seattle', coach: 'Carlos Mendez', year: 2015, color: '#DC2626', category: 'Senior', regDate: '2026-01-28' },
    { id: 5, name: 'Sharks FC', city: 'Miami', coach: 'Liam OConnor', year: 2011, color: '#0284C7', category: 'Senior', regDate: '2026-02-04' },
    { id: 6, name: 'Warriors FC', city: 'Dallas', coach: 'Andre Silva', year: 2013, color: '#4F46E5', category: 'Senior', regDate: '2026-02-11' },
    { id: 7, name: 'Falcons United', city: 'Atlanta', coach: 'Nadia Patel', year: 2016, color: '#B91C1C', category: 'Women', regDate: '2026-02-18' },
    { id: 8, name: 'Valkyries SC', city: 'Portland', coach: 'Hannah Lin', year: 2017, color: '#7C3AED', category: 'Women', regDate: '2026-02-24' },
    { id: 9, name: 'Aurora Athletic', city: 'Denver', coach: 'Claire Bennett', year: 2018, color: '#0D9488', category: 'Women', regDate: '2026-03-03' },
    { id: 10, name: 'Phoenix Ladies FC', city: 'Phoenix', coach: 'Sofia Morales', year: 2019, color: '#E11D48', category: 'Women', regDate: '2026-03-09' },
    { id: 11, name: 'Harbor Sirens', city: 'San Diego', coach: 'Rachel Kim', year: 2017, color: '#0369A1', category: 'Women', regDate: '2026-03-14' },
    { id: 12, name: 'Metro Stars WFC', city: 'Boston', coach: 'Olivia Grant', year: 2016, color: '#6D28D9', category: 'Women', regDate: '2026-03-20' },
    { id: 13, name: 'Mavericks SC', city: 'Austin', coach: 'Tyler Reed', year: 2018, color: '#1D4ED8', category: 'Amateur', regDate: '2026-03-25' },
    { id: 14, name: 'Titans FC', city: 'Houston', coach: 'Omar Hassan', year: 2015, color: '#334155', category: 'Amateur', regDate: '2026-03-29' },
    { id: 15, name: 'Wolves United', city: 'Minneapolis', coach: 'Jonas Berg', year: 2019, color: '#475569', category: 'Amateur', regDate: '2026-04-04' },
    { id: 16, name: 'Panthers FC', city: 'Charlotte', coach: 'Malik Carter', year: 2016, color: '#1E293B', category: 'Amateur', regDate: '2026-04-10' },
    { id: 17, name: 'Coastal Strikers', city: 'Tampa', coach: 'Lucas Ferreira', year: 2020, color: '#059669', category: 'Amateur', regDate: '2026-04-16' },
    { id: 18, name: 'Capital Rovers', city: 'Washington DC', coach: 'Owen Walsh', year: 2017, color: '#991B1B', category: 'Amateur', regDate: '2026-04-22' },
    { id: 19, name: 'Summit Academy', city: 'Salt Lake City', coach: 'Ethan Clark', year: 2021, color: '#15803D', category: 'Youth', regDate: '2026-04-28' },
    { id: 20, name: 'Valley Colts', city: 'San Jose', coach: 'Mateo Ruiz', year: 2020, color: '#2563EB', category: 'Youth', regDate: '2026-05-03' },
    { id: 21, name: 'Dynamo Juniors', city: 'Columbus', coach: 'Noah Weber', year: 2022, color: '#C2410C', category: 'Youth', regDate: '2026-05-08' },
    { id: 22, name: 'Bayou Youth FC', city: 'New Orleans', coach: 'Jaden Cole', year: 2021, color: '#4338CA', category: 'Youth', regDate: '2026-05-14' },
    { id: 23, name: 'Cascade Cadets', city: 'Tacoma', coach: 'Caleb Ross', year: 2022, color: '#0F766E', category: 'Youth', regDate: '2026-05-19' },
    { id: 24, name: 'Heartland Rising', city: 'Kansas City', coach: 'Samira Ali', year: 2021, color: '#BE123C', category: 'Youth', regDate: '2026-05-24' },
  ];

  push('-- 5. Teams (24)');
  for (const t of teamsData) {
    push(
      `INSERT INTO TEAM (team_id, name, city, coach_name, founded_year, logo_color, category, registered_on) VALUES (${t.id}, '${esc(t.name)}', '${esc(t.city)}', '${esc(t.coach)}', ${t.year}, '${t.color}', '${t.category}', '${t.regDate}');`
    );
  }
  push('');

  // 7. VENUE (12)
  const venuesData = [
    { id: 1, name: 'Soldier Memorial Field', city: 'Chicago', cap: 34500, surf: 'Hybrid Turf' },
    { id: 2, name: 'Empire Sports Arena', city: 'New York', cap: 28000, surf: 'Natural Grass' },
    { id: 3, name: 'Pacific Bowl Stadium', city: 'Los Angeles', cap: 38000, surf: 'Bermuda Grass' },
    { id: 4, name: 'Emerald Pitch Park', city: 'Seattle', cap: 25500, surf: 'FieldTurf Pro' },
    { id: 5, name: 'Biscayne Bay Complex', city: 'Miami', cap: 22000, surf: 'Natural Grass' },
    { id: 6, name: 'Lone Star Athletic Field', city: 'Dallas', cap: 24000, surf: 'Hybrid Turf' },
    { id: 7, name: 'Piedmont Commons Ground', city: 'Atlanta', cap: 18500, surf: 'Natural Grass' },
    { id: 8, name: 'Rose City Stadium', city: 'Portland', cap: 21000, surf: 'FieldTurf Pro' },
    { id: 9, name: 'Mile High Pitch', city: 'Denver', cap: 16500, surf: 'Hybrid Turf' },
    { id: 10, name: 'Capitol Oval Park', city: 'Washington DC', cap: 15000, surf: 'Natural Grass' },
    { id: 11, name: 'Silicon Valley Grounds', city: 'San Jose', cap: 12500, surf: 'FieldTurf Pro' },
    { id: 12, name: 'Heartland Sports Center', city: 'Kansas City', cap: 14000, surf: 'Bermuda Grass' },
  ];

  push('-- 6. Venues (12)');
  for (const v of venuesData) {
    push(
      `INSERT INTO VENUE (venue_id, name, city, capacity, surface_type) VALUES (${v.id}, '${esc(v.name)}', '${esc(v.city)}', ${v.cap}, '${v.surf}');`
    );
  }
  push('');

  // 8. OFFICIAL (15)
  const officialsData: Array<{ id: number; name: string; role: string; lic: string; phone: string }> = [
    { id: 1, name: 'Arthur Pendelton', role: 'Referee', lic: 'USA-REF-1001', phone: '+1-312-555-0101' },
    { id: 2, name: 'Gabriela Torres', role: 'Referee', lic: 'USA-REF-1002', phone: '+1-212-555-0102' },
    { id: 3, name: 'Derrick Coleman', role: 'Referee', lic: 'USA-REF-1003', phone: '+1-310-555-0103' },
    { id: 4, name: 'Martin Lindqvist', role: 'Referee', lic: 'USA-REF-1004', phone: '+1-206-555-0104' },
    { id: 5, name: 'Priya Nair', role: 'Referee', lic: 'USA-REF-1005', phone: '+1-305-555-0105' },
    { id: 6, name: 'Victor Alvarez', role: 'Referee', lic: 'USA-REF-1006', phone: '+1-214-555-0106' },
    { id: 7, name: 'Kenneth Brooks', role: 'Referee', lic: 'USA-REF-1007', phone: '+1-404-555-0107' },
    { id: 8, name: 'Lauren Fitzgerald', role: 'Referee', lic: 'USA-REF-1008', phone: '+1-503-555-0108' },
    { id: 9, name: 'Sanjay Kapoor', role: 'Referee', lic: 'USA-REF-1009', phone: '+1-303-555-0109' },
    { id: 10, name: 'Trevor Hayes', role: 'Linesman', lic: 'USA-LIN-2001', phone: '+1-617-555-0110' },
    { id: 11, name: 'Mei-Ling Zhou', role: 'Linesman', lic: 'USA-LIN-2002', phone: '+1-619-555-0111' },
    { id: 12, name: 'Benjamin Ortiz', role: 'Linesman', lic: 'USA-LIN-2003', phone: '+1-512-555-0112' },
    { id: 13, name: 'Fiona McAllister', role: 'Linesman', lic: 'USA-LIN-2004', phone: '+1-713-555-0113' },
    { id: 14, name: 'Raymond Vance', role: 'Match Commissioner', lic: 'USA-COM-3001', phone: '+1-202-555-0114' },
    { id: 15, name: 'Patricia Morales', role: 'Match Commissioner', lic: 'USA-COM-3002', phone: '+1-816-555-0115' },
  ];

  push('-- 7. Officials (15)');
  for (const o of officialsData) {
    push(
      `INSERT INTO OFFICIAL (official_id, full_name, role, license_no, phone) VALUES (${o.id}, '${esc(o.name)}', '${o.role}', '${o.lic}', '${o.phone}');`
    );
  }
  push('');

  // 9. PLAYER (480 players: 20 per team) & TEAM_ROSTER
  const firstNamesMale = [
    'Liam', 'Noah', 'Oliver', 'Elijah', 'Mateo', 'Lucas', 'Levi', 'Asher', 'James', 'Leo',
    'Mason', 'Ethan', 'Logan', 'Sebastian', 'Jack', 'Aiden', 'Owen', 'Samuel', 'Jacob', 'Wyatt',
    'Julian', 'Hudson', 'Grayson', 'Ezra', 'Caleb', 'Gabriel', 'Isaac', 'Carter', 'Jayden', 'Dylan',
    'Adrian', 'Nathan', 'Rohan', 'Arjun', 'Tariq', 'Kieran', 'Declan', 'Marco', 'Rafael', 'Soren',
  ];
  const firstNamesFemale = [
    'Olivia', 'Emma', 'Charlotte', 'Amelia', 'Sophia', 'Mia', 'Isabella', 'Ava', 'Evelyn', 'Luna',
    'Harper', 'Camila', 'Gianna', 'Abigail', 'Ella', 'Aria', 'Scarlett', 'Penelope', 'Layla', 'Chloe',
    'Victoria', 'Madison', 'Eleanor', 'Grace', 'Nora', 'Riley', 'Zoey', 'Hannah', 'Lily', 'Addison',
  ];
  const lastNames = [
    'Anderson', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen',
    'Young', 'Hernandez', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams', 'Baker',
    'Gonzalez', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker',
    'Evans', 'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris', 'Rogers', 'Reed', 'Cook', 'Morgan',
    'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper', 'Richardson', 'Cox', 'Howard', 'Ward', 'Torres',
    'Peterson', 'Gray', 'Ramirez', 'Watson', 'Brooks', 'Kelly', 'Sanders', 'Price', 'Bennett', 'Wood',
  ];
  const positions = [
    'Goalkeeper', 'Defender', 'Defender', 'Defender', 'Defender', 'Defender', 'Defender',
    'Midfielder', 'Midfielder', 'Midfielder', 'Midfielder', 'Midfielder', 'Midfielder',
    'Forward', 'Forward', 'Forward', 'Forward', 'Forward', 'Midfielder', 'Goalkeeper',
  ];
  // Monthly roster join distribution Jan-May 2026 across 480 players (80, 92, 108, 98, 102 = 480)
  const monthPool: string[] = [];
  for (let i = 0; i < 80; i++) monthPool.push(`2026-01-${String((i % 25) + 3).padStart(2, '0')}`);
  for (let i = 0; i < 92; i++) monthPool.push(`2026-02-${String((i % 25) + 2).padStart(2, '0')}`);
  for (let i = 0; i < 108; i++) monthPool.push(`2026-03-${String((i % 27) + 2).padStart(2, '0')}`);
  for (let i = 0; i < 98; i++) monthPool.push(`2026-04-${String((i % 26) + 2).padStart(2, '0')}`);
  for (let i = 0; i < 102; i++) monthPool.push(`2026-05-${String((i % 27) + 2).padStart(2, '0')}`);

  push('-- 8. Players (480) and Team Roster');
  let playerId = 1;
  let rosterId = 1;
  const teamPlayers: Record<number, number[]> = {};

  for (const team of teamsData) {
    teamPlayers[team.id] = [];
    const primaryTournament = team.id <= 12 ? 1 : 2;
    const isWomen = team.category === 'Women';
    const isYouth = team.category === 'Youth';

    for (let slot = 0; slot < 20; slot++) {
      const fPool = isWomen ? firstNamesFemale : firstNamesMale;
      const fn = fPool[(team.id * 7 + slot * 3) % fPool.length];
      const ln = lastNames[(team.id * 11 + slot * 5) % lastNames.length];
      const fullName = `${fn} ${ln}`;
      const birthYear = isYouth ? 2008 + (slot % 3) : 1995 + ((team.id + slot) % 10);
      const dob = `${birthYear}-${String(((slot * 3) % 12) + 1).padStart(2, '0')}-${String(((team.id + slot * 2) % 27) + 1).padStart(2, '0')}`;
      const pos = positions[slot];
      const jersey = slot + 1;
      const email = `${fn.toLowerCase()}.${ln.toLowerCase()}.${playerId}@usapremierleague.org`;

      // Seed initial statuses (SUSPENDED will also be reinforced by disciplinary triggers below; some injured/inactive)
      let status = 'ACTIVE';
      if (slot === 18 && team.id % 2 === 0) status = 'INJURED';
      else if (slot === 19 && team.id % 6 === 0) status = 'INACTIVE';

      push(
        `INSERT INTO PLAYER (player_id, full_name, dob, position, jersey_no, email, status) VALUES (${playerId}, '${esc(fullName)}', '${dob}', '${pos}', ${jersey}, '${email}', '${status}');`
      );

      const joinedOn = monthPool[(playerId - 1) % monthPool.length];
      push(
        `INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (${rosterId}, ${team.id}, ${playerId}, ${primaryTournament}, ${jersey}, '${joinedOn}');`
      );
      rosterId++;

      // Also enroll players from teams 1..6 into Tournament 3 (2025 Season) for multi-season career tracking
      if (team.id <= 6) {
        const joined2025 = `2025-02-${String((slot % 20) + 5).padStart(2, '0')}`;
        push(
          `INSERT INTO TEAM_ROSTER (roster_id, team_id, player_id, tournament_id, jersey_no, joined_on) VALUES (${rosterId}, ${team.id}, ${playerId}, 3, ${jersey}, '${joined2025}');`
        );
        rosterId++;
      }

      teamPlayers[team.id].push(playerId);
      playerId++;
    }
  }
  push('');

  // 10. PLAYER_AVAILABILITY (for injured/unavailable players)
  push('-- 9. Player Availability Records');
  let availId = 1;
  for (let tId = 2; tId <= 24; tId += 2) {
    const pId = teamPlayers[tId][18];
    push(
      `INSERT INTO PLAYER_AVAILABILITY (availability_id, player_id, from_date, to_date, reason) VALUES (${availId++}, ${pId}, '2026-11-10', '2026-12-05', 'Hamstring rehabilitation');`
    );
  }
  push('');

  // 11. MATCHES (72 total: 36 in Tournament 1, 24 in Tournament 2, 12 in Tournament 3)
  // 36 Completed, 36 Scheduled
  interface SeedMatch {
    matchId: number;
    tournamentId: number;
    homeId: number;
    awayId: number;
    venueId: number;
    refId: number;
    date: string;
    time: string;
    round: number;
    status: 'COMPLETED' | 'SCHEDULED';
    homeScore?: number;
    awayScore?: number;
  }

  const matches: SeedMatch[] = [];
  let nextMatchId = 1;
  const usedPairs = new Set<string>();
  const usedVenueSlots = new Set<string>();

  const timeSlots = ['14:00', '16:30', '19:00', '20:30'];

  // Round-robin pair generator helper
  function buildRoundRobinPairs(teamIds: number[]): Array<[number, number, number]> {
    const n = teamIds.length;
    const arr = [...teamIds];
    const pairs: Array<[number, number, number]> = [];
    for (let r = 1; r < n; r++) {
      for (let i = 0; i < n / 2; i++) {
        const a = arr[i];
        const b = arr[n - 1 - i];
        const home = r % 2 === 0 ? a : b;
        const away = r % 2 === 0 ? b : a;
        pairs.push([r, home, away]);
      }
      const last = arr.pop()!;
      arr.splice(1, 0, last);
    }
    return pairs;
  }

  // Tournament 1: Teams 1..12 -> first 6 rounds (6 * 6 = 36 matches). Rounds 1-3 COMPLETED (18), Rounds 4-6 SCHEDULED (18)
  const t1Pairs = buildRoundRobinPairs([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).slice(0, 36);
  const t1DatesCompleted = [
    '2026-09-05', '2026-09-06', '2026-09-12', '2026-09-13', '2026-09-19', '2026-09-20',
    '2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11', '2026-10-17', '2026-10-18',
    '2026-11-01', '2026-11-02', '2026-11-07', '2026-11-08', '2026-11-14', '2026-11-15',
  ];
  const t1DatesScheduled = [
    '2026-11-25', '2026-11-26', '2026-11-28', '2026-11-29', '2026-12-01', '2026-12-02',
    '2026-12-05', '2026-12-06', '2026-12-08', '2026-12-09', '2026-12-12', '2026-12-13',
    '2026-12-15', '2026-12-16', '2026-12-18', '2026-12-19', '2026-12-20', '2026-12-21',
  ];

  t1Pairs.forEach(([round, home, away], idx) => {
    const isCompleted = idx < 18;
    const date = isCompleted ? t1DatesCompleted[idx] : t1DatesScheduled[idx - 18];
    const time = timeSlots[idx % timeSlots.length];
    const venueId = ((home - 1) % 12) + 1;
    const refId = (idx % 9) + 1;
    usedPairs.add(`1-${home}-${away}`);
    usedVenueSlots.add(`${venueId}-${date}-${time}`);

    const hScore = isCompleted ? ((home * 3 + idx) % 4) + (home <= 4 ? 1 : 0) : undefined;
    const aScore = isCompleted ? ((away * 2 + idx) % 3) : undefined;

    matches.push({
      matchId: nextMatchId++,
      tournamentId: 1,
      homeId: home,
      awayId: away,
      venueId,
      refId,
      date,
      time,
      round,
      status: isCompleted ? 'COMPLETED' : 'SCHEDULED',
      homeScore: hScore,
      awayScore: aScore,
    });
  });

  // Tournament 2: Teams 13..24 -> first 4 rounds (4 * 6 = 24 matches). Round 1 COMPLETED (6), Rounds 2-4 SCHEDULED (18)
  const t2Pairs = buildRoundRobinPairs([13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]).slice(0, 24);
  const t2DatesCompleted = [
    '2026-10-24', '2026-10-25', '2026-11-03', '2026-11-09', '2026-11-16', '2026-11-17',
  ];
  const t2DatesScheduled = [
    '2026-11-27', '2026-11-27', '2026-11-30', '2026-11-30', '2026-12-03', '2026-12-03',
    '2026-12-04', '2026-12-07', '2026-12-10', '2026-12-11', '2026-12-14', '2026-12-14',
    '2026-12-17', '2026-12-17', '2026-12-18', '2026-12-19', '2026-12-20', '2026-12-21',
  ];

  t2Pairs.forEach(([round, home, away], idx) => {
    const isCompleted = idx < 6;
    const date = isCompleted ? t2DatesCompleted[idx] : t2DatesScheduled[idx - 6];
    let timeIdx = (idx + 1) % timeSlots.length;
    let venueId = ((home - 1) % 12) + 1;
    while (usedVenueSlots.has(`${venueId}-${date}-${timeSlots[timeIdx]}`)) {
      venueId = (venueId % 12) + 1;
    }
    const time = timeSlots[timeIdx];
    usedVenueSlots.add(`${venueId}-${date}-${time}`);
    const refId = ((idx + 3) % 9) + 1;

    const hScore = isCompleted ? ((home + idx) % 3) + 1 : undefined;
    const aScore = isCompleted ? ((away + idx * 2) % 3) : undefined;

    matches.push({
      matchId: nextMatchId++,
      tournamentId: 2,
      homeId: home,
      awayId: away,
      venueId,
      refId,
      date,
      time,
      round,
      status: isCompleted ? 'COMPLETED' : 'SCHEDULED',
      homeScore: hScore,
      awayScore: aScore,
    });
  });

  // Tournament 3 (2025 Season): Teams 1..6 -> first 4 rounds (4 * 3 = 12 matches), ALL 12 COMPLETED
  const t3Pairs = buildRoundRobinPairs([1, 2, 3, 4, 5, 6]).slice(0, 12);
  t3Pairs.forEach(([round, home, away], idx) => {
    const date = `2025-${String(4 + Math.floor(idx / 3)).padStart(2, '0')}-${String(10 + (idx % 3) * 7).padStart(2, '0')}`;
    const time = timeSlots[idx % timeSlots.length];
    const venueId = ((home + 4) % 12) + 1;
    const refId = ((idx + 2) % 9) + 1;
    const hScore = ((home * 2 + idx) % 4) + 1;
    const aScore = ((away + idx) % 3);

    matches.push({
      matchId: nextMatchId++,
      tournamentId: 3,
      homeId: home,
      awayId: away,
      venueId,
      refId,
      date,
      time,
      round,
      status: 'COMPLETED',
      homeScore: hScore,
      awayScore: aScore,
    });
  });

  push('-- 10. Matches (72: 36 Completed, 36 Scheduled)');
  // Note: Insert all matches as SCHEDULED first so MATCH_RESULT trigger passes, then UPDATE completed matches!
  for (const m of matches) {
    push(
      `INSERT INTO "MATCH" (match_id, tournament_id, home_team_id, away_team_id, venue_id, referee_id, match_date, start_time, round, status) VALUES (${m.matchId}, ${m.tournamentId}, ${m.homeId}, ${m.awayId}, ${m.venueId}, ${m.refId}, '${m.date}', '${m.time}', ${m.round}, 'SCHEDULED');`
    );
  }
  push('');

  // 12. MATCH_RESULT, PLAYER_STATISTICS, DISCIPLINARY_RECORD, and STANDINGS
  push('-- 11. Match Results, Player Statistics, Disciplinary Records & Standings');
  const standingsMap = new Map<
    string,
    { tid: number; teamId: number; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; pts: number }
  >();

  // Initialize standings for all teams in their tournaments
  for (const t of teamsData) {
    const tid = t.id <= 12 ? 1 : 2;
    standingsMap.set(`${tid}-${t.id}`, { tid, teamId: t.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 });
    if (t.id <= 6) {
      standingsMap.set(`3-${t.id}`, { tid: 3, teamId: t.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 });
    }
  }

  let resultId = 1;
  let statId = 1;
  let discId = 1;
  const suspendedTracker = new Set<number>();

  for (const m of matches) {
    if (m.status !== 'COMPLETED' || m.homeScore === undefined || m.awayScore === undefined) continue;

    const hs = m.homeScore;
    const as = m.awayScore;
    const winnerSql = hs > as ? `${m.homeId}` : as > hs ? `${m.awayId}` : 'NULL';

    push(
      `INSERT INTO MATCH_RESULT (result_id, match_id, home_score, away_score, winner_team_id, submitted_at, version) VALUES (${resultId++}, ${m.matchId}, ${hs}, ${as}, ${winnerSql}, '${m.date} 22:15:00', 1);`
    );
    push(`UPDATE "MATCH" SET status = 'COMPLETED' WHERE match_id = ${m.matchId};`);

    // Update standings accumulator
    const hRec = standingsMap.get(`${m.tournamentId}-${m.homeId}`)!;
    const aRec = standingsMap.get(`${m.tournamentId}-${m.awayId}`)!;
    hRec.played++;
    aRec.played++;
    hRec.gf += hs;
    hRec.ga += as;
    aRec.gf += as;
    aRec.ga += hs;
    if (hs > as) {
      hRec.won++;
      hRec.pts += 3;
      aRec.lost++;
    } else if (as > hs) {
      aRec.won++;
      aRec.pts += 3;
      hRec.lost++;
    } else {
      hRec.drawn++;
      aRec.drawn++;
      hRec.pts += 1;
      aRec.pts += 1;
    }

    // Player stats for 4 key players per side (slots 13..16 forwards/mids, plus GK/defenders)
    const homeRoster = teamPlayers[m.homeId];
    const awayRoster = teamPlayers[m.awayId];

    // Distribute home goals across active slots 13..16 (and not already suspended)
    const hStarters = [13, 14, 15, 16, 7, 8].map((s) => homeRoster[s]).filter((pid) => !suspendedTracker.has(pid)).slice(0, 4);
    const aStarters = [13, 14, 15, 16, 7, 8].map((s) => awayRoster[s]).filter((pid) => !suspendedTracker.has(pid)).slice(0, 4);

    const hGoalsPerPlayer = [0, 0, 0, 0];
    for (let g = 0; g < hs; g++) hGoalsPerPlayer[g % hStarters.length]++;
    const aGoalsPerPlayer = [0, 0, 0, 0];
    for (let g = 0; g < as; g++) aGoalsPerPlayer[g % aStarters.length]++;

    hStarters.forEach((pid, idx) => {
      const goals = hGoalsPerPlayer[idx];
      const assists = idx === 1 && hs > 0 ? 1 : idx === 2 && hs > 1 ? 1 : 0;
      const yc = m.matchId % 4 === 0 && idx === 3 ? 1 : 0;
      const rc = m.matchId === 12 && idx === 3 ? 1 : 0;
      push(
        `INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (${statId++}, ${m.matchId}, ${pid}, ${m.homeId}, ${goals}, ${assists}, ${yc}, ${rc}, 90);`
      );
      if (yc > 0) {
        push(
          `INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (${discId++}, ${pid}, ${m.matchId}, 'Reckless tactical foul', 'YELLOW', 0, '${m.date}');`
        );
      }
      if (rc > 0) {
        suspendedTracker.add(pid);
        push(
          `INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (${discId++}, ${pid}, ${m.matchId}, 'Serious foul play', 'RED', 2, '${m.date}');`
        );
      }
    });

    aStarters.forEach((pid, idx) => {
      const goals = aGoalsPerPlayer[idx];
      const assists = idx === 1 && as > 0 ? 1 : 0;
      const yc = m.matchId % 5 === 0 && idx === 2 ? 1 : 0;
      const rc = m.matchId === 18 && idx === 2 ? 1 : 0;
      push(
        `INSERT INTO PLAYER_STATISTICS (stat_id, match_id, player_id, team_id, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (${statId++}, ${m.matchId}, ${pid}, ${m.awayId}, ${goals}, ${assists}, ${yc}, ${rc}, 90);`
      );
      if (yc > 0) {
        push(
          `INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (${discId++}, ${pid}, ${m.matchId}, 'Unsporting dissent', 'YELLOW', 0, '${m.date}');`
        );
      }
      if (rc > 0) {
        suspendedTracker.add(pid);
        push(
          `INSERT INTO DISCIPLINARY_RECORD (record_id, player_id, match_id, offence, card_type, suspension_matches, issued_on) VALUES (${discId++}, ${pid}, ${m.matchId}, 'Violent conduct', 'RED', 2, '${m.date}');`
        );
      }
    });
  }
  push('');

  // Sample result correction so audit diff is already demonstrated in history
  push('-- Sample Result Correction to demonstrate RESULT_AUDIT before/after history');
  push(`UPDATE MATCH_RESULT SET home_score = home_score + 1, version = 2, submitted_at = '2026-10-05 10:00:00' WHERE match_id = 7;`);
  // Sync standings for match 7 (+1 GF for home, +1 GA for away; adjust W/D/L if outcome changed)
  const m7 = matches.find((x) => x.matchId === 7)!;
  const m7OldH = m7.homeScore!;
  const m7NewH = m7OldH + 1;
  const m7A = m7.awayScore!;
  const m7HSt = standingsMap.get(`${m7.tournamentId}-${m7.homeId}`)!;
  const m7ASt = standingsMap.get(`${m7.tournamentId}-${m7.awayId}`)!;
  m7HSt.gf += 1;
  m7ASt.ga += 1;
  if (m7OldH === m7A && m7NewH > m7A) {
    m7HSt.drawn--; m7HSt.won++; m7HSt.pts += 2;
    m7ASt.drawn--; m7ASt.lost++; m7ASt.pts -= 1;
  } else if (m7OldH < m7A && m7NewH === m7A) {
    m7HSt.lost--; m7HSt.drawn++; m7HSt.pts += 1;
    m7ASt.won--; m7ASt.drawn++; m7ASt.pts -= 2;
  }
  push('');

  push('-- 12. Standings (synchronized with all completed match results)');
  for (const s of standingsMap.values()) {
    push(
      `INSERT INTO STANDINGS (tournament_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points) VALUES (${s.tid}, ${s.teamId}, ${s.played}, ${s.won}, ${s.drawn}, ${s.lost}, ${s.gf}, ${s.ga}, ${s.gf - s.ga}, ${s.pts});`
    );
  }
  push('');

  // 13. PAYMENTS totaling exactly $18,560 across 4 categories
  // Registration: 9600 (24 teams * $400 avg or 12*500 + 12*300 = 9600)
  // Sponsorship: 5200
  // Merchandise: 2460
  // Other: 1300
  // Total: 9600 + 5200 + 2460 + 1300 = 18560
  push('-- 13. Payments (Total = $18,560.00 across 4 categories)');
  let payId = 1;
  for (let i = 1; i <= 12; i++) {
    push(
      `INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (${payId++}, ${i}, 1, 500.00, 'Registration', '2026-0${Math.min(5, Math.ceil(i / 3))}-15');`
    );
  }
  for (let i = 13; i <= 24; i++) {
    push(
      `INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (${payId++}, ${i}, 2, 300.00, 'Registration', '2026-0${Math.min(5, Math.ceil((i - 12) / 3))}-20');`
    );
  }
  // Sponsorship ($5,200)
  push(`INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (${payId++}, 1, 1, 1500.00, 'Sponsorship', '2026-02-10');`);
  push(`INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (${payId++}, 2, 1, 1200.00, 'Sponsorship', '2026-03-05');`);
  push(`INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (${payId++}, 7, 1, 1100.00, 'Sponsorship', '2026-04-12');`);
  push(`INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (${payId++}, 3, 3, 1400.00, 'Sponsorship', '2025-03-18');`);
  // Merchandise ($2,460)
  push(`INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (${payId++}, 4, 1, 860.00, 'Merchandise', '2026-03-22');`);
  push(`INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (${payId++}, 5, 1, 700.00, 'Merchandise', '2026-04-28');`);
  push(`INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (${payId++}, 13, 2, 450.00, 'Merchandise', '2026-05-11');`);
  push(`INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (${payId++}, 1, 3, 450.00, 'Merchandise', '2025-05-04');`);
  // Other ($1,300)
  push(`INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (${payId++}, 6, 1, 550.00, 'Other', '2026-05-15');`);
  push(`INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (${payId++}, 15, 2, 400.00, 'Other', '2026-05-21');`);
  push(`INSERT INTO PAYMENT (payment_id, team_id, tournament_id, amount, category, paid_on) VALUES (${payId++}, 2, 3, 350.00, 'Other', '2025-06-12');`);
  push('');

  // 14. COMMUNICATIONS (4 initial notices)
  push('-- 14. Communications');
  push(`INSERT INTO COMMUNICATION (comm_id, title, message, category, target_audience, sent_by, sent_at) VALUES (1, 'Matchday 4 Venue Allocations Confirmed', 'All Round 4 fixtures for USA Premier Cup 2026 have verified stadium slots with zero venue conflicts.', 'Schedule Notice', 'All Senior & Women Coaches', 'John Doe', '2026-11-20 09:30:00');`);
  push(`INSERT INTO COMMUNICATION (comm_id, title, message, category, target_audience, sent_by, sent_at) VALUES (2, 'Disciplinary Notice: 3-Yellow Accumulation Rule', 'Players accumulating 3 yellow cards in a single tournament are automatically suspended by database trigger enforcement.', 'Disciplinary', 'Team Managers & Referees', 'John Doe', '2026-11-18 14:15:00');`);
  push(`INSERT INTO COMMUNICATION (comm_id, title, message, category, target_audience, sent_by, sent_at) VALUES (3, '2026 Registration Fee Settlement Window', 'Final sponsorship and merchandise fee invoices for Challenge Trophy clubs are due prior to Round 3.', 'Registration', 'Club Treasurers', 'John Doe', '2026-11-15 11:00:00');`);
  push(`INSERT INTO COMMUNICATION (comm_id, title, message, category, target_audience, sent_by, sent_at) VALUES (4, 'Official Referee Briefing & Match Reporting', 'Match officials must submit verified score sheets within 2 hours of full time for transactional standings updates.', 'General', 'Match Officials', 'John Doe', '2026-11-12 16:45:00');`);

  return lines.join('\n');
}
