'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Calendar, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';

type Tab = 'login' | 'register';

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

const USERNAME_RE = /^[a-z0-9_]{4,30}$/;

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

export default function LoginPage() {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('login');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');

    const [login, setLogin] = useState({ identifier: '', password: '' });
    const [reg, setReg] = useState({ name: '', username: '', email: '', password: '', confirmPassword: '' });

    const usernameValid = !reg.username || USERNAME_RE.test(reg.username);
    const passwordsMatch = !reg.confirmPassword || reg.password === reg.confirmPassword;

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        setError('');
        await signIn('google', { callbackUrl: '/' });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await signIn('credentials', {
            identifier: login.identifier,
            password: login.password,
            redirect: false,
        });
        setLoading(false);
        if (result?.error) {
            setError('username/อีเมล หรือรหัสผ่านไม่ถูกต้อง');
        } else {
            router.push('/');
            router.refresh();
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!passwordsMatch) { setError('รหัสผ่านไม่ตรงกัน'); return; }
        if (!usernameValid) { setError('username ไม่ถูกต้อง'); return; }
        setLoading(true);

        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reg),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'สมัครสมาชิกไม่สำเร็จ'); setLoading(false); return; }

        // auto sign-in after register
        const result = await signIn('credentials', {
            identifier: reg.username,
            password: reg.password,
            redirect: false,
        });
        setLoading(false);
        if (result?.error) {
            setError('สมัครสำเร็จ — กรุณาเข้าสู่ระบบ');
            setTab('login');
        } else {
            router.push('/');
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 font-sarabun">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/40">
                    <Calendar className="w-7 h-7 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">ระบบจัดตารางเรียน</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">School Scheduler</p>
                </div>
            </div>

            {/* Card */}
            <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/30 overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-gray-100 dark:border-gray-700">
                    {(['login', 'register'] as Tab[]).map(t => (
                        <button key={t} type="button"
                            onClick={() => { setTab(t); setError(''); }}
                            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                                tab === t
                                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                        >
                            {t === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
                        </button>
                    ))}
                </div>

                <div className="p-6 space-y-4">
                    {tab === 'login' ? (
                        /* ── Login Form ── */
                        <form onSubmit={handleLogin} className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Username หรืออีเมล</label>
                                <input type="text" autoComplete="username" placeholder="username หรือ email"
                                    className="form-input" value={login.identifier}
                                    onChange={e => setLogin({ ...login, identifier: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">รหัสผ่าน</label>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                                        placeholder="••••••••" className="form-input pr-10"
                                        value={login.password}
                                        onChange={e => setLogin({ ...login, password: e.target.value })} required />
                                    <button type="button" tabIndex={-1}
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            {error && <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>}
                            <button type="submit" disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white
                                    bg-blue-600 hover:bg-blue-700 active:scale-[0.98]
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    transition-all shadow-sm shadow-blue-200 dark:shadow-blue-900/30 mt-1">
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                เข้าสู่ระบบ
                            </button>
                        </form>
                    ) : (
                        /* ── Register Form ── */
                        <form onSubmit={handleRegister} className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">ชื่อ-นามสกุล</label>
                                <input type="text" autoComplete="name" placeholder="เช่น สมชาย ใจดี"
                                    className="form-input" value={reg.name}
                                    onChange={e => setReg({ ...reg, name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Username</label>
                                <input type="text" autoComplete="username" placeholder="เช่น teacher01"
                                    className={`form-input font-mono ${reg.username && !usernameValid ? 'border-red-400 focus:ring-red-300' : ''}`}
                                    value={reg.username}
                                    onChange={e => setReg({ ...reg, username: e.target.value.toLowerCase() })} required />
                                {reg.username && !usernameValid && (
                                    <p className="text-xs text-red-500 mt-1">4-30 ตัว ใช้ได้เฉพาะ a-z 0-9 และ _</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">อีเมล</label>
                                <input type="email" autoComplete="email" placeholder="your@email.com"
                                    className="form-input" value={reg.email}
                                    onChange={e => setReg({ ...reg, email: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">รหัสผ่าน</label>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                                        placeholder="อย่างน้อย 8 ตัวอักษร" className="form-input pr-10"
                                        value={reg.password}
                                        onChange={e => setReg({ ...reg, password: e.target.value })} required />
                                    <button type="button" tabIndex={-1}
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <PasswordStrength password={reg.password} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">ยืนยันรหัสผ่าน</label>
                                <div className="relative">
                                    <input type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
                                        placeholder="••••••••"
                                        className={`form-input pr-10 ${reg.confirmPassword && !passwordsMatch ? 'border-red-400 focus:ring-red-300' : ''}`}
                                        value={reg.confirmPassword}
                                        onChange={e => setReg({ ...reg, confirmPassword: e.target.value })} required />
                                    <button type="button" tabIndex={-1}
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {reg.confirmPassword && !passwordsMatch && (
                                    <p className="text-xs text-red-500 mt-1">รหัสผ่านไม่ตรงกัน</p>
                                )}
                            </div>
                            {error && <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>}
                            <button type="submit" disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white
                                    bg-blue-600 hover:bg-blue-700 active:scale-[0.98]
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    transition-all shadow-sm shadow-blue-200 dark:shadow-blue-900/30 mt-1">
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                สมัครสมาชิก
                            </button>
                        </form>
                    )}
                </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-600 mt-6">
                ระบบจัดตารางเรียน © {new Date().getFullYear()}
            </p>
        </div>
    );
}
