export function StateChip({ state }: { state: 'PRUEBA' | 'ACTIVA' | 'VENCIDA' }) {
  const m = { PRUEBA: ['En prueba', 'bg-secondary-fixed/60 text-on-secondary-fixed'], ACTIVA: ['Activo', 'bg-[#D1FAE5] text-[#065F46]'], VENCIDA: ['Vencido', 'bg-[#FFE4E6] text-[#9F1239]'] }[state];
  return <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold whitespace-nowrap ${m[1]}`}>{m[0]}</span>;
}
