import type { Metadata } from 'next';
import { Newsreader, Epilogue } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import PageTransition from '@/components/layout/PageTransition';
import { AuthProvider } from '@/context/AuthContext';

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
  // Next.js 14 has no auto fallback-metric overrides for Newsreader yet;
  // disabling silences the build warning at the cost of slightly less
  // CLS mitigation while the font swaps in.
  adjustFontFallback: false,
});

const epilogue = Epilogue({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Gia — Peer-sourced answers for physicians',
  description:
    'Gia turns doctor-to-doctor consultations into a searchable knowledge base. Ask a clinical question, get instant answers sourced from real specialist discussions.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${epilogue.variable}`}>
      <body>
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen">
            <PageTransition>{children}</PageTransition>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
