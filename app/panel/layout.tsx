import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/panel/Sidebar';
import { lowStock } from '@/lib/inventory';
import Link from 'next/link';
import { subscriptionState } from '@/lib/subscription';
import { getSettings } from '@/lib/settings';

export async function generateMetadata() { const s = await getSettings(); return { title: { default: 'Panel', template: `%s · Panel · ${s.appName}` } }; }
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login?next=/panel');
  let business = await db.business.findFirst({ where: { ownerId: user.id } });
  let perms: string[] | 'ALL' = 'ALL';
  if (!business) {
    const st = await db.staff.findUnique({ where: { userId: user.id }, include: { business: true } });
    if (st) { business = st.business; perms = JSON.parse(st.permissions); }
  }
  if (!business) return <>{children}</>; // /panel/registro: crear negocio
  const low = (await lowStock(business.id)).length;
  const sub = subscriptionState(business);
  return (
    <div className="min-h-screen bg-surface-container-low/60 dark:bg-surface">
      <Sidebar business={{ name: business.name, slug: business.slug, plan: business.plan }} user={{ name: user.name, avatar: user.avatar }} perms={perms} lowStock={low} />
      <div className="lg:pl-64 pt-14 lg:pt-0">{sub.state === 'PRUEBA' && <div className="bg-secondary-fixed/60 text-on-secondary-fixed px-margin py-2 font-label-md text-center">Prueba gratis: te quedan {sub.daysLeft} {sub.daysLeft === 1 ? 'día' : 'días'}, sin tarjeta. <Link href="/panel/suscripcion" className="underline font-bold">Ver planes</Link></div>}<main className="p-margin md:p-margin-tablet xl:px-margin-desktop max-w-[1500px] mx-auto">{children}</main></div>
    </div>
  );
}
