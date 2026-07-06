// The payslip email API lives in server.ts (Express + Nodemailer), which does
// not exist on the static production host (GitHub Pages). In production the
// server runs elsewhere (e.g. on the admin's PC exposed through a tunnel) and
// its public URL is configured in Settings, stored in localStorage.
// An empty base URL means "same origin" — which works in local development
// where the Express server also serves the app.

const STORAGE_KEY = "custom_email_server_url";

export const getEmailServerUrl = (): string => {
  if (typeof window === "undefined") return "";
  const saved = localStorage.getItem(STORAGE_KEY) || "";
  return saved.trim().replace(/\/+$/, "");
};

export const setEmailServerUrl = (url: string) => {
  const cleaned = url.trim().replace(/\/+$/, "");
  if (cleaned) {
    localStorage.setItem(STORAGE_KEY, cleaned);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

// Build the comma-separated CC list of manager emails for an employee's project.
export const ccForProject = (
  managers: Record<string, string[]>,
  project?: string,
): string | undefined => {
  if (!project) return undefined;
  const list = (managers[project] || [])
    .map((s) => (s || "").trim())
    .filter(Boolean);
  return list.length ? list.join(", ") : undefined;
};

export const isEmailServerConfigured = (): boolean => {
  // In dev the API is same-origin; in production a URL must be configured.
  return Boolean(getEmailServerUrl()) || process.env.NODE_ENV !== "production";
};

export interface EmailServerHealth {
  ok: boolean;
  smtpConfigured: boolean;
}

export const checkEmailServerHealth = async (): Promise<EmailServerHealth> => {
  const res = await fetch(`${getEmailServerUrl()}/api/health`);
  if (!res.ok) throw new Error(`Health check failed with status ${res.status}`);
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("The URL did not respond like the email server (no JSON health response)");
  }
  return res.json();
};
