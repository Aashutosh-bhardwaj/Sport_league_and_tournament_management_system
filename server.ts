import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import initSqlJs from 'sql.js';
import { createServer as createViteServer } from 'vite';
import { SCHEMA_SQL, VIEWS_SQL, TRIGGERS_SQL } from './src/db/sqlDefinitions.ts';
import { generateSeedSql } from './src/db/seedGenerator.ts';
import {
  exportMysqlCompleteSql,
  exportPostgresCompleteSql,
  exportSqliteCompleteSql,
} from './src/db/sqlDialects.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;
const DB_DIR = path.join(ROOT_DIR, 'database');
const SQLITE_DB_PATH = path.join(DB_DIR, 'sports_league.db');

let sqlJsPromise: ReturnType<typeof initSqlJs> | null = null;

function getSqlJs() {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs();
  }
  return sqlJsPromise;
}

export async function ensureLocalDatabaseFiles(): Promise<void> {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const sqliteSqlPath = path.join(DB_DIR, 'sqlite_complete.sql');
  const mysqlSqlPath = path.join(DB_DIR, 'mysql_complete.sql');
  const postgresSqlPath = path.join(DB_DIR, 'postgresql_complete.sql');

  if (!fs.existsSync(sqliteSqlPath)) {
    fs.writeFileSync(sqliteSqlPath, exportSqliteCompleteSql(), 'utf8');
  }
  if (!fs.existsSync(mysqlSqlPath)) {
    fs.writeFileSync(mysqlSqlPath, exportMysqlCompleteSql(), 'utf8');
  }
  if (!fs.existsSync(postgresSqlPath)) {
    fs.writeFileSync(postgresSqlPath, exportPostgresCompleteSql(), 'utf8');
  }

  if (!fs.existsSync(SQLITE_DB_PATH)) {
    const SQL = await getSqlJs();
    const db = new SQL.Database();
    db.run('PRAGMA foreign_keys = ON;');
    db.run(SCHEMA_SQL);
    db.run(VIEWS_SQL);
    db.run(TRIGGERS_SQL);
    db.run('BEGIN TRANSACTION;');
    try {
      db.run(generateSeedSql());
      db.run('COMMIT;');
    } catch (err) {
      db.run('ROLLBACK;');
      db.close();
      throw err;
    }
    const bytes = db.export();
    fs.writeFileSync(SQLITE_DB_PATH, Buffer.from(bytes));
    db.close();
  }
}

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
  '.aistudio',
  '.vscode',
  '.idea',
]);

const EXCLUDED_FILES = new Set(['.DS_Store', '.env', '.env.local', '.env.production']);

function addDirectoryToZip(zip: JSZip, currentDir: string, relativeBase = ''): void {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const name = entry.name;
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(name)) continue;
      const nextRel = relativeBase ? `${relativeBase}/${name}` : name;
      addDirectoryToZip(zip, path.join(currentDir, name), nextRel);
    } else if (entry.isFile()) {
      if (EXCLUDED_FILES.has(name) || name.endsWith('.log') || name.endsWith('.zip')) continue;
      const fullPath = path.join(currentDir, name);
      const relPath = relativeBase ? `${relativeBase}/${name}` : name;
      const data = fs.readFileSync(fullPath);
      zip.file(relPath, data);
    }
  }
}

async function readLocalSqliteStatus() {
  if (!fs.existsSync(SQLITE_DB_PATH)) {
    return {
      exists: false,
      path: 'database/sports_league.db',
      sizeBytes: 0,
      lastModified: null,
      tablesCount: 0,
      teamsCount: 0,
      playersCount: 0,
      matchesCount: 0,
    };
  }
  const stat = fs.statSync(SQLITE_DB_PATH);
  const SQL = await getSqlJs();
  const bytes = fs.readFileSync(SQLITE_DB_PATH);
  const db = new SQL.Database(bytes);
  try {
    const scalar = (sql: string) => {
      const res = db.exec(sql);
      return res.length > 0 && res[0].values.length > 0 ? Number(res[0].values[0][0]) : 0;
    };
    return {
      exists: true,
      path: 'database/sports_league.db',
      sizeBytes: stat.size,
      lastModified: stat.mtime.toISOString(),
      tablesCount: scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"),
      teamsCount: scalar('SELECT COUNT(*) FROM TEAM'),
      playersCount: scalar('SELECT COUNT(*) FROM PLAYER'),
      matchesCount: scalar('SELECT COUNT(*) FROM "MATCH"'),
      sqlFiles: [
        'database/sports_league.db',
        'database/sqlite_complete.sql',
        'database/mysql_complete.sql',
        'database/postgresql_complete.sql',
        'oracle_plsql.sql',
      ],
    };
  } finally {
    db.close();
  }
}

