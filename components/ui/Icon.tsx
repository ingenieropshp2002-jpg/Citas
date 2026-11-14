export function Icon({ name, className = '', fill = false, size }: { name: string; className?: string; fill?: boolean; size?: number }) {
  return <span aria-hidden className={`material-symbols-outlined ${fill ? 'icon-fill' : ''} ${className}`} style={size ? { fontSize: size } : undefined}>{name}</span>;
}
