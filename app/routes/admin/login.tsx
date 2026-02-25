import type { Route } from './+types/login';
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import { Link, redirect } from 'react-router';

export function meta({}: Route.MetaArgs) {
  return [
    { title: '管理員登入' },
    { name: 'description', content: 'Google OAuth2 管理員登入' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { getAdminUser } = await import('~/.server/admin-auth');

  try {
    const user = await getAdminUser(request);
    if (user) throw redirect('/admin');

    const url = new URL(request.url);
    return { configured: true, error: url.searchParams.get('error') ?? '' };
  } catch (error) {
    if (error instanceof Response) throw error;

    return {
      configured: false,
      error: error instanceof Error ? error.message : '管理員登入設定有誤',
    };
  }
}

export default function AdminLogin({ loaderData }: Route.ComponentProps) {
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper
        variant="outlined"
        sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            管理員登入
          </Typography>
          <Typography variant="body2" color="text.secondary">
            請使用 Google 帳號登入管理頁，以設定付款與交付狀態。
          </Typography>
        </Box>

        {!loaderData.configured && (
          <Alert severity="error">
            {loaderData.error || '登入設定尚未完成'}
          </Alert>
        )}

        {!!loaderData.error && loaderData.configured && (
          <Alert severity="warning">{loaderData.error}</Alert>
        )}

        <Button
          component={Link}
          to="/auth/google/start?returnTo=/admin"
          variant="contained"
          fullWidth
          disabled={!loaderData.configured}
        >
          使用 Google OAuth2 登入
        </Button>
      </Paper>
    </Container>
  );
}
