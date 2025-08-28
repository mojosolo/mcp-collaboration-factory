import crypto from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";

// MFA Types
export type MFAMethod = "totp" | "sms" | "email" | "backup_codes";

// MFA Configuration
interface MFAConfig {
  appName: string;
  issuer: string;
  window: number;
  step: number;
  backupCodesCount: number;
}

// TOTP Setup Data
export interface TOTPSetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

// MFA Verification Result
export interface MFAVerificationResult {
  success: boolean;
  method: MFAMethod;
  error?: string;
  remainingAttempts?: number;
}

// User MFA Settings
export interface UserMFASettings {
  enabled: boolean;
  methods: MFAMethod[];
  totpSecret?: string;
  backupCodes?: string[];
  phoneNumber?: string;
  emailVerified: boolean;
  recoveryEmail?: string;
  lastUsedMethod?: MFAMethod;
  failedAttempts: number;
  lockedUntil?: Date;
}

// MFA Service
export class MFAService {
  private config: MFAConfig;

  constructor() {
    this.config = {
      appName: process.env.MFA_APP_NAME || "ProjectWE",
      issuer: process.env.MFA_ISSUER || "ProjectWE",
      window: parseInt(process.env.MFA_WINDOW || "1", 10),
      step: parseInt(process.env.MFA_STEP || "30", 10),
      backupCodesCount: parseInt(
        process.env.MFA_BACKUP_CODES_COUNT || "10",
        10,
      ),
    };

    // Configure otplib
    authenticator.options = {
      window: this.config.window,
      step: this.config.step,
    };
  }

  // Generate TOTP secret
  generateTOTPSecret(): string {
    return authenticator.generateSecret();
  }

  // Setup TOTP for user
  async setupTOTP(userId: string, userEmail: string): Promise<TOTPSetupData> {
    const secret = this.generateTOTPSecret();
    const label = `${this.config.appName}:${userEmail}`;
    const issuer = this.config.issuer;

    // Generate OTP Auth URL
    const otpAuthUrl = authenticator.keyuri(userEmail, issuer, secret);

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Format secret for manual entry (groups of 4 characters)
    const manualEntryKey = secret.match(/.{1,4}/g)?.join(" ") || secret;

    return {
      secret,
      qrCodeUrl,
      backupCodes,
      manualEntryKey,
    };
  }

  // Verify TOTP token
  verifyTOTP(secret: string, token: string): boolean {
    try {
      return authenticator.verify({
        token: token.replace(/\s/g, ""),
        secret,
      });
    } catch (error) {
      console.error("TOTP verification error:", error);
      return false;
    }
  }

  // Generate backup codes
  generateBackupCodes(): string[] {
    const codes: string[] = [];

    for (let i = 0; i < this.config.backupCodesCount; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      codes.push(code);
    }

    return codes;
  }

  // Verify backup code
  async verifyBackupCode(
    userBackupCodes: string[],
    providedCode: string,
  ): Promise<{
    valid: boolean;
    remainingCodes?: string[];
  }> {
    const normalizedCode = providedCode.replace(/\s/g, "").toUpperCase();
    const codeIndex = userBackupCodes.indexOf(normalizedCode);

    if (codeIndex === -1) {
      return { valid: false };
    }

    // Remove used backup code
    const remainingCodes = userBackupCodes.filter(
      (_, index) => index !== codeIndex,
    );

    return {
      valid: true,
      remainingCodes,
    };
  }

  // Send SMS verification code
  async sendSMSCode(phoneNumber: string): Promise<{
    success: boolean;
    codeId: string;
    error?: string;
  }> {
    try {
      // Generate 6-digit numeric code
      const code = crypto.randomInt(100000, 999999).toString();
      const codeId = crypto.randomUUID();

      // Store code temporarily (in production, use Redis with TTL)
      // For now, we'll simulate SMS sending
      console.log(`SMS Code for ${phoneNumber}: ${code} (ID: ${codeId})`);

      // In production, integrate with SMS provider (Twilio, AWS SNS, etc.)
      // await smsProvider.send(phoneNumber, `Your ProjectWE verification code is: ${code}`);

      return {
        success: true,
        codeId,
      };
    } catch (error) {
      return {
        success: false,
        codeId: "",
        error: error instanceof Error ? error.message : "SMS sending failed",
      };
    }
  }

