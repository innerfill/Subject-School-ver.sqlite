'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';

interface ThaiTimePickerProps {
    value: string;
    onChange: (time: string) => void;
}

const SIZE = 240;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUTER = 88;
const R_INNER = 56;

function toXY(angleDeg: number, r: number) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

export default function ThaiTimePicker({ value, onChange }: ThaiTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<'hour' | 'minute'>('hour');
    const [hour, setHour] = useState(8);
    const [minute, setMinute] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const hourRef = useRef(8);
    const minuteRef = useRef(0);
    const initialValue = useRef(value);
    const wrapRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (value) {
            const [h, m] = value.split(':').map(Number);
            const safeH = isNaN(h) ? 8 : h;
            const safeM = isNaN(m) ? 0 : m;
            setHour(safeH);
            setMinute(safeM);
            hourRef.current = safeH;
            minuteRef.current = safeM;
        }
    }, [value]);

    useEffect(() => {
        const fn = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                // clicking outside = cancel → revert to value before picker opened
                if (initialValue.current) {
                    const [h, m] = initialValue.current.split(':').map(Number);
                    setHour(isNaN(h) ? 8 : h);
                    setMinute(isNaN(m) ? 0 : m);
                }
                setIsOpen(false);
                setMode('hour');
            }
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    const pick = useCallback((clientX: number, clientY: number) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const dx = clientX - rect.left - CX;
        const dy = clientY - rect.top - CY;
        let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
        if (angle < 0) angle += 360;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (mode === 'hour') {
            const pos = Math.round(angle / 30) % 12;
            const isInner = dist < (R_OUTER + R_INNER) / 2;
            const h = isInner ? (pos === 0 ? 0 : pos + 12) : (pos === 0 ? 12 : pos);
            setHour(h);
            hourRef.current = h;
        } else {
            const m = Math.round(angle / 6) % 60;
            setMinute(m);
            minuteRef.current = m;
        }
    }, [mode]);

    const onDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        pick(e.clientX, e.clientY);
    };
    const onMove = (e: React.MouseEvent) => {
        if (isDragging) pick(e.clientX, e.clientY);
    };
    const onUp = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        pick(e.clientX, e.clientY);
        if (mode === 'hour') {
            setMode('minute');
        } else {
            // emit immediately using refs (state update is async, refs are sync)
            onChange(`${String(hourRef.current).padStart(2, '0')}:${String(minuteRef.current).padStart(2, '0')}`);
        }
    };

    const handleConfirm = () => {
        onChange(`${String(hourRef.current).padStart(2, '0')}:${String(minuteRef.current).padStart(2, '0')}`);
        setIsOpen(false);
        setMode('hour');
    };

    const handleCancel = () => {
        if (initialValue.current) {
            const [h, m] = initialValue.current.split(':').map(Number);
            const safeH = isNaN(h) ? 8 : h;
            const safeM = isNaN(m) ? 0 : m;
            setHour(safeH); setMinute(safeM);
            hourRef.current = safeH; minuteRef.current = safeM;
            onChange(initialValue.current);
        }
        setIsOpen(false);
        setMode('hour');
    };

    // Hand geometry
    const hourAngle = ((hour % 12) / 12) * 360;
    const isInnerHour = hour === 0 || hour >= 13;
    const hTip = toXY(hourAngle, isInnerHour ? R_INNER : R_OUTER);

    const minAngle = (minute / 60) * 360;
    const mTip = toXY(minAngle, R_OUTER);

    const dH = String(hour).padStart(2, '0');
    const dM = String(minute).padStart(2, '0');

    return (
        <div ref={wrapRef} className="relative">
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => { initialValue.current = value; setIsOpen(v => !v); setMode('hour'); }}
                className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:border-blue-400 dark:hover:border-blue-500 transition-colors w-full"
            >
                <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <span className="font-mono tracking-widest">{dH}:{dM}</span>
                <span className="text-gray-400 dark:text-gray-500 text-xs ml-auto">น.</span>
            </button>

            {/* Clock popup */}
            {isOpen && (
                <div
                    className="absolute left-0 z-[200] mt-1 rounded-3xl shadow-2xl overflow-hidden"
                    style={{ width: '280px', background: '#fff' }}
                >
                    {/* Header */}
                    <div className="bg-blue-600 px-6 pt-5 pb-4">
                        <p className="text-blue-200 text-[10px] font-semibold tracking-[0.2em] uppercase mb-2">เลือกเวลา</p>
                        <div className="flex items-end gap-1">
                            <button
                                type="button"
                                onClick={() => setMode('hour')}
                                className={`text-[52px] leading-none font-light px-2 py-1 rounded-xl transition-colors ${mode === 'hour' ? 'text-white bg-white/20' : 'text-blue-300 hover:text-white'}`}
                            >
                                {dH}
                            </button>
                            <span className="text-[52px] leading-none font-light text-white pb-1">:</span>
                            <button
                                type="button"
                                onClick={() => setMode('minute')}
                                className={`text-[52px] leading-none font-light px-2 py-1 rounded-xl transition-colors ${mode === 'minute' ? 'text-white bg-white/20' : 'text-blue-300 hover:text-white'}`}
                            >
                                {dM}
                            </button>
                            <span className="text-base text-blue-200 ml-2 mb-2">น.</span>
                        </div>
                    </div>

                    {/* Clock face */}
                    <div style={{ background: '#f3f4f6' }} className="flex justify-center py-5">
                        <svg
                            ref={svgRef}
                            width={SIZE}
                            height={SIZE}
                            className="cursor-pointer select-none"
                            onMouseDown={onDown}
                            onMouseMove={onMove}
                            onMouseUp={onUp}
                            onMouseLeave={() => setIsDragging(false)}
                        >
                            {/* Clock background */}
                            <circle cx={CX} cy={CY} r={CX - 4} fill="#e5e7eb" />

                            {mode === 'hour' ? (
                                <>
                                    {/* Hand */}
                                    <line x1={CX} y1={CY} x2={hTip.x} y2={hTip.y} stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                                    <circle cx={CX} cy={CY} r="5" fill="#2563eb" />
                                    <circle cx={hTip.x} cy={hTip.y} r="19" fill="#2563eb" />

                                    {/* Outer: 1–12 */}
                                    {Array.from({ length: 12 }, (_, i) => {
                                        const h = i === 0 ? 12 : i;
                                        const p = toXY((i / 12) * 360, R_OUTER);
                                        const sel = hour === h;
                                        return (
                                            <text key={h} x={p.x} y={p.y}
                                                textAnchor="middle" dominantBaseline="central"
                                                fontSize="14" fontWeight={sel ? '700' : '400'}
                                                fill={sel ? 'white' : '#111827'}>
                                                {h}
                                            </text>
                                        );
                                    })}

                                    {/* Inner: 0, 13–23 */}
                                    {Array.from({ length: 12 }, (_, i) => {
                                        const h = i === 0 ? 0 : i + 12;
                                        const p = toXY((i / 12) * 360, R_INNER);
                                        const sel = hour === h;
                                        return (
                                            <text key={`i${h}`} x={p.x} y={p.y}
                                                textAnchor="middle" dominantBaseline="central"
                                                fontSize="11" fontWeight={sel ? '700' : '400'}
                                                fill={sel ? 'white' : '#6b7280'}>
                                                {String(h).padStart(2, '0')}
                                            </text>
                                        );
                                    })}
                                </>
                            ) : (
                                <>
                                    {/* Hand */}
                                    <line x1={CX} y1={CY} x2={mTip.x} y2={mTip.y} stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                                    <circle cx={CX} cy={CY} r="5" fill="#2563eb" />
                                    <circle cx={mTip.x} cy={mTip.y} r="19" fill="#2563eb" />

                                    {/* Labels: 00, 05, 10 … 55 */}
                                    {Array.from({ length: 12 }, (_, i) => {
                                        const m = i * 5;
                                        const p = toXY((m / 60) * 360, R_OUTER);
                                        const sel = minute === m;
                                        return (
                                            <text key={m} x={p.x} y={p.y}
                                                textAnchor="middle" dominantBaseline="central"
                                                fontSize="14" fontWeight={sel ? '700' : '400'}
                                                fill={sel ? 'white' : '#111827'}>
                                                {String(m).padStart(2, '0')}
                                            </text>
                                        );
                                    })}

                                    {/* Dots for non-5 minutes */}
                                    {Array.from({ length: 60 }, (_, m) => {
                                        if (m % 5 === 0) return null;
                                        const p = toXY((m / 60) * 360, R_OUTER);
                                        const sel = minute === m;
                                        return (
                                            <circle key={m} cx={p.x} cy={p.y}
                                                r={sel ? 5 : 2}
                                                fill={sel ? '#2563eb' : '#9ca3af'} />
                                        );
                                    })}
                                </>
                            )}
                        </svg>
                    </div>

                    {/* Mode hint */}
                    <div style={{ background: '#f3f4f6' }} className="flex justify-center pb-1">
                        <p className="text-xs text-gray-400">
                            {mode === 'hour' ? 'กดเลือกชั่วโมง' : 'กดเลือกนาที'}
                        </p>
                    </div>

                    {/* Actions */}
                    <div style={{ background: '#f3f4f6' }} className="flex justify-end gap-2 px-5 pb-4">
                        <button type="button" onClick={handleCancel}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                            ยกเลิก
                        </button>
                        <button type="button" onClick={handleConfirm}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                            ตกลง
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
