import { ClerkProvider } from '@clerk/nextjs';
import { Barlow_Condensed, Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-barlow-condensed',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
});

export const metadata = {
  title: 'BFE Ops',
  description: 'Black Flag Edge — internal operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${barlowCondensed.variable} ${inter.variable} ${ibmPlexMono.variable}`}>
        <body className="bg-base text-ink font-body antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