async function startServer() {
  await ensureLocalDatabaseFiles();

  if (process.argv.includes('--init-db')) {
    console.log('Initialized local SQLite database and SQL dialect exports in ./database');
    return;
  }

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'sports-league-management-system', port: PORT });
  });

  app.get('/api/db/status', async (_req, res) => {
    try {
      await ensureLocalDatabaseFiles();
      const status = await readLocalSqliteStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.get('/api/db/download-sqlite', async (_req, res) => {
    try {
      await ensureLocalDatabaseFiles();
      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader('Content-Disposition', 'attachment; filename="sports_league.db"');
      res.sendFile(SQLITE_DB_PATH);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post(
    '/api/db/sync',
    express.raw({ type: 'application/octet-stream', limit: '50mb' }),
    async (req, res) => {
      try {
        let buffer: Buffer | null = null;
        if (Buffer.isBuffer(req.body) && req.body.byteLength > 0) {
          buffer = req.body;
        } else if (req.body && typeof req.body.base64 === 'string') {
          buffer = Buffer.from(req.body.base64, 'base64');
        }
        if (!buffer || buffer.byteLength === 0) {
          res.status(400).json({ error: 'Missing SQLite binary payload.' });
          return;
        }

        const SQL = await getSqlJs();
        const testDb = new SQL.Database(new Uint8Array(buffer));
        try {
          const check = testDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='TOURNAMENT'");
          if (check.length === 0 || check[0].values.length === 0) {
            res.status(400).json({ error: 'Invalid SQLite schema: TOURNAMENT table not found.' });
            return;
          }
        } finally {
          testDb.close();
        }

        if (!fs.existsSync(DB_DIR)) {
          fs.mkdirSync(DB_DIR, { recursive: true });
        }
        fs.writeFileSync(SQLITE_DB_PATH, buffer);
        const status = await readLocalSqliteStatus();
        res.json({ ok: true, status });
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
      }
    }
  );

  app.post('/api/db/query', async (req, res) => {
    try {
      await ensureLocalDatabaseFiles();
      const rawSql = typeof req.body?.sql === 'string' ? req.body.sql : '';
      const trimmed = rawSql.trim().replace(/;+\s*$/, '');
      if (!trimmed) {
        res.status(400).json({ error: 'SQL query is required.' });
        return;
      }
      const upper = trimmed.toUpperCase();
      if (
        !upper.startsWith('SELECT') &&
        !upper.startsWith('WITH') &&
        !upper.startsWith('PRAGMA') &&
        !upper.startsWith('EXPLAIN')
      ) {
        res.status(400).json({ error: 'Only read-only SELECT, WITH, PRAGMA, or EXPLAIN queries are permitted.' });
        return;
      }

      const safeSql = trimmed.replace(/\b(FROM|JOIN)\s+MATCH\b/gi, '$1 "MATCH"');
      const SQL = await getSqlJs();
      const db = new SQL.Database(fs.readFileSync(SQLITE_DB_PATH));
      try {
        const stmt = db.prepare(safeSql);
        try {
          const columns = stmt.getColumnNames();
          const rows: Record<string, unknown>[] = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          res.json({ columns, rows });
        } finally {
          stmt.free();
        }
      } finally {
        db.close();
      }
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.get('/api/export-project.zip', async (_req, res) => {
    try {
      await ensureLocalDatabaseFiles();
      const zip = new JSZip();
      const rootFolder = zip.folder('sports-league-management-system');
      if (!rootFolder) {
        throw new Error('Failed to initialize ZIP archive.');
      }
      addDirectoryToZip(rootFolder, ROOT_DIR);
      const buffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="sports-league-management-system.zip"');
      res.setHeader('Content-Length', String(buffer.byteLength));
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
