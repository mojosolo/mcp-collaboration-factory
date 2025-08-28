/**
 * Security Monitoring Agent with SNYK Integration
 * Provides real-time security scanning and vulnerability management
 */

import { EventEmitter } from "events";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface SecurityAlert {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  type: "vulnerability" | "license" | "compliance" | "container";
  title: string;
  description: string;
  package?: string;
  version?: string;
  fixAvailable?: boolean;
  fixVersion?: string;
  exploitMaturity?: string;
  timestamp: Date;
}

interface SecurityScanResult {
  vulnerabilities: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  dependencies: number;
  alerts: SecurityAlert[];
}

export class SecurityMonitoringAgent extends EventEmitter {
  private snykToken: string;
  private isMonitoring: boolean = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private alerts: Map<string, SecurityAlert> = new Map();

  constructor(snykToken: string) {
    super();
    this.snykToken = snykToken;
  }

  /**
   * Start continuous security monitoring
   */
  async startMonitoring(intervalMinutes: number = 30): Promise<void> {
    if (this.isMonitoring) {
      console.log("Security monitoring already active");
      return;
    }

    console.log("🔒 Starting Security Monitoring Agent...");
    this.isMonitoring = true;

    // Initial scan
    await this.runSecurityScan();

    // Set up interval scanning
    this.scanInterval = setInterval(
      async () => {
        await this.runSecurityScan();
      },
      intervalMinutes * 60 * 1000,
    );

    this.emit("monitoring:started");
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.isMonitoring = false;
    this.emit("monitoring:stopped");
  }

  /**
   * Run comprehensive security scan
   */
  async runSecurityScan(): Promise<SecurityScanResult> {
    console.log("🔍 Running security scan...");

    const result: SecurityScanResult = {
      vulnerabilities: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      dependencies: 0,
      alerts: [],
    };

    try {
      // Run SNYK test
      const { stdout: snykOutput } = await execAsync(
        `SNYK_TOKEN=${this.snykToken} snyk test --json`,
        { maxBuffer: 10 * 1024 * 1024 }, // 10MB buffer
      ).catch((err) => ({ stdout: err.stdout || "{}" }));

      const snykResult = JSON.parse(snykOutput);

      if (snykResult.vulnerabilities) {
        result.vulnerabilities = snykResult.vulnerabilities.length;
        result.dependencies = snykResult.dependencyCount || 0;

        // Process vulnerabilities
        for (const vuln of snykResult.vulnerabilities) {
          const severity = vuln.severity.toLowerCase() as
            | "critical"
            | "high"
            | "medium"
            | "low";
          result[severity]++;

          const alert: SecurityAlert = {
            id: vuln.id,
            severity: severity as any,
            type: "vulnerability",
            title: vuln.title,
            description: vuln.description || "",
            package: vuln.packageName,
            version: vuln.version,
            fixAvailable: vuln.isUpgradable || vuln.isPatchable,
            fixVersion: vuln.upgradePath?.[0],
            exploitMaturity: vuln.exploitMaturity,
            timestamp: new Date(),
          };

          result.alerts.push(alert);
          this.processAlert(alert);
        }
      }

      // Run license check
      await this.checkLicenses(result);

      // Run container scan if Docker is available
      await this.scanContainers(result);

      this.emit("scan:completed", result);
      console.log(
        `✅ Security scan completed: ${result.vulnerabilities} vulnerabilities found`,
      );
    } catch (error) {
      console.error("❌ Security scan failed:", error);
      this.emit("scan:failed", error);
    }

    return result;
  }

