#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Environment variable categories
const envVariables = {
  // Database
  database: {
    DATABASE_URL: "postgresql://user:password@localhost:5432/dbname",
    DATABASE_POOLED_URL:
      "postgresql://user:password@localhost:5432/dbname?pgbouncer=true",
    DATABASE_DIRECT_URL: "postgresql://user:password@localhost:5432/dbname",
  },

  // Authentication
  auth: {
    NEXTAUTH_URL: "http://localhost:3010",
    NEXTAUTH_SECRET: "your-nextauth-secret-here",
    GOOGLE_CLIENT_ID: "your-google-client-id",
    GOOGLE_CLIENT_SECRET: "your-google-client-secret",
  },

  // AI Services
  ai: {
    OPENAI_API_KEY: "sk-...",
    ANTHROPIC_API_KEY: "sk-ant-...",
    PINECONE_API_KEY: "your-pinecone-api-key",
    PINECONE_ENVIRONMENT: "your-pinecone-environment",
    PINECONE_INDEX: "your-pinecone-index",
  },

  // Payment
  payment: {
    STRIPE_SECRET_KEY: "sk_test_...",
    STRIPE_WEBHOOK_SECRET: "whsec_...",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_...",
  },

  // Email
  email: {
    RESEND_API_KEY: "re_...",
    EMAIL_FROM: "noreply@projectwe.com",
  },

  // Real-time
  realtime: {
    PUSHER_APP_ID: "your-pusher-app-id",
    PUSHER_KEY: "your-pusher-key",
    PUSHER_SECRET: "your-pusher-secret",
    PUSHER_CLUSTER: "us2",
    NEXT_PUBLIC_PUSHER_KEY: "your-pusher-key",
    NEXT_PUBLIC_PUSHER_CLUSTER: "us2",
  },

  // Storage
  storage: {
    AWS_ACCESS_KEY_ID: "your-aws-access-key",
    AWS_SECRET_ACCESS_KEY: "your-aws-secret-key",
    AWS_S3_BUCKET: "your-s3-bucket",
    AWS_S3_REGION: "us-east-1",
  },

  // Monitoring
  monitoring: {
    SENTRY_DSN: "https://...@sentry.io/...",
    NEXT_PUBLIC_SENTRY_DSN: "https://...@sentry.io/...",
  },

  // Application
  app: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3010",
    NODE_ENV: "development",
    SKIP_ENV_VALIDATION: "false",
  },
};

// Generate .env.example content
function generateEnvExample() {
  let content = `# ===================================================================
# ProjectWE Marketing Platform - Environment Variables
# ===================================================================
# Copy this file to .env.local and fill in your values
# ===================================================================

`;

  for (const [category, vars] of Object.entries(envVariables)) {
    content += `# ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
    content += `# ${"=".repeat(67)}\n`;

    for (const [key, value] of Object.entries(vars)) {
      content += `${key}="${value}"\n`;
    }

    content += "\n";
  }

  return content;
}

// Generate environment manifest
function generateManifest() {
  const required = [
    "DATABASE_URL",
    "DATABASE_POOLED_URL",
    "NEXTAUTH_URL",
    "NEXTAUTH_SECRET",
  ];

  const buildTimeSafe = [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_PUSHER_KEY",
    "NEXT_PUBLIC_PUSHER_CLUSTER",
    "NEXT_PUBLIC_SENTRY_DSN",
  ];

  const manifest = {
    required,
    buildTimeSafe,
    optional: Object.keys(envVariables)
      .reduce((acc, category) => {
        return acc.concat(Object.keys(envVariables[category]));
      }, [])
      .filter((key) => !required.includes(key) && !buildTimeSafe.includes(key)),
  };

  return manifest;
}

// Main execution
function main() {
  // Write .env.example
  const envExamplePath = path.join(process.cwd(), ".env.example");
  fs.writeFileSync(envExamplePath, generateEnvExample());
  console.log("✅ Created .env.example");

  // Write environment manifest
  const manifestPath = path.join(process.cwd(), ".env.manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(generateManifest(), null, 2));
  console.log("✅ Created .env.manifest.json");

  // Check for missing .env.local
  const envLocalPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envLocalPath)) {
    console.log(
      "⚠️  No .env.local found. Copy .env.example to .env.local and fill in your values.",
    );
  }
}

main();
