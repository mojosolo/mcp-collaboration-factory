import crypto from "crypto";
import { promises as fs } from "fs";

// GDPR Data Categories
export type GDPRDataCategory =
  | "identity" // Name, email, username
  | "contact" // Phone, address
  | "financial" // Payment info, billing
  | "technical" // IP address, device info
  | "behavioral" // Usage patterns, preferences
  | "professional" // Job title, company
  | "demographic" // Age, gender, location
  | "health" // Medical information
  | "biometric" // Fingerprints, facial recognition
  | "genetic" // DNA information
  | "sensitive"; // Race, religion, political views

// Legal basis for processing under GDPR
export type GDPRLegalBasis =
  | "consent" // Article 6(1)(a) - Consent
  | "contract" // Article 6(1)(b) - Contract
  | "legal_obligation" // Article 6(1)(c) - Legal obligation
  | "vital_interests" // Article 6(1)(d) - Vital interests
  | "public_task" // Article 6(1)(e) - Public task
  | "legitimate_interests"; // Article 6(1)(f) - Legitimate interests

// Data subject rights under GDPR
export type GDPRDataSubjectRight =
  | "access" // Right to access (Article 15)
  | "rectification" // Right to rectification (Article 16)
  | "erasure" // Right to erasure (Article 17)
  | "restrict_processing" // Right to restrict processing (Article 18)
  | "data_portability" // Right to data portability (Article 20)
  | "object" // Right to object (Article 21)
  | "withdraw_consent"; // Right to withdraw consent

// Consent record
export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: string;
  dataCategories: GDPRDataCategory[];
  legalBasis: GDPRLegalBasis;
  consentGiven: boolean;
  consentTimestamp: Date;
  consentMethod: "explicit" | "implicit" | "opt_in" | "pre_checked";
  consentVersion: string;
  withdrawalTimestamp?: Date;
  withdrawalReason?: string;
  ipAddress: string;
  userAgent: string;
  language: string;
  consentText: string;
  granular: boolean;
  purposes: {
    necessary: boolean;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
    personalization: boolean;
  };
}

// Data processing record
export interface DataProcessingRecord {
  id: string;
  userId: string;
  dataCategory: GDPRDataCategory;
  processingPurpose: string;
  legalBasis: GDPRLegalBasis;
  dataFields: string[];
  retentionPeriod: number; // days
  processingStart: Date;
  processingEnd?: Date;
  thirdPartySharing: boolean;
  thirdParties?: string[];
  internationalTransfers: boolean;
  transferCountries?: string[];
  safeguards?: string[];
  automated: boolean;
  profiling: boolean;
}

// Data subject request
export interface DataSubjectRequest {
  id: string;
  userId: string;
  requestType: GDPRDataSubjectRight;
  requestDate: Date;
  requestMethod: "email" | "portal" | "phone" | "mail";
  status:
    | "pending"
    | "in_progress"
    | "completed"
    | "rejected"
    | "partially_fulfilled";
  completionDate?: Date;
  rejectionReason?: string;
  requestDetails: string;
  verificationMethod: "password" | "email" | "identity_document" | "mfa";
  verificationCompleted: boolean;
  responseData?: any;
  fulfillmentNotes?: string;
  escalated: boolean;
  dpoNotified: boolean;
}

// Data breach incident
export interface DataBreachIncident {
  id: string;
  incidentDate: Date;
  discoveryDate: Date;
  reportDate?: Date;
  description: string;
  dataCategories: GDPRDataCategory[];
  affectedUsers: number;
  severity: "low" | "medium" | "high" | "critical";
  containmentActions: string[];
  notificationRequired: boolean;
  supervisoryAuthorityNotified: boolean;
  dataSubjectsNotified: boolean;
  riskAssessment: string;
  mitigationMeasures: string[];
  lessonsLearned: string[];
  status: "open" | "investigating" | "contained" | "resolved";
}

