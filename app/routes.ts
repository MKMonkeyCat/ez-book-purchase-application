import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/page.tsx'),
  route('registerOrder', 'routes/registerOrder/page.tsx'),
  route('admin/login', 'routes/admin/login.tsx'),
  route('admin', 'routes/admin/page.tsx'),
  route('auth/google/start', 'routes/auth/google/start.tsx'),
  route('auth/google/callback', 'routes/auth/google/callback.tsx'),
] satisfies RouteConfig;
