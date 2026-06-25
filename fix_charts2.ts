import fs from "fs";

let text = fs.readFileSync("src/pages/POBudgetPage.tsx", "utf-8");
text = text.replace(/totalActualCost === 0/g, "costBreakdownData.reduce((sum, item) => sum + item.value, 0) === 0");
fs.writeFileSync("src/pages/POBudgetPage.tsx", text);
console.log("Fixed charts");
