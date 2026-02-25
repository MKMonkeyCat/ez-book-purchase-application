import { OAuth2Client } from 'google-auth-library';
import { createCookieSessionStorage, redirect } from 'react-router';
import { randomBytes } from 'node:crypto';

export type AdminUser = {
  email: string;
  name: string;
  picture?: string;
};

const SESSION_COOKIE_NAME = '__ez_book_admin';
const SESSION_SECRET = process.env.SESSION_SECRET ?? '';
const OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID ?? '';
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '';
const OAUTH_REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? '';

const ALLOWED_ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
);

const assertAuthConfig = () => {
  if (!SESSION_SECRET) {
    throw new Error('Missing required environment variable: SESSION_SECRET');
  }

  if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET || !OAUTH_REDIRECT_URI) {
    throw new Error(
      'Missing required Google OAuth2 environment variables: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI',
    );
  }

  if (ALLOWED_ADMIN_EMAILS.size === 0) {
    throw new Error('Missing required environment variable: ADMIN_EMAILS');
  }
};

const oauthClient = new OAuth2Client({
  clientId: OAUTH_CLIENT_ID,
  clientSecret: OAUTH_CLIENT_SECRET,
  redirectUri: OAUTH_REDIRECT_URI,
});

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 4, // 4 days
    secrets: [SESSION_SECRET],
  },
});

export const getAdminSession = (request: Request) => (
  assertAuthConfig(),
  sessionStorage.getSession(request.headers.get('cookie'))
);

export const generateOauthState = () => randomBytes(16).toString('hex');

export const buildGoogleAuthUrl = (state: string) => (
  assertAuthConfig(),
  oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    state,
  })
);

export const verifyGoogleCode = async (code: string) => {
  assertAuthConfig();
  const { tokens } = await oauthClient.getToken(code);

  if (!tokens.id_token) {
    throw new Error('Google id_token missing in OAuth2 token response');
  }

  const ticket = await oauthClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: OAUTH_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) {
    throw new Error('Google account email is not verified');
  }

  const normalizedEmail = payload.email.toLowerCase();
  if (!ALLOWED_ADMIN_EMAILS.has(normalizedEmail)) {
    throw new Error('This Google account is not allowed to access admin');
  }

  return {
    email: normalizedEmail,
    name: payload.name ?? normalizedEmail,
    picture: payload.picture,
  } satisfies AdminUser;
};

export const getAdminUser = async (
  request: Request,
): Promise<AdminUser | null> => {
  assertAuthConfig();
  const session = await getAdminSession(request);
  const user = session.get('user') as AdminUser | undefined;

  if (!user?.email || !ALLOWED_ADMIN_EMAILS.has(user.email.toLowerCase())) {
    return null;
  }

  return user;
};

export const requireAdminUser = async (
  request: Request,
  redirectTo = '/admin/login',
): Promise<AdminUser> => {
  const user = await getAdminUser(request);

  if (!user) {
    throw redirect(redirectTo);
  }

  return user;
};

export const commitAdminLogin = async (request: Request, user: AdminUser) => {
  const session = await getAdminSession(request);
  session.unset('oauthState');
  session.unset('oauthReturnTo');
  session.set('user', user);

  return sessionStorage.commitSession(session);
};

export const commitOauthState = async (
  request: Request,
  state: string,
  returnTo: string,
) => {
  const session = await getAdminSession(request);
  session.set('oauthState', state);
  session.set('oauthReturnTo', returnTo);

  return sessionStorage.commitSession(session);
};

export const consumeOauthState = async (request: Request) => {
  const session = await getAdminSession(request);
  const oauthState = String(session.get('oauthState') ?? '');
  const oauthReturnTo = String(session.get('oauthReturnTo') ?? '/admin');

  session.unset('oauthState');
  session.unset('oauthReturnTo');

  return {
    oauthState,
    oauthReturnTo,
    setCookie: await sessionStorage.commitSession(session),
  };
};

export const commitAdminLogout = async (request: Request) => {
  const session = await getAdminSession(request);
  return sessionStorage.destroySession(session);
};
