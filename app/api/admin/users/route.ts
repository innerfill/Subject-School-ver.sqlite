import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { pool } from '@/lib/db';

async function requireAdmin() {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return null;
}

export async function GET() {
    const denied = await requireAdmin();
    if (denied) return denied;

    const [rows] = await pool.query(
        'SELECT id, name, username, email, provider, role, avatar_url, created_at FROM Users ORDER BY created_at ASC'
    );
    return NextResponse.json(rows);
}

export async function PATCH(req: NextRequest) {
    const denied = await requireAdmin();
    if (denied) return denied;

    const body = await req.json();
    const session = await auth();
    const currentId = String((session!.user as any).id);

    // reset password
    if (body.action === 'reset_password') {
        const { id, newPassword } = body;
        if (!id || !newPassword || newPassword.length < 8) {
            return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 });
        }
        const hash = await bcrypt.hash(newPassword, 12);
        await pool.query('UPDATE Users SET password_hash = ? WHERE id = ?', [hash, id]);
        return NextResponse.json({ ok: true });
    }

    // change role
    const { id, role } = body;
    if (!id || !['admin', 'user'].includes(role)) {
        return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }
    if (currentId === String(id)) {
        return NextResponse.json({ error: 'ไม่สามารถเปลี่ยน role ตัวเองได้' }, { status: 400 });
    }
    await pool.query('UPDATE Users SET role = ? WHERE id = ?', [role, id]);
    return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id } = await req.json();
    const session = await auth();
    if (String((session!.user as any).id) === String(id)) {
        return NextResponse.json({ error: 'ไม่สามารถลบบัญชีตัวเองได้' }, { status: 400 });
    }

    await pool.query('DELETE FROM Users WHERE id = ?', [id]);
    return NextResponse.json({ ok: true });
}
