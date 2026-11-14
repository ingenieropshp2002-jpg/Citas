// Envío de mensajes por WhatsApp Cloud API (Meta). Si no hay credenciales, se registra en consola.
export async function sendWhatsapp(to: string, text: string) {
  const phone = to.replace(/\D/g, '');
  const full = phone.length === 10 ? '57' + phone : phone;
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
    console.log(`[WhatsApp simulado] → +${full}: ${text}`);
    return { ok: true, simulated: true };
  }
  const r = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: full, type: 'text', text: { body: text } })
  });
  return { ok: r.ok, simulated: false };
}
export function waLink(phone: string | null | undefined, text: string) {
  const p = (phone || '').replace(/\D/g, '');
  return `https://wa.me/${p ? (p.length === 10 ? '57' + p : p) : ''}?text=${encodeURIComponent(text)}`;
}
