import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';

const USERNAME_RE = /^[a-z0-9_]{4,30}$/;

export async function POST(req: NextRequest) {
    const { name, username, email, password, confirmPassword } = await req.json();

    if (!name?.trim() || !username?.trim() || !email?.trim() || !password) {
        return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 });
    }
    if (!USERNAME_RE.test(username)) {
        return NextResponse.json({ error: 'username: 4-30 ตัว ใช้ได้เฉพาะ a-z 0-9 และ _' }, { status: 400 });
    }
    if (password.length < 8) {
        return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 });
    }
    if (password !== confirmPassword) {
        return NextResponse.json({ error: 'รหัสผ่านไม่ตรงกัน' }, { status: 400 });
    }

    const [byUsername] = await pool.query('SELECT id FROM Users WHERE username = ?', [username]);
    if ((byUsername as any[]).length > 0) {
        return NextResponse.json({ error: `username "${username}" มีผู้ใช้งานแล้ว` }, { status: 409 });
    }

    const [byEmail] = await pool.query('SELECT id FROM Users WHERE email = ?', [email]);
    if ((byEmail as any[]).length > 0) {
        return NextResponse.json({ error: 'อีเมลนี้มีบัญชีอยู่แล้ว' }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
        'INSERT INTO Users (name, username, email, password_hash, provider, role) VALUES (?, ?, ?, ?, ?, ?)',
        [name.trim(), username.trim().toLowerCase(), email.trim().toLowerCase(), hash, 'credentials', 'user']
    );

    return NextResponse.json({ ok: true });
}
