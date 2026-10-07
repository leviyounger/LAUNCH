import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentorship Tracker',
  description: 'Weekly numbers for TikTok Mentorship members, mentored by Levi Younger.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
