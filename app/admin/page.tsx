'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, Users, UserCheck, Trash2, ChevronDown, KeyRound, X, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';

interface User {
    id: number;
    name: string;
    username: string | null;
    email: string;
    provider: string;
    role: 'admin' | 'user';
    avatar_url: string | null;
    created_at: string;
}

function RoleBadge({ role }: { role: string }) {
    return role === 'admin'
        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"><Shield className="w-3 h-3" />admin</span>
        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"><Users className="w-3 h-3" />user</span>;
}

function ProviderBadge({ provider }: { provider: string }) {
    return provider === 'google'
        ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">Google</span>
        : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Email</span>;
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { showToast } = useToast();
    const confirm = useConfirm();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [resetTarget, setResetTarget] = useState<User | null>(null);
    const [resetPwd, setResetPwd] = useState('');
    const [showResetPwd, setShowResetPwd] = useState(false);
    const [resetting, setResetting] = useState(false);

    const currentUserRole = (session?.user as any)?.role;
    const currentUserId = (session?.user as any)?.id;

    useEffect(() => {
        if (status === 'loading') return;
        if (currentUserRole !== 'admin') { router.replace('/'); return; }
        fetchUsers();
    }, [status, currentUserRole]);

    const fetchUsers = async () => {
        setLoading(true);
        const res = await fetch('/api/admin/users');
        if (res.ok) setUsers(await res.json());
        setLoading(false);
    };

    const handleRoleChange = async (user: User, newRole: 'admin' | 'user') => {
        const res = await fetch('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: user.id, role: newRole }),
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`เปลี่ยน role ของ ${user.name || user.username} เป็น ${newRole} แล้ว`, 'success');
            fetchUsers();
        } else {
            showToast(data.error || 'เปลี่ยน role ไม่สำเร็จ', 'error');
        }
    };

    const handleResetPassword = async () => {
        if (!resetTarget || resetPwd.length < 8) return;
        setResetting(true);
        const res = await fetch('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset_password', id: resetTarget.id, newPassword: resetPwd }),
        });
        const data = await res.json();
        setResetting(false);
        if (res.ok) {
            showToast(`รีเซ็ตรหัสผ่านของ ${resetTarget.name || resetTarget.username} สำเร็จ`, 'success');
            setResetTarget(null);
            setResetPwd('');
        } else {
            showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
        }
    };

    const handleDelete = async (user: User) => {
        const ok = await confirm(`ลบบัญชี "${user.name || user.username}" (${user.email}) ถาวร?`);
        if (!ok) return;
        const res = await fetch('/api/admin/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: user.id }),
        });
        const data = await res.json();
        if (res.ok) { showToast('ลบบัญชีสำเร็จ', 'success'); fetchUsers(); }
        else showToast(data.error || 'ลบไม่สำเร็จ', 'error');
    };

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const admins = users.filter(u => u.role === 'admin').length;
    const regular = users.filter(u => u.role === 'user').length;

    return (
        <div className="space-y-6 font-sarabun">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 dark:bg-violet-900/40 rounded-xl">
                    <Shield className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                    <h1 className="page-title">Admin Console</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">จัดการบัญชีผู้ใช้งานระบบ</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'ทั้งหมด', value: users.length, icon: <Users className="w-5 h-5" />, color: 'blue' },
                    { label: 'Admin', value: admins, icon: <Shield className="w-5 h-5" />, color: 'violet' },
                    { label: 'User', value: regular, icon: <UserCheck className="w-5 h-5" />, color: 'emerald' },
                ].map(s => (
                    <div key={s.label} className="data-card flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl bg-${s.color}-100 dark:bg-${s.color}-900/30 text-${s.color}-600 dark:text-${s.color}-400`}>
                            {s.icon}
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="data-card overflow-hidden !p-0">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="section-title">รายชื่อผู้ใช้งาน</h2>
                    <span className="text-xs text-gray-400">{users.length} บัญชี</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">ชื่อ / Username</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">อีเมล</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Provider</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Role</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">สมัครเมื่อ</th>
                                <th className="px-4 py-3 w-24" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {users.map(user => {
                                const isSelf = String(user.id) === String(currentUserId);
                                return (
                                    <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${isSelf ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                                        {(user.name || user.username || user.email)[0].toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">{user.name || '—'}</p>
                                                    <p className="text-xs text-gray-400 font-mono">{user.username ? `@${user.username}` : '—'}</p>
                                                </div>
                                            </div>
                                            {isSelf && <span className="text-xs text-blue-500 ml-11">(คุณ)</span>}
                                        </td>
                                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 text-xs">{user.email}</td>
                                        <td className="px-4 py-3.5"><ProviderBadge provider={user.provider} /></td>
                                        <td className="px-4 py-3.5">
                                            {isSelf ? <RoleBadge role={user.role} /> : (
                                                <div className="relative group inline-block">
                                                    <button className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                                                        <RoleBadge role={user.role} />
                                                        <ChevronDown className="w-3 h-3 text-gray-400" />
                                                    </button>
                                                    <div className="absolute left-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 hidden group-hover:block z-10 py-1 overflow-hidden">
                                                        {(['admin', 'user'] as const).filter(r => r !== user.role).map(r => (
                                                            <button key={r} onClick={() => handleRoleChange(user, r)}
                                                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                                                                เปลี่ยนเป็น {r}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-xs text-gray-400">
                                            {new Date(user.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            {!isSelf && (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => { setResetTarget(user); setResetPwd(''); setShowResetPwd(false); }}
                                                        className="p-1.5 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                                        title="รีเซ็ตรหัสผ่าน">
                                                        <KeyRound className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(user)}
                                                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        title="ลบบัญชี">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Reset password modal */}
            {resetTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <KeyRound className="w-4 h-4 text-amber-500" />
                                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">รีเซ็ตรหัสผ่าน</h3>
                            </div>
                            <button onClick={() => setResetTarget(null)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="px-5 py-4 space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                ตั้งรหัสผ่านใหม่ให้ <span className="font-semibold text-gray-900 dark:text-white">{resetTarget.name || resetTarget.username}</span>
                            </p>
                            <div>
                                <label className="form-label">รหัสผ่านใหม่</label>
                                <div className="relative">
                                    <input
                                        type={showResetPwd ? 'text' : 'password'}
                                        autoFocus
                                        placeholder="อย่างน้อย 8 ตัวอักษร"
                                        className="form-input pr-10 font-mono"
                                        value={resetPwd}
                                        onChange={e => setResetPwd(e.target.value)}
                                    />
                                    <button type="button" tabIndex={-1}
                                        onClick={() => setShowResetPwd(!showResetPwd)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showResetPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {resetPwd && resetPwd.length < 8 && (
                                    <p className="text-xs text-red-500 mt-1">ต้องมีอย่างน้อย 8 ตัวอักษร</p>
                                )}
                            </div>
                            <div className="flex gap-2 justify-end pt-1">
                                <button onClick={() => setResetTarget(null)}
                                    className="px-4 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    ยกเลิก
                                </button>
                                <button onClick={handleResetPassword}
                                    disabled={resetPwd.length < 8 || resetting}
                                    className="px-4 py-2 text-sm rounded-lg font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    {resetting ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
