import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { resetDb } from '@/lib/db';

const DB_PATH = path.join(process.cwd(), 'school_schedule.db');

// POST /api/backup/restore  (multipart: file = .db)
export async function POST(request: Request) {
    let file: File;
    try {
        const form = await request.formData();
        const f = form.get('file');
        if (!f || typeof f === 'string') throw new Error();
        file = f as File;
    } catch {
        return NextResponse.json({ error: 'No .db file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.db'))
        return NextResponse.json({ error: 'Only .db files are accepted' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // Close current db connection, replace file, let it reopen on next request
    resetDb();
    await writeFile(DB_PATH, buffer);

    return NextResponse.json({ success: true });
}
