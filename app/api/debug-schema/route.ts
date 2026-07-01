import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
    try {
        const tables = ['Classes', 'Teachers', 'Subjects', 'Rooms', 'SchoolSettings', 'Signatories', 'AcademicTerms', 'Schedule'];
        const schemas: any = {};

        for (const table of tables) {
            try {
                const [columns] = await pool.query(`SHOW COLUMNS FROM ${table}`);
                schemas[table] = columns;
            } catch (e: any) {
                schemas[table] = e.message;
            }
        }

        return NextResponse.json(schemas);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
