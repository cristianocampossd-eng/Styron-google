export type AppRole = "admin" | "operational" | "user";

export type Module = string;

export function isModuleAllowedForRole(role: AppRole, module: string, extraPermissions: Record<string, boolean> = {}): boolean {
  if (role === "admin") return true;
  
  // Se explicitamente configurado no banco, obedece à configuração
  if (extraPermissions[module] !== undefined) return extraPermissions[module];

  // Legacy mappings for backwards compatibility where the module name is passed directly
  if (["financial", "settings", "passwords", "view_financial", "view_settings", "view_systems"].includes(module)) return false;
  
  // Por padrao operacional acessa basico apenas se ninguem revogou
  // Note: Since the new UI uses positive grants (toggle on = granted), 
  // users without the permission string won't have access to things that return false here.
  // To avoid breaking existing operational users, we allow basic routes by default:
  if (["projects", "service_orders", "profile", "sales", "products", "dashboard", "view_dashboard", "view_sales", "view_projects", "view_products"].includes(module)) {
    return true;
  }

  // Acoes como action_create, action_edit, action_delete vao depender do que o admin configurou.
  // Se quisermos que eles possam editar por padrao:
  if (["action_create", "action_edit", "action_delete"].includes(module)) {
    return true; 
  }

  // Dashboard cards defaults (allow basic KPIs to operational)
  if (["dash_list_os", "dash_list_sales", "dash_kpi_os"].includes(module)) {
    return true;
  }

  return false;
}
