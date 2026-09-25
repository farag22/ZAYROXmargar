export function canAccessAdmin(role: string | null | undefined) {
  return role === "super_admin";
}
