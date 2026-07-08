import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

const SENSITIVE_KEYS = new Set(['line_channel_access_token']);

export async function GET() {
    try {
        const [rows] = await pool.query('SELECT key, value, updated_at FROM SystemConfig');
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
    } catch {
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const entries = Object.entries(body as Record<string, string>);
        if (entries.length === 0) return NextResponse.json({ error: 'No data' }, { status: 400 });

        for (const [key, value] of entries) {
            if (value === '' || value === null) {
                await pool.query('DELETE FROM SystemConfig WHERE key = ?', [key]);
            } else {
                await pool.query(
                    "INSERT OR REPLACE INTO SystemConfig (key, value, updated_at) VALUES (?, ?, datetime('now'))",
                    [key, String(value)]
                );
            }
        }
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
