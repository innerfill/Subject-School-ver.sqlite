import type { Metadata } from "next";
import { Inter, Sarabun } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { ConfirmProvider } from "@/components/ConfirmProvider";

const inter = Inter({ subsets: ["latin"] });
const sarabun = Sarabun({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-sarabun',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "School Scheduler",
  description: "Class Scheduling System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${sarabun.variable} font-sarabun bg-gray-50 min-h-screen text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-200`}>
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              <Navbar />
              <main className="container mx-auto px-4 py-6 sm:px-6 lg:px-8 print:!p-0 print:!max-w-none print:!m-0">
                {children}
              </main>
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
