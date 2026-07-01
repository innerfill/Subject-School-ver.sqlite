import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

async function ensureTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS SystemConfig (
            \`key\`      VARCHAR(100) PRIMARY KEY,
            value       TEXT,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
}

const SENSITIVE_KEYS = new Set(['line_channel_access_token']);

// GET /api/settings — return all config; sensitive values masked
export async function GET() {
    try {
        await ensureTable();
        const [rows] = await pool.query('SELECT `key`, value, updated_at FROM SystemConfig');
        const result: Record<string, any> = {};
        for (const row of rows as any[]) {
            result[row.key] = {
                value: SENSITIVE_KEYS.has(row.key)
                    ? (row.value ? '••••••••' + String(row.value).slice(-4) : '')
                    : row.value,
                updated_at: row.updated_at,
                is_set: !!row.value,
            };
        }
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

// POST /api/settings — upsert { key, value } pairs
export async function POST(request: Request) {
    try {
        await ensureTable();
        const body = await request.json();
        // body: { line_channel_access_token: '...', line_group_id: '...' }
        const entries = Object.entries(body as Record<string, string>);
        if (entries.length === 0) return NextResponse.json({ error: 'No data' }, { status: 400 });

        for (const [key, value] of entries) {
            if (value === '' || value === null) {
                await pool.query('DELETE FROM SystemConfig WHERE `key` = ?', [key]);
            } else {
                await pool.query(
                    'INSERT INTO SystemConfig (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
                    [key, String(value)]
                );
            }
        }
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
