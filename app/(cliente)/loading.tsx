export default function Loading() {
  return <main aria-busy="true" aria-label="Cargando" className="pt-20 max-w-[1280px] mx-auto px-margin"><div className="skeleton h-48 mb-4" /><div className="skeleton h-8 w-2/3 mb-3" /><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-40" />)}</div></main>;
}