// Privacy notice
export interface PrivacyNotice {
  id: string;
  version: string;
  effectiveDate: Date;
  language: string;
  content: {
    dataController: string;
    dpoContact: string;
    processingPurposes: { purpose: string; legalBasis: GDPRLegalBasis }[];
    dataCategories: GDPRDataCategory[];
    retentionPeriods: { category: GDPRDataCategory; period: number }[];
    thirdPartySharing: { party: string; purpose: string }[];
    internationalTransfers: { country: string; safeguards: string[] }[];
    dataSubjectRights: GDPRDataSubjectRight[];
    contactInfo: string;
    complaintInfo: string;
  };
}

// GDPR Compliance Service
export class GDPRComplianceService {
  private consentStore = new Map<string, ConsentRecord[]>();
  private processingRecords = new Map<string, DataProcessingRecord[]>();
  private dataSubjectRequests = new Map<string, DataSubjectRequest[]>();
  private breachIncidents: DataBreachIncident[] = [];

  // Consent Management
  async recordConsent(consent: Omit<ConsentRecord, "id">): Promise<string> {
    const consentRecord: ConsentRecord = {
      id: crypto.randomUUID(),
      ...consent,
    };

    const userConsents = this.consentStore.get(consent.userId) || [];
    userConsents.push(consentRecord);
    this.consentStore.set(consent.userId, userConsents);

    // Log consent for audit trail
    await this.logGDPRActivity({
      type: "consent_recorded",
      userId: consent.userId,
      details: {
        purpose: consent.purpose,
        legalBasis: consent.legalBasis,
        consentGiven: consent.consentGiven,
      },
    });

    return consentRecord.id;
  }

  // Withdraw consent
  async withdrawConsent(
    userId: string,
    consentId: string,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const userConsents = this.consentStore.get(userId) || [];
    const consentIndex = userConsents.findIndex((c) => c.id === consentId);

    if (consentIndex === -1) {
      return { success: false, error: "Consent record not found" };
    }

    const consent = userConsents[consentIndex];
    consent.consentGiven = false;
    consent.withdrawalTimestamp = new Date();
    consent.withdrawalReason = reason;

    userConsents[consentIndex] = consent;
    this.consentStore.set(userId, userConsents);

    await this.logGDPRActivity({
      type: "consent_withdrawn",
      userId,
      details: { consentId, reason },
    });

    return { success: true };
  }

  // Check if user has valid consent
  hasValidConsent(
    userId: string,
    purpose: string,
    dataCategory: GDPRDataCategory,
  ): boolean {
    const userConsents = this.consentStore.get(userId) || [];

    return userConsents.some(
      (consent) =>
        consent.consentGiven &&
        consent.purpose === purpose &&
        consent.dataCategories.includes(dataCategory) &&
        !consent.withdrawalTimestamp,
    );
  }

  // Get user consents
  getUserConsents(userId: string): ConsentRecord[] {
    return this.consentStore.get(userId) || [];
  }

  // Record data processing activity
  async recordProcessingActivity(
    processing: Omit<DataProcessingRecord, "id">,
  ): Promise<string> {
    const processingRecord: DataProcessingRecord = {
      id: crypto.randomUUID(),
      ...processing,
    };

    const userProcessing = this.processingRecords.get(processing.userId) || [];
    userProcessing.push(processingRecord);
    this.processingRecords.set(processing.userId, userProcessing);

    await this.logGDPRActivity({
      type: "processing_recorded",
      userId: processing.userId,
      details: {
        dataCategory: processing.dataCategory,
        purpose: processing.processingPurpose,
        legalBasis: processing.legalBasis,
      },
    });

    return processingRecord.id;
  }

