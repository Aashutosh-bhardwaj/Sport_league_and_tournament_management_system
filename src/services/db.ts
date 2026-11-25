import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { SCHEMA_SQL, VIEWS_SQL, TRIGGERS_SQL, QUERIES_SQL, ORACLE_PLSQL_SQL } from '../db/sqlDefinitions';
import { generateSeedSql } from '../db/seedGenerator';

export type SqlParam = string | number | null | Uint8Array;

export interface DbRunner {
  runQuery<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): T[];
  runExec(sql: string, params?: SqlParam[]): { changes: number; lastInsertRowId: number };
  runTransaction<T>(fn: () => T): T;
}

const IDB_NAME = 'SLMS_SQLITE_DB';
const IDB_STORE = 'sqlite_store';
const IDB_KEY = 'slms_database_v1';
const FASTAPI_BASE_URL = 'http://127.0.0.1:8000';

let sqlEngine: SqlJsStatic | null = null;
let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;
let txDepth = 0;

const listeners = new Set<() => void>();

export function subscribeDbChanges(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifyDbChanged(): void {
  for (const cb of listeners) {
    try {
      cb();
    } catch {
      // ignore subscriber render exceptions
    }
  }
}

export function mapSqlError(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err);

  const customPrefixes = [
    'Roster Constraint:',
    'Eligibility Constraint:',
    'Venue Conflict:',
    'Fixture Conflict:',
    'Match State Constraint:',
    'Constraint Error:',
  ];
  for (const prefix of customPrefixes) {
    const idx = raw.indexOf(prefix);
    if (idx !== -1) {
      return new Error(raw.slice(idx));
    }
  }

  if (raw.includes('UNIQUE constraint failed')) {
    if (raw.includes('TEAM_ROSTER.player_id')) {
      return new Error('Roster Conflict: This player is already registered on a team in this tournament.');
    }
    if (raw.includes('TEAM_ROSTER.team_id')) {
      return new Error('Jersey Conflict: This jersey number is already assigned on this team in the selected tournament.');
    }
    if (raw.includes('MATCH.venue_id')) {
      return new Error('Venue Conflict: This venue is already booked at the selected date and time.');
    }
    if (raw.includes('MATCH.tournament_id')) {
      return new Error('Fixture Conflict: This exact home vs away fixture already exists in this tournament.');
    }
    if (raw.includes('TEAM.name')) {
      return new Error('Duplicate Team: A team with this name already exists.');
    }
    if (raw.includes('PLAYER.email')) {
      return new Error('Duplicate Email: Another player already uses this email address.');
    }
    if (raw.includes('OFFICIAL.license_no')) {
      return new Error('Duplicate License: An official with this license number already exists.');
    }
    if (raw.includes('PLAYER_STATISTICS.match_id')) {
      return new Error('Duplicate Stat: Statistics for this player in this match are already recorded.');
    }
    return new Error(`Unique Constraint Error: ${raw}`);
  }

  if (raw.includes('FOREIGN KEY constraint failed')) {
    return new Error(
      'Foreign Key Constraint: Cannot delete or update this record while dependent records (matches, results, rosters, or payments) reference it.'
    );
  }

  if (raw.includes('CHECK constraint failed')) {
    return new Error(
      'Check Constraint Failed: Input violates a relational rule (e.g., end_date must be after start_date, scores >= 0, or home team must differ from away team).'
    );
  }

  return err instanceof Error ? err : new Error(raw);
}

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
}

async function loadPersistedBytes(): Promise<Uint8Array | null> {
  try {
    if (typeof indexedDB !== 'undefined') {
      const idb = await openIndexedDb();
      return await new Promise<Uint8Array | null>((resolve, reject) => {
        const tx = idb.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const getReq = store.get(IDB_KEY);
        getReq.onsuccess = () => {
          const val = getReq.result;
          resolve(val instanceof Uint8Array ? val : null);
        };
        getReq.onerror = () => reject(getReq.error);
      });
    }
  } catch {
    // fallback below
  }
  return null;
}

async function savePersistedBytes(bytes: Uint8Array): Promise<void> {
  try {
    if (typeof indexedDB !== 'undefined') {
      const idb = await openIndexedDb();
      await new Promise<void>((resolve, reject) => {
        const tx = idb.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const putReq = store.put(bytes, IDB_KEY);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      });
    }
  } catch {
    // non-fatal in headless or test environments without IndexedDB
  }
}

