/**
 * Twilio Connect Integration
 * Handles authorization and account management
 */

import { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

// Store connected accounts (use database in production)
const connectedAccounts = new Map<string, ConnectedAccount>();

interface ConnectedAccount {
  accountSid: string;
  userId: string;
  authorizedAt: Date;
  phoneNumbers?: string[];
}

// Handle Twilio Connect authorization callback
export async function handleAuthorization(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { AccountSid } = req.query;

  if (!AccountSid || typeof AccountSid !== "string") {
    return res.status(400).json({ error: "Missing AccountSid" });
  }

  try {
    // Store the connected account
    const account: ConnectedAccount = {
      accountSid: AccountSid,
      userId: "demo", // TODO: Get from your auth system
      authorizedAt: new Date(),
    };

    // Fetch available phone numbers from connected account
    const client = twilio(AccountSid, process.env.TWILIO_AUTH_TOKEN, {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
    });

    const numbers = await client.incomingPhoneNumbers.list({ limit: 10 });
    account.phoneNumbers = numbers.map((n) => n.phoneNumber);

    connectedAccounts.set(AccountSid, account);

    console.log("✅ Twilio account connected:", {
      accountSid: AccountSid,
      numbers: account.phoneNumbers,
    });

    // Redirect to success page
    res.redirect("/settings/integrations?success=twilio");
  } catch (error) {
    console.error("Authorization error:", error);
    res.redirect("/settings/integrations?error=twilio_auth_failed");
  }
}

// Handle deauthorization
export async function handleDeauthorization(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { AccountSid } = req.query;

  if (AccountSid && typeof AccountSid === "string") {
    connectedAccounts.delete(AccountSid);
    console.log("🔌 Twilio account disconnected:", AccountSid);
  }

  res.status(200).send("OK");
}

// Send SMS using connected account
export async function sendSMSViaConnectedAccount(
  accountSid: string,
  to: string,
  message: string,
) {
  const account = connectedAccounts.get(accountSid);
  if (!account) {
    throw new Error("Account not connected");
  }

  const client = twilio(accountSid, process.env.TWILIO_AUTH_TOKEN, {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
  });

  // Use first available number or specify one
  const from = account.phoneNumbers?.[0];
  if (!from) {
    throw new Error("No phone numbers available");
  }

  return await client.messages.create({
    body: message,
    from,
    to,
  });
}

// Get all connected accounts for a user
export function getConnectedAccounts(userId: string) {
  return Array.from(connectedAccounts.values()).filter(
    (account) => account.userId === userId,
  );
}

// Example usage in your monitoring
export async function sendAlertToAllConnectedAccounts(
  message: string,
  severity: "critical" | "warning" | "info",
) {
  const emoji = {
    critical: "🚨",
    warning: "⚠️",
    info: "ℹ️",
  };

  const fullMessage = `${emoji[severity]} ProjectWE Alert

${message}`;

  const results = [];
  for (const [accountSid, account] of connectedAccounts) {
    try {
      const result = await sendSMSViaConnectedAccount(
        accountSid,
        account.phoneNumbers?.[0] || "", // Send to account owner
        fullMessage,
      );
      results.push({ accountSid, success: true, messageId: result.sid });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      results.push({ accountSid, success: false, error: errorMessage });
    }
  }

  return results;
}