  // Handle data subject requests
  async submitDataSubjectRequest(
    request: Omit<
      DataSubjectRequest,
      | "id"
      | "requestDate"
      | "status"
      | "verificationCompleted"
      | "escalated"
      | "dpoNotified"
    >,
  ): Promise<string> {
    const dataSubjectRequest: DataSubjectRequest = {
      id: crypto.randomUUID(),
      requestDate: new Date(),
      status: "pending",
      verificationCompleted: false,
      escalated: false,
      dpoNotified: false,
      ...request,
    };

    const userRequests = this.dataSubjectRequests.get(request.userId) || [];
    userRequests.push(dataSubjectRequest);
    this.dataSubjectRequests.set(request.userId, userRequests);

    await this.logGDPRActivity({
      type: "data_subject_request_submitted",
      userId: request.userId,
      details: {
        requestType: request.requestType,
        requestMethod: request.requestMethod,
      },
    });

    // Auto-notify DPO for certain request types
    if (["erasure", "restrict_processing"].includes(request.requestType)) {
      await this.notifyDPO(dataSubjectRequest);
      dataSubjectRequest.dpoNotified = true;
    }

    return dataSubjectRequest.id;
  }

  // Process data access request (Article 15)
  async processAccessRequest(
    userId: string,
    requestId: string,
  ): Promise<{
    personalData: any;
    processingActivities: DataProcessingRecord[];
    consents: ConsentRecord[];
    retentionPeriods: { category: GDPRDataCategory; period: number }[];
  }> {
    // Collect all personal data
    const personalData = await this.collectPersonalData(userId);
    const processingActivities = this.processingRecords.get(userId) || [];
    const consents = this.consentStore.get(userId) || [];
    const retentionPeriods = this.getRetentionPeriods();

    await this.updateRequestStatus(requestId, "completed", {
      completionDate: new Date(),
      fulfillmentNotes: "Personal data exported successfully",
    });

    return {
      personalData,
      processingActivities,
      consents,
      retentionPeriods,
    };
  }

  // Process data erasure request (Article 17 - Right to be forgotten)
  async processErasureRequest(
    userId: string,
    requestId: string,
    verifyDeletion = true,
  ): Promise<{ success: boolean; deletedData: string[]; errors: string[] }> {
    const deletedData: string[] = [];
    const errors: string[] = [];

    try {
      // Check if erasure is legally permissible
      const canErase = await this.canEraseUserData(userId);
      if (!canErase.allowed) {
        await this.updateRequestStatus(requestId, "rejected", {
          rejectionReason: canErase.reason,
        });
        return { success: false, deletedData, errors: [canErase.reason!] };
      }

      // Delete user data from various systems
      const deletionResults = await Promise.allSettled([
        this.deleteUserProfile(userId),
        this.deleteUserDocuments(userId),
        this.deleteUserSessions(userId),
        this.deleteUserAnalytics(userId),
        this.deleteUserBackups(userId),
      ]);

      deletionResults.forEach((result, index) => {
        const dataType = [
          "profile",
          "documents",
          "sessions",
          "analytics",
          "backups",
        ][index];

        if (result.status === "fulfilled") {
          deletedData.push(dataType);
        } else {
          errors.push(`Failed to delete ${dataType}: ${result.reason}`);
        }
      });

      // Remove from consent and processing records
      this.consentStore.delete(userId);
      this.processingRecords.delete(userId);

      // Anonymize remaining references
      await this.anonymizeUserReferences(userId);

      await this.updateRequestStatus(requestId, "completed", {
        completionDate: new Date(),
        fulfillmentNotes: `Data deletion completed. Deleted: ${deletedData.join(", ")}`,
      });

      await this.logGDPRActivity({
        type: "data_erased",
        userId,
        details: { deletedData, errors },
      });

      return { success: errors.length === 0, deletedData, errors };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      errors.push(errorMessage);

      await this.updateRequestStatus(requestId, "rejected", {
        rejectionReason: errorMessage,
      });

      return { success: false, deletedData, errors };
    }
  }

