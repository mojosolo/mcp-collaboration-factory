import { Resend } from "resend";
import { render } from "@react-email/render";
import { Email } from "../../domain/entities/email";
import { IEmailProvider } from "../../domain/services/email-service";

export class ResendEmailProvider implements IEmailProvider {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async sendEmail(email: Email): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Prepare email data
      const emailData = {
        from: email.fromName ? `${email.fromName} <${email.from}>` : email.from,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        subject: email.subject,
        html: email.htmlContent,
        text: email.textContent,
        replyTo: email.replyTo,
        tags: this.prepareTags(email.tags),
        headers: this.prepareHeaders(email),
      };

      // Remove undefined fields
      Object.keys(emailData).forEach((key) => {
        if (emailData[key as keyof typeof emailData] === undefined) {
          delete emailData[key as keyof typeof emailData];
        }
      });

      const result = await this.resend.emails.send(emailData);

      if (result.error) {
        return {
          success: false,
          error: result.error.message,
        };
      }

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      console.error("Resend email sending failed:", error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async sendTemplatedEmail(templateComponent: React.ReactElement): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Render React template to HTML
      const html = render(templateComponent);

      // Extract email props from the component
      const props = templateComponent.props;

      const result = await this.resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: props.to || [],
        subject: props.subject || "ProjectWE Notification",
        html,
        tags: props.tags || [],
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message,
        };
      }

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      console.error("Resend templated email sending failed:", error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  private prepareTags(tags: string[]): Array<{ name: string; value: string }> {
    return tags.map((tag) => ({
      name: "category",
      value: tag,
    }));
  }

  private prepareHeaders(email: Email): Record<string, string> {
    const headers: Record<string, string> = {};

    // Add tracking headers
    if (email.id) {
      headers["X-Email-ID"] = email.id;
    }

    if (email.userId) {
      headers["X-User-ID"] = email.userId;
    }

    if (email.referenceId && email.referenceType) {
      headers["X-Reference-ID"] = email.referenceId;
      headers["X-Reference-Type"] = email.referenceType;
    }

    // Add unsubscribe header
    if (email.userId) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://projectwe.ai";
      headers["List-Unsubscribe"] =
        `<${baseUrl}/unsubscribe?user=${email.userId}>`;
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }

    return headers;
  }

  // Webhook handler for delivery events
  async handleWebhook(payload: any): Promise<void> {
    try {
      const { type, data } = payload;

      switch (type) {
        case "email.sent":
          await this.handleEmailSent(data);
          break;
        case "email.delivered":
          await this.handleEmailDelivered(data);
          break;
        case "email.delivery_delayed":
          await this.handleEmailDelayed(data);
          break;
        case "email.complained":
          await this.handleEmailComplaint(data);
          break;
        case "email.bounced":
          await this.handleEmailBounced(data);
          break;
        default:
          console.log("Unhandled webhook type:", type);
      }
    } catch (error) {
      console.error("Webhook handling failed:", error);
    }
  }

  private async handleEmailSent(data: any): Promise<void> {
    // Update email status in database
    console.log("Email sent:", data);
    // This would typically trigger a domain event
  }

  private async handleEmailDelivered(data: any): Promise<void> {
    // Update email status in database
    console.log("Email delivered:", data);
    // This would typically trigger a domain event
  }

  private async handleEmailDelayed(data: any): Promise<void> {
    // Log delivery delay
    console.log("Email delivery delayed:", data);
  }

  private async handleEmailComplaint(data: any): Promise<void> {
    // Handle spam complaint
    console.log("Email complaint received:", data);
    // This should trigger unsubscribe and domain event
  }

  private async handleEmailBounced(data: any): Promise<void> {
    // Handle bounce
    console.log("Email bounced:", data);
    // This would typically trigger a domain event and possibly unsubscribe
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Try to get domains to validate API key
      const domains = await this.resend.domains.list();
      return !domains.error;
    } catch (error) {
      return false;
    }
  }

  async getDomains(): Promise<any[]> {
    try {
      const result = await this.resend.domains.list();
      return result.data?.data || [];
    } catch (error) {
      console.error("Failed to get domains:", error);
      return [];
    }
  }

  async getEmailStats(emailId: string): Promise<any> {
    try {
      // Note: Resend doesn't have a direct stats API for individual emails
      // This would need to be implemented via webhooks and database tracking
      return null;
    } catch (error) {
      console.error("Failed to get email stats:", error);
      return null;
    }
  }
}
