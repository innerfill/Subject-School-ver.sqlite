import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
    try {
        const [settings] = await pool.query('SELECT * FROM SchoolSettings LIMIT 1');
        const [signatories] = await pool.query('SELECT * FROM Signatories');

        return NextResponse.json({
            school: (settings as any)[0] || {},
            signatories: signatories
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch settings', details: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { school, signatories } = await request.json();

        // Update School Settings
        if (school.id) {
            await pool.query(
                'UPDATE SchoolSettings SET school_name = ?, affiliation = ?, table_theme = ?, logo_url = ? WHERE id = ?',
                [school.school_name, school.affiliation, school.table_theme || 'blue', school.logo_url || null, school.id]
            );
        } else {
            await pool.query(
                'INSERT INTO SchoolSettings (school_name, affiliation, table_theme, logo_url) VALUES (?, ?, ?, ?)',
                [school.school_name, school.affiliation, school.table_theme || 'blue', school.logo_url || null]
            );
        }

        // Update Signatories
        for (const sig of signatories) {
            await pool.query(
                'UPDATE Signatories SET position_name = ?, person_name = ?, person_prefix = ?, rank_title = ? WHERE id = ?',
                [sig.position_name, sig.person_name, sig.person_prefix || null, sig.rank_title || null, sig.id]
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update settings error:', error);
        return NextResponse.json({ error: 'Failed to update settings', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
