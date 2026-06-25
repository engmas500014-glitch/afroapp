const fs = require('fs');
const filePath = 'src/store/AppContext.tsx';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(
  /export type Role = "Admin" \| "HR" \| "Manager" \| "Employee";/g,
  'export type Role = "Admin" | "HR" | "Manager" | "Employee" | "Acceptances" | "PM" | "CM";'
);
content = content.replace(
  /roles: { (Admin: (?:true|false), HR: (?:true|false), Manager: (?:true|false), Employee: (?:true|false)) }/g,
  'roles: { $1, Acceptances: false, PM: false, CM: false }'
);
fs.writeFileSync(filePath, content);
console.log("Done");
