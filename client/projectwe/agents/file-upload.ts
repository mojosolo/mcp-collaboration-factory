import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";
import { Readable } from "stream";

// File upload configuration
export interface FileUploadConfig {
  maxFileSize: number; // bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  quarantineDirectory: string;
  uploadDirectory: string;
  scanForViruses: boolean;
  scanForMalware: boolean;
  allowExecutables: boolean;
  maxFilenameLength: number;
  preserveFilename: boolean;
}

// File validation result
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedFilename: string;
  detectedMimeType: string;
  fileSize: number;
  hash: string;
}

// Virus scan result
export interface VirusScanResult {
  isClean: boolean;
  threats: string[];
  scanEngine: string;
  scanTime: number;
  quarantined: boolean;
}

// File metadata
export interface SecureFileMetadata {
  originalName: string;
  sanitizedName: string;
  mimeType: string;
  size: number;
  hash: string;
  uploadedAt: Date;
  uploadedBy: string;
  scanResults: VirusScanResult[];
  isQuarantined: boolean;
  accessLevel: "public" | "private" | "restricted";
}

// Default configuration
const DEFAULT_CONFIG: FileUploadConfig = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ],
  allowedExtensions: [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".txt",
    ".csv",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
  ],
  quarantineDirectory: "./quarantine",
  uploadDirectory: "./uploads",
  scanForViruses: true,
  scanForMalware: true,
  allowExecutables: false,
  maxFilenameLength: 255,
  preserveFilename: false,
};

// MIME type detection using magic numbers
const MAGIC_NUMBERS: { [key: string]: string } = {
  FFD8FF: "image/jpeg",
  "89504E47": "image/png",
  "47494638": "image/gif",
  "52494646": "image/webp",
  "25504446": "application/pdf",
  D0CF11E0: "application/msword",
  "504B0304": "application/vnd.openxmlformats-officedocument",
  "7F454C46": "application/x-executable", // ELF
  "4D5A": "application/x-executable", // PE/DOS
};

// Malicious file patterns
const MALICIOUS_PATTERNS = [
  // Script injection patterns
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,

  // PHP code patterns
  /<\?php/gi,
  /<\?=/gi,

  // Embedded executables
  /MZ\x90\x00/g, // PE header
  /\x7fELF/g, // ELF header

  // Macro patterns
  /Auto_Open/gi,
  /Workbook_Open/gi,
  /Document_Open/gi,
];

// Secure File Upload Service
export class SecureFileUploadService {
  private config: FileUploadConfig;

  constructor(config: Partial<FileUploadConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeDirectories();
  }

