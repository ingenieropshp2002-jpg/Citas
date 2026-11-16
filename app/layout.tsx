import './globals.css';
import type { Metadata, Viewport } from 'next';
import { PwaRegister } from '@/components/ui/PwaRegister';
import { getSettings } from '@/lib/settings';
import { getImpersonator, getUser } from '@/lib/auth';
import { stopImpersonationAction } from '@/app/admin/actions';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { default: s.appName, template: `%s · ${s.appName}` },
    description: s.tagline,
    applicationName: s.appName,
    manifest: '/manifest.webmanifest',
    icons: { icon: [{ url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' }, { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: '/icons/apple-touch-icon.png' },
    appleWebApp: { capable: true, title: s.appName, statusBarStyle: 'default' },
    formatDetection: { telephone: false }
  };
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0d2538' };

const themeScript = `try{var t=localStorage.getItem('rc-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const admin = await getImpersonator();
  const as = admin ? await getUser() : null;
  return (
    <html lang="es-CO" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap" rel="stylesheet" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-surface font-sans text-body-md text-on-surface min-h-screen antialiased">
        {admin && as && <form action={stopImpersonationAction} className="fixed bottom-24 md:bottom-4 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-full bg-[#7c2d12] text-white shadow-raised font-label-md text-label-md"><span>Viendo como <b>{as.name}</b></span><button className="h-8 px-3 rounded-full bg-white text-[#7c2d12] font-bold">Volver a superadmin</button></form>}
        {s.announcement && <div className="relative z-[60] bg-secondary-fixed text-on-secondary-fixed px-margin py-2 text-center font-label-md text-label-md">{s.announcement}</div>}
        {children}<PwaRegister /></body>
    </html>
  );
}
