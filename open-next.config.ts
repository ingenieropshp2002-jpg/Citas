import { defineCloudflareConfig } from '@opennextjs/cloudflare';

const config = defineCloudflareConfig({});
// Cloudflare Workers Builds ejecuta `npm run build`, que llama a OpenNext; OpenNext compila Next con este comando.
config.buildCommand = 'npm run build:next';
export default config;
