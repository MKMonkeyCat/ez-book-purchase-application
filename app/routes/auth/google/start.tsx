import type { Route } from './+types/start';
import { redirect } from 'react-router';

export async function loader({ request }: Route.LoaderArgs) {
  const { buildGoogleAuthUrl, commitOauthState, generateOauthState } =
    await import('~/.server/admin-auth');

  try {
    const requestUrl = new URL(request.url);
    const returnTo = requestUrl.searchParams.get('returnTo') || '/admin';

    const state = generateOauthState();
    const setCookie = await commitOauthState(request, state, returnTo);
    const googleAuthUrl = buildGoogleAuthUrl(state);

    return redirect(googleAuthUrl, { headers: { 'Set-Cookie': setCookie } });
  } catch (error) {
    console.error(error);

    return redirect(
      `/admin/login?error=${encodeURIComponent('Google OAuth2 啟動失敗')}`,
    );
  }
}