  // Process data portability request (Article 20)
  async processPortabilityRequest(
    userId: string,
    requestId: string,
  ): Promise<{
    exportData: any;
    format: "json" | "csv" | "xml";
    filename: string;
  }> {
    const exportData = await this.collectPortableData(userId);
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `personal-data-export-${userId}-${timestamp}.json`;

    await this.updateRequestStatus(requestId, "completed", {
      completionDate: new Date(),
      responseData: { filename, recordCount: Object.keys(exportData).length },
    });

    return {
      exportData,
      format: "json",
      filename,
    };
  }

  // Data breach management
  async reportDataBreach(
    breach: Omit<DataBreachIncident, "id" | "reportDate">,
  ): Promise<string> {
    const breachIncident: DataBreachIncident = {
      id: crypto.randomUUID(),
      reportDate: new Date(),
      ...breach,
    };

    this.breachIncidents.push(breachIncident);

    // Assess notification requirements
    const riskLevel = this.assessBreachRisk(breachIncident);

    if (riskLevel === "high" || riskLevel === "critical") {
      breachIncident.notificationRequired = true;

      // Must notify supervisory authority within 72 hours
      setTimeout(
        async () => {
          if (!breachIncident.supervisoryAuthorityNotified) {
            await this.notifySupervisoryAuthority(breachIncident);
          }
        },
        72 * 60 * 60 * 1000,
      ); // 72 hours
    }

    await this.logGDPRActivity({
      type: "data_breach_reported",
      userId: "system",
      details: {
        breachId: breachIncident.id,
        severity: breach.severity,
        affectedUsers: breach.affectedUsers,
      },
    });

    return breachIncident.id;
  }

