export const dashboardModules = [
  "pulse",
  "cashFlow",
  "spending",
  "position",
  "recent",
] as const;
export type DashboardModule = (typeof dashboardModules)[number];
export interface Personalization {
  accent: "prism" | "slate" | "olive";
  density: "comfortable" | "compact";
  motion: "system" | "full" | "reduced";
  analyticsBar: boolean;
  privacyMode: boolean;
  landingPage: "dashboard" | "transactions" | "analytics" | "accounts";
  sidebarCompact: boolean;
  chartAnimation: boolean;
  compactLegend: boolean;
  dateFormat: "locale" | "iso";
  dashboardOrder: DashboardModule[];
  hiddenModules: DashboardModule[];
  showAccounts: boolean;
  showGoals: boolean;
  showDebts: boolean;
}
export const defaultPersonalization: Personalization = {
  accent: "prism",
  density: "comfortable",
  motion: "system",
  analyticsBar: true,
  privacyMode: false,
  landingPage: "dashboard",
  sidebarCompact: false,
  chartAnimation: true,
  compactLegend: false,
  dateFormat: "locale",
  dashboardOrder: ['cashFlow', 'spending', 'position', 'recent', 'pulse'],
  hiddenModules: [],
  showAccounts: true,
  showGoals: true,
  showDebts: true,
};
export function sanitizePersonalization(value: unknown): Personalization {
  const result = {
    ...defaultPersonalization,
    dashboardOrder: [...defaultPersonalization.dashboardOrder],
    hiddenModules: [] as DashboardModule[],
  };
  if (!value || typeof value !== "object") return result;
  const saved = value as Record<string, unknown>;
  for (const key of [
    "analyticsBar",
    "privacyMode",
    "sidebarCompact",
    "chartAnimation",
    "compactLegend",
    "showAccounts",
    "showGoals",
    "showDebts",
  ] as const)
    if (typeof saved[key] === "boolean") result[key] = saved[key];
  const choices = {
    accent: ["prism", "slate", "olive"],
    density: ["comfortable", "compact"],
    motion: ["system", "full", "reduced"],
    landingPage: ["dashboard", "transactions", "analytics", "accounts"],
    dateFormat: ["locale", "iso"],
  } as const;
  for (const key of Object.keys(choices) as (keyof typeof choices)[])
    if ((choices[key] as readonly unknown[]).includes(saved[key]))
      Object.assign(result, { [key]: saved[key] });
  if (Array.isArray(saved.dashboardOrder))
    result.dashboardOrder = [
      ...new Set(
        saved.dashboardOrder.filter((s): s is DashboardModule =>
          dashboardModules.includes(s as DashboardModule),
        ),
      ),
      ...dashboardModules,
    ].filter((s, i, a) => a.indexOf(s) === i);
  if (Array.isArray(saved.hiddenModules))
    result.hiddenModules = [
      ...new Set(
        saved.hiddenModules.filter((s): s is DashboardModule =>
          dashboardModules.includes(s as DashboardModule),
        ),
      ),
    ];
  return result;
}
