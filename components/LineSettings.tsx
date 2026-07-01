'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import { MessageSquare, Eye, EyeOff, CheckCircle, XCircle, Loader2, Save, FlaskConical } from 'lucide-react';

export default function LineSettings() {
    const { showToast } = useToast();

    const [token, setToken] = useState('');
    const [groupId, setGroupId] = useState('');
    const [showToken, setShowToken] = useState(false);
    const [tokenIsSet, setTokenIsSet] = useState(false);
    const [groupIsSet, setGroupIsSet] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        fetch('/api/settings')
            .then(r => r.json())
            .then(data => {
                setTokenIsSet(data.line_channel_access_token?.is_set ?? false);
                setGroupIsSet(data.line_group_id?.is_set ?? false);
                setGroupId(data.line_group_id?.is_set ? data.line_group_id.value : '');
            })
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const body: Record<string, string> = {};
            if (token.trim()) body.line_channel_access_token = token.trim();
            if (groupId.trim()) body.line_group_id = groupId.trim();
            if (Object.keys(body).length === 0) { showToast('ไม่มีข้อมูลที่ต้องบันทึก', 'error'); return; }
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('บันทึกล้มเหลว');
            showToast('บันทึกสำเร็จ', 'success');
            setToken('');
            if (token.trim()) setTokenIsSet(true);
            if (groupId.trim()) setGroupIsSet(true);
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            const res = await fetch('/api/notify/line?test=1', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'ทดสอบล้มเหลว');
            showToast(data.message || 'ส่ง test message สำเร็จ', 'success');
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setTesting(false);
        }
    };

    const StatusBadge = ({ isSet }: { isSet: boolean }) => isSet
        ? <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><CheckCircle className="w-3.5 h-3.5" />ตั้งค่าแล้ว</span>
        : <span className="flex items-center gap-1 text-xs text-gray-400"><XCircle className="w-3.5 h-3.5" />ยังไม่ตั้งค่า</span>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-500" />
                <h2 className="font-semibold text-gray-800 dark:text-gray-100">ตั้งค่า LINE Notification</h2>
            </div>
            <div className="p-5 space-y-5">
                {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                ) : (
                    <>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Channel Access Token</label>
                                <StatusBadge isSet={tokenIsSet} />
                            </div>
                            <div className="relative">
                                <input
                                    type={showToken ? 'text' : 'password'}
                                    value={token}
                                    onChange={e => setToken(e.target.value)}
                                    placeholder={tokenIsSet ? 'พิมพ์ token ใหม่เพื่อเปลี่ยน' : 'วาง Channel Access Token ที่นี่'}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-10 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                />
                                <button type="button" onClick={() => setShowToken(!showToken)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-gray-400">ดูได้ที่ LINE Developers Console → Messaging API → Channel access token</p>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">LINE Group ID</label>
                                <StatusBadge isSet={groupIsSet} />
                            </div>
                            <input
                                type="text"
                                value={groupId}
                                onChange={e => setGroupId(e.target.value)}
                                placeholder="C xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            />
                            <p className="mt-1 text-xs text-gray-400">Group ID ขึ้นต้นด้วย C — ดูได้จาก webhook event หรือ LINE Bot SDK</p>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                            <button onClick={handleSave} disabled={saving || (!token.trim() && !groupId.trim())}
                                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                บันทึก
                            </button>
                            <button onClick={handleTest} disabled={testing || (!tokenIsSet && !token.trim())}
                                className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors">
                                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                                ทดสอบการเชื่อมต่อ
                            </button>
                        </div>

                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                            <p className="font-semibold">วิธีหา Group ID:</p>
                            <ol className="list-decimal list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
                                <li>เพิ่ม LINE Bot เข้ากลุ่ม</li>
                                <li>ส่งข้อความใดก็ได้ในกลุ่ม</li>
                                <li>ดู webhook log — field <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">source.groupId</code></li>
                            </ol>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
