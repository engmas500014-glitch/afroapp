// Standalone, lightweight payslip email server (no Vite, no static hosting).
// Runs on the Ubuntu server behind Caddy. Start with:  node email-server.mjs
// Reads SMTP settings and PORT from environment (.env or systemd EnvironmentFile).
import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';

const app = express();
const PORT = Number(process.env.PORT || 3005);

app.use(express.json({ limit: '2mb' }));

// CORS so the hosted site (afroapp.site) can reach this server over HTTPS.
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const isSmtpConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_USER !== 'my_smtp_user');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const money = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

function payslipHtml(name, month, year, details = {}, netSalary = 0) {
  const { base = netSalary, ot = 0, bonus = 0, gift = 0, retro = 0, mobile = 0, otherCostNet = 0 } = details || {};
  const row = (label, val, color) =>
    val ? `<tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#4a5568;">${label}</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;color:${color};">+ EGP ${money(val)}</td></tr>` : '';
  return `<div style="font-family:'Segoe UI',Arial,sans-serif;padding:30px;color:#333;max-width:600px;line-height:1.6;border:1px solid #eaeaea;border-radius:8px;">
    <h2 style="color:#1a365d;margin-bottom:20px;border-bottom:2px solid #ebf8ff;padding-bottom:10px;">Monthly Payslip</h2>
    <p>Dear <strong>${name}</strong>,</p>
    <p>Please find the detailed breakdown of your salary for <strong style="color:#2b6cb0;">${month} ${year}</strong> below:</p>
    <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:14px;">
      <tr style="background-color:#f7fafc;"><td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#4a5568;">Base Salary</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#4a5568;">EGP ${money(base)}</td></tr>
      ${row('Overtime (Net)', ot, '#38a169')}
      ${row('Top Hero Bonus', bonus, '#3182ce')}
      ${row('Gift', gift, '#805ad5')}
      ${row('Retroactive Pay', retro, '#718096')}
      ${row('Mobile Allowance', mobile, '#718096')}
      ${row('Other Cost (Net)', otherCostNet, '#718096')}
      <tr style="background-color:#ebf8ff;"><td style="padding:12px;border-bottom:2px solid #2b6cb0;font-weight:bold;font-size:16px;color:#2c5282;">Total Net Salary</td><td style="padding:12px;border-bottom:2px solid #2b6cb0;text-align:right;font-weight:bold;font-size:16px;color:#2c5282;">EGP ${money(netSalary)}</td></tr>
    </table>
    <p style="margin-top:30px;font-size:13px;color:#718096;">If you have any questions regarding this payslip, please reach out to the HR department.</p>
    <p style="font-size:14px;font-weight:bold;color:#4a5568;">Best regards,<br/><span style="color:#2b6cb0;">AFRO HR Team</span></p>
  </div>`;
}

function friendlyAuthError(msg) {
  if (msg && (msg.includes('534-5.7.9') || msg.includes('Application-specific password required')))
    return 'Google requires an App Password. Generate one in your Google Account Security settings and update SMTP_PASS.';
  if (msg && (msg.includes('535') || msg.includes('Invalid login')))
    return 'Invalid SMTP credentials. For Gmail you MUST use an App Password, not your normal password.';
  return null;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, smtpConfigured: isSmtpConfigured() });
});

app.post('/api/send-payslip', async (req, res) => {
  const { email, employeeName, netSalary, details, month, year } = req.body || {};
  if (!email || !employeeName || netSalary == null || !month || !year)
    return res.status(400).json({ error: 'Missing required fields' });
  if (!isSmtpConfigured())
    return res.json({ message: 'Payslip simulated (configure SMTP to send real emails)', simulated: true });
  try {
    await transporter.sendMail({
      from: `"AFRO HR" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: `Payslip for ${month} ${year}`,
      html: payslipHtml(employeeName, month, year, details, netSalary),
    });
    res.json({ message: 'Payslip sent successfully' });
  } catch (err) {
    res.status(500).json({ error: friendlyAuthError(err?.message) || err?.message || 'Failed to send payslip' });
  }
});

app.post('/api/send-all-payslips', async (req, res) => {
  const { employees, month, year } = req.body || {};
  if (!Array.isArray(employees)) return res.status(400).json({ error: 'Missing employees list' });
  if (!isSmtpConfigured())
    return res.json({ message: `Simulated sending to ${employees.length} employees`, successCount: employees.length, failCount: 0, simulated: true });

  let successCount = 0, failCount = 0, authError = '';
  for (const emp of employees) {
    if (!emp.email) { failCount++; continue; }
    try {
      await transporter.sendMail({
        from: `"AFRO HR" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: emp.email,
        subject: `Payslip for ${month} ${year}`,
        html: payslipHtml(emp.name, month, year, emp.details, emp.netSalary),
      });
      successCount++;
    } catch (err) {
      failCount++;
      const fe = friendlyAuthError(err?.message);
      if (fe) { authError = fe; break; }
    }
  }
  if (authError) return res.status(500).json({ error: authError });
  res.json({ message: 'Batch sending completed', successCount, failCount });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[${new Date().toISOString()}] AFRO email server on 127.0.0.1:${PORT} (smtp=${isSmtpConfigured()})`);
});
