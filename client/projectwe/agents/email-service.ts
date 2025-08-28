import { Resend } from "resend";
import nodemailer from "nodemailer";

// Initialize Resend client conditionally
let resend: Resend | null = null;
if (
  process.env.RESEND_API_KEY &&
  process.env.RESEND_API_KEY !== "re_your_resend_api_key_here"
) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

// Initialize Mailgun SMTP client as fallback
const mailgunTransporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp.mailgun.org",
  port: parseInt(process.env.MAIL_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});

// Check email service availability
export async function getEmailServiceStatus() {
  const hasResend =
    !!process.env.RESEND_API_KEY &&
    process.env.RESEND_API_KEY !== "re_your_resend_api_key_here";
  const hasMailgun = !!(
    process.env.MAIL_USERNAME &&
    process.env.MAIL_PASSWORD &&
    process.env.MAIL_HOST
  );

  return {
    resend: hasResend,
    mailgun: hasMailgun,
    hasService: hasResend || hasMailgun,
    preferredProvider: hasResend ? "resend" : hasMailgun ? "mailgun" : "none",
  };
}

// Email templates
export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

// Email options
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  tags?: Array<{ name: string; value: string }>;
}

// Send email function with multi-provider support
export async function sendEmail(options: SendEmailOptions) {
  const serviceStatus = getEmailServiceStatus();

  if (!serviceStatus.hasService) {
    return {
      success: false,
      error:
        "No email service configured. Please configure either Resend API key or Mailgun credentials.",
    };
  }

  try {
    const from =
      options.from ||
      `${process.env.EMAIL_FROM_NAME || "ProjectWE Team"} <${process.env.EMAIL_FROM || process.env.MAIL_FROM_ADDRESS}>`;

    // Try Resend first if available
    if (serviceStatus.resend && resend) {
      try {
        const result = await resend.emails.send({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          cc: options.cc,
          bcc: options.bcc,
          replyTo: options.replyTo,
          attachments: options.attachments,
          tags: options.tags,
        });

        return {
          success: true,
          data: result,
          provider: "resend",
        };
      } catch (resendError) {
        console.warn("Resend failed, falling back to Mailgun:", resendError);
        if (!serviceStatus.mailgun) {
          throw resendError; // If no fallback, throw the original error
        }
      }
    }

    // Use Mailgun as fallback or primary
    if (serviceStatus.mailgun) {
      const mailOptions = {
        from,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        cc: Array.isArray(options.cc) ? options.cc.join(", ") : options.cc,
        bcc: Array.isArray(options.bcc) ? options.bcc.join(", ") : options.bcc,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      };

      const result = await mailgunTransporter.sendMail(mailOptions);

      return {
        success: true,
        data: result,
        provider: "mailgun",
      };
    }

    throw new Error("No email service available");
  } catch (error) {
    console.error("Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
      provider: serviceStatus.preferredProvider,
    };
  }
}

// Email template functions
export function getWorkspaceInvitationTemplate(data: {
  workspaceName: string;
  inviterName: string;
  inviterEmail: string;
  invitationLink: string;
  message?: string;
}): EmailTemplate {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Workspace Invitation</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #7C3AED;
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .button {
            display: inline-block;
            background-color: #7C3AED;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>You're Invited to Join ${data.workspaceName}</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>${data.inviterName} (${data.inviterEmail}) has invited you to join the <strong>${data.workspaceName}</strong> workspace on ProjectWE.</p>
          ${data.message ? `<p><em>"${data.message}"</em></p>` : ""}
          <p>Click the button below to accept the invitation and get started:</p>
          <div style="text-align: center;">
            <a href="${data.invitationLink}" class="button">Accept Invitation</a>
          </div>
          <p>This invitation will expire in 7 days. If you have any questions, please contact ${data.inviterName}.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ProjectWE. All rights reserved.</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
You're Invited to Join ${data.workspaceName}

${data.inviterName} (${data.inviterEmail}) has invited you to join the ${data.workspaceName} workspace on ProjectWE.

${data.message ? `Message: "${data.message}"` : ""}

Accept the invitation: ${data.invitationLink}

This invitation will expire in 7 days. If you have any questions, please contact ${data.inviterName}.

© ${new Date().getFullYear()} ProjectWE. All rights reserved.
If you didn't expect this invitation, you can safely ignore this email.
  `;

  return {
    subject: `You're invited to join ${data.workspaceName}`,
    html,
    text,
  };
}

