export const SETU_USER_TYPE_KEY = "setu_user_type";

export function clearSetuUserType(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SETU_USER_TYPE_KEY);
}

export function setSetuUserType(value: "family" | "hospital"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETU_USER_TYPE_KEY, value);
}
