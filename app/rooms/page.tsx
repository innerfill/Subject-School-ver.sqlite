'use client';

import { useState, useEffect, useMemo } from 'react';
import { Trash2, Plus, Edit, MapPin, Search, X, Filter } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';

interface Room {
    id: number;
    name: string;
    type: string;
    capacity: number;
    building_name?: string;
    building_id?: number;
    allow_overlap: number;
}

interface Building { id: number; name: string; }

const ROOM_TYPES = [
    { value: 'Lecture',    label: 'ห้องเรียน',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    { value: 'Lab',        label: 'ปฏิบัติการ',   color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
    { value: 'Gym',        label: 'โรงยิม',        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    { value: 'Auditorium', label: 'หอประชุม',      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
];

const TYPE_MAP = Object.fromEntries(ROOM_TYPES.map(t => [t.value, t]));

const emptyForm = { name: '', type: 'Lecture', capacity: 40 as number | string, building_id: '' as string | number, allow_overlap: false };

export default function RoomsPage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterBuilding, setFilterBuilding] = useState('');
    const { showToast } = useToast();
    const confirm = useConfirm();

    const [addForm, setAddForm] = useState(emptyForm);
    const [editModal, setEditModal] = useState<{ open: boolean; room: Room | null }>({ open: false, room: null });
    const [editForm, setEditForm] = useState(emptyForm);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [roomsRes, buildingsRes] = await Promise.all([
                fetch('/api/rooms'),
                fetch('/api/master-data?type=buildings'),
            ]);
            setRooms(await roomsRes.json());
            setBuildings(await buildingsRes.json());
        } catch {
            showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        let list = rooms;
        if (filterType) list = list.filter(r => r.type === filterType);
        if (filterBuilding) list = list.filter(r => r.building_id?.toString() === filterBuilding);
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(r => r.name.toLowerCase().includes(q) || (r.building_name || '').toLowerCase().includes(q));
        }
        return list;
    }, [rooms, search, filterType, filterBuilding]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(addForm),
        });
        if (res.ok) {
            // preserve building + type for batch entry
            setAddForm(prev => ({ ...emptyForm, building_id: prev.building_id, type: prev.type }));
            fetchData();
            showToast('เพิ่มห้องเรียนสำเร็จ', 'success');
        } else {
            showToast('บันทึกข้อมูลไม่สำเร็จ', 'error');
        }
    };

    const handleEdit = (room: Room) => {
        setEditForm({ name: room.name, type: room.type, capacity: room.capacity, building_id: room.building_id?.toString() || '', allow_overlap: !!room.allow_overlap });
        setEditModal({ open: true, room });
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editModal.room) return;
        const res = await fetch('/api/rooms', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...editForm, id: editModal.room.id }),
        });
        if (res.ok) {
            setEditModal({ open: false, room: null });
            fetchData();
            showToast('บันทึกการแก้ไขสำเร็จ', 'success');
        } else {
            showToast('บันทึกข้อมูลไม่สำเร็จ', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        const isConfirmed = await confirm('คุณต้องการลบห้องเรียนนี้ใช่หรือไม่?');
        if (!isConfirmed) return;
        const res = await fetch(`/api/rooms?id=${id}`, { method: 'DELETE' });
        if (res.ok) { fetchData(); showToast('ลบห้องเรียนสำเร็จ', 'success'); }
        else showToast('ลบข้อมูลไม่สำเร็จ', 'error');
    };

    const hasFilter = search || filterType || filterBuilding;

    return (
        <div className="space-y-6">
            <h1 className="page-title">ห้องเรียน</h1>

            {/* Add Form */}
            <div className="data-card">
                <h2 className="section-title mb-4">เพิ่มห้องเรียนใหม่</h2>
                <form onSubmit={handleAdd} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="form-label">ชื่อห้อง <span className="text-red-500">*</span></label>
                            <input type="text" required className="form-input" placeholder="เช่น ห้อง 101, ห้อง Lab วิทย์"
                                value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">อาคาร</label>
                            <select className="form-select" value={addForm.building_id}
                                onChange={e => setAddForm({ ...addForm, building_id: e.target.value })}>
                                <option value="">เลือกอาคาร</option>
                                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">ประเภท</label>
                            <select className="form-select" value={addForm.type}
                                onChange={e => setAddForm({ ...addForm, type: e.target.value })}>
                                {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">ความจุ (คน)</label>
                            <input type="number" required min="1" className="form-input"
                                value={addForm.capacity} onChange={e => setAddForm({ ...addForm, capacity: e.target.value === '' ? '' : parseInt(e.target.value) })} />
                        </div>
                        <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input type="checkbox" className="w-4 h-4 accent-blue-600 cursor-pointer"
                                    checked={!!addForm.allow_overlap}
                                    onChange={e => setAddForm({ ...addForm, allow_overlap: e.target.checked })} />
                                <span className="text-sm text-gray-700 dark:text-gray-300">อนุญาตใช้ซ้ำในคาบเดียวกัน</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400 dark:text-gray-500">หลัง submit จะคง อาคาร + ประเภท ไว้</p>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">
                            <Plus className="w-4 h-4" /> เพิ่มห้อง
                        </button>
                    </div>
                </form>
            </div>

            {/* Table */}
            <div className="data-table-container">
                {/* filter header */}
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                        <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                        <select className="form-select text-sm md:w-36" value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option value="">ทุกประเภท</option>
                            {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        {buildings.length > 0 && (
                            <select className="form-select text-sm md:w-40" value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)}>
                                <option value="">ทุกอาคาร</option>
                                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        )}
                        {hasFilter && (
                            <button type="button" onClick={() => { setFilterType(''); setFilterBuilding(''); setSearch(''); }}
                                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                                <X className="w-3 h-3" /> ล้างทั้งหมด
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <span className="text-sm text-gray-400 dark:text-gray-500 shrink-0">
                            {loading ? '...' : `${filtered.length} / ${rooms.length} ห้อง`}
                        </span>
                        <div className="relative w-full md:w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="ค้นหาชื่อห้อง / อาคาร" className="form-input pl-9 pr-8 text-sm"
                                value={search} onChange={e => setSearch(e.target.value)} />
                            {search && (
                                <button type="button" onClick={() => setSearch('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="table-th">ชื่อห้อง</th>
                            <th className="table-th">อาคาร</th>
                            <th className="table-th">ประเภท</th>
                            <th className="table-th">ความจุ</th>
                            <th className="table-th">ใช้ซ้ำ</th>
                            <th className="table-th-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center">
                                    <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                                        <div className="loading-spinner"></div>
                                        <span className="text-sm">กำลังโหลดข้อมูล...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
                                        <MapPin className="w-10 h-10 opacity-40" />
                                        <span className="text-sm">{hasFilter ? 'ไม่พบห้องที่ค้นหา' : 'ยังไม่มีข้อมูลห้องเรียน'}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map(room => {
                                const typeInfo = TYPE_MAP[room.type];
                                return (
                                    <tr key={room.id} className="table-row">
                                        <td className="table-td-primary">{room.name}</td>
                                        <td className="table-td">
                                            {room.building_name
                                                ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" />{room.building_name}</span>
                                                : <span className="text-gray-300 dark:text-gray-600">-</span>}
                                        </td>
                                        <td className="table-td">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeInfo?.color || ''}`}>
                                                {typeInfo?.label || room.type}
                                            </span>
                                        </td>
                                        <td className="table-td">
                                            <span className="font-medium">{room.capacity}</span>
                                            <span className="text-xs text-gray-400 ml-1">คน</span>
                                        </td>
                                        <td className="table-td">
                                            {room.allow_overlap
                                                ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">ได้</span>
                                                : <span className="text-gray-300 dark:text-gray-600 text-xs">-</span>}
                                        </td>
                                        <td className="table-td-right flex justify-end gap-3 items-center">
                                            <button onClick={() => handleEdit(room)} title="แก้ไข"
                                                className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(room.id)} title="ลบ"
                                                className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editModal.open && editModal.room && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">แก้ไขห้องเรียน</h2>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{editModal.room.name}</p>
                            </div>
                            <button onClick={() => setEditModal({ open: false, room: null })}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="px-6 py-5 space-y-4">
                            <div>
                                <label className="form-label">ชื่อห้อง <span className="text-red-500">*</span></label>
                                <input type="text" required className="form-input" value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="form-label">อาคาร</label>
                                <select className="form-select" value={editForm.building_id}
                                    onChange={e => setEditForm({ ...editForm, building_id: e.target.value })}>
                                    <option value="">เลือกอาคาร</option>
                                    {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">ประเภท</label>
                                    <select className="form-select" value={editForm.type}
                                        onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                                        {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">ความจุ (คน)</label>
                                    <input type="number" required min="1" className="form-input" value={editForm.capacity}
                                        onChange={e => setEditForm({ ...editForm, capacity: e.target.value === '' ? '' : parseInt(e.target.value) })} />
                                </div>
                            </div>
                            <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                                <input type="checkbox" className="w-4 h-4 accent-blue-600 mt-0.5 shrink-0"
                                    checked={!!editForm.allow_overlap}
                                    onChange={e => setEditForm({ ...editForm, allow_overlap: e.target.checked })} />
                                <div>
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">อนุญาตใช้ซ้ำในคาบเดียวกัน</div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">เหมาะสำหรับสนามกีฬา, โรงยิม ที่หลายกลุ่มใช้พร้อมกันได้</div>
                                </div>
                            </label>
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setEditModal({ open: false, room: null })}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    ยกเลิก
                                </button>
                                <button type="submit"
                                    className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors flex items-center gap-2">
                                    <Edit className="w-4 h-4" /> บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
