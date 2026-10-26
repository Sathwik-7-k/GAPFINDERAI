import { authenticateUser, createSession, getCurrentUser, registerUser, revokeCurrentSession, setSessionCookie } from "@/lib/auth";

type AuthRequest = { action?: "register" | "signin"; name?: string; email?: string; password?: string };

export async function GET() {
  const user = await getCurrentUser();
  return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let body: AuthRequest;
  try {
    body = await request.json() as AuthRequest;
  } catch {
    return Response.json({ error: "Enter your account details." }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 12 || password.length > 256) {
    return Response.json({ error: "Use a password between 12 and 256 characters." }, { status: 400 });
  }

  try {
    let user;
    if (body.action === "register") {
      const name = body.name?.trim() ?? "";
      if (name.length < 2 || name.length > 80) return Response.json({ error: "Enter your name (2 to 80 characters)." }, { status: 400 });
      user = await registerUser(name, email, password);
    } else if (body.action === "signin") {
      user = await authenticateUser(email, password);
      if (!user) return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
    } else {
      return Response.json({ error: "Choose sign in or create account." }, { status: 400 });
    }
    const token = createSession(user.id);
    await setSessionCookie(token);
    return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed: users.email")) {
      return Response.json({ error: "An account with that email already exists. Sign in instead." }, { status: 409 });
    }
    return Response.json({ error: "Could not create your account right now." }, { status: 500 });
  }
}

export async function DELETE() {
  await revokeCurrentSession();
  return Response.json({ signedOut: true });
}