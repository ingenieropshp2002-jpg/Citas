'use client';
import { Icon } from '@/components/ui/Icon';
export function PrintButton() { return <button className="btn-primary btn-sm" onClick={() => window.print()}><Icon name="print" className="text-[18px]" />Imprimir afiche</button>; }
