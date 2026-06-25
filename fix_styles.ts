import fs from "fs";

let code = fs.readFileSync('src/pages/POBudgetPage.tsx', 'utf-8');

// The main TR for headings
code = code.replace(/<tr className="bg-slate-50 text-ink uppercase text-\[10px\] tracking-wider">/, '<tr className="bg-muted text-muted-fg uppercase text-[10px] tracking-wider">');

// Project and Month column headers
code = code.replace(/bg-slate-50 z-50/g, 'bg-muted z-50 text-muted-fg');

// Other header backgrounds that were bg-slate-50
code = code.replace(/th className="(.*?)bg-slate-50(.*?)"/g, 'th className="$1bg-muted/50 text-muted-fg$2"');

// And text-right bg-[color-name]-50/50 for headers
code = code.replace(/th className="text-right bg-([a-z]+)-50\/50 border-x py-3 px-3 border-b font-bold/g, 'th className="text-right bg-muted text-muted-fg border-x py-3 px-3 border-b font-bold');

// Let's replace the fixed bg-slate-100 and bg-slate-200 with bg-muted
code = code.replace(/bg-slate-100/g, 'bg-muted/80');
code = code.replace(/bg-slate-200\/50/g, 'bg-muted/50');
code = code.replace(/bg-slate-200/g, 'bg-muted');

// Footer TOTAL ACTUAL row
code = code.replace(/<tr className="bg-slate-50 font-bold text-muted-fg h-12 border-t-\[0.2rem\] border-slate-200">/g, '<tr className="bg-muted font-bold text-muted-fg h-12 border-t-[0.2rem] border-border">');
code = code.replace(/<tr className="bg-slate-50 font-bold text-muted-fg h-12 border-t-2">/g, '<tr className="bg-muted font-bold text-muted-fg h-12 border-t-2 border-border">');

// Footer Project and Month
code = code.replace(/td className="sticky left-0 bg-slate-50 /g, 'td className="sticky left-0 bg-muted ');
code = code.replace(/td className="sticky left-\[250px\] bg-slate-50 /g, 'td className="sticky left-[250px] bg-muted ');

// Add muted text to body
code = code.replace(/<tbody className="text-\[11px\] font-mono">/, '<tbody className="text-[11px] font-mono text-muted-fg">');

fs.writeFileSync('src/pages/POBudgetPage.tsx', code);
