
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const valid = profileSchema.safeParse(body);

  if (!valid.success) {
    return Response.json(
      { success: false, error: valid.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: valid.data.fullName,
    },
  });

  if (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  return Response.json({
    success: true,
    user: data.user,
    message: "Profile updated successfully.",
  });
}
