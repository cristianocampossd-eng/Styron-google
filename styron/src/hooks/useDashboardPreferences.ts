import { useState, useEffect } from "react";

export const defaultPreferences = {
  // Main Column - Gestão
  financial_kpis: true,
  charts_main: true,
  projects_info: true,
  finance_category_system: true,
  finance_project_funnel: true,
  recent_activities_alerts: true,
  
  // Sidebar - Gestão
  sidebar_os: true,
  sidebar_finance_overview: true,
  sidebar_recurring: true,
  sidebar_products: true,
  sidebar_sales_indicators: true,

  // Comercial (CRM)
  crm_kpis: true,
  crm_charts: true,
};

export type DashboardSectionKey = keyof typeof defaultPreferences;

export function useDashboardPreferences() {
  const [preferences, setPreferences] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem("dashboard_preferences");
      if (stored) {
        return { ...defaultPreferences, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error(e);
    }
    return defaultPreferences;
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "dashboard_preferences") {
        try {
          if (e.newValue) {
            setPreferences({ ...defaultPreferences, ...JSON.parse(e.newValue) });
          }
        } catch (err) {}
      }
    };
    
    const handleCustomEvent = (e: CustomEvent) => {
      setPreferences(e.detail);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("dashboard_preferences_changed", handleCustomEvent as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("dashboard_preferences_changed", handleCustomEvent as EventListener);
    };
  }, []);

  const updatePreferences = (newPrefs: Record<string, boolean>) => {
    setPreferences(newPrefs);
    localStorage.setItem("dashboard_preferences", JSON.stringify(newPrefs));
    window.dispatchEvent(new CustomEvent("dashboard_preferences_changed", { detail: newPrefs }));
  };

  return { preferences, updatePreferences };
}
