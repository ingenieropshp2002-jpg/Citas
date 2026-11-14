// Crea una peluquería de demostración completa (no borra nada). Uso: npx tsx prisma/demo-peluqueria.ts
import bcrypt from 'bcryptjs';
import { IMG } from '../lib/images';
import { addDays, fromBogota, ymd } from '../lib/format';
import { splitTax } from '../lib/tax';
import { db } from '../lib/db';

const SLUG = 'bella-forma-peluqueria';
const hours = (o: string, c: string, sat = ['08:00', '19:00'], sun: string[] | null = null) =>
  JSON.stringify({ '1': [o, c], '2': [o, c], '3': [o, c], '4': [o, c], '5': [o, c], '6': sat, ...(sun ? { '0': sun } : {}) });

// Ilustración SVG de producto (frasco, tarro o tubo) como data URL
function productSvg(shape: 'bottle' | 'jar' | 'tube' | 'spray', c1: string, c2: string, brand: string, label: string) {
  const body = {
    bottle: `<rect x="150" y="70" width="100" height="40" rx="8" fill="#1f2937"/><rect x="120" y="105" width="160" height="250" rx="34" fill="url(#g)"/>`,
    spray: `<rect x="170" y="50" width="60" height="30" rx="6" fill="#111827"/><rect x="225" y="58" width="40" height="12" rx="4" fill="#111827"/><rect x="160" y="78" width="80" height="34" rx="8" fill="#374151"/><rect x="130" y="108" width="140" height="250" rx="22" fill="url(#g)"/>`,
    jar: `<rect x="105" y="150" width="190" height="50" rx="12" fill="#1f2937"/><rect x="95" y="190" width="210" height="165" rx="30" fill="url(#g)"/>`,
    tube: `<path d="M140 80 h120 l-14 250 h-92 z" fill="url(#g)"/><rect x="165" y="325" width="70" height="38" rx="8" fill="#1f2937"/>`
  }[shape];
  const ly = shape === 'jar' ? 240 : 190;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient><radialGradient id="bg" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#fdfaf3"/><stop offset="1" stop-color="#eee6d4"/></radialGradient></defs><rect width="400" height="400" fill="url(#bg)"/><ellipse cx="200" cy="368" rx="120" ry="12" fill="#000" opacity=".10"/>${body}<rect x="138" y="${ly}" width="124" height="70" rx="6" fill="#fff" opacity=".92"/><text x="200" y="${ly + 28}" text-anchor="middle" font-family="Georgia,serif" font-size="17" font-weight="700" fill="#0d2538">${brand}</text><text x="200" y="${ly + 52}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#735c00">${label}</text></svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

async function main() {
  if (await db.business.findUnique({ where: { slug: SLUG } })) { console.log('Ya existe ' + SLUG); return; }
  const pass = await bcrypt.hash(process.env.DEMO_PASSWORD || 'BellaForma2026', 10);
  const owner = await db.user.create({ data: { name: 'Carolina Ríos', email: 'demo.peluqueria@reservacitas.co', passwordHash: pass, role: 'OWNER' } });
  const trialEnd = new Date(Date.now() + 14 * 86400000);
  const b = await db.business.create({ data: {
    slug: SLUG, name: 'Bella Forma Peluquería', category: 'PELUQUERIA', tagline: 'Color, corte y cuidado capilar',
    description: 'Peluquería de barrio con alma de salón boutique. Especialistas en balayage, cortes en capas, keratina y tratamientos de hidratación. Usamos productos profesionales y te asesoramos para cuidar tu cabello en casa.',
    city: 'Bogotá', zone: 'Cedritos', address: 'Cl. 140 #11-25, Local 3, Bogotá', lat: 4.7226, lng: -74.0442,
    phone: '6017004455', whatsapp: '3001234567', instagram: 'bellaformapeluqueria',
    images: JSON.stringify([IMG.salon, IMG.ritual, IMG.spa]), logo: IMG.logo, rating: 4.8, reviewCount: 6,
    openingHours: hours('08:00', '19:30'), ownerId: owner.id, depositPercent: 20, requireDeposit: false,
    legalName: 'Bella Forma SAS', docType: '31', nit: '901555777', dv: '3', taxRegime: '48', taxResponsibilities: 'O-13', ciiu: '9602', fiscalEmail: 'facturas@bellaforma.co',
    subscriptionStatus: 'PRUEBA', plan: 'PRO', trialEndsAt: trialEnd, pointsPerThousand: 1, birthdayCoupon: 'CUMPLE10'
  } });
  const today = new Date(); const until = new Date(today.getTime() + 365 * 86400000);
  await db.numberingResolution.createMany({ data: [
    { businessId: b.id, docType: 'FE', resolutionNumber: '18760000001', resolutionDate: today, prefix: 'SETP', rangeFrom: 990000000, rangeTo: 995000000, current: 989999999, validFrom: new Date('2019-01-19'), validTo: until, technicalKey: 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c' },
    { businessId: b.id, docType: 'POS', resolutionNumber: '18760000002', resolutionDate: today, prefix: 'POS', rangeFrom: 1, rangeTo: 100000, current: 0, validFrom: new Date('2024-01-01'), validTo: until },
    { businessId: b.id, docType: 'NC', resolutionNumber: 'N/A', resolutionDate: today, prefix: 'NC', rangeFrom: 1, rangeTo: 100000, current: 0, validFrom: new Date('2024-01-01'), validTo: until }
  ] });
  await db.dianConfig.create({ data: { businessId: b.id, environment: '2', provider: 'SIMULADO' } });

  // Equipo
  const mk = (name: string, title: string, photo: string, color: string, rating: number) => db.staff.create({ data: { businessId: b.id, name, title, photo, color, rating, commissionPct: 40 } });
  const laura = await mk('Laura Méndez', 'Colorista senior', IMG.valentina, '#0d2538', 4.9);
  const andres = await mk('Andrés Pineda', 'Estilista y barbero', IMG.camilo, '#735c00', 4.8);
  const paola = await mk('Paola Rincón', 'Tratamientos y peinados', IMG.catalina, '#274a66', 4.8);
  const team = [laura, andres, paola];

  // Servicios
  const svcDefs: [string, string, string | null, number, number, string, string[], boolean][] = [
    ['Corte dama con lavado y secado', 'Corte', 'Más pedido', 60, 55000, 'Asesoría de forma según tu rostro, lavado con masaje y secado con cepillo.', [laura.id, paola.id], true],
    ['Corte caballero', 'Corte', null, 35, 30000, 'Corte a máquina y tijera con perfilado de cejas incluido.', [andres.id], true],
    ['Balayage', 'Color', 'Tendencia', 180, 320000, 'Iluminación a mano alzada con matizado y tratamiento sellador.', [laura.id], true],
    ['Tinte global', 'Color', null, 120, 150000, 'Coloración de raíz a puntas con cobertura de canas.', [laura.id], false],
    ['Retoque de raíz', 'Color', null, 75, 90000, 'Retoque de crecimiento hasta 3 cm.', [laura.id, paola.id], false],
    ['Keratina alisadora', 'Tratamientos', 'Larga duración', 150, 250000, 'Alisado progresivo libre de formol, dura hasta 4 meses.', [paola.id], true],
    ['Hidratación profunda', 'Tratamientos', null, 45, 70000, 'Mascarilla nutritiva con vapor y masaje capilar.', [paola.id, laura.id], false],
    ['Peinado para evento', 'Peinados', null, 60, 85000, 'Ondas, recogidos o semirecogidos. Incluye fijación.', [paola.id], false],
    ['Barba y perfilado', 'Barbería', null, 30, 25000, 'Diseño de barba con toalla caliente y aceite.', [andres.id], false]
  ];
  const services = [] as Awaited<ReturnType<typeof db.service.create>>[];
  for (const [name, category, tag, durationMin, price, description, staffIds, popular] of svcDefs)
    services.push(await db.service.create({ data: { businessId: b.id, name, category, tag, durationMin, price, description, popular, image: IMG.ritual, staff: { create: staffIds.map(staffId => ({ staffId })) } } }));

  // Productos a la venta (con foto, precio y cantidad)
  const supplier = await db.supplier.create({ data: { businessId: b.id, name: 'Distribuidora Capilar Andina SAS', nit: '900111222', phone: '6014567890' } });
  const prodDefs: [string, string, string, number, number, number, string, Parameters<typeof productSvg>][] = [
    ['Shampoo sin sulfatos 300 ml', 'Nutrapel', 'Shampoo', 24000, 46000, 12, 'Limpieza suave para cabello teñido o con keratina.', ['bottle', '#7c3aed', '#a78bfa', 'Nutrapel', 'Sin sulfatos']],
    ['Acondicionador reparador 300 ml', 'Nutrapel', 'Acondicionador', 25000, 48000, 9, 'Desenreda y repara puntas abiertas.', ['bottle', '#0f766e', '#5eead4', 'Nutrapel', 'Reparador']],
    ['Shampoo matizador morado 300 ml', 'Tec Italy', 'Shampoo', 32000, 62000, 7, 'Neutraliza tonos amarillos en rubios y mechas.', ['bottle', '#4c1d95', '#8b5cf6', 'Tec Italy', 'Matizador']],
    ['Mascarilla hidratante 250 g', 'Kativa', 'Tratamiento', 21000, 39000, 15, 'Hidratación intensa con aceite de argán y coco.', ['jar', '#b45309', '#fbbf24', 'Kativa', 'Hidratante']],
    ['Aceite de argán 60 ml', 'Moroccanoil', 'Tratamiento', 62000, 115000, 5, 'Brillo y control del frizz. Aplica en medios y puntas.', ['bottle', '#92400e', '#f59e0b', 'Moroccanoil', 'Argán']],
    ['Protector térmico 200 ml', "L'Oréal Pro", 'Styling', 34000, 64000, 8, 'Protege hasta 230 °C antes de plancha o secador.', ['spray', '#be123c', '#fb7185', "L'Oréal", 'Térmico']],
    ['Crema para peinar rizos 300 ml', 'Lissia', 'Styling', 16000, 32000, 10, 'Define rizos sin dejar el cabello duro.', ['tube', '#db2777', '#f9a8d4', 'Lissia', 'Rizos']],
    ['Cera mate para cabello 85 g', 'Reuzel', 'Styling', 38000, 72000, 4, 'Fijación media con acabado natural.', ['jar', '#111827', '#4b5563', 'Reuzel', 'Mate']],
    ['Ampolla de keratina x 4', 'Kativa', 'Tratamiento', 14000, 28000, 20, 'Tratamiento de choque para cabello maltratado.', ['tube', '#0369a1', '#7dd3fc', 'Kativa', 'Keratina']],
    ['Spray de brillo 150 ml', 'Tec Italy', 'Styling', 29000, 55000, 0, 'Brillo instantáneo sin engrasar.', ['spray', '#a16207', '#fde047', 'Tec Italy', 'Brillo']]
  ];
  const products = [];
  let n = 1;
  for (const [name, brand, category, cost, price, stock, description, svg] of prodDefs) {
    const sku = 'BF-' + String(n++).padStart(3, '0');
    const p = await db.product.create({ data: { businessId: b.id, sku, name, brand, category, kind: 'VENTA', unit: 'UND', cost, price, stock: stock + 3, minStock: 3, description, image: productSvg(...svg), showInShop: true, barcode: '7709' + String(100000000 + n * 7919).slice(0, 9) } });
    await db.stockMovement.create({ data: { businessId: b.id, productId: p.id, type: 'ENTRADA', quantity: stock + 3, unitCost: cost, balance: stock + 3, supplierId: supplier.id, reference: 'FC-20451', note: 'Inventario inicial', userName: owner.name, createdAt: new Date(Date.now() - 25 * 86400000) } });
    products.push(p);
  }

  // Clientes
  const names = ['María José Arango', 'Natalia Bermúdez', 'Diana Carolina Silva', 'Julián Moreno', 'Paula Andrea Torres', 'Sebastián Gil', 'Isabella Quintero', 'Lina Marcela Ruiz'];
  const customers = [];
  for (let i = 0; i < names.length; i++) {
    const bd = new Date(Date.UTC(1985 + i * 2, (today.getUTCMonth() + i) % 12, 5 + i * 3, 17));
    customers.push(await db.customer.create({ data: { businessId: b.id, name: names[i], phone: `31${String(20304050 + i * 1357913).slice(0, 8)}`, docNumber: String(52300100 + i * 2222), birthday: bd, tags: JSON.stringify(i % 3 === 0 ? ['VIP'] : []), notes: i === 0 ? 'Rubia cenizo, matizar cada 6 semanas.' : i === 2 ? 'Cuero cabelludo sensible.' : null, createdAt: new Date(Date.now() - 80 * 86400000) } }));
  }

  // Citas: 20 días atrás y 6 adelante, con ventas para las completadas
  const todayStr = ymd(today);
  let code = 5000; let saleNo = 0;
  for (let d = -20; d <= 6; d++) {
    const date = addDays(todayStr, d);
    if (fromBogota(date, '12:00').getUTCDay() === 0) continue;
    const perDay = d === 0 ? 5 : 2 + ((d + 30) % 3);
    for (let k = 0; k < perDay; k++) {
      const st = team[(k + d + 30) % 3];
      const opts = services.filter((_, i) => svcDefs[i][6].includes(st.id));
      const s = opts[(k * 2 + d + 40) % opts.length];
      const start = fromBogota(date, `${String(9 + k * 2).padStart(2, '0')}:${k % 2 ? '30' : '00'}`);
      const end = new Date(start.getTime() + s.durationMin * 60000);
      const cust = customers[(k * 3 + d + 40) % customers.length];
      const past = d < 0 || (d === 0 && end < today);
      const status = past ? ((k + d) % 9 === 0 ? 'NO_ASISTIO' : 'COMPLETADA') : (k % 3 === 0 ? 'PENDIENTE' : 'CONFIRMADA');
      const appt = await db.appointment.create({ data: { code: `BF-${code++}`, businessId: b.id, customerId: cust.id, staffId: st.id, start, end, status, total: s.price, source: k % 2 ? 'ONLINE' : 'PANEL', createdAt: new Date(start.getTime() - 3 * 86400000), services: { create: { serviceId: s.id, price: s.price, durationMin: s.durationMin } } } });
      if (status !== 'COMPLETADA') continue;
      const prod = (k + d) % 3 === 0 ? products[(k + d + 40) % 9] : null;
      const sv = splitTax(s.price, 19); const pv = prod ? splitTax(prod.price, 19) : { base: 0, tax: 0 };
      const total = s.price + (prod ? prod.price : 0);
      const sale = await db.sale.create({ data: { businessId: b.id, number: ++saleNo, customerId: cust.id, cashierName: owner.name, subtotal: sv.base + pv.base, taxTotal: sv.tax + pv.tax, tip: 0, total, createdAt: end,
        items: { create: [
          { kind: 'SERVICIO', serviceId: s.id, staffId: st.id, description: s.name, code: 'S-' + s.id.slice(-5), unit: 'E48', quantity: 1, unitPrice: s.price, taxRate: 19, base: sv.base, taxAmount: sv.tax, total: s.price, commission: Math.round(sv.base * 0.4) },
          ...(prod ? [{ kind: 'PRODUCTO', productId: prod.id, description: prod.name, code: prod.sku, unit: '94', quantity: 1, unitPrice: prod.price, taxRate: 19, base: pv.base, taxAmount: pv.tax, total: prod.price }] : [])
        ] },
        payments: { create: [{ businessId: b.id, method: ['EFECTIVO', 'NEQUI', 'TARJETA'][k % 3], amount: total, createdAt: end }] } } });
      await db.appointment.update({ where: { id: appt.id }, data: { saleId: sale.id } });
      if (prod) {
        const np = await db.product.update({ where: { id: prod.id }, data: { stock: { decrement: 1 } } });
        await db.stockMovement.create({ data: { businessId: b.id, productId: prod.id, type: 'VENTA', quantity: -1, unitCost: prod.cost, balance: np.stock, reference: `Venta #${saleNo}`, userName: owner.name, createdAt: end } });
      }
      const pts = Math.floor(total / 1000);
      await db.customer.update({ where: { id: cust.id }, data: { totalSpent: { increment: total }, visits: { increment: 1 }, lastVisit: end, points: { increment: pts } } });
      await db.pointMovement.create({ data: { businessId: b.id, customerId: cust.id, points: pts, reason: `Compra #${saleNo}`, saleId: sale.id, createdAt: end } });
    }
  }
  // Ajustar stock a la cantidad deseada (las ventas descontaron)
  for (let i = 0; i < products.length; i++) {
    const p = await db.product.findUniqueOrThrow({ where: { id: products[i].id } });
    const want = prodDefs[i][5];
    if (p.stock !== want) {
      await db.product.update({ where: { id: p.id }, data: { stock: want } });
      await db.stockMovement.create({ data: { businessId: b.id, productId: p.id, type: 'AJUSTE', quantity: want - p.stock, unitCost: p.cost, balance: want, note: 'Conteo físico', userName: owner.name } });
    }
  }

  // Reseñas
  const rv: [string, number, string, string, string][] = [
    ['María José Arango', 5, 'Laura es una maga con el color. Mi balayage quedó natural y sin maltratar el cabello.', 'Balayage', laura.id],
    ['Natalia Bermúdez', 5, 'La keratina me duró casi 4 meses. Paola explica todo y el sitio es muy limpio.', 'Keratina alisadora', paola.id],
    ['Julián Moreno', 5, 'Corte rápido y bien hecho. Andrés siempre acierta con lo que pido.', 'Corte caballero', andres.id],
    ['Paula Andrea Torres', 4, 'Muy buena atención. Me recomendaron un shampoo que de verdad funcionó.', 'Hidratación profunda', paola.id],
    ['Isabella Quintero', 5, 'Me peinaron para un matrimonio y el peinado aguantó toda la noche.', 'Peinado para evento', paola.id],
    ['Diana Carolina Silva', 5, 'Puntuales y amables. Reservar por la app es facilísimo.', 'Corte dama con lavado y secado', laura.id]
  ];
  for (const [authorName, rating, comment, serviceName, staffId] of rv) await db.review.create({ data: { businessId: b.id, authorName, rating, comment, serviceName, staffId } });

  // Fidelización, gastos y marketing
  await db.reward.createMany({ data: [
    { businessId: b.id, name: 'Hidratación gratis', points: 150 },
    { businessId: b.id, name: '20% en productos', points: 100 },
    { businessId: b.id, name: 'Corte gratis', points: 250 }
  ] });
  const ex: [string, string, number, number][] = [['ARRIENDO', 'Arriendo del local', 2800000, -14], ['SERVICIOS', 'Luz, agua e internet', 420000, -10], ['INSUMOS', 'Tintes y oxidantes', 650000, -7], ['NOMINA', 'Recepcionista quincena', 750000, -3]];
  for (const [category, description, amount, d] of ex) await (db as any).expense.create({ data: { businessId: b.id, category, description, amount, date: fromBogota(addDays(todayStr, d), '12:00'), userName: owner.name } });
  await db.coupon.createMany({ data: [
    { businessId: b.id, code: 'BIENVENIDA10', type: 'PORCENTAJE', value: 10, maxUses: 100, uses: 3 },
    { businessId: b.id, code: 'CUMPLE10', type: 'PORCENTAJE', value: 10, maxUses: 200, uses: 1 }
  ] });
  console.log('OK', SLUG);
}
main().finally(() => db.$disconnect());
