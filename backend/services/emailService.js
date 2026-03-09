const nodemailer = require('nodemailer');

// Create transporter - Configure with Gmail SMTP
// To use: set GMAIL_USER and GMAIL_APP_PASSWORD in .env
// Get App Password: Google Account → Security → 2FA → App Passwords
const createTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('⚠️ Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

// Company info for email templates
const COMPANY_NAME = process.env.COMPANY_NAME || 'ElectroPro Solutions';
const COMPANY_EMAIL = process.env.GMAIL_USER || 'noreply@company.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Base HTML template
const baseTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f7; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #1e3a5f; padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .body { padding: 30px; }
    .body h2 { color: #1e3a5f; margin-top: 0; }
    .body p { color: #333; line-height: 1.6; }
    .button { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f4f4f7; padding: 20px; text-align: center; font-size: 12px; color: #888; }
    .info-box { background: #f0f7ff; border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .price { font-size: 28px; font-weight: bold; color: #16a34a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${COMPANY_NAME}</h1>
    </div>
    <div class="body">
      <h2>${title}</h2>
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// ============================================================
// EMAIL TEMPLATES
// ============================================================

// 1. New project created - Notify company
const notifyNewProject = async (project, electrician) => {
  const transporter = createTransporter();
  if (!transporter) return console.log('📧 [SKIP] Email not configured - New project notification');

  const content = `
    <p>A new project has been created and requires your attention.</p>
    <div class="info-box">
      <p><strong>Project:</strong> ${project.nombreCasa}</p>
      <p><strong>Address:</strong> ${project.direccion}</p>
      <p><strong>Client:</strong> ${electrician.nombre} (${electrician.email})</p>
      <p><strong>Start Date:</strong> ${new Date(project.fechaInicio).toLocaleDateString('en-US')}</p>
      <p><strong>Floor Plans:</strong> ${project.planos?.length || 0}</p>
      <p><strong>Photos:</strong> ${project.fotosLocalizacion?.length || 0}</p>
    </div>
    <a href="${FRONTEND_URL}/proyecto/${project._id}" class="button">View Project</a>
    <p>Please review and prepare an offer for this client.</p>
  `;

  try {
    await transporter.sendMail({
      from: `"${COMPANY_NAME}" <${COMPANY_EMAIL}>`,
      to: process.env.COMPANY_NOTIFICATION_EMAIL || COMPANY_EMAIL,
      subject: `🔔 New Project: ${project.nombreCasa} - ${electrician.nombre}`,
      html: baseTemplate('New Project Created', content),
    });
    console.log('📧 ✅ New project notification sent to company');
  } catch (error) {
    console.error('📧 ❌ Error sending new project email:', error.message);
  }
};

// 2. Offer sent - Notify client
const notifyOfferSent = async (project, electrician) => {
  const transporter = createTransporter();
  if (!transporter) return console.log('📧 [SKIP] Email not configured - Offer sent notification');

  const oferta = project.oferta;
  const content = `
    <p>Dear ${electrician.nombre},</p>
    <p>Great news! We have prepared a proposal for your project <strong>${project.nombreCasa}</strong>.</p>
    <div class="info-box">
      <p><strong>Project:</strong> ${project.nombreCasa}</p>
      <p><strong>Address:</strong> ${project.direccion}</p>
      ${oferta?.precioTotal ? `<p class="price">Total: €${oferta.precioTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>` : ''}
      ${oferta?.descuentoPorcentaje > 0 ? `<p><strong>Discount Applied:</strong> ${oferta.descuentoPorcentaje}%</p>` : ''}
      ${oferta?.fechaInicioInstalacion ? `<p><strong>Proposed Start:</strong> ${new Date(oferta.fechaInicioInstalacion).toLocaleDateString('en-US')}</p>` : ''}
    </div>
    <a href="${FRONTEND_URL}/proyecto/${project._id}/oferta" class="button">View Proposal</a>
    <p>Please review the proposal and let us know if you'd like to proceed.</p>
    <p>Best regards,<br>${COMPANY_NAME}</p>
  `;

  try {
    await transporter.sendMail({
      from: `"${COMPANY_NAME}" <${COMPANY_EMAIL}>`,
      to: electrician.email,
      subject: `📋 Proposal Ready: ${project.nombreCasa} - ${COMPANY_NAME}`,
      html: baseTemplate('Your Proposal is Ready', content),
    });
    console.log('📧 ✅ Offer sent notification sent to client');
  } catch (error) {
    console.error('📧 ❌ Error sending offer email:', error.message);
  }
};

// 3. Contract signed - Notify company
const notifyContractSigned = async (project, electrician) => {
  const transporter = createTransporter();
  if (!transporter) return console.log('📧 [SKIP] Email not configured - Contract signed notification');

  const content = `
    <p>The client has <strong>accepted and signed</strong> the contract for the following project:</p>
    <div class="info-box">
      <p><strong>Project:</strong> ${project.nombreCasa}</p>
      <p><strong>Client:</strong> ${electrician.nombre} (${electrician.email})</p>
      <p><strong>Address:</strong> ${project.direccion}</p>
      <p><strong>Total Price:</strong> €${project.oferta?.precioTotal?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || 'N/A'}</p>
      <p><strong>Signed on:</strong> ${new Date().toLocaleDateString('en-US')} at ${new Date().toLocaleTimeString('en-US')}</p>
    </div>
    <p>The project status has been updated to <strong>Working on Project</strong>.</p>
    <a href="${FRONTEND_URL}/proyecto/${project._id}" class="button">View Project</a>
    <p>Please begin preparations for the installation.</p>
  `;

  try {
    await transporter.sendMail({
      from: `"${COMPANY_NAME}" <${COMPANY_EMAIL}>`,
      to: process.env.COMPANY_NOTIFICATION_EMAIL || COMPANY_EMAIL,
      subject: `✅ Contract Signed: ${project.nombreCasa} - ${electrician.nombre}`,
      html: baseTemplate('Contract Signed by Client', content),
    });
    console.log('📧 ✅ Contract signed notification sent to company');
  } catch (error) {
    console.error('📧 ❌ Error sending contract signed email:', error.message);
  }
};

// 4. Project finished - Notify client (optional, triggered by admin)
const notifyProjectFinished = async (project, electrician) => {
  const transporter = createTransporter();
  if (!transporter) return console.log('📧 [SKIP] Email not configured - Project finished notification');

  const content = `
    <p>Dear ${electrician.nombre},</p>
    <p>We are pleased to inform you that the work on your project has been <strong>completed successfully</strong>.</p>
    <div class="info-box">
      <p><strong>Project:</strong> ${project.nombreCasa}</p>
      <p><strong>Address:</strong> ${project.direccion}</p>
      <p><strong>Total Amount Due:</strong> €${project.oferta?.precioTotal?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || 'N/A'}</p>
    </div>
    <p>The project is now <strong>pending payment</strong>. Please arrange payment at your earliest convenience.</p>
    <a href="${FRONTEND_URL}/proyecto/${project._id}" class="button">View Project</a>
    <p>Thank you for choosing ${COMPANY_NAME}!</p>
    <p>Best regards,<br>${COMPANY_NAME}</p>
  `;

  try {
    await transporter.sendMail({
      from: `"${COMPANY_NAME}" <${COMPANY_EMAIL}>`,
      to: electrician.email,
      subject: `🏠 Project Completed: ${project.nombreCasa} - Payment Pending`,
      html: baseTemplate('Your Project is Complete', content),
    });
    console.log('📧 ✅ Project finished notification sent to client');
  } catch (error) {
    console.error('📧 ❌ Error sending project finished email:', error.message);
  }
};

// 5. Payment received - Notify client
const notifyPaymentReceived = async (project, electrician) => {
  const transporter = createTransporter();
  if (!transporter) return console.log('📧 [SKIP] Email not configured - Payment received notification');

  const content = `
    <p>Dear ${electrician.nombre},</p>
    <p>We have received your payment for the project <strong>${project.nombreCasa}</strong>.</p>
    <div class="info-box">
      <p><strong>Project:</strong> ${project.nombreCasa}</p>
      <p><strong>Amount Paid:</strong> €${project.oferta?.precioTotal?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || 'N/A'}</p>
      <p><strong>Status:</strong> ✅ Paid in Full</p>
    </div>
    <p>Thank you for your business! We look forward to working with you again.</p>
    <p>Best regards,<br>${COMPANY_NAME}</p>
  `;

  try {
    await transporter.sendMail({
      from: `"${COMPANY_NAME}" <${COMPANY_EMAIL}>`,
      to: electrician.email,
      subject: `✅ Payment Confirmed: ${project.nombreCasa} - ${COMPANY_NAME}`,
      html: baseTemplate('Payment Received', content),
    });
    console.log('📧 ✅ Payment received notification sent to client');
  } catch (error) {
    console.error('📧 ❌ Error sending payment email:', error.message);
  }
};

module.exports = {
  notifyNewProject,
  notifyOfferSent,
  notifyContractSigned,
  notifyProjectFinished,
  notifyPaymentReceived,
  sendReminderOfertaSinRespuesta,
};

// 5. Reminder: offer sent but no client response
async function sendReminderOfertaSinRespuesta(project, electrician, diasEspera) {
  const transporter = createTransporter();
  if (!transporter) return console.log('📧 [SKIP] Email not configured - offer reminder');

  const content = `
    <p>Dear ${electrician.nombre},</p>
    <p>This is a friendly reminder that your proposal for project <strong>${project.nombreCasa}</strong> has been waiting for your response for <strong>${diasEspera} days</strong>.</p>
    <div class="info-box">
      <p><strong>Project:</strong> ${project.nombreCasa}</p>
      <p><strong>Address:</strong> ${project.direccion}</p>
      ${project.oferta?.precioTotal ? `<p><strong>Total Amount:</strong> €${project.oferta.precioTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>` : ''}
    </div>
    <a href="${FRONTEND_URL}/proyecto/${project._id}/ver-oferta" class="button">View & Sign Proposal</a>
    <p>If you have any questions, please don't hesitate to contact us.</p>
    <p>Best regards,<br>${COMPANY_NAME}</p>
  `;

  try {
    await transporter.sendMail({
      from: `"${COMPANY_NAME}" <${COMPANY_EMAIL}>`,
      to: electrician.email,
      subject: `⏰ Reminder: Your proposal is waiting — ${project.nombreCasa}`,
      html: baseTemplate('Proposal Reminder', content),
    });
    console.log('📧 ✅ Offer reminder sent to', electrician.email);
  } catch (error) {
    console.error('📧 ❌ Error sending offer reminder:', error.message);
  }
}

