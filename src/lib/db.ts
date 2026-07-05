import { supabase } from './supabase';
import { Employee, SafetyRecord, AccountItem, POBudget, SalaryRecord, Escalation, PermissionNode, POAcceptance, ProjectConfig, User } from '../store/AppContext';

export const loadDataFromSupabase = async () => {
  const results = await Promise.all([
    supabase.from('employees').select('*'),
    supabase.from('safety_records').select('*'),
    supabase.from('accounts').select('*'),
    supabase.from('po_budgets').select('*'),
    supabase.from('salary_records').select('*'),
    supabase.from('escalations').select('*'),
    supabase.from('permissions').select('*'),
    supabase.from('po_acceptances').select('*'),
    supabase.from('fin_config').select('*'),
    supabase.from('users').select('*')
  ]);

  results.forEach((res, i) => {
    if (res.error) {
      console.warn(`Error loading table ${i}:`, res.error);
      throw new Error(`Error loading table ${i}: ${res.error.message}`);
    }
  });

  const [
    { data: employees },
    { data: safetyRecords },
    { data: accounts },
    { data: poBudgets },
    { data: salaryOverrides },
    { data: escalations },
    { data: permissions },
    { data: poAcceptances },
    { data: finConfig },
    { data: users }
  ] = results;

  const mappedEmployees = (employees || []).map(e => ({
    id: e.id,
    hrCode: e.hr_code,
    name: e.name,
    position: e.position,
    account: e.account,
    project: e.project,
    email: e.email,
    phone1: e.phone1,
    phone2: e.phone2,
    dateHiring: e.date_hiring,
    dateResign: e.date_resign,
    status: e.status,
    netSalary: e.net_salary,
    socialInsuranceEmployee: e.social_insurance_employee,
    socialInsuranceCompany: e.social_insurance_company,
    taxes: e.taxes,
    medical: e.medical,
    bankAccount: e.bank_account,
    notes: e.notes,
  })) as Employee[];

  const mappedSafetyRecords: Record<string, SafetyRecord> = {};
  (safetyRecords || []).forEach(r => {
    mappedSafetyRecords[r.id] = {
      medicalCheck: r.medical_check,
      medicalCheckStart: r.medical_check_start,
      medicalCheckEnd: r.medical_check_end,
      workingAtHeight: r.working_at_height,
      workingAtHeightStart: r.working_at_height_start,
      workingAtHeightEnd: r.working_at_height_end,
      electricity: r.electricity,
      electricityStart: r.electricity_start,
      electricityEnd: r.electricity_end,
      riskAssessment: r.risk_assessment,
      riskAssessmentStart: r.risk_assessment_start,
      riskAssessmentEnd: r.risk_assessment_end,
      fireFighting: r.fire_fighting,
      fireFightingStart: r.fire_fighting_start,
      fireFightingEnd: r.fire_fighting_end,
      firstAid: r.first_aid,
      firstAidStart: r.first_aid_start,
      firstAidEnd: r.first_aid_end,
      ppe: r.ppe,
      ppeStart: r.ppe_start,
      ppeEnd: r.ppe_end,
    };
  });

  const mappedPoBudgets = (poBudgets || []).map(b => ({
    id: b.id,
    account: b.account,
    project: b.project,
    month: b.month,
    year: b.year,
    poAmount: b.po_amount,
    noOfStaff: b.no_of_staff,
    poSalaries: b.po_salaries,
    poOT: b.po_ot,
    poRetro: b.po_retro,
    poGifts: b.po_gifts,
    poTopHero: b.po_top_hero,
    poBreakfast: b.po_breakfast,
    poAnnual: b.po_annual,
    poMobile: b.po_mobile,
    poMedical: b.po_medical,
    poLaptop: b.po_laptop,
    poNetProfit: b.po_net_profit,
    actualBreakfast: b.actual_breakfast,
    actualAnnual: b.actual_annual,
    actualMedical: b.actual_medical,
    actualLaptop: b.actual_laptop,
    actualNetProfit: b.actual_net_profit,
    actualTopHero: b.actual_top_hero,
    customAllocations: b.custom_allocations || undefined,
    customActualAllocations: b.custom_actual_allocations || undefined,
  })) as POBudget[];

  const mappedSalaryOverrides: Record<string, SalaryRecord> = {};
  (salaryOverrides || []).forEach(r => {
    mappedSalaryOverrides[r.id] = {
      ot: r.ot ?? 0,
      bonus: r.bonus ?? 0,
      laptop: r.bonus ?? 0,
      otherCostNet: r.ot ?? 0,
      gift: r.gift ?? 0,
      retro: r.retro ?? 0,
      mobile: r.mobile ?? 0,
      topHero: r.top_hero ?? 0,
      poNumbers: r.po_numbers || undefined,
      poAmountRequests: r.po_amount_requests || undefined,
    };
  });

  const mappedEscalations = (escalations || []).map(e => ({
    id: e.id,
    employeeId: e.employee_id,
    employeeName: e.employee_name,
    managerName: e.manager_name,
    subject: e.subject,
    description: e.description,
    date: e.date,
    status: e.status,
    replies: e.replies || [],
  })) as Escalation[];

  const mappedPoAcceptances = (poAcceptances || []).map(a => ({
    id: a.id,
    month: a.month,
    year: a.year,
    poNumber: a.po_number,
    amountPo: a.amount_po,
    poAmountRequest: a.po_amount_request,
    costPo: a.cost_po,
    balancePo: a.balance_po,
    grnNumber: a.grn_number,
    grnDate: a.grn_date,
    invoiceNo: a.invoice_no,
    invoiceDate: a.invoice_date,
    collectDate: a.collect_date,
    collectState: a.collect_state,
  })) as POAcceptance[];

  const mappedFinConfig: Record<string, ProjectConfig> = {};
  (finConfig || []).forEach(c => {
    mappedFinConfig[c.id] = {
      labels: c.labels,
      actualLabels: c.actual_labels,
      customCategories: c.custom_categories || [],
      disabledCores: c.disabled_cores || [],
      grossPercentage: c.gross_percentage,
      grossPercentages: c.gross_percentages,
    };
  });

  return {
    employees: mappedEmployees,
    safetyRecords: mappedSafetyRecords,
    accounts: accounts || [],
    poBudgets: mappedPoBudgets,
    salaryOverrides: mappedSalaryOverrides,
    escalations: mappedEscalations,
    permissions: permissions || [],
    poAcceptances: mappedPoAcceptances,
    finConfig: mappedFinConfig,
    users: users || []
  };
};

