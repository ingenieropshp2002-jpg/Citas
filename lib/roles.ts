// Roles del equipo: atajos de permisos. El dueño siempre tiene todo; el rol solo marca las casillas.
export const PERMS: [string, string][] = [['agenda', 'Agenda'], ['agenda_todos', 'Ve la agenda de todo el equipo'], ['clientes', 'Clientes'], ['caja', 'Caja / POS'], ['inventario', 'Inventario'], ['servicios', 'Servicios'], ['equipo', 'Equipo'], ['facturacion', 'Facturación'], ['marketing', 'Marketing'], ['gastos', 'Gastos'], ['fidelizacion', 'Fidelización'], ['reportes', 'Reportes'], ['configuracion', 'Configuración']];
export const ROLES: { key: string; label: string; desc: string; perms: string[] }[] = [
  { key: 'PROFESIONAL', label: 'Profesional', desc: 'Ve solo su agenda y sus clientes.', perms: ['agenda', 'clientes'] },
  { key: 'RECEPCION', label: 'Recepción', desc: 'Agenda de todos, clientes, caja y fidelización. Sin reportes ni configuración.', perms: ['agenda', 'agenda_todos', 'clientes', 'caja', 'fidelizacion'] },
  { key: 'ADMINISTRADOR', label: 'Administrador', desc: 'Todo el panel, igual que el dueño.', perms: PERMS.map(p => p[0]) }
];
export function roleOf(perms: string[]) {
  const set = [...perms].sort().join(',');
  return ROLES.find(r => [...r.perms].sort().join(',') === set)?.label || (perms.length ? 'Personalizado' : 'Sin acceso');
}
