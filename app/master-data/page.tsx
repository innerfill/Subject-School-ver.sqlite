'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, Check, Edit, X, Building2, Save, School, Upload } from 'lucide-react';
import { useConfirm } from '@/components/ConfirmProvider';
import { useToast } from '@/components/ToastProvider';

interface MasterData { id: number; name: string;[key: string]: any; }

const GRADE_GROUPS = [
    { label: 'อนุบาล', grades: [{ name: 'อ.1', order_index: 1 }, { name: 'อ.2', order_index: 2 }, { name: 'อ.3', order_index: 3 }] },
    { label: 'ประถมศึกษา', grades: [{ name: 'ป.1', order_index: 4 }, { name: 'ป.2', order_index: 5 }, { name: 'ป.3', order_index: 6 }, { name: 'ป.4', order_index: 7 }, { name: 'ป.5', order_index: 8 }, { name: 'ป.6', order_index: 9 }] },
    { label: 'มัธยมต้น', grades: [{ name: 'ม.1', order_index: 10 }, { name: 'ม.2', order_index: 11 }, { name: 'ม.3', order_index: 12 }] },
    { label: 'มัธยมปลาย', grades: [{ name: 'ม.4', order_index: 13 }, { name: 'ม.5', order_index: 14 }, { name: 'ม.6', order_index: 15 }] },
];

const DEPT_PRESETS = [
    'ปฐมวัย',
    'ภาษาไทย',
    'คณิตศาสตร์',
    'วิทยาศาสตร์และเทคโนโลยี',
    'สังคมศึกษา ศาสนา และวัฒนธรรม',
    'สุขศึกษาและพลศึกษา',
    'ศิลปะ',
    'การงานอาชีพ',
    'ภาษาต่างประเทศ',
    'กิจกรรมพัฒนาผู้เรียน',
];

