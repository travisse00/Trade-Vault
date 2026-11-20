import { createClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validation/auth";
import { formatZodError } from "@/lib/validation/format";

export async function POST(request: Request) {
    const body = await request.json();
    const valid = registerSchema.safeParse(body);

    if(!valid.success) {
        return Response.json({ success: false, error: formatZodError(valid.error)}, {status: 400})
    }

    const supabase = await createClient()

    const authResult = await supabase.auth.signUp({
        email: valid.data.email,
        password: valid.data.password,
        options: {
            data: {
                full_name: valid.data.fullName
            }
        }
    })

    if(authResult.error) {
        return Response.json({success: false, error: authResult.error.message}, {status: 400})
    } 

    if (!authResult.data.session) {
        return Response.json({success: true, message: "Account has been created. Check your email to verify."}, {status: 201})
    }

  return Response.json({ success: valid.success, message: "Account created successfully"}, {status: 201});
}