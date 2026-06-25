import fs from "fs";

let text = fs.readFileSync("src/pages/DashboardPage.tsx", "utf-8");

const emptyState = `{data.length === 0 || data.every(d => d.po === 0 && d.actual === 0) ? (
              <div className="flex h-full w-full items-center justify-center text-sm italic text-muted-fg">No data to display</div>
            ) : (`

const emptyState2 = `{costTrends.length === 0 || costTrends.every(d => d.totalCost === 0) ? (
              <div className="flex h-full w-full items-center justify-center text-sm italic text-muted-fg">No data to display</div>
            ) : (`

text = text.replace(/<ResponsiveContainer\n\s*width="100%"\n\s*height="100%"\n\s*minWidth=\{1\}\n\s*minHeight=\{1\}\n\s*>/g,
  `{data && (data.length === 0 || data.every(d => d.po === 0 && d.actual === 0)) ? (
              <div className="flex h-full w-full items-center justify-center text-sm italic text-muted-fg">No data to display</div>
            ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>`
);

text = text.replace(/<\/ResponsiveContainer>/g, '</ResponsiveContainer>\n            )}');

// Fix costTrends specifically since it might use `costTrends` instead of `data`
text = text.replace(/\{data && \(data\.length === 0 \|\| data\.every\(d => d\.po === 0 && d\.actual === 0\)\) \? \(\n\s*<div className="flex h-full w-[^<]+<ResponsiveContainer width="100%" height="100%" minWidth=\{1\} minHeight=\{1\}>\n\s*<LineChart\n\s*data=\{costTrends\}/, 
  `{costTrends && (costTrends.length === 0 || costTrends.every((d: any) => d.totalCost === 0)) ? (
              <div className="flex h-full w-full items-center justify-center text-sm italic text-muted-fg">No data to display</div>
            ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <LineChart
                data={costTrends}`
);

fs.writeFileSync("src/pages/DashboardPage.tsx", text);
console.log("Fixed charts dashboard");