  // Verify SMS code
  async verifySMSCode(codeId: string, providedCode: string): Promise<boolean> {
    // In production, retrieve stored code from Redis and compare
    // For now, we'll simulate verification
    console.log(`Verifying SMS code: ${providedCode} for ID: ${codeId}`);

    // Simulate verification logic
    return providedCode.length === 6 && /^\d{6}$/.test(providedCode);
  }

  // Send email verification code
  async sendEmailCode(email: string): Promise<{
    success: boolean;
    codeId: string;
    error?: string;
  }> {
    try {
      // Generate 6-digit numeric code
      const code = crypto.randomInt(100000, 999999).toString();
      const codeId = crypto.randomUUID();

      console.log(`Email Code for ${email}: ${code} (ID: ${codeId})`);

      // In production, send via email service
      // await emailService.send({
      //   to: email,
      //   subject: 'ProjectWE Verification Code',
      //   html: `Your verification code is: <strong>${code}</strong>`
      // });

      return {
        success: true,
        codeId,
      };
    } catch (error) {
      return {
        success: false,
        codeId: "",
        error: error instanceof Error ? error.message : "Email sending failed",
      };
    }
  }

  // Verify email code
  async verifyEmailCode(
    codeId: string,
    providedCode: string,
  ): Promise<boolean> {
    // Similar to SMS verification
    console.log(`Verifying email code: ${providedCode} for ID: ${codeId}`);
    return providedCode.length === 6 && /^\d{6}$/.test(providedCode);
  }