  // Data retention management
  async applyRetentionPolicies(): Promise<{
    processed: number;
    deleted: number;
    errors: string[];
  }> {
    const results = { processed: 0, deleted: 0, errors: [] as string[] };
    const retentionPolicies = this.getRetentionPeriods();

    for (const [
      userId,
      processingRecords,
    ] of this.processingRecords.entries()) {
      results.processed++;

      try {
        for (const record of processingRecords) {
          const policy = retentionPolicies.find(
            (p) => p.category === record.dataCategory,
          );
          if (!policy) continue;

          const retentionEnd = new Date(record.processingStart);
          retentionEnd.setDate(retentionEnd.getDate() + policy.period);

          if (new Date() > retentionEnd) {
            // Data should be deleted or anonymized
            await this.deleteOrAnonymizeData(userId, record.dataCategory);
            results.deleted++;

            await this.logGDPRActivity({
              type: "data_retention_applied",
              userId,
              details: {
                dataCategory: record.dataCategory,
                retentionPeriod: policy.period,
              },
            });
          }
        }
      } catch (error) {
        results.errors.push(
          `Error processing user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return results;
  }

  // Privacy impact assessment
  async conductPrivacyImpactAssessment(processingActivity: {
    purpose: string;
    dataCategories: GDPRDataCategory[];
    legalBasis: GDPRLegalBasis;
    automation: boolean;
    profiling: boolean;
    largescale: boolean;
    sensitive: boolean;
    publicArea: boolean;
  }): Promise<{
    riskLevel: "low" | "medium" | "high";
    piaRequired: boolean;
    recommendations: string[];
    safeguards: string[];
  }> {
    let riskScore = 0;
    const recommendations: string[] = [];
    const safeguards: string[] = [];

    // Risk factors
    if (processingActivity.sensitive) riskScore += 3;
    if (processingActivity.automation) riskScore += 2;
    if (processingActivity.profiling) riskScore += 2;
    if (processingActivity.largescale) riskScore += 2;
    if (processingActivity.publicArea) riskScore += 1;

    // Special category data
    const specialCategories: GDPRDataCategory[] = [
      "health",
      "biometric",
      "genetic",
      "sensitive",
    ];
    if (
      processingActivity.dataCategories.some((cat) =>
        specialCategories.includes(cat),
      )
    ) {
      riskScore += 4;
    }

    // Determine risk level
    let riskLevel: "low" | "medium" | "high";
    if (riskScore <= 2) riskLevel = "low";
    else if (riskScore <= 5) riskLevel = "medium";
    else riskLevel = "high";

    // PIA requirement (Article 35)
    const piaRequired =
      riskLevel === "high" ||
      processingActivity.profiling ||
      specialCategories.some((cat) =>
        processingActivity.dataCategories.includes(cat),
      );

    // Generate recommendations
    if (processingActivity.automation) {
      recommendations.push(
        "Implement human oversight for automated decision-making",
      );
      safeguards.push("Right to human intervention");
    }

    if (processingActivity.sensitive) {
      recommendations.push(
        "Implement additional security measures for sensitive data",
      );
      safeguards.push(
        "Enhanced encryption",
        "Access logging",
        "Regular security audits",
      );
    }

    if (riskLevel === "high") {
      recommendations.push("Conduct full Privacy Impact Assessment");
      recommendations.push("Consult with Data Protection Officer");
      recommendations.push("Consider data minimization opportunities");
    }

    return { riskLevel, piaRequired, recommendations, safeguards };
  }

  // Helper methods
  private async collectPersonalData(userId: string): Promise<any> {
    // Collect data from all systems
    return {
      profile: await this.getUserProfile(userId),
      documents: await this.getUserDocuments(userId),
      activities: await this.getUserActivities(userId),
      preferences: await this.getUserPreferences(userId),
    };
  }

  private async collectPortableData(userId: string): Promise<any> {
    // Collect only user-provided or user-generated data
    const profile = await this.getUserProfile(userId);
    const documents = await this.getUserDocuments(userId);

    return {
      profile: {
        name: profile.name,
        email: profile.email,
        preferences: profile.preferences,
      },
      documents: documents.map((doc: any) => ({
        name: doc.name,
        content: doc.content,
        created: doc.created,
      })),
    };
  }

  private async canEraseUserData(
    userId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check legal obligations that might prevent erasure
    const hasLegalObligation = await this.checkLegalObligations(userId);
    if (hasLegalObligation) {
      return {
        allowed: false,
        reason: "Data retention required by legal obligation",
      };
    }

    const hasActiveContract = await this.checkActiveContract(userId);
    if (hasActiveContract) {
      return {
        allowed: false,
        reason: "Data required for contract performance",
      };
    }

    return { allowed: true };
  }

  private async updateRequestStatus(
    requestId: string,
    status: DataSubjectRequest["status"],
    updates: Partial<DataSubjectRequest>,
  ): Promise<void> {
    // Find and update request across all users
    for (const [userId, requests] of this.dataSubjectRequests.entries()) {
      const requestIndex = requests.findIndex((r) => r.id === requestId);
      if (requestIndex !== -1) {
        requests[requestIndex] = {
          ...requests[requestIndex],
          status,
          ...updates,
        };
        this.dataSubjectRequests.set(userId, requests);
        break;
      }
    }
  }

  private async logGDPRActivity(activity: {
    type: string;
    userId: string;
    details: any;
  }): Promise<void> {
    // Log GDPR compliance activities for audit
    console.log(`GDPR Activity: ${activity.type}`, {
      userId: activity.userId,
      timestamp: new Date().toISOString(),
      details: activity.details,
    });

    // In production, integrate with security logging system
  }

  private getRetentionPeriods(): {
    category: GDPRDataCategory;
    period: number;
  }[] {
    return [
      { category: "identity", period: 2555 }, // 7 years
      { category: "contact", period: 1095 }, // 3 years
      { category: "financial", period: 2555 }, // 7 years
      { category: "technical", period: 365 }, // 1 year
      { category: "behavioral", period: 730 }, // 2 years
      { category: "professional", period: 1095 }, // 3 years
      { category: "demographic", period: 1095 }, // 3 years
    ];
  }

  // Placeholder implementations for data operations
  private async getUserProfile(userId: string): Promise<any> {
    return {};
  }
  private async getUserDocuments(userId: string): Promise<any[]> {
    return [];
  }
  private async getUserActivities(userId: string): Promise<any[]> {
    return [];
  }
  private async getUserPreferences(userId: string): Promise<any> {
    return {};
  }
  private async deleteUserProfile(userId: string): Promise<void> {}
  private async deleteUserDocuments(userId: string): Promise<void> {}
  private async deleteUserSessions(userId: string): Promise<void> {}
  private async deleteUserAnalytics(userId: string): Promise<void> {}
  private async deleteUserBackups(userId: string): Promise<void> {}
  private async anonymizeUserReferences(userId: string): Promise<void> {}
  private async checkLegalObligations(userId: string): Promise<boolean> {
    return false;
  }
  private async checkActiveContract(userId: string): Promise<boolean> {
    return false;
  }
  private async deleteOrAnonymizeData(
    userId: string,
    category: GDPRDataCategory,
  ): Promise<void> {}
  private async notifyDPO(request: DataSubjectRequest): Promise<void> {}
  private async notifySupervisoryAuthority(
    breach: DataBreachIncident,
  ): Promise<void> {}

  private assessBreachRisk(
    breach: DataBreachIncident,
  ): "low" | "medium" | "high" | "critical" {
    let riskScore = 0;

    if (breach.affectedUsers > 1000) riskScore += 2;
    if (breach.affectedUsers > 10000) riskScore += 2;

    const sensitiveCategories: GDPRDataCategory[] = [
      "financial",
      "health",
      "biometric",
      "sensitive",
    ];
    if (
      breach.dataCategories.some((cat) => sensitiveCategories.includes(cat))
    ) {
      riskScore += 3;
    }

    if (riskScore <= 1) return "low";
    if (riskScore <= 3) return "medium";
    if (riskScore <= 5) return "high";
    return "critical";
  }
}

// Export singleton instance
export const gdprCompliance = new GDPRComplianceService();

// Utility functions
export const GDPRUtils = {
  // Generate privacy notice
  generatePrivacyNotice(language = "en"): PrivacyNotice {
    return {
      id: crypto.randomUUID(),
      version: "1.0",
      effectiveDate: new Date(),
      language,
      content: {
        dataController: "ProjectWE, Inc.",
        dpoContact: "privacy@projectwe.ai",
        processingPurposes: [
          { purpose: "Service provision", legalBasis: "contract" },
          { purpose: "Analytics", legalBasis: "legitimate_interests" },
          { purpose: "Marketing", legalBasis: "consent" },
        ],
        dataCategories: ["identity", "contact", "technical", "behavioral"],
        retentionPeriods: [
          { category: "identity", period: 2555 },
          { category: "contact", period: 1095 },
        ],
        thirdPartySharing: [
          { party: "Analytics Provider", purpose: "Usage analysis" },
        ],
        internationalTransfers: [
          {
            country: "US",
            safeguards: ["Privacy Shield", "Standard Contractual Clauses"],
          },
        ],
        dataSubjectRights: [
          "access",
          "rectification",
          "erasure",
          "restrict_processing",
          "data_portability",
          "object",
        ],
        contactInfo: "privacy@projectwe.ai",
        complaintInfo:
          "You can lodge a complaint with your local supervisory authority",
      },
    };
  },

  // Validate consent
  isConsentValid(consent: ConsentRecord): boolean {
    return (
      consent.consentGiven &&
      !consent.withdrawalTimestamp &&
      consent.consentMethod !== "pre_checked" &&
      consent.granular
    );
  },

  // Check if processing is lawful
  isProcessingLawful(
    userId: string,
    purpose: string,
    dataCategory: GDPRDataCategory,
    legalBasis: GDPRLegalBasis,
  ): boolean {
    if (legalBasis === "consent") {
      return gdprCompliance.hasValidConsent(userId, purpose, dataCategory);
    }

    // For other legal bases, additional checks would be needed
    return true;
  },
};

export default GDPRComplianceService;
