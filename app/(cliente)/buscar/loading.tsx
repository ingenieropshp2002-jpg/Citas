export default function Loading() {
  return <main className="pt-20 max-w-[1280px] mx-auto px-margin"><div className="skeleton h-14 mb-4" /><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-64" />)}</div></main>;
}
