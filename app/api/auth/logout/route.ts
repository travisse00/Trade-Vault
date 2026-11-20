import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();

  const authResult = await supabase.auth.signOut()

  if(authResult.error) {
    return Response.json({success: false, message: "Failed to logout."}, {status: 400})
  }

  return Response.json({success: true, message: "Logged out."}, {status: 200})
}