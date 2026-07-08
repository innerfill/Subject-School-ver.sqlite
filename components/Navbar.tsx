'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import {
    Calendar, Users, BookOpen, MapPin, Layers, Database,
    Clock, Lock, ClipboardList, Printer, ChevronDown, Menu,
    Sun, Moon, BarChart2, ClipboardCheck, Settings, ShieldAlert
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function Navbar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

    // Close mobile menu when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    if (pathname.includes('/print')) {
        return null;
    }

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm font-sarabun dark:bg-gray-800 dark:border-gray-700 print:hidden">
            <div className="max-w-screen-xl mx-auto px-4">
                <div className="flex justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                            <Calendar className="h-8 w-8" />
                            <span className="self-center text-xl font-bold whitespace-nowrap text-gray-900 dark:text-white">
                                ระบบจัดตารางเรียน
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden lg:flex items-center space-x-1">

                        {/* Group 1: ข้อมูลพื้นฐาน */}
                        <Dropdown
                            title="ข้อมูลพื้นฐาน"
                            icon={<Database className="w-4 h-4" />}
                            active={['/academic-terms', '/master-data', '/teachers', '/subjects', '/rooms', '/classes', '/time-slots'].includes(pathname)}
                        >
                            <DropdownItem href="/academic-terms" icon={<Clock className="w-4 h-4" />}>ปีการศึกษา</DropdownItem>
                            <DropdownItem href="/master-data" icon={<Database className="w-4 h-4" />}>ข้อมูลทั่วไป</DropdownItem>
                            <DropdownItem href="/teachers" icon={<Users className="w-4 h-4" />}>ข้อมูลครู</DropdownItem>
                            <DropdownItem href="/subjects" icon={<BookOpen className="w-4 h-4" />}>รายวิชา</DropdownItem>
                            <DropdownItem href="/rooms" icon={<MapPin className="w-4 h-4" />}>ห้องเรียน</DropdownItem>
                            <DropdownItem href="/classes" icon={<Layers className="w-4 h-4" />}>ชั้นเรียน</DropdownItem>
                            <DropdownItem href="/time-slots" icon={<Clock className="w-4 h-4" />}>คาบเรียน</DropdownItem>
                        </Dropdown>

                        {/* Group 2: จัดการการสอน */}
                        <Dropdown
                            title="จัดการการสอน"
                            icon={<ClipboardList className="w-4 h-4" />}
                            active={['/course-assignments', '/fixed-activities', '/workload', '/time-structure', '/validate'].includes(pathname)}
                        >
                            <DropdownItem href="/course-assignments" icon={<ClipboardList className="w-4 h-4" />}>มอบหมายงานสอน</DropdownItem>
                            <DropdownItem href="/fixed-activities" icon={<Lock className="w-4 h-4" />}>ล็อกตาราง/กิจกรรม</DropdownItem>
                            <DropdownItem href="/workload" icon={<BarChart2 className="w-4 h-4" />}>ภาระงานสอนครู</DropdownItem>
                            <DropdownItem href="/time-structure" icon={<ClipboardCheck className="w-4 h-4" />}>ตรวจสอบโครงสร้างเวลาเรียน</DropdownItem>
                            <DropdownItem href="/validate" icon={<ShieldAlert className="w-4 h-4" />}>ตรวจตารางชน</DropdownItem>
                        </Dropdown>

                        {/* Direct Links */}
                        <NavItem href="/schedule" icon={<Calendar className="w-4 h-4" />} active={pathname === '/schedule'}>
                            จัดตาราง
                        </NavItem>

                        <NavItem href="/reports" icon={<Printer className="w-4 h-4" />} active={pathname.startsWith('/reports')}>
                            ออกรายงาน
                        </NavItem>


                        <NavItem href="/settings" icon={<Settings className="w-4 h-4" />} active={pathname.startsWith('/settings')}>
                            ตั้งค่า
                        </NavItem>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 ml-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                            aria-label="Toggle Dark Mode"
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center lg:hidden gap-2">
                        {/* Theme Toggle for Mobile */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                            aria-label="Toggle Dark Mode"
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="lg:hidden border-t border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">ข้อมูลพื้นฐาน</div>
                        <MobileNavItem href="/academic-terms">ปีการศึกษา</MobileNavItem>
                        <MobileNavItem href="/master-data">ข้อมูลทั่วไป</MobileNavItem>
                        <MobileNavItem href="/teachers">ข้อมูลครู</MobileNavItem>
                        <MobileNavItem href="/subjects">รายวิชา</MobileNavItem>
                        <MobileNavItem href="/rooms">ห้องเรียน</MobileNavItem>
                        <MobileNavItem href="/classes">ชั้นเรียน</MobileNavItem>
                        <MobileNavItem href="/time-slots">คาบเรียน</MobileNavItem>

                        <div className="border-t border-gray-200 my-2 dark:border-gray-700"></div>
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">จัดการการสอน</div>
                        <MobileNavItem href="/course-assignments">มอบหมายงานสอน</MobileNavItem>
                        <MobileNavItem href="/fixed-activities">ล็อกตาราง</MobileNavItem>
                        <MobileNavItem href="/workload">ภาระงานสอนครู</MobileNavItem>
                        <MobileNavItem href="/time-structure">ตรวจสอบโครงสร้างเวลาเรียน</MobileNavItem>
                        <MobileNavItem href="/validate">ตรวจตารางชน</MobileNavItem>

                        <div className="border-t border-gray-200 my-2 dark:border-gray-700"></div>
                        <MobileNavItem href="/schedule" icon={<Calendar className="w-4 h-4" />}>จัดตาราง</MobileNavItem>
                        <MobileNavItem href="/reports" icon={<Printer className="w-4 h-4" />}>ออกรายงาน</MobileNavItem>
                        <MobileNavItem href="/settings" icon={<Settings className="w-4 h-4" />}>ตั้งค่า</MobileNavItem>
                    </div>
                </div>
            )}
        </nav>
    );
}

function NavItem({ href, icon, children, active }: { href: string, icon: React.ReactNode, children: React.ReactNode, active?: boolean }) {
    return (
        <Link
            href={href}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${active
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400'
                }`}
        >
            {icon}
            {children}
            {active && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
        </Link>
    );
}

function Dropdown({ title, icon, children, active }: { title: string, icon: React.ReactNode, children: React.ReactNode, active?: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none
                    ${active || isOpen
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400'
                    }`}
            >
                {icon}
                {title}
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                {active && !isOpen && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-1 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50 py-1">
                    {children}
                </div>
            )}
        </div>
    );
}

function DropdownItem({ href, icon, children }: { href: string, icon: React.ReactNode, children: React.ReactNode }) {
    const pathname = usePathname();
    const active = pathname === href;
    return (
        <Link
            href={href}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors border-l-2 ${
                active
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400'
            }`}
        >
            <span className={active ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}>{icon}</span>
            {children}
        </Link>
    );
}

function MobileNavItem({ href, icon, children }: { href: string, icon?: React.ReactNode, children: React.ReactNode }) {
    const pathname = usePathname();
    const active = pathname === href;
    return (
        <Link
            href={href}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                active
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
            }`}
        >
            {icon}
            {children}
            {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />}
        </Link>
    );
}
