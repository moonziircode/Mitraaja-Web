import { clearSessionCookie, getCookieName } from '@/lib/auth';

export async function POST() {
  const cookieName = getCookieName();
  const setCookieHeader = clearSessionCookie(cookieName);

  return Response.json(
    { success: true },
    {
      status: 200,
      headers: { 'Set-Cookie': setCookieHeader },
    },
  );
}
