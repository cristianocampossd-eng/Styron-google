export type AppRole = "admin" | "operational" | "user";

export const RESTRICTED_MODULES = ["dashboard", "financial", "settings", "passwords"] as const;
export type Module = "dashboard" | "projects" | "service_orders" | "financial" | "settings" | "profile" | "passwords" | "sales" | "products" | "systems";

export function isModuleAllowedForRole(role: AppRole, module: Module, extraPermissions: string[] = []): boolean {
  if (role === "admin") return true;
  if (extraPermissions.includes(module)) return true;
  // operational/user defaults
  if (["projects", "service_orders", "profile", "sales", "products"].includes(module)) return true;
  return false;
}