export function getPasswordResetTemplate(data: {
  userName: string;
  resetLink: string;
}): EmailTemplate {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #7C3AED;
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .button {
            display: inline-block;
            background-color: #7C3AED;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reset Your Password</h1>
        </div>
        <div class="content">
          <p>Hi ${data.userName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center;">
            <a href="${data.resetLink}" class="button">Reset Password</a>
          </div>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ProjectWE. All rights reserved.</p>
          <p>For security, this link can only be used once.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
Reset Your Password

Hi ${data.userName},

We received a request to reset your password. Visit the link below to create a new password:

${data.resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, please ignore this email and your password will remain unchanged.

© ${new Date().getFullYear()} ProjectWE. All rights reserved.
For security, this link can only be used once.
  `;

  return {
    subject: "Reset Your ProjectWE Password",
    html,
    text,
  };
}

export function getWeeklyDigestTemplate(data: {
  userName: string;
  weekSummary: {
    tasksCompleted: number;
    documentsShared: number;
    newMembers: number;
    upcomingDeadlines: Array<{
      title: string;
      dueDate: string;
    }>;
  };
  dashboardLink: string;
}): EmailTemplate {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Weekly Digest</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #7C3AED;
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .stat-box {
            display: inline-block;
            background-color: white;
            padding: 20px;
            margin: 10px;
            border-radius: 8px;
            text-align: center;
            min-width: 150px;
          }
          .stat-number {
            font-size: 36px;
            font-weight: bold;
            color: #7C3AED;
          }
          .stat-label {
            color: #666;
            font-size: 14px;
          }
          .button {
            display: inline-block;
            background-color: #7C3AED;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Your Weekly Digest</h1>
        </div>
        <div class="content">
          <p>Hi ${data.userName},</p>
          <p>Here's what happened in your workspace this week:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div class="stat-box">
              <div class="stat-number">${data.weekSummary.tasksCompleted}</div>
              <div class="stat-label">Tasks Completed</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">${data.weekSummary.documentsShared}</div>
              <div class="stat-label">Documents Shared</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">${data.weekSummary.newMembers}</div>
              <div class="stat-label">New Members</div>
            </div>
          </div>
          
          ${
            data.weekSummary.upcomingDeadlines.length > 0
              ? `
            <h3>Upcoming Deadlines</h3>
            <ul>
              ${data.weekSummary.upcomingDeadlines
                .map(
                  (deadline) =>
                    `<li><strong>${deadline.title}</strong> - Due ${deadline.dueDate}</li>`,
                )
                .join("")}
            </ul>
          `
              : ""
          }
          
          <div style="text-align: center;">
            <a href="${data.dashboardLink}" class="button">View Dashboard</a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ProjectWE. All rights reserved.</p>
          <p>You're receiving this because you're subscribed to weekly digests.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
Your Weekly Digest

Hi ${data.userName},

Here's what happened in your workspace this week:

Tasks Completed: ${data.weekSummary.tasksCompleted}
Documents Shared: ${data.weekSummary.documentsShared}
New Members: ${data.weekSummary.newMembers}

${
  data.weekSummary.upcomingDeadlines.length > 0
    ? `
Upcoming Deadlines:
${data.weekSummary.upcomingDeadlines
  .map((deadline) => `- ${deadline.title} - Due ${deadline.dueDate}`)
  .join("
")}
`
    : ""
}

View your dashboard: ${data.dashboardLink}

© ${new Date().getFullYear()} ProjectWE. All rights reserved.
You're receiving this because you're subscribed to weekly digests.
  `;

  return {
    subject: "Your ProjectWE Weekly Digest",
    html,
    text,
  };
}

// Subscription welcome email
export async function sendSubscriptionWelcome(
  to: string,
  data: {
    userName: string;
    planName: string;
    billingCycle: string;
  },
) {
  const template = createSubscriptionWelcomeTemplate(data);
  return sendEmail({
    to,
    ...template,
  });
}

function createSubscriptionWelcomeTemplate(data: {
  userName: string;
  planName: string;
  billingCycle: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #7C3AED; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: white; padding: 30px; border-radius: 0 0 8px 8px; }
          .plan-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .plan-name { font-size: 24px; font-weight: bold; color: #7C3AED; }
          .button { display: inline-block; background-color: #7C3AED; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ProjectWE ${data.planName}!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName},</p>
            <p>Thank you for subscribing to ProjectWE! Your subscription is now active.</p>
            
            <div class="plan-box">
              <div class="plan-name">${data.planName} Plan</div>
              <p>Billed ${data.billingCycle}ly</p>
            </div>
            
            <h3>What's included in your plan:</h3>
            <ul>
              <li>Unlimited exit planning workflows</li>
              <li>AI-powered document analysis</li>
              <li>Team collaboration features</li>
              <li>Priority support</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXTAUTH_URL}/dashboard" class="button">Go to Dashboard</a>
            </div>
            
            <p>If you have any questions, our support team is here to help!</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    subject: `Welcome to ProjectWE ${data.planName}!`,
    html,
    text: `Welcome to ProjectWE ${data.planName}!

Hi ${data.userName},

Thank you for subscribing! Your ${data.planName} plan is now active.`,
  };
}

// Plan change notification
export async function sendPlanChangeNotification(
  to: string,
  data: {
    userName: string;
    oldPlan: string;
    newPlan: string;
    effectiveDate: Date;
  },
) {
  const template = createPlanChangeTemplate(data);
  return sendEmail({
    to,
    ...template,
  });
}

function createPlanChangeTemplate(data: {
  userName: string;
  oldPlan: string;
  newPlan: string;
  effectiveDate: Date;
}) {
  const isUpgrade =
    ["starter", "professional", "enterprise"].indexOf(data.newPlan) >
    ["starter", "professional", "enterprise"].indexOf(data.oldPlan);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #7C3AED; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: white; padding: 30px; border-radius: 0 0 8px 8px; }
          .change-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .old-plan { color: #999; text-decoration: line-through; }
          .new-plan { color: #7C3AED; font-weight: bold; font-size: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Plan Has Been ${isUpgrade ? "Upgraded" : "Changed"}</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName},</p>
            <p>Your ProjectWE subscription has been successfully updated.</p>
            
            <div class="change-box">
              <p class="old-plan">${data.oldPlan}</p>
              <p>↓</p>
              <p class="new-plan">${data.newPlan}</p>
              <p><small>Effective: ${data.effectiveDate.toLocaleDateString()}</small></p>
            </div>
            
            ${
              isUpgrade
                ? `
              <h3>New features unlocked:</h3>
              <ul>
                <li>Increased team member limits</li>
                <li>More AI credits per month</li>
                <li>Advanced analytics and reporting</li>
                <li>Priority support</li>
              </ul>
            `
                : ""
            }
            
            <p>Your next bill will reflect this change.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    subject: `Your ProjectWE plan has been ${isUpgrade ? "upgraded" : "changed"}`,
    html,
    text: `Your plan has been changed from ${data.oldPlan} to ${data.newPlan}, effective ${data.effectiveDate.toLocaleDateString()}`,
  };
}

// Subscription cancellation
export async function sendSubscriptionCancellation(
  to: string,
  data: {
    userName: string;
    endDate: Date;
  },
) {
  const template = createCancellationTemplate(data);
  return sendEmail({
    to,
    ...template,
  });
}

function createCancellationTemplate(data: { userName: string; endDate: Date }) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: white; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #7C3AED; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Subscription Cancelled</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName},</p>
            <p>We're sorry to see you go. Your ProjectWE subscription has been cancelled.</p>
            
            <p><strong>Access until: ${data.endDate.toLocaleDateString()}</strong></p>
            
            <p>You'll continue to have access to your account until the end of your billing period. After that, your account will be downgraded to the free plan.</p>
            
            <h3>What happens next?</h3>
            <ul>
              <li>Your data will be preserved for 30 days</li>
              <li>You can reactivate anytime</li>
              <li>Free plan features will remain available</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXTAUTH_URL}/settings/billing" class="button">Reactivate Subscription</a>
            </div>
            
            <p>We'd love to hear your feedback about why you're leaving.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    subject: "Your ProjectWE subscription has been cancelled",
    html,
    text: `Your subscription has been cancelled. You'll have access until ${data.endDate.toLocaleDateString()}.`,
  };
}

// Payment receipt
export async function sendPaymentReceipt(
  to: string,
  data: {
    invoiceId: string;
    amount: number;
    currency: string;
    invoiceUrl: string;
    billingPeriod: { start: Date; end: Date };
  },
) {
  const template = createReceiptTemplate(data);
  return sendEmail({
    to,
    ...template,
  });
}

function createReceiptTemplate(data: {
  invoiceId: string;
  amount: number;
  currency: string;
  invoiceUrl: string;
  billingPeriod: { start: Date; end: Date };
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10b981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: white; padding: 30px; border-radius: 0 0 8px 8px; }
          .receipt-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .amount { font-size: 32px; font-weight: bold; color: #10b981; }
          .button { display: inline-block; background-color: #7C3AED; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Received</h1>
          </div>
          <div class="content">
            <p>Thank you for your payment!</p>
            
            <div class="receipt-box">
              <div class="amount">${data.currency} ${data.amount.toFixed(2)}</div>
              <p>Invoice #${data.invoiceId}</p>
              <p>Billing period: ${data.billingPeriod.start.toLocaleDateString()} - ${data.billingPeriod.end.toLocaleDateString()}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${data.invoiceUrl}" class="button">View Invoice</a>
            </div>
            
            <p>This receipt is for your records. No action is required.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    subject: `Payment receipt for ${data.currency} ${data.amount.toFixed(2)}`,
    html,
    text: `Payment received: ${data.currency} ${data.amount.toFixed(2)}. Invoice: ${data.invoiceId}`,
  };
}

// Payment failure notification
export async function sendPaymentFailure(
  to: string,
  data: {
    amount: number;
    currency: string;
    attemptCount: number;
    nextRetryDate: Date | null;
  },
) {
  const template = createPaymentFailureTemplate(data);
  return sendEmail({
    to,
    ...template,
  });
}

function createPaymentFailureTemplate(data: {
  amount: number;
  currency: string;
  attemptCount: number;
  nextRetryDate: Date | null;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: white; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert-box { background-color: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Failed</h1>
          </div>
          <div class="content">
            <p>We were unable to process your payment.</p>
            
            <div class="alert-box">
              <p><strong>Amount due: ${data.currency} ${data.amount.toFixed(2)}</strong></p>
              <p>Attempt: ${data.attemptCount}</p>
              ${data.nextRetryDate ? `<p>Next retry: ${data.nextRetryDate.toLocaleDateString()}</p>` : ""}
            </div>
            
            <p>Please update your payment method to avoid service interruption.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXTAUTH_URL}/settings/billing" class="button">Update Payment Method</a>
            </div>
            
            ${
              data.attemptCount >= 3
                ? `
              <p><strong>Warning:</strong> After 3 failed attempts, your account may be suspended.</p>
            `
                : ""
            }
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    subject: "Action required: Payment failed",
    html,
    text: `Payment failed for ${data.currency} ${data.amount.toFixed(2)}. Please update your payment method.`,
  };
}

// Checkout confirmation
export async function sendCheckoutConfirmation(
  to: string,
  data: {
    customerName: string;
    amountTotal: number;
    currency: string;
  },
) {
  const template = createCheckoutConfirmationTemplate(data);
  return sendEmail({
    to,
    ...template,
  });
}

function createCheckoutConfirmationTemplate(data: {
  customerName: string;
  amountTotal: number;
  currency: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10b981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: white; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #7C3AED; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Thank you for your order! Your payment of <strong>${data.currency} ${data.amountTotal.toFixed(2)}</strong> has been successfully processed.</p>
            
            <p>You now have full access to your ProjectWE account.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXTAUTH_URL}/dashboard" class="button">Go to Dashboard</a>
            </div>
            
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    subject: "Order confirmed - Welcome to ProjectWE!",
    html,
    text: `Order confirmed! Your payment of ${data.currency} ${data.amountTotal.toFixed(2)} has been processed.`,
  };
}

// Batch email sending for notifications
export async function sendBatchEmails(emails: SendEmailOptions[]) {
  try {
    const results = await Promise.allSettled(
      emails.map((email) => sendEmail(email)),
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return {
      success: failed === 0,
      sent: successful,
      failed,
      results,
    };
  } catch (error) {
    console.error("Batch email send error:", error);
    return {
      success: false,
      sent: 0,
      failed: emails.length,
      error:
        error instanceof Error ? error.message : "Failed to send batch emails",
    };
  }
}
