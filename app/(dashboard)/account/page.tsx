import AccountClient from "../components/AccountClient";
import { getAccountPageData } from "@/lib/service/account.service";
import { loadWithAccountGuard } from "@/lib/service/account-guard";

export default async function AccountPage() {
  const { overview, history } = await loadWithAccountGuard(
    getAccountPageData
  );

  return <AccountClient overview={overview} entries={history.entries} />;
}
