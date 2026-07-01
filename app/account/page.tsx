'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { KeyRound, Eye, EyeOff, Check, X, Shield, User } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

function PasswordStrength({ password }: { password: string }) {
    const checks = [
        { label: 'อย่างน้อย 8 ตัวอักษร', ok: password.length >= 8 },
        { label: 'มีตัวพิมพ์ใหญ่', ok: /[A-Z]/.test(password) },
        { label: 'มีตัวเลข', ok: /[0-9]/.test(password) },
    ];
    if (!password) return null;
    return (
        <div className="mt-1.5 space-y-0.5">
            {checks.map(c => (
                <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                    {c.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {c.label}
                </div>
            ))}
        </div>
    );
}

function TogglePassword({ show, onToggle }: { show: boolean; onToggle: () => void }) {
    return (
        <button type="button" tabIndex={-1} onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
    );
}

export default function AccountPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const user = session?.user as any;

    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [show, setShow] = useState({ current: false, newPwd: false, confirm: false });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const passwordsMatch = !form.confirmPassword || form.newPassword === form.confirmPassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!passwordsMatch) { setError('รหัสผ่านใหม่ไม่ตรงกัน'); return; }

        setLoading(true);
        const res = await fetch('/api/auth/password', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
        });
        const data = await res.json();
        setLoading(false);

        if (res.ok) {
            showToast('เปลี่ยนรหัสผ่านสำเร็จ', 'success');
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } else {
            setError(data.error || 'เกิดข้อผิดพลาด');
        }
    };

    return (
        <div className="max-w-lg mx-auto space-y-6 font-sarabun">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl">
                    <User className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                    <h1 className="page-title">บัญชีของฉัน</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
            </div>

            {/* Profile info */}
            <div className="data-card">
                <h2 className="section-title mb-4">ข้อมูลบัญชี</h2>
                <div className="space-y-3">
                    {[
                        { label: 'ชื่อ', value: user?.name },
                        { label: 'อีเมล', value: user?.email },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 dark:text-gray-400 w-16 shrink-0">{label}</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value || '—'}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400 w-16 shrink-0">Role</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            user?.role === 'admin'
                                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                            {user?.role === 'admin' && <Shield className="w-3 h-3" />}
                            {user?.role}
                        </span>
                    </div>
                </div>
            </div>

            {/* Change password */}
            <div className="data-card">
                <div className="flex items-center gap-2 mb-5">
                    <KeyRound className="w-4 h-4 text-gray-500" />
                    <h2 className="section-title">เปลี่ยนรหัสผ่าน</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="form-label">รหัสผ่านปัจจุบัน</label>
                        <div className="relative">
                            <input type={show.current ? 'text' : 'password'} autoComplete="current-password"
                                className="form-input pr-10" value={form.currentPassword}
                                onChange={e => setForm({ ...form, currentPassword: e.target.value })} required />
                            <TogglePassword show={show.current} onToggle={() => setShow(s => ({ ...s, current: !s.current }))} />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">รหัสผ่านใหม่</label>
                        <div className="relative">
                            <input type={show.newPwd ? 'text' : 'password'} autoComplete="new-password"
                                placeholder="อย่างน้อย 8 ตัวอักษร"
                                className="form-input pr-10" value={form.newPassword}
                                onChange={e => setForm({ ...form, newPassword: e.target.value })} required />
                            <TogglePassword show={show.newPwd} onToggle={() => setShow(s => ({ ...s, newPwd: !s.newPwd }))} />
                        </div>
                        <PasswordStrength password={form.newPassword} />
                    </div>

                    <div>
                        <label className="form-label">ยืนยันรหัสผ่านใหม่</label>
                        <div className="relative">
                            <input type={show.confirm ? 'text' : 'password'} autoComplete="new-password"
                                className={`form-input pr-10 ${form.confirmPassword && !passwordsMatch ? 'border-red-400 focus:ring-red-300' : ''}`}
                                value={form.confirmPassword}
                                onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required />
                            <TogglePassword show={show.confirm} onToggle={() => setShow(s => ({ ...s, confirm: !s.confirm }))} />
                        </div>
                        {form.confirmPassword && !passwordsMatch && (
                            <p className="text-xs text-red-500 mt-1">รหัสผ่านไม่ตรงกัน</p>
                        )}
                    </div>

                    {error && (
                        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white
                            bg-blue-600 hover:bg-blue-700 active:scale-95
                            disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">
                        {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <KeyRound className="w-4 h-4" />}
                        บันทึกรหัสผ่านใหม่
                    </button>
                </form>
            </div>
        </div>
    );
}
