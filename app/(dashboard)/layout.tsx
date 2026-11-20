
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import DashboardShell from "./components/DashboardShell";

// The layout reads the session (`cookies()`) to guard every dashboard route.
// With Cache Components enabled, that read cannot be part of the static shell,
// so this segment is allowed to block on the server instead of streaming.
export const instant = false;

async function Layout({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AuthProvider user={user}>
      <DashboardShell>
        {children}
      </DashboardShell>
    </AuthProvider>
  );
}

export default Layout;