export const syncEmployees = async (data: Employee[]) => {
  const ids = data.map(e => e.id);
  if (ids.length > 0) {
    const { error: deleteError } = await supabase
      .from('employees')
      .delete()
      .not('id', 'in', `(${ids.map(id => `"${id}"`).join(',')})`);
    if (deleteError) {
      console.warn("Error deleting removed employees:", deleteError);
    }
  } else {
    const { error: deleteError } = await supabase
      .from('employees')
      .delete()
      .neq('id', '_dummy_id_');
    if (deleteError) {
      console.warn("Error clearing employees:", deleteError);
    }
  }

  if (data.length > 0) {
    const mapped = data.map(e => ({
      id: e.id,
      hr_code: e.hrCode,
      name: e.name,
      position: e.position,
      account: e.account || null,
      project: e.project || null,
      email: e.email || null,
      phone1: e.phone1 || null,
      phone2: e.phone2 || null,
      date_hiring: e.dateHiring || null,
      date_resign: e.dateResign || null,
      status: e.status,
      net_salary: e.netSalary || 0,
      social_insurance_employee: e.socialInsuranceEmployee || null,
      social_insurance_company: e.socialInsuranceCompany || null,
      taxes: e.taxes || null,
      medical: e.medical || null,
      bank_account: e.bankAccount || null,
      notes: e.notes || null,
    }));
    const { error } = await supabase.from('employees').upsert(mapped);
    if (error) {
      console.warn("Error syncing employees:", error);
      throw new Error(`Error syncing employees: ${error.message}`);
    }
  }
};

