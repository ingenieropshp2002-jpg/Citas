'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { importProducts, type ImportRow } from '@/app/admin/_actions/inventory';

const COLS: Record<string, keyof ImportRow> = {
  nombre: 'nombre', producto: 'nombre', descripcion: 'descripcion', precio: 'precio', 'precio venta': 'precio', 'precio de venta': 'precio', valor: 'precio',
  cantidad: 'cantidad', stock: 'cantidad', existencias: 'cantidad', unidades: 'cantidad', costo: 'costo', 'precio compra': 'costo', categoria: 'categoria', marca: 'marca',
  sku: 'sku', codigo: 'sku', referencia: 'sku', 'codigo de barras': 'codigo_barras', codigo_barras: 'codigo_barras', ean: 'codigo_barras', iva: 'iva'
};
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
// Números colombianos: "$ 35.000" → 35000; "35000,50" → 35000.5
const money = (s: string) => { const t = s.replace(/[^\d.,-]/g, ''); if (!t) return NaN; const c = t.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'); return Number(c); };

function parseCsv(text: string): string[][] {
  const first = text.split(/\r?\n/)[0] || '';
  const sep = (first.match(/;/g)?.length || 0) > (first.match(/,/g)?.length || 0) ? ';' : first.includes('\t') ? '\t' : ',';
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true; else if (ch === sep) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}

export function Importer() {
  const [rows, setRows] = useState<ImportRow[]>([]); const [unknown, setUnknown] = useState<string[]>([]);
  const [res, setRes] = useState<{ created: number; updated: number; errors: string[] } | null>(null); const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  function load(text: string) {
    setRes(null); setErr('');
    const data = parseCsv(text.replace(/^﻿/, ''));
    if (data.length < 2) { setErr('El archivo necesita una fila de títulos y al menos un producto.'); setRows([]); return; }
    const head = data[0].map(h => COLS[norm(h)]);
    setUnknown(data[0].filter((h, i) => !head[i] && h.trim()));
    if (!head.includes('nombre')) { setErr('No encontré la columna "nombre". Revisa los títulos de la primera fila.'); setRows([]); return; }
    setRows(data.slice(1).map(r => { const o: any = {}; head.forEach((k, i) => { if (!k) return; const v = (r[i] || '').trim(); if (!v) return; o[k] = ['precio', 'costo', 'cantidad', 'iva'].includes(k) ? money(v) : v; }); return o as ImportRow; }).filter(r => r.nombre));
  }
  const template = 'data:text/csv;charset=utf-8,' + encodeURIComponent('﻿nombre;precio;cantidad;costo;categoria;marca;sku;codigo de barras;descripcion\nShampoo hidratante 400 ml;45000;12;25000;Cuidado capilar;L\'Oréal;;7701234567890;Para cabello seco\nCera para peinar;32000;8;15000;Barbería;Reuzel;;;Fijación media\n');
  return (
    <div className="space-y-4">
      <section className="card p-5">
        <h2 className="h-section mb-2">1. Prepara tu archivo</h2>
        <p className="text-on-surface-variant">Usa una hoja de Excel con estos títulos en la primera fila: <b>nombre, precio, cantidad</b> y, si quieres, costo, categoría, marca, sku, código de barras y descripción. En Excel ve a <b>Archivo &gt; Guardar como &gt; CSV</b>.</p>
        <a href={template} download="plantilla-productos.csv" className="btn-outline btn-sm mt-3 inline-flex"><Icon name="download" className="text-[16px]" />Descargar plantilla</a>
      </section>
      <section className="card p-5">
        <h2 className="h-section mb-2">2. Sube el archivo</h2>
        <label className="btn-primary btn-sm cursor-pointer inline-flex"><Icon name="upload_file" className="text-[16px]" />Elegir archivo CSV<input type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (f) load(await f.text()); }} /></label>
        <details className="mt-3"><summary className="font-label-md text-secondary cursor-pointer">O pega aquí las filas copiadas de Excel</summary>
          <textarea rows={6} className="input mt-2 font-mono text-[12px]" placeholder={'nombre\tprecio\tcantidad\nShampoo 400 ml\t45000\t12'} onBlur={e => e.target.value && load(e.target.value)} /></details>
        {err && <p className="mt-3 p-2 rounded-lg bg-[#FFF1F2] text-danger font-label-md">{err}</p>}
        {unknown.length > 0 && <p className="mt-2 font-body-sm text-on-surface-variant">Columnas ignoradas: {unknown.join(', ')}</p>}
      </section>
      {rows.length > 0 && !res && <section className="card p-5 overflow-x-auto">
        <h2 className="h-section mb-3">3. Revisa y confirma ({rows.length} productos)</h2>
        <table className="table"><thead><tr><th>Nombre</th><th className="text-right">Precio</th><th className="text-right">Cantidad</th><th className="text-right">Costo</th><th>Categoría</th></tr></thead>
          <tbody>{rows.slice(0, 50).map((r, i) => <tr key={i}><td>{r.nombre}</td><td className="text-right tnum">{r.precio !== undefined ? (isNaN(r.precio) ? '⚠️' : '$ ' + r.precio.toLocaleString('es-CO')) : '—'}</td><td className="text-right tnum">{r.cantidad ?? '—'}</td><td className="text-right tnum">{r.costo !== undefined ? '$ ' + r.costo.toLocaleString('es-CO') : '—'}</td><td>{r.categoria || '—'}</td></tr>)}</tbody></table>
        {rows.length > 50 && <p className="font-body-sm text-on-surface-variant mt-2">…y {rows.length - 50} más.</p>}
        <p className="font-body-sm text-on-surface-variant mt-3">Si un producto ya existe (mismo SKU o mismo nombre) se actualiza su precio y la cantidad pasa a ser la del archivo.</p>
        <button disabled={pending} className="btn-primary mt-3" onClick={() => start(async () => { const r = await importProducts(rows); if ('error' in r && r.error) setErr(r.error); else setRes(r as any); })}>{pending ? 'Importando…' : `Importar ${rows.length} productos`}</button>
      </section>}
      {res && <section className="card p-5">
        <p className="p-3 rounded-xl bg-[#ECFDF5] text-[#065F46] font-label-lg">✓ {res.created} productos nuevos y {res.updated} actualizados.</p>
        {res.errors.length > 0 && <ul className="mt-3 text-danger font-body-sm list-disc pl-5">{res.errors.map(e => <li key={e}>{e}</li>)}</ul>}
        <Link href="/admin/inventario" className="btn-primary btn-sm mt-3 inline-flex">Ver inventario</Link>
      </section>}
    </div>
  );
}