async function getSqlEngine(): Promise<SqlJsStatic> {
  if (sqlEngine) return sqlEngine;
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  sqlEngine = await initSqlJs(
    isBrowser
      ? {
          locateFile: () => '/sql-wasm.wasm',
          useOldExtensionFunctions: false,
        }
      : undefined
  );
  return sqlEngine;
}

function bootstrapSchemaAndSeed(db: Database, includeSeed: boolean): void {
  db.run('PRAGMA foreign_keys = ON;');
  db.run(SCHEMA_SQL);
  db.run(VIEWS_SQL);
  db.run(TRIGGERS_SQL);
  if (includeSeed) {
    db.run('BEGIN TRANSACTION;');
    try {
      db.run(generateSeedSql());
      db.run('COMMIT;');
    } catch (err) {
      db.run('ROLLBACK;');
      throw err;
    }
  }
}

export async function initDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await getSqlEngine();
    const saved = await loadPersistedBytes();
    if (saved && saved.byteLength > 0) {
      try {
        const loaded = new SQL.Database(saved);
        loaded.run('PRAGMA foreign_keys = ON;');
        const check = loaded.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='TOURNAMENT'");
        if (check.length > 0 && check[0].values.length > 0) {
          dbInstance = loaded;
          return dbInstance;
        }
      } catch {
        // corrupt persisted bytes: re-seed cleanly
      }
    }

    const fresh = new SQL.Database();
    bootstrapSchemaAndSeed(fresh, true);
    dbInstance = fresh;
    await savePersistedBytes(fresh.export());
    return dbInstance;
  })();

  return initPromise;
}

export async function createInMemoryTestDatabase(withSeed = true): Promise<Database> {
  const SQL = await getSqlEngine();
  const db = new SQL.Database();
  bootstrapSchemaAndSeed(db, withSeed);
  return db;
}

export function setActiveDatabaseForTests(db: Database): void {
  dbInstance = db;
  txDepth = 0;
}

function requireDb(): Database {
  if (!dbInstance) {
    throw new Error('Database not initialized yet. Wait for initDatabase() to resolve.');
  }
  return dbInstance;
}

export function persistNow(): void {
  if (!dbInstance) return;
  const bytes = dbInstance.export();
  void savePersistedBytes(bytes);
}

