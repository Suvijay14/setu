import { isCallEscalation } from "@/lib/dashboardClient";
import type { CallLog } from "@/lib/types";

/** Escalations first, then newest first. */
export function sortOrgDashboardCalls(calls: CallLog[]): CallLog[] {
  return [...calls].sort((a, b) => {
    const aEsc = isCallEscalation(a);
    const bEsc = isCallEscalation(b);
    if (aEsc !== bEsc) {
      return aEsc ? -1 : 1;
    }
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });
}
