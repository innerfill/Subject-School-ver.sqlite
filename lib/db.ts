import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'school_schedule.db');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
    if (_db) return _db;
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    const schema = fs.readFileSync(path.join(process.cwd(), 'lib', 'schema.sql'), 'utf-8');
    _db.exec(schema);
    return _db;
}

function isWriteQuery(sql: string): boolean {
    const t = sql.trim().toUpperCase();
    return t.startsWith('INSERT') || t.startsWith('UPDATE') || t.startsWith('DELETE') ||
           t.startsWith('CREATE') || t.startsWith('DROP') || t.startsWith('ALTER') ||
           t.startsWith('REPLACE');
}

export const pool = {
    query: async (sql: string, params?: any[]): Promise<[any, any]> => {
        const db = getDb();
        const flat = params ? (params as any[]).flat(Infinity) : [];
        const stmt = db.prepare(sql);
        if (isWriteQuery(sql)) {
            const r = stmt.run(...flat);
            return [{ insertId: r.lastInsertRowid, affectedRows: r.changes }, []];
        }
        return [stmt.all(...flat), []];
    },
};

export function backupDb(dest: string): Promise<unknown> {
    return getDb().backup(dest);
}

export function resetDb(): void {
    if (_db) { _db.close(); _db = null; }
}