function syncAllMutationsToMySQL(sql: string, params?: SqlParam[]): void {
  const trimmed = sql.trim();
  const upper = trimmed.toUpperCase();

  if (!upper.startsWith('INSERT') && !upper.startsWith('UPDATE') && !upper.startsWith('DELETE')) {
    return;
  }

  const cleanParams: (string | number | null)[] = [];
  if (params) {
    for (const p of params) {
      if (p === null || typeof p === 'string' || typeof p === 'number') {
        cleanParams.push(p);
      } else {
        cleanParams.push(null);
      }
    }
  }

  void fetch(`${FASTAPI_BASE_URL}/api/sync-sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sql: trimmed,
      params: cleanParams,
    }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('FastAPI MySQL Sync Error:', err, 'Query:', trimmed);
      } else {
        console.log('Synced to MySQL Workbench:', trimmed.slice(0, 60));
      }
    })
    .catch((err) => {
      console.error('FastAPI Server unreachable:', err);
    });
}

export function runQuery<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): T[] {
  const db = requireDb();
  const stmt = db.prepare(sql);
  try {
    if (params && params.length > 0) {
      stmt.bind(params);
    }
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    return rows;
  } catch (err) {
    throw mapSqlError(err);
  } finally {
    stmt.free();
  }
}

export function runExec(sql: string, params?: SqlParam[]): { changes: number; lastInsertRowId: number } {
  const db = requireDb();
  try {
    db.run('PRAGMA foreign_keys = ON;');
    if (params && params.length > 0) {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params);
        stmt.step();
      } finally {
        stmt.free();
      }
    } else {
      db.run(sql);
    }
    const changes = db.getRowsModified();
    const idRes = db.exec('SELECT last_insert_rowid() AS id');
    const lastInsertRowId =
      idRes.length > 0 && idRes[0].values.length > 0 ? Number(idRes[0].values[0][0]) : 0;

    if (txDepth === 0) {
      persistNow();
      notifyDbChanged();
    }

    syncAllMutationsToMySQL(sql, params);

    return { changes, lastInsertRowId };
  } catch (err) {
    throw mapSqlError(err);
  }
}

export function runTransaction<T>(fn: () => T): T {
  const db = requireDb();
  const isOuter = txDepth === 0;
  if (isOuter) {
    db.run('PRAGMA foreign_keys = ON;');
    db.run('BEGIN TRANSACTION;');
  }
  txDepth++;
  try {
    const result = fn();
    txDepth--;
    if (isOuter) {
      db.run('COMMIT;');
      persistNow();
      notifyDbChanged();
    }
    return result;
  } catch (err) {
    txDepth--;
    if (isOuter) {
      try {
        db.run('ROLLBACK;');
      } catch {
        // ignore rollback error if transaction already aborted by trigger
      }
    }
    throw mapSqlError(err);
  }
}

export async function resetDatabase(includeSeed = true): Promise<void> {
  const SQL = await getSqlEngine();
  const fresh = new SQL.Database();
  bootstrapSchemaAndSeed(fresh, includeSeed);
  dbInstance = fresh;
  txDepth = 0;
  await savePersistedBytes(fresh.export());
  notifyDbChanged();
}

export function runReadOnlySelect(rawSql: string): { columns: string[]; rows: Record<string, unknown>[] } {
  const db = requireDb();
  const trimmed = rawSql.trim().replace(/;+\s*$/, '');
  if (!trimmed) {
    throw new Error('Please enter a SQL query to execute.');
  }
  const upper = trimmed.toUpperCase();
  const allowedStart =
    upper.startsWith('SELECT') ||
    upper.startsWith('WITH') ||
    upper.startsWith('PRAGMA') ||
    upper.startsWith('EXPLAIN');
  if (!allowedStart) {
    throw new Error('SQL Console only allows read-only SELECT, WITH, PRAGMA, or EXPLAIN queries.');
  }

  const safeSql = trimmed.replace(/\b(FROM|JOIN)\s+MATCH\b/gi, '$1 "MATCH"');

  const stmt = db.prepare(safeSql);
  try {
    const columns = stmt.getColumnNames();
    const rows: Record<string, unknown>[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as Record<string, unknown>);
    }
    return { columns, rows };
  } catch (err) {
    throw mapSqlError(err);
  } finally {
    stmt.free();
  }
}

export function getDbRunner(): DbRunner {
  return {
    runQuery,
    runExec,
    runTransaction,
  };
}

export function getSchemaOverview() {
  return {
    schemaSql: SCHEMA_SQL,
    viewsSql: VIEWS_SQL,
    triggersSql: TRIGGERS_SQL,
    queriesSql: QUERIES_SQL,
    oraclePlsqlSql: ORACLE_PLSQL_SQL,
    tables: runQuery<{ name: string; sql: string }>(
      `SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    ),
    views: runQuery<{ name: string; sql: string }>(
      `SELECT name, sql FROM sqlite_master WHERE type='view' ORDER BY name`
    ),
    triggers: runQuery<{ name: string; tbl_name: string; sql: string }>(
      `SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger' ORDER BY tbl_name, name`
    ),
  };
}

export function exportCompleteSqlScript(): string {
  return [
    '-- ============================================================================',
    '-- Sports League & Tournament Management System - Complete SQLite Export',
    `-- Generated at ${new Date().toISOString()}`,
    '-- ============================================================================',
    '',
    SCHEMA_SQL,
    '',
    VIEWS_SQL,
    '',
    TRIGGERS_SQL,
    '',
    generateSeedSql(),
  ].join('\n');
}

export function exportDatabaseBytes(): Uint8Array {
  return requireDb().export();
}

export async function syncDatabaseToLocalServer(): Promise<{
  ok: boolean;
  status?: {
    exists: boolean;
    path: string;
    sizeBytes: number;
    lastModified: string | null;
    tablesCount: number;
    teamsCount: number;
    playersCount: number;
    matchesCount: number;
  };
}> {
  const bytes = exportDatabaseBytes();
  const res = await fetch('/api/db/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: new Blob([new Uint8Array(bytes)], { type: 'application/octet-stream' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Sync failed' }));
    throw new Error(err.error || 'Failed to sync browser database to local disk.');
  }
  return res.json();
}