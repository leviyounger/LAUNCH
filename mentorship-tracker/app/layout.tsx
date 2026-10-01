import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentorship Tracker',
  description: 'Weekly numbers for Launch Academy mentees.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="field-bg" aria-hidden="true">
          <span className="blob-a" />
          <span className="blob-b" />
          <span className="blob-c" />
        </div>
        {children}
      </body>
    </html>
  );
}
