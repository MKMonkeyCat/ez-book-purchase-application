import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/page.tsx'),
  route('registerOrder', 'routes/registerOrder/page.tsx'),
] satisfies RouteConfig;
