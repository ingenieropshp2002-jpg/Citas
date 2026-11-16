import type { MetadataRoute } from 'next';

import { getSettings } from '@/lib/settings';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  return {
    id: '/',
    name: s.appName,
    short_name: s.shortName,
    description: s.tagline,
    start_url: '/?fuente=app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8f9ff',
    theme_color: '#0d2538',
    lang: 'es-CO',
    categories: ['lifestyle', 'business'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
