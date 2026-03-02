import 'react-router';
import net from 'net';
import { createRequestHandler } from '@react-router/express';
import express from 'express';

declare module 'react-router' {
  interface AppLoadContext {
    clientIp: string;
  }
}

export const app = express();

const parseTrustProxy = (value: string | undefined): boolean | number => {
  if (!value) return false;

  const trimmed = value.trim();
  const numberValue = Number(trimmed);
  return Number.isNaN(numberValue) ? trimmed === 'true' : numberValue;
};

app.set('trust proxy', parseTrustProxy(process.env.EXPRESS_TRUST_PROXY));

app.use(
  createRequestHandler({
    build: () => import('virtual:react-router/server-build'),
    getLoadContext(req) {
      const ip = req.ip;

      console.log(req.headers);

      return {
        clientIp: ip && net.isIP(ip) ? ip : 'unknown',
      };
    },
  }),
);
