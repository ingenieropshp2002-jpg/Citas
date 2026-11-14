/** @type {import('next').NextConfig} */
const config = {
  images: { unoptimized: true, remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }, { protocol: 'https', hostname: 'lh3.googleusercontent.com' }] },
  serverExternalPackages: ['@prisma/client', '.prisma/client']
};
export default config;
if (process.env.NODE_ENV === 'development') {
  import('@opennextjs/cloudflare').then((m) => m.initOpenNextCloudflareForDev()).catch(() => {});
}
