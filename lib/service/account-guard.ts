import "server-only";

import { redirect } from "next/navigation";
import {
  AccountSetupRequiredError,
  UnauthenticatedError,
} from "@/lib/service/account.service";

/**
 * Run a server-side data loader that needs an authenticated trading account.
 *
 * Only the two expected "not ready yet" states are turned into redirects:
 *  - no session        → /login
 *  - no account yet    → /account-setup
 *
 * Every other error is re-thrown so a real failure (a database hiccup, a bad
 * query, a transient auth refresh) surfaces instead of silently bouncing an
 * already-configured user back to the account-setup form — which is what led
 * them to submit it again and hit a duplicate-account conflict.
 */
export async function loadWithAccountGuard<T>(
  loader: () => Promise<T>
): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    if (error instanceof AccountSetupRequiredError) {
      redirect("/account-setup");
    }

    if (error instanceof UnauthenticatedError) {
      redirect("/login");
    }

    throw error;
  }
}
