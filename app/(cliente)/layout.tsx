import { Suspense } from 'react';
import { BottomNav } from '@/components/cliente/BottomNav';
import { InstallPrompt } from '@/components/ui/InstallPrompt';
export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return <><div className="pb-20 md:pb-0">{children}</div><Suspense><BottomNav /></Suspense><InstallPrompt /></>;
}