  // Initialize upload and quarantine directories
  private async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.config.uploadDirectory, { recursive: true });
      await fs.mkdir(this.config.quarantineDirectory, { recursive: true });
    } catch (error) {
      console.error("Failed to initialize directories:", error);
    }
  }

  // Validate file upload
  async validateFile(
    file: File | Buffer,
    originalFilename: string,
  ): Promise<FileValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Convert File to Buffer if necessary
    const buffer =
      file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
    const fileSize = buffer.length;

    // File size validation
    if (fileSize > this.config.maxFileSize) {
      errors.push(
        `File size ${this.formatFileSize(fileSize)} exceeds maximum allowed size ${this.formatFileSize(this.config.maxFileSize)}`,
      );
    }

    if (fileSize === 0) {
      errors.push("File is empty");
    }

    // Filename validation
    const sanitizedFilename = this.sanitizeFilename(originalFilename);

    if (sanitizedFilename.length > this.config.maxFilenameLength) {
      errors.push(
        `Filename too long (max ${this.config.maxFilenameLength} characters)`,
      );
    }

    // Extension validation
    const extension = path.extname(sanitizedFilename).toLowerCase();
    if (!this.config.allowedExtensions.includes(extension)) {
      errors.push(`File extension '${extension}' is not allowed`);
    }

    // MIME type detection and validation
    const detectedMimeType = this.detectMimeType(buffer);

    if (!this.config.allowedMimeTypes.includes(detectedMimeType)) {
      errors.push(`File type '${detectedMimeType}' is not allowed`);
    }

    // Check for executable files
    if (
      !this.config.allowExecutables &&
      this.isExecutableFile(buffer, extension)
    ) {
      errors.push("Executable files are not allowed");
    }

    // Check for malicious content
    const maliciousPatterns = this.detectMaliciousPatterns(buffer);
    if (maliciousPatterns.length > 0) {
      errors.push("File contains potentially malicious content");
      warnings.push(`Detected patterns: ${maliciousPatterns.join(", ")}`);
    }

    // Generate file hash
    const hash = this.generateFileHash(buffer);

    // Check for double extensions
    if (this.hasDoubleExtension(sanitizedFilename)) {
      warnings.push("File has double extension, which may be suspicious");
    }

    // Check for null bytes in filename
    if (originalFilename.includes("\0")) {
      errors.push("Filename contains null bytes");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedFilename,
      detectedMimeType,
      fileSize,
      hash,
    };
  }

  // Sanitize filename
  private sanitizeFilename(filename: string): string {
    // Remove or replace dangerous characters
    let sanitized = filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_") // Replace dangerous chars with underscore
      .replace(/\.+/g, ".") // Replace multiple dots with single dot
      .replace(/^\.+/, "") // Remove leading dots
      .replace(/\.+$/, "") // Remove trailing dots (except extension)
      .trim();

    // Ensure filename is not empty
    if (!sanitized) {
      sanitized = "file";
    }

    // Add timestamp if not preserving original filename
    if (!this.config.preserveFilename) {
      const timestamp = Date.now();
      const extension = path.extname(sanitized);
      const basename = path.basename(sanitized, extension);
      sanitized = `${basename}_${timestamp}${extension}`;
    }

    return sanitized;
  }

  // Detect MIME type using magic numbers
  private detectMimeType(buffer: Buffer): string {
    const headerHex = buffer.toString("hex", 0, 8).toUpperCase();

    // Check magic numbers
    for (const [magic, mimeType] of Object.entries(MAGIC_NUMBERS)) {
      if (headerHex.startsWith(magic)) {
        // Handle Office documents (ZIP-based)
        if (magic === "504B0304") {
          const zipContent = buffer.toString("utf8");
          if (zipContent.includes("word/"))
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          if (zipContent.includes("xl/"))
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          if (zipContent.includes("ppt/"))
            return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        }
        return mimeType;
      }
    }

    // Fallback to text analysis
    if (this.isTextFile(buffer)) {
      return "text/plain";
    }

    return "application/octet-stream";
  }

  // Check if file is executable
  private isExecutableFile(buffer: Buffer, extension: string): boolean {
    const executableExtensions = [
      ".exe",
      ".bat",
      ".cmd",
      ".com",
      ".scr",
      ".pif",
      ".sh",
      ".bin",
    ];

    if (executableExtensions.includes(extension)) {
      return true;
    }

    // Check for executable magic numbers
    const headerHex = buffer.toString("hex", 0, 4).toUpperCase();
    return headerHex === "4D5A" || headerHex === "7F454C46";
  }

  // Check if file is text
  private isTextFile(buffer: Buffer): boolean {
    // Sample first 1KB
    const sample = buffer.slice(0, 1024);
    let textChars = 0;

    for (const byte of sample) {
      if (
        (byte >= 32 && byte <= 126) ||
        byte === 9 ||
        byte === 10 ||
        byte === 13
      ) {
        textChars++;
      }
    }

    return textChars / sample.length > 0.7;
  }

  // Detect malicious patterns
  private detectMaliciousPatterns(buffer: Buffer): string[] {
    const content = buffer.toString("utf8", 0, Math.min(buffer.length, 10240)); // First 10KB
    const detectedPatterns: string[] = [];

    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(content)) {
        detectedPatterns.push(pattern.source);
      }
    }

    return detectedPatterns;
  }

  // Check for double extensions
  private hasDoubleExtension(filename: string): boolean {
    const parts = filename.split(".");
    return parts.length > 2;
  }

  // Generate file hash
  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  // Virus scanning (placeholder - integrate with ClamAV or similar)
  async scanForViruses(filePath: string): Promise<VirusScanResult> {
    const startTime = Date.now();

    // Placeholder implementation
    // In production, integrate with ClamAV, Windows Defender, or cloud scanning service

    try {
      // Simulate virus scanning
      await new Promise((resolve) => setTimeout(resolve, 100));

      const scanTime = Date.now() - startTime;

      // Check if file should be quarantined based on patterns
      const buffer = await fs.readFile(filePath);
      const maliciousPatterns = this.detectMaliciousPatterns(buffer);
      const threats =
        maliciousPatterns.length > 0 ? ["Potentially malicious content"] : [];

      return {
        isClean: threats.length === 0,
        threats,
        scanEngine: "ProjectWE Security Scanner",
        scanTime,
        quarantined: threats.length > 0,
      };
    } catch (error) {
      return {
        isClean: false,
        threats: ["Scan failed"],
        scanEngine: "ProjectWE Security Scanner",
        scanTime: Date.now() - startTime,
        quarantined: true,
      };
    }
  }

  // Quarantine file
  async quarantineFile(filePath: string, reason: string): Promise<string> {
    const filename = path.basename(filePath);
    const quarantinePath = path.join(
      this.config.quarantineDirectory,
      `${Date.now()}_${filename}`,
    );

    try {
      await fs.rename(filePath, quarantinePath);

      // Create quarantine metadata
      const metadata = {
        originalPath: filePath,
        quarantinedAt: new Date(),
        reason,
        filename,
      };

      await fs.writeFile(
        `${quarantinePath}.meta`,
        JSON.stringify(metadata, null, 2),
      );

      return quarantinePath;
    } catch (error) {
      throw new Error(`Failed to quarantine file: ${error}`);
    }
  }

  // Process file upload
  async processUpload(
    file: File | Buffer,
    originalFilename: string,
    userId: string,
    accessLevel: "public" | "private" | "restricted" = "private",
  ): Promise<{
    success: boolean;
    metadata?: SecureFileMetadata;
    errors?: string[];
    quarantined?: boolean;
  }> {
    try {
      // Validate file
      const validation = await this.validateFile(file, originalFilename);

      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Convert to buffer if needed
      const buffer =
        file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;

      // Generate secure filename
      const secureFilename = `${crypto.randomUUID()}_${validation.sanitizedFilename}`;
      const uploadPath = path.join(this.config.uploadDirectory, secureFilename);

      // Write file to disk
      await fs.writeFile(uploadPath, buffer);

      // Scan for viruses if enabled
      let scanResults: VirusScanResult[] = [];
      let quarantined = false;

      if (this.config.scanForViruses) {
        const scanResult = await this.scanForViruses(uploadPath);
        scanResults.push(scanResult);

        if (!scanResult.isClean) {
          await this.quarantineFile(
            uploadPath,
            `Virus scan failed: ${scanResult.threats.join(", ")}`,
          );
          quarantined = true;
        }
      }

      // Create metadata
      const metadata: SecureFileMetadata = {
        originalName: originalFilename,
        sanitizedName: validation.sanitizedFilename,
        mimeType: validation.detectedMimeType,
        size: validation.fileSize,
        hash: validation.hash,
        uploadedAt: new Date(),
        uploadedBy: userId,
        scanResults,
        isQuarantined: quarantined,
        accessLevel,
      };

      // Save metadata
      await fs.writeFile(
        `${uploadPath}.meta`,
        JSON.stringify(metadata, null, 2),
      );

      return {
        success: true,
        metadata,
        quarantined,
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : "Upload failed"],
      };
    }
  }

  // Format file size for display
  private formatFileSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  // Clean up old quarantined files
  async cleanupQuarantine(maxAge: number = 30): Promise<void> {
    try {
      const files = await fs.readdir(this.config.quarantineDirectory);
      const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(this.config.quarantineDirectory, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error("Quarantine cleanup failed:", error);
    }
  }
}

