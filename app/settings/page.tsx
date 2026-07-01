'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import BackupPanel from '@/components/BackupPanel';

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {}, [status, session]);

    return (
        <div className="max-w-2xl mx-auto space-y-10 font-sarabun">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg dark:bg-gray-700">
                    <Settings className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ตั้งค่าระบบ</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">สำรองและกู้คืนข้อมูล</p>
                </div>
            </div>

            <section>
                <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                    สำรอง / กู้คืนข้อมูล
                </h2>
                <BackupPanel />
            </section>
        </div>
    );
}
