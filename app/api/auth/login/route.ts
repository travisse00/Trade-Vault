import { createClient } from "@/lib/supabase/server";
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

  return Response.json(
    { success: true, message: "You have successfully logged in!!." },
    { status: 200 },
  );
}
