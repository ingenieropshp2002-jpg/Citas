export default function Loading() {
  return <div aria-busy="true" aria-label="Cargando" className="p-margin"><div className="skeleton h-10 w-56 mb-2" /><div className="skeleton h-5 w-80 mb-6" /><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-36" />)}</div></div>;
}
