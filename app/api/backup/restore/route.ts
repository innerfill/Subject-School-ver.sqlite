import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

const MYSQL = process.env.MYSQL_PATH || 'C:\\xampp\\mysql\\bin\\mysql.exe';

// POST /api/backup/restore  (multipart: file = .sql)
export async function POST(request: Request) {
    let file: File;
    try {
        const form = await request.formData();
        const f = form.get('file');
        if (!f || typeof f === 'string') throw new Error();
        file = f as File;
    } catch {
        return NextResponse.json({ error: 'No .sql file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.sql'))
        return NextResponse.json({ error: 'Only .sql files are accepted' }, { status: 400 });

    const sql = await file.text();

    const host = process.env.DB_HOST || '127.0.0.1';
    const user = process.env.DB_USER || 'root';
    const pass = process.env.DB_PASSWORD || '';
    const db   = process.env.DB_NAME  || 'school_schedule';

    const args = [
        `-h${host}`, `-u${user}`,
        ...(pass ? [`-p${pass}`] : []),
        '--default-character-set=utf8mb4',
        db,
    ];

    return new Promise<NextResponse>((resolve) => {
        const proc = spawn(MYSQL, args);
        let errOut = '';
        proc.stderr.on('data', (d: Buffer) => { errOut += d.toString(); });
        proc.on('close', (code) => {
            if (code !== 0) {
                resolve(NextResponse.json({ error: `Restore failed: ${errOut}` }, { status: 500 }));
                return;
            }
            resolve(NextResponse.json({ success: true }));
        });
        proc.stdin.write(sql);
        proc.stdin.end();
    });
}
