import { DIAS, parseJson } from '@/lib/format';
export function HoursFields({ prefix, value }: { prefix: string; value: string }) {
  const h = parseJson<Record<string, [string, string] | null>>(value, {});
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5, 6, 0].map(d => (
        <div key={d} className="grid grid-cols-[110px_1fr_1fr] items-center gap-2">
          <label className="flex items-center gap-2 font-label-lg"><input type="checkbox" name={`${prefix}on${d}`} defaultChecked={!!h[String(d)]} className="accent-primary-container" />{DIAS[d].slice(0, 3)}</label>
          <input type="time" name={`${prefix}from${d}`} defaultValue={h[String(d)]?.[0] || '08:00'} className="input !h-10" />
          <input type="time" name={`${prefix}to${d}`} defaultValue={h[String(d)]?.[1] || '18:00'} className="input !h-10" />
        </div>
      ))}
    </div>
  );
}
