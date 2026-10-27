import { supabase } from "@/lib/supabase";

function isMissingIsActiveColumn(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42703" &&
    (error.message?.includes("is_active") ?? false)
  );
}

/** Org-scoped patients; omits inactive when `is_active` exists, else all rows for org. */
export async function fetchOrgPatients<T extends string>(
  orgId: string,
  select: T,
) {
  const withActiveFilter = await supabase
    .from("patients")
    .select(select)
    .eq("org_id", orgId)
    .or("is_active.eq.true,is_active.is.null");

  if (!withActiveFilter.error) {
    return { data: withActiveFilter.data, error: null };
  }

  if (!isMissingIsActiveColumn(withActiveFilter.error)) {
    return { data: null, error: withActiveFilter.error };
  }

  const legacy = await supabase
    .from("patients")
    .select(select)
    .eq("org_id", orgId);

  return { data: legacy.data, error: legacy.error };
}