// File Access Control Service
export class FileAccessControlService {
  // Check if user can access file
  async canAccessFile(
    userId: string,
    userRoles: string[],
    fileMetadata: SecureFileMetadata,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Public files are accessible to everyone
    if (fileMetadata.accessLevel === "public") {
      return { allowed: true };
    }

    // Private files are only accessible to the uploader
    if (fileMetadata.accessLevel === "private") {
      if (fileMetadata.uploadedBy === userId) {
        return { allowed: true };
      }
      return { allowed: false, reason: "File is private" };
    }

    // Restricted files require special permissions
    if (fileMetadata.accessLevel === "restricted") {
      if (userRoles.includes("admin") || userRoles.includes("super_admin")) {
        return { allowed: true };
      }
      return { allowed: false, reason: "Insufficient permissions" };
    }

    return { allowed: false, reason: "Unknown access level" };
  }

  // Generate signed URL for file access
  generateSignedUrl(fileId: string, expirationMinutes: number = 60): string {
    const expirationTime = Date.now() + expirationMinutes * 60 * 1000;
    const payload = `${fileId}:${expirationTime}`;
    const signature = crypto
      .createHmac("sha256", process.env.URL_SIGNING_SECRET || "default-secret")
      .update(payload)
      .digest("hex");

    return `${payload}:${signature}`;
  }

  // Verify signed URL
  verifySignedUrl(signedUrl: string): {
    valid: boolean;
    fileId?: string;
    expired?: boolean;
  } {
    try {
      const [fileId, expirationTime, signature] = signedUrl.split(":");

      // Verify signature
      const payload = `${fileId}:${expirationTime}`;
      const expectedSignature = crypto
        .createHmac(
          "sha256",
          process.env.URL_SIGNING_SECRET || "default-secret",
        )
        .update(payload)
        .digest("hex");

      if (signature !== expectedSignature) {
        return { valid: false };
      }

      // Check expiration
      if (Date.now() > parseInt(expirationTime)) {
        return { valid: false, expired: true };
      }

      return { valid: true, fileId };
    } catch (error) {
      return { valid: false };
    }
  }
}

// Export singleton instances
export const fileUploadService = new SecureFileUploadService();
export const fileAccessControl = new FileAccessControlService();

// Utility functions
export const FileUploadUtils = {
  // Get file extension from MIME type
  getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: { [key: string]: string } = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "application/pdf": ".pdf",
      "text/plain": ".txt",
      "text/csv": ".csv",
      "application/msword": ".doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        ".docx",
      "application/vnd.ms-excel": ".xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        ".xlsx",
    };

    return mimeToExt[mimeType] || "";
  },

  // Check if file type is supported
  isFileTypeSupported(mimeType: string): boolean {
    return DEFAULT_CONFIG.allowedMimeTypes.includes(mimeType);
  },

  // Generate secure download filename
  generateSecureDownloadFilename(originalName: string): string {
    const timestamp = Date.now();
    const extension = path.extname(originalName);
    const basename = path.basename(originalName, extension);
    const sanitized = basename.replace(/[^a-zA-Z0-9_-]/g, "_");

    return `${sanitized}_${timestamp}${extension}`;
  },
};

export default SecureFileUploadService;
