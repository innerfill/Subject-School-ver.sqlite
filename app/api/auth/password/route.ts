import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { pool } from '@/lib/db';

export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 });
    }
    if (newPassword.length < 8) {
        return NextResponse.json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const [rows] = await pool.query('SELECT password_hash FROM Users WHERE id = ?', [userId]);
    const user = (rows as any[])[0];

    if (!user?.password_hash) {
        return NextResponse.json({ error: 'บัญชีนี้ใช้ Google login ไม่มีรหัสผ่าน' }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
        return NextResponse.json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, { status: 400 });
    }
    if (currentPassword === newPassword) {
        return NextResponse.json({ error: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม' }, { status: 400 });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE Users SET password_hash = ? WHERE id = ?', [hash, userId]);
    return NextResponse.json({ ok: true });
}