export const syncSafetyRecords = async (data: Record<string, SafetyRecord>) => {
  const keys = Object.keys(data);
  if (!keys.length) return;
  const mapped = keys.map(k => {
    const r = data[k];
    return {
      id: k,
      medical_check: r.medicalCheck || 0,
      medical_check_start: r.medicalCheckStart || null,
      medical_check_end: r.medicalCheckEnd || null,
      working_at_height: r.workingAtHeight || 0,
      working_at_height_start: r.workingAtHeightStart || null,
      working_at_height_end: r.workingAtHeightEnd || null,
      electricity: r.electricity || 0,
      electricity_start: r.electricityStart || null,
      electricity_end: r.electricityEnd || null,
      risk_assessment: r.riskAssessment || 0,
      risk_assessment_start: r.riskAssessmentStart || null,
      risk_assessment_end: r.riskAssessmentEnd || null,
      fire_fighting: r.fireFighting || 0,
      fire_fighting_start: r.fireFightingStart || null,
      fire_fighting_end: r.fireFightingEnd || null,
      first_aid: r.firstAid || 0,
      first_aid_start: r.firstAidStart || null,
      first_aid_end: r.firstAidEnd || null,
      ppe: r.ppe || 0,
      ppe_start: r.ppeStart || null,
      ppe_end: r.ppeEnd || null,
    };
  });
  const { error } = await supabase.from('safety_records').upsert(mapped);
  if (error) console.warn("Error syncing safety_records:", error);
};

export const syncAccounts = async (data: AccountItem[]) => {
  const ids = data.map(x => x.id);
  if (ids.length > 0) {
    const { error: deleteError } = await supabase
      .from('accounts')
      .delete()
      .not('id', 'in', `(${ids.map(id => `"${id}"`).join(',')})`);
    if (deleteError) console.warn("Error deleting removed accounts:", deleteError);
  } else {
    const { error: deleteError } = await supabase
      .from('accounts')
      .delete()
      .neq('id', '_dummy_id_');
    if (deleteError) console.warn("Error clearing accounts:", deleteError);
  }

  if (data.length > 0) {
    const { error } = await supabase.from('accounts').upsert(data);
    if (error) {
      console.warn("Error syncing accounts:", error);
      throw new Error(`Error syncing accounts: ${error.message}`);
    }
  }
};

export const syncPoBudgets = async (data: POBudget[]) => {
  const ids = data.map(b => b.id);
  if (ids.length > 0) {
    const { error: deleteError } = await supabase
      .from('po_budgets')
      .delete()
      .not('id', 'in', `(${ids.map(id => `"${id}"`).join(',')})`);
    if (deleteError) console.warn("Error deleting removed po_budgets:", deleteError);
  } else {
    const { error: deleteError } = await supabase
      .from('po_budgets')
      .delete()
      .neq('id', '_dummy_id_');
    if (deleteError) console.warn("Error clearing po_budgets:", deleteError);
  }

  if (data.length > 0) {
    const mapped = data.map(b => ({
      id: b.id,
      account: b.account,
      project: b.project,
      month: b.month,
      year: b.year,
      po_amount: b.poAmount || 0,
      no_of_staff: b.noOfStaff || 0,
      po_salaries: b.poSalaries || 0,
      po_ot: b.poOT || 0,
      po_retro: b.poRetro || 0,
      po_gifts: b.poGifts || 0,
      po_top_hero: b.poTopHero || 0,
      po_breakfast: b.poBreakfast || 0,
      po_annual: b.poAnnual || 0,
      po_mobile: b.poMobile || 0,
      po_medical: b.poMedical || 0,
      po_laptop: b.poLaptop || 0,
      po_net_profit: b.poNetProfit || 0,
      actual_breakfast: b.actualBreakfast || 0,
      actual_annual: b.actualAnnual || 0,
      actual_medical: b.actualMedical || 0,
      actual_laptop: b.actualLaptop || 0,
      actual_net_profit: b.actualNetProfit || 0,
      actual_top_hero: b.actualTopHero || 0,
      custom_allocations: b.customAllocations || null,
      custom_actual_allocations: b.customActualAllocations || null,
    }));
    const { error } = await supabase.from('po_budgets').upsert(mapped);
    if (error) {
      console.warn("Error syncing po_budgets:", error);
      throw new Error(`Error syncing po_budgets: ${error.message}`);
    }
  }
};

export const syncSalaryOverrides = async (data: Record<string, SalaryRecord>) => {
  const keys = Object.keys(data);
  if (!keys.length) return;
  const mapped = keys.map(k => {
    const r = data[k];
    return {
      id: k,
      ot: r.otherCostNet !== undefined ? r.otherCostNet : (r.ot || 0),
      bonus: r.laptop !== undefined ? r.laptop : (r.bonus || 0),
      gift: r.gift || 0,
      retro: r.retro || 0,
      mobile: r.mobile || 0,
      top_hero: r.topHero || 0,
      po_numbers: r.poNumbers || null,
      po_amount_requests: r.poAmountRequests || null,
    };
  });
  const { error } = await supabase.from('salary_records').upsert(mapped);
  if (error) console.warn("Error syncing salary_records:", error);
};

