import Link from 'next/link';
import { Empty } from '@/components/ui/Empty';
export default function NotFound() { return <main className="min-h-screen flex items-center justify-center"><Empty icon="explore_off" title="No encontramos esta página" action={<Link href="/" className="btn-primary">Ir al inicio</Link>} /></main>; }