  // Comprehensive MFA verification
  async verifyMFA(
    userMFASettings: UserMFASettings,
    method: MFAMethod,
    code: string,
    codeId?: string,
  ): Promise<MFAVerificationResult> {
    // Check if user is locked out
    if (
      userMFASettings.lockedUntil &&
      userMFASettings.lockedUntil > new Date()
    ) {
      return {
        success: false,
        method,
        error: "Account temporarily locked due to too many failed attempts",
      };
    }

    let verificationResult = false;
    let remainingBackupCodes: string[] | undefined;

    try {
      switch (method) {
        case "totp":
          if (!userMFASettings.totpSecret) {
            return {
              success: false,
              method,
              error: "TOTP not configured",
            };
          }
          verificationResult = this.verifyTOTP(
            userMFASettings.totpSecret,
            code,
          );
          break;

        case "backup_codes":
          if (
            !userMFASettings.backupCodes ||
            userMFASettings.backupCodes.length === 0
          ) {
            return {
              success: false,
              method,
              error: "No backup codes available",
            };
          }
          const backupResult = await this.verifyBackupCode(
            userMFASettings.backupCodes,
            code,
          );
          verificationResult = backupResult.valid;
          remainingBackupCodes = backupResult.remainingCodes;
          break;

        case "sms":
          if (!codeId) {
            return {
              success: false,
              method,
              error: "SMS code ID required",
            };
          }
          verificationResult = await this.verifySMSCode(codeId, code);
          break;

        case "email":
          if (!codeId) {
            return {
              success: false,
              method,
              error: "Email code ID required",
            };
          }
          verificationResult = await this.verifyEmailCode(codeId, code);
          break;

        default:
          return {
            success: false,
            method,
            error: "Unsupported MFA method",
          };
      }

      if (verificationResult) {
        // Success - reset failed attempts
        return {
          success: true,
          method,
        };
      } else {
        // Failed verification
        const newFailedAttempts = userMFASettings.failedAttempts + 1;
        const maxAttempts = 5;

        return {
          success: false,
          method,
          error: "Invalid verification code",
          remainingAttempts: Math.max(0, maxAttempts - newFailedAttempts),
        };
      }
    } catch (error) {
      return {
        success: false,
        method,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  // Check if account should be locked
  shouldLockAccount(failedAttempts: number): boolean {
    return failedAttempts >= 5;
  }

  // Calculate lockout duration
  calculateLockoutDuration(failedAttempts: number): number {
    // Progressive lockout: 5 min, 15 min, 30 min, 1 hour, 2 hours
    const durations = [5, 15, 30, 60, 120]; // minutes
    const index = Math.min(failedAttempts - 5, durations.length - 1);
    return durations[index] * 60 * 1000; // Convert to milliseconds
  }

  // Generate recovery codes for account recovery
  generateRecoveryCodes(): string[] {
    const codes: string[] = [];

    for (let i = 0; i < 5; i++) {
      const code = crypto.randomBytes(16).toString("hex").toUpperCase();
      codes.push(code);
    }

    return codes;
  }

  // Validate MFA setup
  validateMFASetup(
    method: MFAMethod,
    settings: Partial<UserMFASettings>,
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    switch (method) {
      case "totp":
        if (!settings.totpSecret) {
          errors.push("TOTP secret is required");
        }
        break;

      case "sms":
        if (!settings.phoneNumber) {
          errors.push("Phone number is required for SMS MFA");
        }
        break;

      case "email":
        if (!settings.emailVerified) {
          errors.push("Email must be verified for email MFA");
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// MFA Manager for handling user MFA settings
export class MFAManager {
  private mfaService: MFAService;

  constructor() {
    this.mfaService = new MFAService();
  }

  // Enable MFA for user
  async enableMFA(
    userId: string,
    userEmail: string,
    method: MFAMethod,
    verificationCode: string,
    additionalData?: { phoneNumber?: string; codeId?: string },
  ): Promise<{
    success: boolean;
    setupData?: TOTPSetupData;
    error?: string;
  }> {
    try {
      switch (method) {
        case "totp":
          // Setup TOTP and verify initial code
          const setupData = await this.mfaService.setupTOTP(userId, userEmail);
          const isValidInitialCode = this.mfaService.verifyTOTP(
            setupData.secret,
            verificationCode,
          );

          if (!isValidInitialCode) {
            return {
              success: false,
              error: "Invalid verification code",
            };
          }

          return {
            success: true,
            setupData,
          };

        case "sms":
          if (!additionalData?.phoneNumber || !additionalData?.codeId) {
            return {
              success: false,
              error: "Phone number and code ID required",
            };
          }

          const smsValid = await this.mfaService.verifySMSCode(
            additionalData.codeId,
            verificationCode,
          );

          return {
            success: smsValid,
            error: smsValid ? undefined : "Invalid SMS code",
          };

        default:
          return {
            success: false,
            error: "Unsupported MFA method",
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "MFA setup failed",
      };
    }
  }

  // Disable MFA for user
  async disableMFA(
    userId: string,
    currentPassword: string,
    mfaCode: string,
    userMFASettings: UserMFASettings,
  ): Promise<{ success: boolean; error?: string }> {
    // Verify current password (this would be done in the calling function)
    // Verify MFA code
    const verification = await this.mfaService.verifyMFA(
      userMFASettings,
      userMFASettings.lastUsedMethod || "totp",
      mfaCode,
    );

    if (!verification.success) {
      return {
        success: false,
        error: verification.error || "MFA verification failed",
      };
    }

    return { success: true };
  }
}

// Export singleton instances
export const mfaService = new MFAService();
export const mfaManager = new MFAManager();

// Utility functions
export const MFAUtils = {
  // Format backup codes for display
  formatBackupCodes(codes: string[]): string[] {
    return codes.map((code) => code.match(/.{1,4}/g)?.join("-") || code);
  },

  // Mask phone number for display
  maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 4) return phoneNumber;
    const visible = phoneNumber.slice(-4);
    const masked = "*".repeat(phoneNumber.length - 4);
    return masked + visible;
  },

  // Check if MFA is required for action
  requiresMFA(action: string, userRole: string): boolean {
    const mfaRequiredActions = [
      "password_change",
      "email_change",
      "account_deletion",
      "sensitive_data_access",
    ];

    const adminActions = [
      "user_management",
      "system_configuration",
      "data_export",
    ];

    return (
      mfaRequiredActions.includes(action) ||
      (adminActions.includes(action) && userRole === "admin")
    );
  },

  // Get MFA method priority
  getMFAMethodPriority(): MFAMethod[] {
    return ["totp", "backup_codes", "sms", "email"];
  },
};

export default MFAService;
