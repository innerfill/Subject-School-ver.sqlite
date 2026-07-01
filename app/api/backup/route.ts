import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { readdir, stat, unlink, mkdir } from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';

const MYSQLDUMP = process.env.MYSQLDUMP_PATH || 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
const BACKUPS_DIR = path.join(process.cwd(), 'backups');

function dumpArgs() {
    const host = process.env.DB_HOST || '127.0.0.1';
    const user = process.env.DB_USER || 'root';
    const pass = process.env.DB_PASSWORD || '';
    const db   = process.env.DB_NAME  || 'school_schedule';
    return [
        `-h${host}`, `-u${user}`,
        ...(pass ? [`-p${pass}`] : []),
        '--default-character-set=utf8mb4',
        '--single-transaction',
        '--routines',
        db,
    ];
}

function timestamp() {
    return new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
}

// GET /api/backup          → download .sql
// GET /api/backup?type=list → list saved files
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    if (searchParams.get('type') === 'list') {
        try {
            await mkdir(BACKUPS_DIR, { recursive: true });
            const files = (await readdir(BACKUPS_DIR)).filter(f => f.endsWith('.sql'));
            const infos = await Promise.all(files.map(async f => {
                const s = await stat(path.join(BACKUPS_DIR, f));
                return { name: f, size: s.size, modified: s.mtime };
            }));
            return NextResponse.json(infos.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()));
        } catch {
            return NextResponse.json([]);
        }
    }

    // stream download
    const filename = `school_schedule_${timestamp()}.sql`;
    return new Promise<NextResponse>((resolve) => {
        const chunks: Buffer[] = [];
        const proc = spawn(MYSQLDUMP, dumpArgs());
        proc.stdout.on('data', (c: Buffer) => chunks.push(c));
        proc.on('close', (code) => {
            if (code !== 0) {
                resolve(NextResponse.json({ error: 'mysqldump failed' }, { status: 500 }));
                return;
            }
            const body = Buffer.concat(chunks);
            resolve(new NextResponse(body, {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                },
            }));
        });
    });
}

// POST /api/backup → save to backups/ folder
export async function POST() {
    await mkdir(BACKUPS_DIR, { recursive: true });
    const filename = `school_schedule_${timestamp()}.sql`;
    const filepath = path.join(BACKUPS_DIR, filename);

    return new Promise<NextResponse>((resolve) => {
        const proc = spawn(MYSQLDUMP, dumpArgs());
        const ws   = createWriteStream(filepath);
        proc.stdout.pipe(ws);
        let errOut = '';
        proc.stderr.on('data', (d: Buffer) => { errOut += d.toString(); });
        proc.on('close', (code) => {
            if (code !== 0) {
                resolve(NextResponse.json({ error: `mysqldump failed: ${errOut}` }, { status: 500 }));
                return;
            }
            resolve(NextResponse.json({ success: true, filename }));
        });
    });
}

// DELETE /api/backup?file=filename → delete saved file
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

    // prevent path traversal
    const safe = path.basename(file);
    if (!safe.endsWith('.sql')) return NextResponse.json({ error: 'invalid file' }, { status: 400 });

    try {
        await unlink(path.join(BACKUPS_DIR, safe));
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
}
