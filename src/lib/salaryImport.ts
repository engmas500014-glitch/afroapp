import { Employee, SalaryRecord } from "../store/AppContext";

// Minimal CSV parser that understands quoted fields (matches the Export format).
export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((x) => x !== "")) rows.push(row); }
  return rows;
};

const toNumber = (v: string) => {
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
};

export interface SalaryImportResult {
  error?: string;
  overrides: Record<string, SalaryRecord>;
  salaryUpdates: Map<string, number>; // employeeId -> new base salary
  matched: number;
  unmatched: number;
}

// Parse an exported salaries/cost CSV and produce updated salary overrides for
// the given month/year, matching rows to employees strictly by HR Code.
export function parseSalaryImport(
  csvText: string,
  employees: Employee[],
  currentOverrides: Record<string, SalaryRecord>,
  month: string,
  year: number | string,
): SalaryImportResult {
  const empty: SalaryImportResult = { overrides: currentOverrides, salaryUpdates: new Map(), matched: 0, unmatched: 0 };

  const rows = parseCsv(csvText);
  if (rows.length < 2) return { ...empty, error: "الملف فاضي أو مفيهوش بيانات." };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  // Prefer an exact header match, then startsWith, then a loose "includes" as a
  // last resort — otherwise "ot" would wrongly match "total net".
  const col = (names: string[]) => {
    let i = header.findIndex((h) => names.some((n) => h === n));
    if (i !== -1) return i;
    i = header.findIndex((h) => names.some((n) => h.startsWith(n)));
    if (i !== -1) return i;
    return header.findIndex((h) => names.some((n) => h.includes(n)));
  };
  const iHr = col(["hr code", "hr_code", "hrcode"]);
  const iSalary = col(["salary (net)", "gross salary", "salary"]);
  const iOt = col(["ot (net)", "overtime", "ot"]);
  const iHero = col(["top hero bonus", "top hero", "hero"]);
  const iGift = col(["gift"]);
  const iRetro = col(["retro"]);
  const iMobile = col(["mobile"]);

  if (iHr === -1) return { ...empty, error: "الملف لازم يكون فيه عمود HR Code." };

  const byHr = new Map<string, Employee>(
    employees.map((emp) => [String(emp.hrCode || "").trim().toLowerCase(), emp]),
  );

  let matched = 0;
  let unmatched = 0;
  const overrides = { ...currentOverrides };
  const salaryUpdates = new Map<string, number>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const hr = String(row[iHr] || "").trim().toLowerCase();
    const emp = hr ? byHr.get(hr) : undefined;
    if (!emp) { unmatched++; continue; }
    matched++;

    const key = `${emp.id}_${month}_${year}`;
    const prev = overrides[key] || ({} as SalaryRecord);
    overrides[key] = {
      ...prev,
      ot: iOt >= 0 ? toNumber(row[iOt]) : prev.ot || 0,
      bonus: prev.bonus || 0,
      topHero: iHero >= 0 ? toNumber(row[iHero]) : prev.topHero || 0,
      gift: iGift >= 0 ? toNumber(row[iGift]) : prev.gift || 0,
      retro: iRetro >= 0 ? toNumber(row[iRetro]) : prev.retro || 0,
      mobile: iMobile >= 0 ? toNumber(row[iMobile]) : prev.mobile ?? 334.21,
    };

    if (iSalary >= 0) {
      const s = toNumber(row[iSalary]);
      if (s > 0) salaryUpdates.set(emp.id, s);
    }
  }

  return { overrides, salaryUpdates, matched, unmatched };
}
