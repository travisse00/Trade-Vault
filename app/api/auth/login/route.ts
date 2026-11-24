import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";
import { formatZodError } from "@/lib/validation/format";

export async function POST(request: Request) {
    const body = await request.json();
    const valid = loginSchema.safeParse(body);

  if (!valid.success) {
    return Response.json(
      { success: false, error: formatZodError(valid.error) },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const authResult = await supabase.auth.signInWithPassword({
    email: valid.data.email,
    password: valid.data.password,
  });

  if (authResult.error) {
    return Response.json(
      { success: false, error: authResult.error.message },
      { status: 400 },
    );
  }

  if (!authResult.data.session) {
    return Response.json(
  { success: false, error: "Unable to establish a session." },
  { status: 401 }
);
  }

  // Send first-time users straight to account setup. A failed lookup must not
  // block a valid login — the destination pages still run their own account
  // guard, so fall back to the dashboard in that case.
  let hasAccount = true;
  const userId = authResult.data.user?.id;

  if (userId) {
    try {
      const account = await prisma.tradingAccount.findUnique({
        where: { userId },
        select: { id: true },
      });

      hasAccount = account !== null;
    } catch (error) {
      console.error("Account lookup after login failed:", error);
    }
  }

  return Response.json(
    {
      success: true,
      message: "You have successfully logged in!!.",
      hasAccount,
      redirectTo: hasAccount ? "/dashboard" : "/account-setup",
    },
    { status: 200 },
  );
}
