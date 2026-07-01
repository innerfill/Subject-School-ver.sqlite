'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import ThaiTimePicker from '@/components/ThaiTimePicker';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';

interface TimeSlot {
    id: number;
    order_index: number;
    start_time: string;
    end_time: string;
    type: string;
}

export default function TimeSlotsPage() {
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        order_index: 1, start_time: '08:00', end_time: '09:00', type: 'Study'
    });
    const { showToast } = useToast();
    const confirm = useConfirm();

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSlots();
    }, []);

    const fetchSlots = async () => {
        try {
            const res = await fetch(`/api/time-slots?_t=${new Date().getTime()}`);
            const data = await res.json();
            setSlots(data);
            const maxOrder = data.length > 0 ? Math.max(...data.map((s: TimeSlot) => s.order_index)) : 0;
            setFormData(prev => ({ ...prev, order_index: maxOrder + 1 }));
        } catch (error) {
            console.error('Failed to fetch slots', error);
            showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (formData.start_time >= formData.end_time) {
            showToast('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น', 'error');
            return;
        }
        try {
            const res = await fetch('/api/time-slots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setFormData(prev => ({
                    order_index: prev.order_index + 1,
                    start_time: prev.end_time,
                    end_time: incrementHour(prev.end_time),
                    type: 'Study'
                }));
                fetchSlots();
                showToast('เพิ่มคาบเรียนสำเร็จ', 'success');
            } else {
                const data = await res.json();
                setError(data.error);
                showToast(data.error || 'Failed to create slot', 'error');
            }
        } catch (error) {
            console.error('Failed to create slot', error);
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        }
    };

    const incrementHour = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const handleDelete = async (id: number) => {
        if (!id) return;

        const isConfirmed = await confirm('คุณต้องการลบข้อมูลคาบเรียนนี้ใช่หรือไม่?');
        if (!isConfirmed) return;

        try {
            const res = await fetch(`/api/time-slots?id=${id}`, { method: 'DELETE' });

            if (!res.ok) {
                const data = await res.json();
                showToast(data.error || 'Failed to delete slot', 'error');
                return;
            }

            await fetchSlots();
            showToast('ลบคาบเรียนสำเร็จ', 'success');
        } catch (error) {
            console.error('Failed to delete slot', error);
            showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + (error as Error).message, 'error');
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="page-title">ตั้งค่าคาบเรียน</h1>

            <div className="data-card">
                <h2 className="section-title mb-4">เพิ่มคาบเรียน</h2>
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm border border-red-200 dark:border-red-800">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
                    <div className="w-24">
                        <label className="form-label">ลำดับที่</label>
                        <input
                            type="number"
                            readOnly
                            className="form-input bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 cursor-default"
                            value={formData.order_index}
                        />
                    </div>
                    <div className="w-40">
                        <label className="form-label">เวลาเริ่ม</label>
                        <ThaiTimePicker
                            value={formData.start_time}
                            onChange={(time) => setFormData({ ...formData, start_time: time })}
                        />
                    </div>
                    <div className="w-40">
                        <label className="form-label">เวลาสิ้นสุด</label>
                        <ThaiTimePicker
                            value={formData.end_time}
                            onChange={(time) => setFormData({ ...formData, end_time: time })}
                        />
                    </div>
                    <div className="w-40">
                        <label className="form-label">ประเภท</label>
                        <select
                            className="form-select"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="Study">เรียน</option>
                            <option value="Break">พัก</option>
                            <option value="Assembly">เข้าแถว</option>
                            <option value="Homeroom">โฮมรูม</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" /> เพิ่ม
                    </button>
                </form>
            </div>

            <div className="data-table-container">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="table-th">คาบที่</th>
                            <th className="table-th">เวลา</th>
                            <th className="table-th">ประเภท</th>
                            <th className="table-th-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center">
                                    <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                                        <div className="loading-spinner"></div>
                                        <span className="text-sm">กำลังโหลดข้อมูล...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : slots.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">ยังไม่มีข้อมูลคาบเรียน</td></tr>
                        ) : (
                            (() => {
                                const maxOrder = Math.max(...slots.map(s => s.order_index));
                                let periodNum = 0;
                                return slots.map((slot) => {
                                    const isStudy = slot.type === 'Study';
                                    if (isStudy) periodNum++;
                                    const isLast = slot.order_index === maxOrder;
                                    const typeLabel = slot.type === 'Study' ? 'เรียน'
                                        : slot.type === 'Break' ? 'พัก'
                                        : slot.type === 'Assembly' ? 'เข้าแถว'
                                        : 'โฮมรูม';
                                    return (
                                        <tr key={slot.id} className={`transition-colors duration-100 ${!isStudy ? 'bg-gray-50/80 dark:bg-gray-700/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                                            <td className="table-td-primary">
                                                {isStudy
                                                    ? <span>คาบที่ {periodNum}</span>
                                                    : <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
                                                }
                                            </td>
                                            <td className="table-td">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</td>
                                            <td className="table-td">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    isStudy ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                                    'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {typeLabel}
                                                </span>
                                            </td>
                                            <td className="table-td-right">
                                                <div className="flex justify-end">
                                                    {isLast ? (
                                                        <button
                                                            onClick={() => handleDelete(slot.id)}
                                                            className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <Trash2 className="w-4 h-4 text-gray-200 dark:text-gray-700" />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                });
                            })()
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
