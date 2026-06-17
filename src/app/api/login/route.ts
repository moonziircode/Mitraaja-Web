import { type NextRequest } from 'next/server';
import { anterajaClient } from '@/lib/anteraja-client';
import {
  setSessionCookie,
  createSessionCookie,
  getCookieName,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body as {
      username?: string;
      password?: string;
    };

    // ── Input validation ──────────────────────────────────────────────
    if (!username?.trim() || !password?.trim()) {
      return Response.json(
        {
          success: false,
          message: 'Agent ID dan Password harus diisi.',
        },
        { status: 400 },
      );
    }

    // ── Authenticate against Anteraja ─────────────────────────────────
    const loginResult = await anterajaClient.login(username, password);

    // ── Build encrypted session cookie ────────────────────────────────
    const cookieName = getCookieName();
    const cookieValue = setSessionCookie(loginResult.token, loginResult.user);
    const setCookieHeader = createSessionCookie(cookieName, cookieValue);

    return Response.json(
      {
        success: true,
        user: {
          name: loginResult.user.name,
          agentStaffId: loginResult.user.agentStaffId,
          storeName: loginResult.user.storeName,
        },
      },
      {
        status: 200,
        headers: { 'Set-Cookie': setCookieHeader },
      },
    );
  } catch (error) {
    console.error('[POST /api/login]', error);

    return Response.json(
      {
        success: false,
        message: 'Login gagal. Periksa kembali Agent ID dan Password.',
      },
      { status: 401 },
    );
  }
}
