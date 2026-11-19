/** @type {import('next').NextConfig} */
const config = {
  images: { unoptimized: true, remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }, { protocol: 'https', hostname: 'lh3.googleusercontent.com' }] },
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
  // El panel de los negocios se llamaba /panel (ahora /admin) y el superadmin estaba en /admin (ahora /superadmin).
  // Los enlaces viejos de /panel siguen funcionando; /admin/ingresar ya no lleva al superadmin.
  async redirects() {
    return [
      { source: '/panel', destination: '/admin', permanent: true },
      { source: '/panel/:path*', destination: '/admin/:path*', permanent: true },
      { source: '/admin/ingresar', destination: '/login?next=/admin', permanent: false }
    ];
  }
};
export default config;
if (process.env.NODE_ENV === 'development') {
  import('@opennextjs/cloudflare').then((m) => m.initOpenNextCloudflareForDev()).catch(() => {});
}
