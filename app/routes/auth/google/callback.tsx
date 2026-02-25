import type { Route } from './+types/callback';
import { redirect } from 'react-router';

export async function loader({ request }: Route.LoaderArgs) {
  const { commitAdminLogin, consumeOauthState, verifyGoogleCode } =
    await import('~/.server/admin-auth');

  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code') || '';
    const state = requestUrl.searchParams.get('state') || '';

    const { oauthState, oauthReturnTo, setCookie } =
      await consumeOauthState(request);

    if (!code || !state || !oauthState || state !== oauthState) {
      return redirect(
        `/admin/login?error=${encodeURIComponent('OAuth2 state 驗證失敗')}`,
        { headers: { 'Set-Cookie': setCookie } },
      );
    }

    const user = await verifyGoogleCode(code);
    const authCookie = await commitAdminLogin(request, user);

    return redirect(oauthReturnTo || '/admin', {
      headers: { 'Set-Cookie': authCookie },
    });
  } catch (error) {
    console.error(error);

    return redirect(
      `/admin/login?error=${encodeURIComponent('Google OAuth2 登入失敗')}`,
    );
  }
}
