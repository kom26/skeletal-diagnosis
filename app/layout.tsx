import type { Metadata, Viewport } from 'next';
import { ABeeZee, DM_Sans } from 'next/font/google';
import './globals.css';

const abeeZee = ABeeZee({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'SKELÉ — AI骨格診断',
  description: '写真1枚からAIが骨格タイプ（ストレート・ウェーブ・ナチュラル）を診断します',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body
        className={`${abeeZee.variable} ${dmSans.variable} font-sans antialiased`}
        style={{ backgroundColor: '#FFF7F9', minHeight: '100vh' }}
      >
        {children}
      </body>
    </html>
  );
}
