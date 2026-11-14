import bcrypt from 'bcryptjs';
import { IMG } from '../lib/images';
import { addDays, fromBogota, ymd } from '../lib/format';
import { splitTax } from '../lib/tax';

import { db } from '../lib/db';
const hours = (o: string, c: string, sat = ['08:00', '20:30'], sun: string[] | null = ['09:00', '17:00']) =>
  JSON.stringify({ '1': [o, c], '2': [o, c], '3': [o, c], '4': [o, c], '5': [o, c], '6': sat, '0': sun });

async function main() {
  if ((await db.user.count()) > 0 && process.env.SEED_RESET !== '1') {
    console.log('La base ya tiene datos. Para borrarla y volver a sembrar use SEED_RESET=1.');
    return;
  }
  // Limpieza (orden por dependencias)
  for (const m of ['electronicDocument', 'payment', 'saleItem', 'appointmentService', 'review', 'appointment', 'sale', 'cashSession', 'stockMovement', 'serviceSupply', 'serviceStaff', 'product', 'supplier', 'service', 'blockedTime', 'customer', 'staff', 'numberingResolution', 'dianConfig', 'campaign', 'coupon', 'business', 'otpCode', 'user'] as const) {
    await (db as any)[m].deleteMany();
  }
  const pass = await bcrypt.hash(process.env.SEED_PASSWORD || 'demo1234', 10);
  const owner = await db.user.create({ data: { name: 'Inge Piere', email: 'dueno@demo.co', phone: '3001112233', passwordHash: pass, role: 'OWNER' } });
  const client = await db.user.create({ data: { name: 'Ana María Gómez', email: 'cliente@demo.co', phone: '3124589920', passwordHash: pass, role: 'CLIENT', avatar: IMG.profile } });
  const staffUser = await db.user.create({ data: { name: 'Valentina Restrepo', email: 'valentina@demo.co', phone: '3015550001', passwordHash: pass, role: 'STAFF', avatar: IMG.valentina } });

  const b = await db.business.create({ data: {
    slug: 'lumiere-studio-spa', name: 'Lumière Studio & Spa', category: 'PELUQUERIA', tagline: 'Boutique & Wellness',
    description: 'Salón boutique en el corazón de Chicó Norte. Cortes de autor, rituales de barbería tradicional, spa holístico y manicura de alta precisión, con café de cortesía y valet parking.',
    city: 'Bogotá', zone: 'Zona Rosa Chicó', address: 'Cl. 85 #12-44, Bogotá (Chicó Norte)', lat: 4.6697, lng: -74.0530,
    phone: '6013000000', whatsapp: '3001234567', instagram: 'lumierestudio', images: JSON.stringify([IMG.salon, IMG.barber, IMG.spa, IMG.ritual]), logo: IMG.logo,
    rating: 4.9, reviewCount: 342, openingHours: hours('07:00', '20:00'), ownerId: owner.id, depositPercent: 33,
    legalName: 'Lumière Studio SAS', docType: '31', nit: '901234567', dv: '1', taxRegime: '48', taxResponsibilities: 'O-13', ciiu: '9602', fiscalEmail: 'facturacion@lumiere.co'
  } });
  const others = [
    { slug: 'barberia-el-patron', name: 'Barbería El Patrón', category: 'BARBERIA', city: 'Medellín', zone: 'El Poblado', address: 'Cra. 37 #8A-32, Medellín', rating: 4.8, reviewCount: 211, images: [IMG.barber, IMG.salon], tagline: 'Barbería clásica' },
    { slug: 'spa-ritual-pacifico', name: 'Spa Ritual Pacífico', category: 'SPA', city: 'Cali', zone: 'Granada', address: 'Av. 9N #15-20, Cali', rating: 4.7, reviewCount: 128, images: [IMG.spa, IMG.ritual], tagline: 'Spa & bienestar' },
    { slug: 'nail-atelier-usaquen', name: 'Nail Atelier Usaquén', category: 'UNAS', city: 'Bogotá', zone: 'Usaquén', address: 'Cl. 119 #6-15, Bogotá', rating: 4.6, reviewCount: 96, images: [IMG.ritual, IMG.salon], tagline: 'Manicura & pedicura' }
  ];
  for (const o of others) {
    const ob = await db.business.create({ data: { ...o, images: JSON.stringify(o.images), description: `${o.name}: experiencia premium en ${o.city}.`, ownerId: owner.id === '' ? '' : (await db.user.create({ data: { name: 'Dueño ' + o.name, email: o.slug + '@demo.co', passwordHash: pass, role: 'OWNER' } })).id, openingHours: hours('08:00', '19:00') } });
    const st = await db.staff.create({ data: { businessId: ob.id, name: 'Equipo ' + o.name.split(' ')[0], title: 'Especialista', rating: 4.8 } });
    const svcs = o.category === 'BARBERIA' ? [['Corte clásico', 40, 45000], ['Barba con toalla caliente', 30, 35000]] : o.category === 'SPA' ? [['Masaje relajante', 60, 140000], ['Facial hidratante', 50, 120000]] : [['Manicura semipermanente', 45, 48000], ['Pedicura spa', 60, 60000]];
    for (const [n, d, p] of svcs) await db.service.create({ data: { businessId: ob.id, name: n as string, category: o.category, durationMin: d as number, price: p as number, staff: { create: { staffId: st.id } } } });
  }

  // Equipo
  const team = await Promise.all([
    db.staff.create({ data: { businessId: b.id, userId: staffUser.id, name: 'Valentina Restrepo', title: 'Master Stylist', photo: IMG.valentina, color: '#0d2538', commissionPct: 45, rating: 4.9, permissions: JSON.stringify(['agenda', 'clientes', 'caja']) } }),
    db.staff.create({ data: { businessId: b.id, name: 'Camilo Suárez', title: 'Fade & Beard Specialist', photo: IMG.camilo, color: '#735c00', commissionPct: 40, rating: 4.9, workHours: hours('09:00', '19:00', ['09:00', '18:00'], null) } }),
    db.staff.create({ data: { businessId: b.id, name: 'Catalina Mejía', title: 'Spa & Nails Expert', photo: IMG.catalina, color: '#274a66', commissionPct: 40, rating: 4.8 } })
  ]);
  const [val, cam, cat] = team;

  // Inventario
  const prod = async (sku: string, name: string, brand: string, category: string, kind: string, unit: string, cost: number, price: number, stock: number, minStock: number, taxRate = 19) =>
    db.product.create({ data: { businessId: b.id, sku, name, brand, category, kind, unit, cost, price, stock, minStock, taxRate, barcode: '770' + sku.replace(/\D/g, '').padStart(10, '0') } });
  const shampoo = await prod('P-001', 'Shampoo Caviar 300 ml', 'Alterna', 'Cuidado capilar', 'VENTA', 'UND', 62000, 115000, 14, 4);
  const cera = await prod('P-002', 'Cera mate para barba 85 g', 'Reuzel', 'Barbería', 'VENTA', 'UND', 38000, 72000, 3, 5);
  const aceite = await prod('P-003', 'Aceite de argán 100 ml', 'Moroccanoil', 'Cuidado capilar', 'AMBOS', 'UND', 70000, 129000, 9, 3);
  const shampooBack = await prod('I-001', 'Shampoo profesional (galón)', 'Kérastase', 'Insumos', 'INSUMO', 'ML', 45, 0, 3800, 1000);
  const tinte = await prod('I-002', 'Tinte permanente 60 ml', "L'Oréal Pro", 'Insumos', 'INSUMO', 'UND', 18000, 0, 22, 6);
  const esmalte = await prod('I-003', 'Esmalte semipermanente', 'OPI', 'Insumos', 'INSUMO', 'UND', 32000, 0, 2, 4);
  const aceiteMasaje = await prod('I-004', 'Aceite de masaje lavanda', 'Natura', 'Insumos', 'INSUMO', 'ML', 60, 0, 2500, 800);
  const supplier = await db.supplier.create({ data: { businessId: b.id, name: 'Distribuidora Belleza Pro SAS', nit: '900765432', phone: '6017451200' } });
  for (const p of [shampoo, cera, aceite, shampooBack, tinte, esmalte, aceiteMasaje]) {
    await db.stockMovement.create({ data: { businessId: b.id, productId: p.id, type: 'ENTRADA', quantity: p.stock, unitCost: p.cost, balance: p.stock, supplierId: supplier.id, reference: 'FV-88421', note: 'Inventario inicial', userName: 'Inge Piere' } });
  }

  // Servicios
  const svc = async (name: string, category: string, tag: string, durationMin: number, price: number, description: string, staffIds: string[], popular = true, supplies: [string, number][] = []) =>
    db.service.create({ data: { businessId: b.id, name, category, tag, durationMin, price, description, popular, image: IMG.ritual,
      staff: { create: staffIds.map(staffId => ({ staffId })) }, supplies: { create: supplies.map(([productId, quantity]) => ({ productId, quantity })) } } });
  const s1 = await svc('Corte Editorial & Blowout Caviar', 'Peluquería & Peinado', 'Top Sell', 60, 110000, 'Diagnóstico capilar personalizado, lavado relajante con masaje craneal y finalizado texturizado.', [val.id], true, [[shampooBack.id, 30]]);
  const s2 = await svc('Ritual Barba Real & Toalla Caliente', 'Barbería Premium', 'Caballeros', 45, 65000, 'Perfilado con navaja japonesa, aceites botánicos esenciales de cedro y exfoliación facial suave.', [cam.id]);
  const s3 = await svc('Masaje Holístico Aromaterapia', 'Spa & Masajes', 'Spa Sanctuary', 50, 130000, 'Descompresión muscular profunda con piedras volcánicas y esencias de lavanda andina.', [cat.id], true, [[aceiteMasaje.id, 40]]);
  const s4 = await svc('Manicura Rusa & Esmaltado Semipermanente', 'Uñas & Manicura', 'Nails', 45, 45000, 'Limpieza profunda con torno de alta precisión, nivelación con base de goma y brillo cristal.', [cat.id], true, [[esmalte.id, 0.1]]);
  const s5 = await svc('Corte & Peinado de Autor', 'Peluquería & Peinado', 'Firma', 50, 75000, 'Corte personalizado con masaje capilar incluido.', [val.id, cam.id], false, [[shampooBack.id, 25]]);
  const s6 = await svc('Color Global & Gloss', 'Peluquería & Peinado', 'Color', 120, 260000, 'Coloración permanente de raíz a puntas con gloss de brillo.', [val.id], false, [[tinte.id, 2], [shampooBack.id, 30]]);
  const s7 = await svc('Fade Clásico', 'Barbería Premium', 'Caballeros', 40, 50000, 'Degradado a máquina y tijera con acabado a navaja.', [cam.id], false);
  const services = [s1, s2, s3, s4, s5, s6, s7];

  // Clientes
  const names = ['Ana María Gómez', 'Juan Pablo Ortiz', 'Laura Cárdenas', 'Santiago Rojas', 'Daniela Pérez', 'Felipe Castaño', 'Mariana Villa', 'Andrés Londoño', 'Sofía Herrera', 'Camila Duque', 'Mateo Zapata', 'Valeria Muñoz'];
  const customers = [];
  for (let i = 0; i < names.length; i++) {
    customers.push(await db.customer.create({ data: { businessId: b.id, userId: i === 0 ? client.id : null, name: names[i], phone: i === 0 ? '3124589920' : `31${String(10000000 + i * 7654321).slice(0, 8)}`, email: i === 0 ? 'cliente@demo.co' : null, docNumber: String(1020300400 + i * 1111), tags: JSON.stringify(i % 3 === 0 ? ['VIP'] : i % 4 === 1 ? ['Nuevo'] : []), notes: i === 0 ? 'Prefiere café sin azúcar. Cabello fino, evitar productos con sulfatos.' : null, preferences: i === 0 ? 'Valentina como estilista' : null } }));
  }

  // Resoluciones de numeración (ambiente de habilitación)
  const today = new Date();
  const until = new Date(today.getTime() + 365 * 86400000);
  await db.numberingResolution.createMany({ data: [
    { businessId: b.id, docType: 'FE', resolutionNumber: '18760000001', resolutionDate: today, prefix: 'SETP', rangeFrom: 990000000, rangeTo: 995000000, current: 989999999, validFrom: new Date('2019-01-19'), validTo: until, technicalKey: 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c' },
    { businessId: b.id, docType: 'POS', resolutionNumber: '18760000002', resolutionDate: today, prefix: 'POS', rangeFrom: 1, rangeTo: 100000, current: 0, validFrom: new Date('2024-01-01'), validTo: until },
    { businessId: b.id, docType: 'NC', resolutionNumber: 'N/A', resolutionDate: today, prefix: 'NC', rangeFrom: 1, rangeTo: 100000, current: 0, validFrom: new Date('2024-01-01'), validTo: until }
  ] });
  await db.dianConfig.create({ data: { businessId: b.id, environment: '2', provider: 'SIMULADO', softwareId: 'DEMO-SOFTWARE-ID', softwarePin: '12345' } });

  // Citas: 21 días hacia atrás y 7 hacia adelante
  const todayStr = ymd(today);
  let code = 1000; let saleNo = 0;
  const session = await db.cashSession.create({ data: { businessId: b.id, cashierName: 'Inge Piere', openingAmount: 200000, openedAt: fromBogota(todayStr, '07:00') } });
  for (let d = -21; d <= 7; d++) {
    const date = addDays(todayStr, d);
    const dow = fromBogota(date, '12:00').getUTCDay();
    if (dow === 0 && d % 2) continue;
    const perDay = d === 0 ? 7 : 3 + ((d + 30) % 4);
    for (let k = 0; k < perDay; k++) {
      const st = team[k % 3];
      const options = services.filter(s => (s.id === s1.id || s.id === s5.id || s.id === s6.id) ? st.id === val.id || (s.id === s5.id && st.id === cam.id) : (s.id === s2.id || s.id === s7.id) ? st.id === cam.id : st.id === cat.id);
      const s = options[(k + d + 40) % options.length];
      const hour = 8 + Math.floor(k / 3) * 2 + (k % 3 === 2 ? 1 : 0) + (k >= 6 ? 1 : 0);
      const start = fromBogota(date, `${String(hour + Math.floor(k/3)).padStart(2, '0')}:${k % 2 ? '30' : '00'}`);
      const end = new Date(start.getTime() + s.durationMin * 60000);
      const cust = customers[(k * 5 + d + 40) % customers.length];
      const past = d < 0 || (d === 0 && end < today);
      const status = past ? ((k + d) % 11 === 0 ? 'NO_ASISTIO' : (k + d) % 13 === 0 ? 'CANCELADA' : 'COMPLETADA') : (k % 4 === 0 ? 'PENDIENTE' : 'CONFIRMADA');
      const dep = Math.round(s.price * 0.33 / 1000) * 1000;
      const appt = await db.appointment.create({ data: { code: `RC-${code++}`, businessId: b.id, customerId: cust.id, staffId: st.id, start, end, status, total: s.price, depositAmount: dep, depositStatus: 'PAGADO', paymentMethod: ['NEQUI', 'PSE', 'TARJETA'][k % 3], source: k % 3 ? 'ONLINE' : 'PANEL', services: { create: { serviceId: s.id, price: s.price, durationMin: s.durationMin } } } });
      if (status === 'COMPLETADA') {
        const { base, tax } = splitTax(s.price, 19);
        const withProduct = k % 4 === 1;
        const pBase = withProduct ? splitTax(cera.price, 19) : { base: 0, tax: 0 };
        const tip = k % 3 === 0 ? 10000 : 0;
        const sale = await db.sale.create({ data: { businessId: b.id, number: ++saleNo, customerId: cust.id, cashierName: 'Inge Piere', cashSessionId: d === 0 ? session.id : null, subtotal: base + pBase.base, taxTotal: tax + pBase.tax, tip, total: s.price + (withProduct ? cera.price : 0) + tip, createdAt: end,
          items: { create: [
            { kind: 'SERVICIO', serviceId: s.id, staffId: st.id, description: s.name, code: 'S-' + s.id.slice(-5), unit: 'E48', quantity: 1, unitPrice: s.price, taxRate: 19, base, taxAmount: tax, total: s.price, commission: Math.round(base * st.commissionPct / 100) },
            ...(withProduct ? [{ kind: 'PRODUCTO', productId: cera.id, description: cera.name, code: cera.sku, unit: '94', quantity: 1, unitPrice: cera.price, taxRate: 19, base: pBase.base, taxAmount: pBase.tax, total: cera.price }] : [])
          ] },
          payments: { create: [{ businessId: b.id, method: ['EFECTIVO', 'TARJETA', 'NEQUI'][k % 3], amount: s.price + (withProduct ? cera.price : 0) + tip, createdAt: end }] } } });
        await db.appointment.update({ where: { id: appt.id }, data: { saleId: sale.id } });
        await db.customer.update({ where: { id: cust.id }, data: { totalSpent: { increment: sale.total }, visits: { increment: 1 }, lastVisit: end } });
      }
    }
  }
  // Reseñas
  const rv = [
    ['Ana María Gómez', 5, 'La atención de Valentina fue sublime. El corte transformó totalmente mi cabello y el café de cortesía con el ritual aromático hacen que la experiencia en la Zona Rosa valga cada peso.', 'Corte & Blowout', val.id],
    ['Juan Pablo Ortiz', 5, 'El mejor ritual de barba de Bogotá. Camilo es un artista con la navaja.', 'Ritual Barba Real', cam.id],
    ['Laura Cárdenas', 4, 'Masaje increíble, salí nueva. Solo esperé 10 minutos para empezar.', 'Masaje Holístico', cat.id]
  ] as const;
  for (const [authorName, rating, comment, serviceName, staffId] of rv) await db.review.create({ data: { businessId: b.id, authorName, rating, comment, serviceName, staffId } });

  // Marketing
  await db.coupon.createMany({ data: [
    { businessId: b.id, code: 'BIENVENIDA15', type: 'PORCENTAJE', value: 15, maxUses: 100, uses: 12 },
    { businessId: b.id, code: 'REGRESA20K', type: 'VALOR', value: 20000, maxUses: 50, uses: 4 }
  ] });
  await db.campaign.createMany({ data: [
    { businessId: b.id, name: 'Te extrañamos', audience: 'INACTIVOS', message: 'Hola {nombre}, hace tiempo no te vemos en Lumière. Vuelve con 20.000 de descuento usando REGRESA20K. Reserva aquí: {link}', couponCode: 'REGRESA20K', status: 'ENVIADA', sentCount: 38 },
    { businessId: b.id, name: 'Temporada de fin de año', audience: 'TODOS', message: '¡Prepárate para las fiestas, {nombre}! Agenda tu look con anticipación: {link}', status: 'BORRADOR' }
  ] });
  console.log('✔ Datos de demostración creados');
  console.log('  Dueño:   dueno@demo.co / ' + (process.env.SEED_PASSWORD || 'demo1234'));
  console.log('  Cliente: cliente@demo.co / ' + (process.env.SEED_PASSWORD || 'demo1234'));
  console.log('  Estilista: valentina@demo.co / ' + (process.env.SEED_PASSWORD || 'demo1234'));
}
main().finally(() => db.$disconnect());
