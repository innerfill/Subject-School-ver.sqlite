'use client';

import { useState, useRef } from 'react';
import { Download, Upload, ShieldAlert, DatabaseBackup, AlertTriangle, FileCheck, KeyRound } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function BackupPanel() {
    const [downloading, setDownloading]       = useState(false);
    const [restoreFile, setRestoreFile]       = useState<File | null>(null);
    const [restoreConfirm, setRestoreConfirm] = useState('');
    const [restoring, setRestoring]           = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const res = await fetch('/api/backup');
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            const cd   = res.headers.get('Content-Disposition') || '';
            const name = cd.match(/filename="([^"]+)"/)?.[1] || 'backup.sql';
            const a    = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = name;
            a.click();
            URL.revokeObjectURL(a.href);
            showToast('ดาวน์โหลด backup สำเร็จ', 'success');
        } catch { showToast('สร้าง backup ไม่สำเร็จ', 'error'); }
        finally { setDownloading(false); }
    };

    const handleRestore = async () => {
        if (!restoreFile || restoreConfirm !== 'RESTORE') return;
        setRestoring(true);
        try {
            const form = new FormData();
            form.append('file', restoreFile);
            const res  = await fetch('/api/backup/restore', { method: 'POST', body: form });
            const data = await res.json();
            if (res.ok) {
                showToast('กู้คืนข้อมูลสำเร็จ — กรุณา reload หน้าเว็บ', 'success');
                setRestoreFile(null);
                setRestoreConfirm('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
                showToast(data.error || 'กู้คืนข้อมูลไม่สำเร็จ', 'error');
            }
        } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
        finally { setRestoring(false); }
    };

    const canRestore = restoreFile && restoreConfirm === 'RESTORE';
    const Spinner    = ({ light = true }) => (
        <span className={`w-4 h-4 border-2 rounded-full animate-spin inline-block ${light ? 'border-white/30 border-t-white' : 'border-gray-300 border-t-gray-600'}`} />
    );

    return (
        <div className="space-y-5">

            {/* ── Backup ── */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                {/* header strip */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                    <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40">
                        <DatabaseBackup className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">สำรองข้อมูล</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">ส่งออกไฟล์ฐานข้อมูล SQLite ทั้งหมด</p>
                    </div>
                </div>
                {/* body */}
                <div className="px-5 py-4">
                    <button onClick={handleDownload} disabled={downloading}
                        className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white
                            bg-blue-600 hover:bg-blue-700 active:scale-95
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all shadow-sm shadow-blue-200 dark:shadow-none">
                        {downloading ? <Spinner /> : <Download className="w-4 h-4" />}
                        {downloading ? 'กำลังสร้าง...' : 'ดาวน์โหลด .db'}
                    </button>
                </div>
            </div>

            {/* ── Restore ── */}
            <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-gray-800 overflow-hidden">
                {/* header strip */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20">
                    <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50">
                        <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-red-700 dark:text-red-300">กู้คืนข้อมูล</p>
                        <p className="text-xs text-red-400 dark:text-red-500">Restore จากไฟล์ .db</p>
                    </div>
                </div>

                {/* warning banner */}
                <div className="mx-5 mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                        ข้อมูลปัจจุบัน<strong className="font-semibold">ทั้งหมด</strong>จะถูกแทนที่ด้วยไฟล์ที่เลือก การดำเนินการนี้ย้อนกลับไม่ได้
                    </p>
                </div>

                {/* steps */}
                <div className="px-5 py-5 space-y-5">
                    {/* step 1 */}
                    <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 shrink-0 mt-0.5">
                            <FileCheck className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">เลือกไฟล์ .db</p>
                            <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors
                                ${restoreFile
                                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 bg-gray-50 dark:bg-gray-700/40'
                                }`}>
                                <Upload className={`w-4 h-4 shrink-0 ${restoreFile ? 'text-emerald-500' : 'text-gray-400'}`} />
                                <span className={`text-sm truncate ${restoreFile ? 'text-emerald-700 dark:text-emerald-300 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {restoreFile ? restoreFile.name : 'คลิกเพื่อเลือกไฟล์'}
                                </span>
                                <input ref={fileInputRef} type="file" accept=".db" className="hidden"
                                    onChange={e => { setRestoreFile(e.target.files?.[0] || null); setRestoreConfirm(''); }} />
                            </label>
                        </div>
                    </div>

                    {/* step 2 — shown only after file selected */}
                    <div className={`flex items-start gap-3 transition-all duration-200 ${restoreFile ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 shrink-0 mt-0.5">
                            <KeyRound className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                พิมพ์ <code className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400 font-mono text-xs">RESTORE</code> เพื่อยืนยัน
                            </p>
                            <input type="text" placeholder="RESTORE" value={restoreConfirm}
                                onChange={e => setRestoreConfirm(e.target.value)}
                                className={`form-input font-mono max-w-xs transition-colors ${
                                    restoreConfirm === 'RESTORE'
                                        ? 'border-red-400 dark:border-red-600 focus:ring-red-300'
                                        : ''
                                }`} />
                        </div>
                    </div>

                    {/* action */}
                    <button onClick={handleRestore} disabled={!canRestore || restoring}
                        className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white
                            bg-red-600 hover:bg-red-700 active:scale-95
                            disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
                            transition-all shadow-sm shadow-red-200 dark:shadow-none">
                        {restoring ? <Spinner /> : <ShieldAlert className="w-4 h-4" />}
                        {restoring ? 'กำลังกู้คืน...' : 'กู้คืนข้อมูล'}
                    </button>
                </div>
            </div>
        </div>
    );
}
