import compression from 'compression';
import express from 'express';
import morgan from 'morgan';
import os from 'node:os';
import pc from 'picocolors';

// Short-circuit the type-checking of the built output.
const BUILD_PATH = './build/server/index.js';
const DEVELOPMENT = process.env.NODE_ENV === 'development';
const PORT = Number.parseInt(process.env.PORT || '3000');

const app = express();
const IS_HOST = process.argv.includes('--host');

app.use(compression());
app.disable('x-powered-by');

if (DEVELOPMENT) {
  console.log('Starting development server');
  const viteDevServer = await import('vite').then((vite) =>
    vite.createServer({
      server: {
        middlewareMode: true,
        host: IS_HOST ? '0.0.0.0' : undefined,
      },
    }),
  );
  app.use(viteDevServer.middlewares);
  app.use(async (req, res, next) => {
    try {
      const source = await viteDevServer.ssrLoadModule('./server/app.ts');
      return await source.app(req, res, next);
    } catch (error) {
      if (typeof error === 'object' && error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error);
      }
      next(error);
    }
  });
} else {
  console.log('Starting production server');
  app.use(
    '/assets',
    express.static('build/client/assets', { immutable: true, maxAge: '1y' }),
  );
  app.use(morgan('tiny'));
  app.use(express.static('build/client', { maxAge: '1h' }));
  app.use(await import(BUILD_PATH).then((mod) => mod.app));
}

app.listen(PORT, () => {
  console.log(
    `\n  ${pc.green(pc.bold('➜'))}  ${pc.bold('Local')}:   ${pc.cyan(`http://localhost:${pc.bold(PORT)}/`)}`,
  );

  if (IS_HOST) {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      if (!iface) continue;

      for (let i = 0; i < iface.length; i++) {
        const alias = iface[i];
        if (alias.family === 'IPv4' && !alias.internal) {
          console.log(
            `  ${pc.green(pc.bold('➜'))}  ${pc.bold('Network')}: ${pc.cyan(`http://${alias.address}:${pc.bold(PORT)}/`)}`,
          );
        }
      }
    }
  } else {
    console.log(
      `  ${pc.green(pc.bold('➜'))}  ${pc.dim('Network: use --host to expose')}`,
    );
  }
});
