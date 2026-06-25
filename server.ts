import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import nodemailer from 'nodemailer';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // Middleware to parse JSON bodies
  app.use(express.json());

  // Set up Nodemailer transporter using environment variables
  // The user needs to supply these in their .env file.
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // API endpoint to send a single payslip
  app.post('/api/send-payslip', async (req, res) => {
    const { email, employeeName, netSalary, details, month, year } = req.body;

    if (!email || !employeeName || !netSalary || !month || !year) {
       res.status(400).json({ error: 'Missing required fields' });
       return;
    }

    const { base = netSalary, ot = 0, topHero = 0, gift = 0, retro = 0, mobile = 0 } = details || {};
    const bonus = details ? details.bonus : 0;

    try {
      // In a real application, you would generate a PDF or detailed HTML file here.
      // We are sending a structured HTML email for demonstration.
      const mailOptions = {
        from: `"Nazam HR" <${process.env.SMTP_FROM || 'no-reply@example.com'}>`,
        to: email, // use a real email when testing, or the employee's setup email
        subject: `Payslip for ${month} ${year}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; max-width: 600px; line-height: 1.6; border: 1px solid #eaeaea; border-radius: 8px;">
            <h2 style="color: #1a365d; margin-bottom: 20px; border-bottom: 2px solid #ebf8ff; padding-bottom: 10px;">Monthly Payslip</h2>
            <p>Dear <strong>${employeeName}</strong>,</p>
            <p>Please find the detailed breakdown of your salary for <strong style="color: #2b6cb0;">${month} ${year}</strong> below:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
              <tr style="background-color: #f7fafc;">
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4a5568;">Base Salary</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #4a5568;">EGP ${base.toLocaleString()}</td>
              </tr>
              ${ot ? `<tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4a5568;">Overtime (Net)</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #38a169;">+ EGP ${ot.toLocaleString()}</td>
              </tr>` : ''}
              ${bonus ? `<tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4a5568;">Top Hero Bonus</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #3182ce;">+ EGP ${bonus.toLocaleString()}</td>
              </tr>` : ''}
              ${gift ? `<tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4a5568;">Gift</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #805ad5;">+ EGP ${gift.toLocaleString()}</td>
              </tr>` : ''}
              ${retro ? `<tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4a5568;">Retroactive Pay</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #718096;">+ EGP ${retro.toLocaleString()}</td>
              </tr>` : ''}
              ${mobile ? `<tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4a5568;">Mobile Allowance</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #718096;">+ EGP ${mobile.toLocaleString()}</td>
              </tr>` : ''}
              <tr style="background-color: #ebf8ff;">
                <td style="padding: 12px; border-bottom: 2px solid #2b6cb0; font-weight: bold; font-size: 16px; color: #2c5282;">Total Net Salary</td>
                <td style="padding: 12px; border-bottom: 2px solid #2b6cb0; text-align: right; font-weight: bold; font-size: 16px; color: #2c5282;">EGP ${netSalary.toLocaleString()}</td>
              </tr>
            </table>
            
            <p style="margin-top: 30px; font-size: 13px; color: #718096;">If you have any questions or require clarifications regarding this payslip, please reach out to the HR department.</p>
            <p style="font-size: 14px; font-weight: bold; color: #4a5568;">Best regards,<br/><span style="color: #2b6cb0;">Nazam HR Team</span></p>
          </div>
        `,
      };

      // Only attempt to send if SMTP setup is likely present, else simulate.
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_USER !== 'my_smtp_user') {
        await transporter.sendMail(mailOptions);
        res.json({ message: 'Payslip sent successfully' });
      } else {
        console.warn('SMTP credentials not configured in .env. Simulating email send.');
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        res.json({ 
          message: 'Payslip simulated successfully (configure SMTP to send real emails)',
          simulated: true
        });
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      let errorMessage = 'Failed to send payslip';
      if (error && error.message) {
        if (error.message.includes('Application-specific password required') || error.message.includes('534-5.7.9')) {
             errorMessage = 'Google requires an App Password to send emails. Please generate an App Password in your Google Account Security settings and update the SMTP_PASS secret.';
        } else if (error.message.includes('Invalid login')) {
          errorMessage = 'Invalid SMTP credentials. Check your SMTP configuration in the Settings/Secrets panel. If using Gmail, you MUST use an App Password.';
        }
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  // API endpoint to send multiple payslips
  app.post('/api/send-all-payslips', async (req, res) => {
    const { employees, month, year } = req.body;
    
    if (!employees || !Array.isArray(employees)) {
      res.status(400).json({ error: 'Missing employees list' });
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let authError = '';

    try {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || process.env.SMTP_USER === 'my_smtp_user') {
         console.warn('SMTP credentials not configured or using dummy values in .env. Simulating batch email send.');
         await new Promise((resolve) => setTimeout(resolve, 1500));
         res.json({ 
           message: `Simulated sending to ${employees.length} employees (configure valid SMTP settings for real emails)`,
           successCount: employees.length, 
           failCount: 0,
           simulated: true
         });
         return;
      }

      for (const emp of employees) {
        try {
          const { base = emp.netSalary, ot = 0, topHero = 0, gift = 0, retro = 0, mobile = 0 } = emp.details || {};
          const bonus = emp.details ? emp.details.bonus : 0;

          await transporter.sendMail({
            from: `"Nazam HR" <${process.env.SMTP_FROM || 'no-reply@example.com'}>`,
            to: emp.email || 'employee@example.com', // fallback to dummy for safety if not set
            subject: `Payslip for ${month} ${year}`,
            html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; max-width: 600px; line-height: 1.6; border: 1px solid #eaeaea; border-radius: 8px;">
            <h2 style="color: #1a365d; margin-bottom: 20px; border-bottom: 2px solid #ebf8ff; padding-bottom: 10px;">Monthly Payslip</h2>
            <p>Dear <strong>${emp.name}</strong>,</p>
            <p>Please find the detailed breakdown of your salary for <strong style="color: #2b6cb0;">${month} ${year}</strong> below:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
              <tr style="background-color: #f7fafc;">
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4a5568;">Base Salary</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #4a5568;">EGP ${base.toLocaleString()}</td>
              </tr>
              ${ot ? `<tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4a5568;">Overtime (Net)</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #38a169;">+ EGP ${ot.toLocaleString()}</td>
              </tr>` : ''}
              ${bonus ? `<tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4a5568;">Top Hero Bonus</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #3182ce;">+ EGP ${bonus.toLocaleString()}</td>
              </tr>` : ''}
              ${gift ? `<tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4a5568;">Gift</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #805ad5;">+ EGP ${gift.toLocaleString()}</td>
              </tr>` : ''}
              ${retro ? `<tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4a5568;">Retroactive Pay</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #718096;">+ EGP ${retro.toLocaleString()}</td>
              </tr>` : ''}
              ${mobile ? `<tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4a5568;">Mobile Allowance</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #718096;">+ EGP ${mobile.toLocaleString()}</td>
              </tr>` : ''}
              <tr style="background-color: #ebf8ff;">
                <td style="padding: 12px; border-bottom: 2px solid #2b6cb0; font-weight: bold; font-size: 16px; color: #2c5282;">Total Net Salary</td>
                <td style="padding: 12px; border-bottom: 2px solid #2b6cb0; text-align: right; font-weight: bold; font-size: 16px; color: #2c5282;">EGP ${(emp.netSalary || 0).toLocaleString()}</td>
              </tr>
            </table>
            
            <p style="margin-top: 30px; font-size: 13px; color: #718096;">If you have any questions or require clarifications regarding this payslip, please reach out to the HR department.</p>
            <p style="font-size: 14px; font-weight: bold; color: #4a5568;">Best regards,<br/><span style="color: #2b6cb0;">Nazam HR Team</span></p>
          </div>
            `,
          });
          successCount++;
        } catch (err: any) {
          console.error(`Failed to send to ${emp.email || emp.name}:`, err);
          failCount++;
          if (err && err.message) {
            if (err.message.includes('Application-specific password required') || err.message.includes('534-5.7.9')) {
               authError = 'Google requires an App Password to send emails. Please generate an App Password in your Google Account Security settings and update the SMTP_PASS secret.';
            } else if (err.message.includes('Invalid login')) {
               authError = 'Invalid SMTP credentials. Check your SMTP configuration in the Settings/Secrets panel. If using Gmail, you MUST use an App Password.';
            }
             if (authError) break; // Stop trying to send if auth fails
          }
        }
      }

      if (authError) {
        res.status(500).json({ error: authError });
      } else {
        res.json({ message: 'Batch sending completed', successCount, failCount });
      }
    } catch (error: any) {
      console.error('Batch error:', error);
      res.status(500).json({ error: 'Failed to process batch emails' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
