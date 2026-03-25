import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { defineConfig, type UserConfig } from 'vite';


const execAsync = promisify(exec);

function getNodeModulePackageName(id: string) {
  const normalizedId = id.split('\\').join('/');
  const nodeModulesIndex = normalizedId.lastIndexOf('/node_modules/');

  if (nodeModulesIndex === -1) {
    return null;
  }

  const packagePath = normalizedId.slice(nodeModulesIndex + '/node_modules/'.length);
  const [scopeOrName, maybeName] = packagePath.split('/');

  if (!scopeOrName) {
    return null;
  }

  return scopeOrName.startsWith('@') && maybeName
    ? `${scopeOrName}/${maybeName}`
    : scopeOrName;
}

function blogGeneratePlugin() {
  return {
    name: 'admin-blog-generate-endpoint',
    configureServer(server: any) {
      server.middlewares.use('/__admin/blog-generate', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: 'Method not allowed' }));
          return;
        }

        try {
          const { stdout, stderr } = await execAsync('npm run blog:generate');
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            message: 'npm run blog:generate exécuté avec succès.',
            stdout,
            stderr,
          }));
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            message: error?.stderr || error?.message || 'Échec de génération du blog.',
          }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }): UserConfig => {
  const isProd = mode === 'production';

  return {
    plugins: [react(), tailwindcss(), blogGeneratePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      // Force a single React instance — prevents "Invalid hook call" when motion/react
      // is pre-bundled with a separate CJS React copy alongside the ESM one used by react-dom.
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      // Pre-bundle React as ESM so all packages share the exact same instance.
      include: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: process.env.PRODUCT_IMPORTER_API ?? 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 300,
      sourcemap: isProd ? 'hidden' : true,
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            if (
              id.includes('/pages/Admin') ||
              id.includes('/pages/POSPage') ||
              id.includes('/components/admin/') ||
              id.includes('/components/pos/')
            ) {
              return 'app-admin';
            }

            if (
              id.includes('/components/budtender') ||
              id.includes('/hooks/useBudTender') ||
              id.includes('/lib/budtender')
            ) {
              return 'app-budtender';
            }

            if (
              id.includes('/pages/account/') ||
              id.includes('/pages/Orders') ||
              id.includes('/pages/Profile') ||
              id.includes('/pages/Addresses') ||
              id.includes('/pages/Subscriptions') ||
              id.includes('/pages/Loyalty') ||
              id.includes('/pages/Favorites') ||
              id.includes('/pages/Referrals')
            ) {
              return 'app-account';
            }

            const packageName = getNodeModulePackageName(id);

            if (!packageName) {
              return;
            }

            if (['motion', 'framer-motion'].includes(packageName)) {
              return 'vendor-motion';
            }

            if (packageName === 'lucide-react') {
              return 'vendor-icons';
            }

            if (
              packageName === 'recharts' ||
              packageName === 'victory-vendor' ||
              packageName.startsWith('d3-')
            ) {
              return 'vendor-charts';
            }

            if (
              ['jspdf', 'jspdf-autotable', 'html2canvas'].includes(packageName)
            ) {
              return 'vendor-pdf';
            }

            if (
              ['html5-qrcode', 'qrcode', 'qrcode.react'].includes(packageName)
            ) {
              return 'vendor-qr';
            }

            if (packageName.startsWith('@stripe/')) {
              return 'vendor-stripe';
            }

            if (packageName.startsWith('@supabase/')) {
              return 'vendor-supabase';
            }

            if (
              ['@google/genai', '@google/generative-ai'].includes(packageName)
            ) {
              return 'vendor-ai';
            }

            if (['papaparse', 'xlsx', 'csv-parser'].includes(packageName)) {
              return 'vendor-csv';
            }
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const ext = assetInfo.name?.split('.').pop() ?? '';

            if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext)) {
              return 'assets/images/[name]-[hash][extname]';
            }

            if (['woff', 'woff2', 'ttf', 'eot'].includes(ext)) {
              return 'assets/fonts/[name]-[hash][extname]';
            }

            return 'assets/[name]-[hash][extname]';
          },
        },
      },
      minify: 'esbuild',
    },
  };
});