export default function MasterDataPage() {
    const [grades, setGrades] = useState<MasterData[]>([]);
    const [departments, setDepartments] = useState<MasterData[]>([]);
    const [buildings, setBuildings] = useState<MasterData[]>([]);
    const confirm = useConfirm();
    const { showToast } = useToast();

    const [schoolSettings, setSchoolSettings] = useState({ id: 0, school_name: '', affiliation: '', logo_url: '', table_theme: 'blue' });
    const [savingSchool, setSavingSchool] = useState(false);

    const [buildingForm, setBuildingForm] = useState({ name: '' });
    const [editingBuilding, setEditingBuilding] = useState<{ id: number; name: string } | null>(null);

    const buildingInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        Promise.all([
            fetch('/api/master-data?type=grades').then(r => r.json()),
            fetch('/api/master-data?type=departments').then(r => r.json()),
            fetch('/api/master-data?type=buildings').then(r => r.json()),
            fetch('/api/reports/settings').then(r => r.json()),
        ]).then(([g, d, b, s]) => {
            setGrades(g);
            setDepartments(d);
            setBuildings(b);
            if (s.school) setSchoolSettings(s.school);
        });
    };

    const handleSaveSchool = async () => {
        setSavingSchool(true);
        const res = await fetch('/api/reports/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ school: schoolSettings, signatories: [] }),
        });
        setSavingSchool(false);
        if (res.ok) showToast('บันทึกข้อมูลโรงเรียนสำเร็จ', 'success');
        else showToast('บันทึกไม่สำเร็จ', 'error');
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 512;
                let w = img.width, h = img.height;
                if (w > h && w > MAX_SIZE) { h = Math.round(h * MAX_SIZE / w); w = MAX_SIZE; }
                else if (h > MAX_SIZE) { w = Math.round(w * MAX_SIZE / h); h = MAX_SIZE; }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, w, h);
                    const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.8);
                    setSchoolSettings(prev => ({ ...prev, logo_url: dataUrl }));
                }
            };
            img.src = ev.target?.result as string;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleToggleGrade = async (preset: { name: string; order_index: number }) => {
        const existing = grades.find(g => g.name === preset.name);
        if (existing) {
            const isConfirmed = await confirm(`ปิดระดับชั้น ${preset.name}? ข้อมูลชั้นเรียนที่ผูกอยู่อาจได้รับผลกระทบ`);
            if (!isConfirmed) return;
            const res = await fetch(`/api/master-data?type=grades&id=${existing.id}`, { method: 'DELETE' });
            if (res.ok) { fetchData(); showToast(`ปิด ${preset.name} แล้ว`, 'success'); }
            else showToast('ลบไม่สำเร็จ', 'error');
        } else {
            const res = await fetch('/api/master-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'grades', name: preset.name, order_index: preset.order_index }),
            });
            if (res.ok) { fetchData(); showToast(`เปิด ${preset.name} แล้ว`, 'success'); }
            else showToast('เพิ่มไม่สำเร็จ', 'error');
        }
    };

    const handleToggleDept = async (name: string) => {
        const existing = departments.find(d => d.name === name);
        if (existing) {
            const isConfirmed = await confirm(`ปิดกลุ่มสาระฯ "${name}"? ข้อมูลที่ผูกอยู่อาจได้รับผลกระทบ`);
            if (!isConfirmed) return;
            const res = await fetch(`/api/master-data?type=departments&id=${existing.id}`, { method: 'DELETE' });
            if (res.ok) { fetchData(); showToast(`ปิด ${name} แล้ว`, 'success'); }
            else showToast('ลบไม่สำเร็จ', 'error');
        } else {
            const res = await fetch('/api/master-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'departments', name }),
            });
            if (res.ok) { fetchData(); showToast(`เพิ่ม ${name} แล้ว`, 'success'); }
            else showToast('เพิ่มไม่สำเร็จ', 'error');
        }
    };

    const handleEditBuildingSave = async () => {
        if (!editingBuilding || !editingBuilding.name.trim()) { showToast('กรุณากรอกชื่ออาคาร', 'error'); return; }
        const res = await fetch('/api/master-data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'buildings', ...editingBuilding }),
        });
        if (res.ok) { setEditingBuilding(null); fetchData(); showToast('บันทึกสำเร็จ', 'success'); }
        else showToast('บันทึกไม่สำเร็จ', 'error');
    };

    const handleAdd = async (type: string, data: any, resetForm: () => void, focusRef?: React.RefObject<HTMLInputElement | null>) => {
        if (!data.name?.trim()) { showToast('กรุณากรอกชื่อก่อน', 'error'); return; }
        try {
            const res = await fetch('/api/master-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, ...data }),
            });
            if (res.ok) {
                resetForm();
                fetchData();
                showToast('เพิ่มข้อมูลสำเร็จ', 'success');
                setTimeout(() => focusRef?.current?.focus(), 50);
            } else {
                showToast('บันทึกข้อมูลไม่สำเร็จ', 'error');
            }
        } catch {
            showToast('เกิดข้อผิดพลาด', 'error');
        }
    };

    const handleDelete = async (type: string, id: number) => {
        const isConfirmed = await confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่?');
        if (!isConfirmed) return;
        const res = await fetch(`/api/master-data?type=${type}&id=${id}`, { method: 'DELETE' });
        if (res.ok) { fetchData(); showToast('ลบข้อมูลสำเร็จ', 'success'); }
        else showToast('ลบข้อมูลไม่สำเร็จ', 'error');
    };

    return (
        <div className="space-y-8">
            <h1 className="page-title">ข้อมูลอ้างอิงของโรงเรียน</h1>

            {/* School Settings */}
            <section className="data-card">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                            <School className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="section-title text-blue-600 dark:text-blue-400">ข้อมูลโรงเรียน</h2>
                    </div>
                    <button
                        type="button"
                        onClick={handleSaveSchool}
                        disabled={savingSchool}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                        <Save className="w-3.5 h-3.5" />
                        {savingSchool ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    <div>
                        <label className="form-label">ชื่อโรงเรียน</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="เช่น โรงเรียนบ้านห้วยตาด"
                            value={schoolSettings.school_name}
                            onChange={e => setSchoolSettings({ ...schoolSettings, school_name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="form-label">สังกัด</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="เช่น สพป.เลย เขต 1"
                            value={schoolSettings.affiliation}
                            onChange={e => setSchoolSettings({ ...schoolSettings, affiliation: e.target.value })}
                        />
                    </div>
                </div>
                <div>
                    <label className="form-label">ตราสัญลักษณ์โรงเรียน (Logo)</label>
                    <div className="flex items-center gap-4 mt-1">
                        {schoolSettings.logo_url ? (
                            <img src={schoolSettings.logo_url} alt="Logo" className="w-16 h-16 object-contain border border-gray-200 dark:border-gray-700 rounded-lg bg-white shadow-sm" />
                        ) : (
                            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center">
                                <School className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <input ref={logoInputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handleLogoUpload} />
                            <button
                                type="button"
                                onClick={() => logoInputRef.current?.click()}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors border border-gray-200 dark:border-gray-600"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                อัปโหลดรูป
                            </button>
                            {schoolSettings.logo_url && (
                                <button
                                    type="button"
                                    onClick={() => setSchoolSettings({ ...schoolSettings, logo_url: '' })}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors border border-red-100 dark:border-red-900/30"
                                >
                                    ลบรูป
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">รองรับ .jpg, .png ระบบจะย่อขนาดสูงสุด 512px อัตโนมัติ</p>
                </div>
            </section>

            {/* Grade Levels — toggle */}
            <section className="data-card">
                <div className="mb-4">
                    <h2 className="section-title text-blue-600 dark:text-blue-400">ระดับชั้น</h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">คลิกเพื่อเปิด/ปิดระดับชั้นที่โรงเรียนเปิดสอน</p>
                </div>
                <div className="space-y-4">
                    {GRADE_GROUPS.map(group => {
                        const enabledCount = group.grades.filter(p => grades.some(g => g.name === p.name)).length;
                        return (
                            <div key={group.label}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{group.label}</span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">({enabledCount}/{group.grades.length})</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {group.grades.map(preset => {
                                        const enabled = grades.some(g => g.name === preset.name);
                                        return (
                                            <button
                                                key={preset.name}
                                                type="button"
                                                onClick={() => handleToggleGrade(preset)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                                    enabled
                                                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700'
                                                        : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:text-blue-500'
                                                }`}
                                            >
                                                {enabled && <Check className="w-3 h-3" />}
                                                {preset.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Departments — toggle */}
            <section className="data-card">
                <div className="mb-4">
                    <h2 className="section-title text-indigo-600 dark:text-indigo-400">กลุ่มสาระฯ</h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">คลิกเพื่อเปิด/ปิดกลุ่มสาระที่โรงเรียนเปิดสอน ({departments.length}/{DEPT_PRESETS.length})</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {DEPT_PRESETS.map(name => {
                        const enabled = departments.some(d => d.name === name);
                        return (
                            <button
                                key={name}
                                type="button"
                                onClick={() => handleToggleDept(name)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                    enabled
                                        ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 hover:border-indigo-700'
                                        : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 hover:border-indigo-400 hover:text-indigo-500'
                                }`}
                            >
                                {enabled && <Check className="w-3 h-3 shrink-0" />}
                                {name}
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Buildings */}
            <section className="data-card">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="section-title text-emerald-600 dark:text-emerald-400">อาคารและสถานที่</h2>
                        {buildings.length > 0 && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{buildings.length} อาคาร</p>}
                    </div>
                </div>
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        handleAdd('buildings', buildingForm, () => setBuildingForm({ name: '' }), buildingInputRef);
                    }}
                    className="flex gap-3 mb-5 items-end flex-wrap"
                >
                    <div className="flex-1 min-w-[160px]">
                        <label className="form-label">ชื่ออาคาร</label>
                        <input
                            ref={buildingInputRef}
                            placeholder="เช่น อาคาร 1, โรงยิม"
                            className="form-input"
                            value={buildingForm.name}
                            onChange={e => setBuildingForm({ ...buildingForm, name: e.target.value })}
                        />
                    </div>
                    <button type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium transition-colors">
                        <Plus className="w-4 h-4" /> เพิ่ม
                    </button>
                </form>

                {buildings.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-gray-300 dark:text-gray-600">
                        <Building2 className="w-10 h-10" />
                        <p className="text-sm text-gray-400 dark:text-gray-500">ยังไม่มีอาคาร</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {buildings.map(b => (
                            <div key={b.id} className="group border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                                {editingBuilding?.id === b.id ? (
                                    /* inline edit mode */
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 space-y-2">
                                        <input
                                            autoFocus
                                            className="form-input text-sm"
                                            value={editingBuilding.name}
                                            onChange={e => setEditingBuilding({ ...editingBuilding, name: e.target.value })}
                                            onKeyDown={e => { if (e.key === 'Enter') handleEditBuildingSave(); if (e.key === 'Escape') setEditingBuilding(null); }}
                                            placeholder="ชื่ออาคาร"
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <button type="button" onClick={() => setEditingBuilding(null)}
                                                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <X className="w-3 h-3" /> ยกเลิก
                                            </button>
                                            <button type="button" onClick={handleEditBuildingSave}
                                                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                                                <Check className="w-3 h-3" /> บันทึก
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* display mode */
                                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                                            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{b.name}</div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button type="button"
                                                onClick={() => setEditingBuilding({ id: b.id, name: b.name })}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors">
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button type="button"
                                                onClick={() => handleDelete('buildings', b.id)}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
