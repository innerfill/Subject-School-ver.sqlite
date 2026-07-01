import { pool } from '@/lib/db';

// Returns raw value from SystemConfig, falls back to env var
export async function getConfig(key: string, envFallback?: string): Promise<string | null> {
    try {
        const [rows] = await pool.query('SELECT value FROM SystemConfig WHERE `key` = ?', [key]);
        const val = (rows as any[])[0]?.value;
        if (val) return val;
    } catch {
        // table may not exist yet — fall through to env
    }
    return envFallback ?? null;
}