  /**
   * Check for license compliance
   */
  private async checkLicenses(result: SecurityScanResult): Promise<void> {
    try {
      const { stdout } = await execAsync(
        `SNYK_TOKEN=${this.snykToken} snyk test --license --json`,
        { maxBuffer: 10 * 1024 * 1024 },
      ).catch((err) => ({ stdout: err.stdout || "{}" }));

      const licenseResult = JSON.parse(stdout);

      if (licenseResult.licenses) {
        for (const license of licenseResult.licenses) {
          if (license.severity && license.severity !== "none") {
            const alert: SecurityAlert = {
              id: `license-${license.id}`,
              severity: license.severity.toLowerCase() as any,
              type: "license",
              title: `License Issue: ${license.license}`,
              description: license.instructions || "",
              package: license.packageName,
              timestamp: new Date(),
            };

            result.alerts.push(alert);
            this.processAlert(alert);
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn("License check skipped:", errorMessage);
    }
  }

  /**
   * Scan Docker containers
   */
  private async scanContainers(result: SecurityScanResult): Promise<void> {
    try {
      // Check if Docker is available
      await execAsync("docker --version");

      // Get list of images
      const { stdout: imagesOutput } = await execAsync(
        'docker images --format "{{.Repository}}:{{.Tag}}"',
      );

      const images = imagesOutput
        .trim()
        .split("\n")
")
        .filter((img) => img && !img.includes("<none>"));

      for (const image of images.slice(0, 3)) {
        // Limit to 3 images for performance
        try {
          const { stdout } = await execAsync(
            `SNYK_TOKEN=${this.snykToken} snyk container test ${image} --json`,
            { maxBuffer: 10 * 1024 * 1024 },
          ).catch((err) => ({ stdout: err.stdout || "{}" }));

          const containerResult = JSON.parse(stdout);

          if (containerResult.vulnerabilities) {
            for (const vuln of containerResult.vulnerabilities) {
              const alert: SecurityAlert = {
                id: `container-${vuln.id}`,
                severity: vuln.severity.toLowerCase() as any,
                type: "container",
                title: `Container Vulnerability: ${vuln.title}`,
                description: `Found in image ${image}: ${vuln.description || ""}`,
                package: vuln.packageName,
                version: vuln.version,
                timestamp: new Date(),
              };

              result.alerts.push(alert);
              this.processAlert(alert);
            }
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.warn(`Container scan skipped for ${image}:`, errorMessage);
        }
      }
    } catch (error) {
      // Docker not available, skip container scanning
    }
  }

  /**
   * Process and emit alerts
   */
  private processAlert(alert: SecurityAlert): void {
    const existingAlert = this.alerts.get(alert.id);

    if (!existingAlert) {
      this.alerts.set(alert.id, alert);

      // Emit critical and high severity alerts immediately
      if (alert.severity === "critical" || alert.severity === "high") {
        this.emit("alert:critical", alert);
        console.error(`🚨 CRITICAL SECURITY ALERT: ${alert.title}`);
      } else {
        this.emit("alert:new", alert);
      }
    }
  }

  /**
   * Get current security status
   */
  getSecurityStatus(): {
    isMonitoring: boolean;
    totalAlerts: number;
    criticalAlerts: number;
    highAlerts: number;
    recentAlerts: SecurityAlert[];
  } {
    const alerts = Array.from(this.alerts.values());
    const criticalAlerts = alerts.filter((a) => a.severity === "critical");
    const highAlerts = alerts.filter((a) => a.severity === "high");
    const recentAlerts = alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      isMonitoring: this.isMonitoring,
      totalAlerts: alerts.length,
      criticalAlerts: criticalAlerts.length,
      highAlerts: highAlerts.length,
      recentAlerts,
    };
  }

  /**
   * Fix vulnerabilities automatically where possible
   */
  async autoFix(): Promise<void> {
    console.log("🔧 Attempting to auto-fix vulnerabilities...");

    try {
      const { stdout } = await execAsync(
        `SNYK_TOKEN=${this.snykToken} snyk fix --dry-run`,
        { maxBuffer: 10 * 1024 * 1024 },
      );

      console.log("Auto-fix preview:", stdout);

      // In production, you might want to actually run the fix
      // await execAsync(`SNYK_TOKEN=${this.snykToken} snyk fix`);

      this.emit("autofix:completed");
    } catch (error) {
      console.error("Auto-fix failed:", error);
      this.emit("autofix:failed", error);
    }
  }

  /**
   * Generate security report
   */
  async generateSecurityReport(): Promise<string> {
    const status = this.getSecurityStatus();
    const timestamp = new Date().toISOString();

    const report = `
# Security Report - ${timestamp}

## Summary
- Total Vulnerabilities: ${status.totalAlerts}
- Critical: ${status.criticalAlerts}
- High: ${status.highAlerts}
- Monitoring Status: ${status.isMonitoring ? "Active" : "Inactive"}

## Critical Alerts
${status.recentAlerts
  .filter((a) => a.severity === "critical")
  .map(
    (a) => `- **${a.title}** (${a.package}@${a.version})
  Fix available: ${a.fixAvailable ? `Yes - upgrade to ${a.fixVersion}` : "No"}`,
  )
  .join("
")}

## Recent Alerts
${status.recentAlerts
  .slice(0, 5)
  .map((a) => `- [${a.severity.toUpperCase()}] ${a.title} (${a.type})`)
  .join("
")}

## Recommendations
1. Address all critical vulnerabilities immediately
2. Update dependencies with available fixes
3. Review license compliance issues
4. Scan container images regularly

Generated by ProjectWE Security Monitoring Agent
`;

    return report;
  }
}

// Export singleton instance
export const createSecurityMonitor = (snykToken: string) => {
  return new SecurityMonitoringAgent(snykToken);
};
