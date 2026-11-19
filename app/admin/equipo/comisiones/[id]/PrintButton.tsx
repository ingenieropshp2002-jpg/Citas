'use client';
import { Icon } from '@/components/ui/Icon';
export function PrintButton() { return <button type="button" onClick={() => window.print()} className="btn-outline btn-sm"><Icon name="print" className="text-[16px]" />Imprimir</button>; }
