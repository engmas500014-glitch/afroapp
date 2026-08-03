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

// Split a PO cell into a list. Export joins multiple values with " | ";
// also accept commas. "-" or empty means no values.
const splitList = (v: string): string[] => {
  const s = String(v || "").trim();
  if (!s || s === "-") return [];
  return s.split(/\||,/).map((x) => x.trim()).filter(Boolean);
};

// Build a column-finder for a header row. Prefers an exact match, then
// startsWith, then a loose "includes" — otherwise e.g. "ot" would wrongly
// match "total net".
const makeCol = (header: string[]) => (names: string[]) => {
  let i = header.findIndex((h) => names.some((n) => h === n));
  if (i !== -1) return i;
  i = header.findIndex((h) => names.some((n) => h.startsWith(n)));
  if (i !== -1) return i;
  return header.findIndex((h) => names.some((n) => h.includes(n)));
};

export interface SalaryImportResult {
  error?: string;
  overrides: Record<string, SalaryRecord>;
  employeeUpdates: Map<string, Partial<Employee>>; // employeeId -> employee field updates
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
  const empty: SalaryImportResult = { overrides: currentOverrides, employeeUpdates: new Map(), matched: 0, unmatched: 0 };

  const rows = parseCsv(csvText);
  if (rows.length < 2) return { ...empty, error: "الملف فاضي أو مفيهوش بيانات." };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = makeCol(header);
  const iHr = col(["hr code", "hr_code", "hrcode"]);
  // Only the true net salary column — never "gross salary" (a computed total).
  const iSalary = col(["salary (net)", "salary(net)", "net salary"]);
  const iOt = col(["ot (net)", "overtime", "ot"]);
  const iHero = col(["top hero bonus", "top hero", "hero"]);
  const iGift = col(["gift"]);
  const iRetro = col(["retro"]);
  const iMobile = col(["mobile"]);
  const iPo = col(["po number", "po_number", "ponumber"]);
  const iPoReq = col(["po amount request", "po amount", "po_amount_request"]);
  const iProject = col(["project"]);

  if (iHr === -1) return { ...empty, error: "الملف لازم يكون فيه عمود HR Code." };

  const byHr = new Map<string, Employee>(
    employees.map((emp) => [String(emp.hrCode || "").trim().toLowerCase(), emp]),
  );

  let matched = 0;
  let unmatched = 0;
  const overrides = { ...currentOverrides };
  const employeeUpdates = new Map<string, Partial<Employee>>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const hr = String(row[iHr] || "").trim().toLowerCase();
    const emp = hr ? byHr.get(hr) : undefined;
    if (!emp) { unmatched++; continue; }
    matched++;

    const key = `${emp.id}_${month}_${year}`;
    const prev = overrides[key] || ({} as SalaryRecord);
    const next: SalaryRecord = {
      ...prev,
      ot: iOt >= 0 ? toNumber(row[iOt]) : prev.ot || 0,
      bonus: prev.bonus || 0,
      topHero: iHero >= 0 ? toNumber(row[iHero]) : prev.topHero || 0,
      gift: iGift >= 0 ? toNumber(row[iGift]) : prev.gift || 0,
      retro: iRetro >= 0 ? toNumber(row[iRetro]) : prev.retro || 0,
      mobile: iMobile >= 0 ? toNumber(row[iMobile]) : prev.mobile ?? 0,
    };
    // PO fields are stored as string lists; the export joins them with " | ".
    if (iPo >= 0) next.poNumbers = splitList(row[iPo]);
    if (iPoReq >= 0) next.poAmountRequests = splitList(row[iPoReq]);
    overrides[key] = next;

    // Employee-level fields; only non-empty cells are applied so an import
    // never blanks out data the file happens not to carry.
    const empPatch: Partial<Employee> = {};
    if (iSalary >= 0) {
      const s = toNumber(row[iSalary]);
      if (s > 0) empPatch.netSalary = s;
    }
    if (iProject >= 0) {
      const p = String(row[iProject] || "").trim();
      if (p && p !== "-") empPatch.project = p;
    }
    if (Object.keys(empPatch).length > 0) employeeUpdates.set(emp.id, empPatch);
  }

  return { overrides, employeeUpdates, matched, unmatched };
}

export interface GrossImportResult {
  error?: string;
  updates: Map<string, Partial<Employee>>; // employeeId -> employee field updates
  matched: number;
  unmatched: number;
}

// Parse an exported Gross Salaries CSV and produce employee field updates
// (base salary, social insurance, taxes, medical), matching rows by HR Code.
export function parseGrossImport(
  csvText: string,
  employees: Employee[],
): GrossImportResult {
  const empty: GrossImportResult = { updates: new Map(), matched: 0, unmatched: 0 };

  const rows = parseCsv(csvText);
  if (rows.length < 2) return { ...empty, error: "الملف فاضي أو مفيهوش بيانات." };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = makeCol(header);
  const iHr = col(["hr code", "hr_code", "hrcode"]);
  const iNet = col(["salary (net)", "salary(net)", "net salary"]);
  const iSiEmp = col(["social ins. employee", "social ins employee", "social insurance employee"]);
  const iSiComp = col(["social ins. company", "social ins company", "social insurance company"]);
  const iTaxes = col(["taxes", "tax"]);
  const iMedical = col(["medical"]);

  if (iHr === -1) return { ...empty, error: "الملف لازم يكون فيه عمود HR Code." };

  const byHr = new Map<string, Employee>(
    employees.map((emp) => [String(emp.hrCode || "").trim().toLowerCase(), emp]),
  );

  let matched = 0;
  let unmatched = 0;
  const updates = new Map<string, Partial<Employee>>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const hr = String(row[iHr] || "").trim().toLowerCase();
    const emp = hr ? byHr.get(hr) : undefined;
    if (!emp) { unmatched++; continue; }
    matched++;

    const patch: Partial<Employee> = {};
    if (iNet >= 0) patch.netSalary = toNumber(row[iNet]);
    if (iSiEmp >= 0) patch.socialInsuranceEmployee = toNumber(row[iSiEmp]);
    if (iSiComp >= 0) patch.socialInsuranceCompany = toNumber(row[iSiComp]);
    if (iTaxes >= 0) patch.taxes = toNumber(row[iTaxes]);
    if (iMedical >= 0) patch.medical = toNumber(row[iMedical]);
    updates.set(emp.id, patch);
  }

  return { updates, matched, unmatched };
}
