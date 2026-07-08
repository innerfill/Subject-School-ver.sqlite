import { NextResponse } from 'next/server';
import { readdir, stat, unlink, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { backupDb } from '@/lib/db';

const BACKUPS_DIR = path.join(process.cwd(), 'backups');

function timestamp() {
    return new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
}

// GET /api/backup           → download .db
// GET /api/backup?type=list → list saved files
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    if (searchParams.get('type') === 'list') {
        try {
            await mkdir(BACKUPS_DIR, { recursive: true });
            const files = (await readdir(BACKUPS_DIR)).filter(f => f.endsWith('.db'));
            const infos = await Promise.all(files.map(async f => {
                const s = await stat(path.join(BACKUPS_DIR, f));
                return { name: f, size: s.size, modified: s.mtime };
            }));
            return NextResponse.json(infos.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()));
        } catch {
            return NextResponse.json([]);
        }
    }

    // stream download — backup to temp then send
    const tmpPath = path.join(process.cwd(), `_backup_tmp_${Date.now()}.db`);
    try {
        await backupDb(tmpPath);
        const data = await readFile(tmpPath);
        const filename = `school_schedule_${timestamp()}.db`;
        return new NextResponse(data, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } finally {
        if (existsSync(tmpPath)) await unlink(tmpPath).catch(() => {});
    }
}

// POST /api/backup → save to backups/ folder
export async function POST() {
    await mkdir(BACKUPS_DIR, { recursive: true });
    const filename = `school_schedule_${timestamp()}.db`;
    const filepath = path.join(BACKUPS_DIR, filename);
    await backupDb(filepath);
    return NextResponse.json({ success: true, filename });
}

// DELETE /api/backup?file=filename → delete saved file
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

    const safe = path.basename(file);
    if (!safe.endsWith('.db')) return NextResponse.json({ error: 'invalid file' }, { status: 400 });

    try {
        await unlink(path.join(BACKUPS_DIR, safe));
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
}
