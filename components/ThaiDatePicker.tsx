'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface ThaiDatePickerProps {
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    placeholder?: string;
    className?: string;
}

const MONTHS_TH = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function ThaiDatePicker({ value, onChange, placeholder = 'วว/ดด/ปปปป', className = '' }: ThaiDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date()); // For navigation
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value) {
            setCurrentDate(new Date(value));
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const yearBE = date.getFullYear() + 543;
        return `${day}/${month}/${yearBE}`;
    };

    const handleDateClick = (day: number) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        // Adjust for timezone offset to ensure YYYY-MM-DD is correct
        const offsetDate = new Date(newDate.getTime() - (newDate.getTimezoneOffset() * 60000));
        onChange(offsetDate.toISOString().split('T')[0]);
        setIsOpen(false);
    };

    const changeMonth = (delta: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
    };

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8"></div>);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const isSelected = value && new Date(value).getDate() === d && new Date(value).getMonth() === month && new Date(value).getFullYear() === year;
            days.push(
                <button
                    key={d}
                    type="button"
                    onClick={() => handleDateClick(d)}
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm transition-colors ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900/40'}`}
                >
                    {d}
                </button>
            );
        }
        return days;
    };

    return (
        <div className={`relative min-w-[140px] ${className}`} ref={containerRef}>
            <div
                className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 cursor-pointer bg-white dark:bg-gray-700 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`flex-1 text-sm ${!value ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                    {value ? formatDate(value) : placeholder}
                </span>
                <CalendarIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-50 p-4 w-64">
                    <div className="flex justify-between items-center mb-4">
                        <button type="button" onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-600 dark:text-gray-300"><ChevronLeft className="w-4 h-4" /></button>
                        <div className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                            {MONTHS_TH[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
                        </div>
                        <button type="button" onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-600 dark:text-gray-300"><ChevronRight className="w-4 h-4" /></button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => (
                            <div key={d} className="text-xs text-gray-500 dark:text-gray-400 font-medium">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {renderCalendar()}
                    </div>

                    <div className="mt-4 flex justify-between">
                        <button
                            type="button"
                            onClick={() => { onChange(''); setIsOpen(false); }}
                            className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                        >
                            ล้างค่า
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const today = new Date();
                                const offsetDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
                                onChange(offsetDate.toISOString().split('T')[0]);
                                setIsOpen(false);
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                        >
                            วันนี้
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