export const syncEscalations = async (data: Escalation[]) => {
  const ids = data.map(e => e.id);
  if (ids.length > 0) {
    const { error: deleteError } = await supabase
      .from('escalations')
      .delete()
      .not('id', 'in', `(${ids.map(id => `"${id}"`).join(',')})`);
    if (deleteError) console.warn("Error deleting removed escalations:", deleteError);
  } else {
    const { error: deleteError } = await supabase
      .from('escalations')
      .delete()
      .neq('id', '_dummy_id_');
    if (deleteError) console.warn("Error clearing escalations:", deleteError);
  }

  if (data.length > 0) {
    const mapped = data.map(e => ({
      id: e.id,
      employee_id: e.employeeId,
      employee_name: e.employeeName,
      manager_name: e.managerName,
      subject: e.subject,
      description: e.description,
      date: e.date,
      status: e.status,
      replies: e.replies || [],
    }));
    const { error } = await supabase.from('escalations').upsert(mapped);
    if (error) {
      console.warn("Error syncing escalations:", error);
      throw new Error(`Error syncing escalations: ${error.message}`);
    }
  }
};

export const syncPermissions = async (data: PermissionNode[]) => {
  if (!data.length) return;
  const { error } = await supabase.from('permissions').upsert(data);
  if (error) console.warn("Error syncing permissions:", error);
};

export const syncPoAcceptances = async (data: POAcceptance[]) => {
  const ids = data.map(a => a.id);
  if (ids.length > 0) {
    const { error: deleteError } = await supabase
      .from('po_acceptances')
      .delete()
      .not('id', 'in', `(${ids.map(id => `"${id}"`).join(',')})`);
    if (deleteError) console.warn("Error deleting removed po_acceptances:", deleteError);
  } else {
    const { error: deleteError } = await supabase
      .from('po_acceptances')
      .delete()
      .neq('id', '_dummy_id_');
    if (deleteError) console.warn("Error clearing po_acceptances:", deleteError);
  }

  if (data.length > 0) {
    const mapped = data.map(a => ({
      id: a.id,
      month: a.month,
      year: a.year,
      po_number: a.poNumber,
      amount_po: a.amountPo || 0,
      po_amount_request: a.poAmountRequest || null,
      cost_po: a.costPo || 0,
      balance_po: a.balancePo || 0,
      grn_number: a.grnNumber,
      grn_date: a.grnDate,
      invoice_no: a.invoiceNo,
      invoice_date: a.invoiceDate,
      collect_date: a.collectDate,
      collect_state: a.collectState || null,
    }));
    const { error } = await supabase.from('po_acceptances').upsert(mapped);
    if (error) {
      console.warn("Error syncing po_acceptances:", error);
      throw new Error(`Error syncing po_acceptances: ${error.message}`);
    }
  }
};

export const syncFinConfig = async (data: Record<string, ProjectConfig>) => {
  const keys = Object.keys(data);
  if (!keys.length) return;
  const mapped = keys.map(k => {
    const c = data[k];
    return {
      id: k,
      labels: c.labels,
      actual_labels: c.actualLabels || null,
      custom_categories: c.customCategories || [],
      disabled_cores: c.disabledCores || [],
      gross_percentage: c.grossPercentage || null,
      gross_percentages: c.grossPercentages || null,
    };
  });
  const { error } = await supabase.from('fin_config').upsert(mapped);
  if (error) console.warn("Error syncing fin_config:", error);
};

export const syncUsers = async (data: User[]) => {
  const ids = data.map(u => u.id);
  if (ids.length > 0) {
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .not('id', 'in', `(${ids.map(id => `"${id}"`).join(',')})`);
    if (deleteError) console.warn("Error deleting removed users:", deleteError);
  } else {
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .neq('id', '_dummy_id_');
    if (deleteError) console.warn("Error clearing users:", deleteError);
  }

  if (data.length > 0) {
    const { error } = await supabase.from('users').upsert(data);
    if (error) {
      console.warn("Error syncing users:", error);
      throw new Error(`Error syncing users: ${error.message}`);
    }
  }
};
