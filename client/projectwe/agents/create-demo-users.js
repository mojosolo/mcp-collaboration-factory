#!/usr/bin/env node

/**
 * Create Demo Users for Presentation
 * Run: node scripts/create-demo-users.js
 */

const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

// Supabase connection (from your deployment)
const SUPABASE_URL = "https://mxfvlbrdyvdmycuzpwlc.supabase.co";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || "YOUR_SERVICE_KEY_HERE";

// For direct Postgres connection (alternative)
const DATABASE_URL =
  "postgresql://postgres.mxfvlbrdyvdmycuzpwlc:bRkP3RiQ9LBwK5tt@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

// Demo users configuration
const DEMO_USERS = [
  {
    email: "demo@projectwe.com",
    password: "Demo2024!",
    name: "Demo Executive",
    role: "owner",
    company: "ProjectWE Demo Company",
    title: "CEO & Founder",
  },
  {
    email: "manager@projectwe.com",
    password: "Manager2024!",
    name: "Sarah Johnson",
    role: "admin",
    company: "ProjectWE Demo Company",
    title: "Operations Manager",
  },
  {
    email: "advisor@projectwe.com",
    password: "Advisor2024!",
    name: "Michael Chen",
    role: "user",
    company: "Exit Planning Advisors",
    title: "Senior Advisor",
  },
];

async function createDemoUsers() {
  console.log("🚀 Creating demo users for presentation...\n");

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  for (const user of DEMO_USERS) {
    try {
      console.log(`Creating user: ${user.email}`);

      // Hash the password
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Try Supabase Auth first (recommended)
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            name: user.name,
            role: user.role,
            company: user.company,
            title: user.title,
          },
        });

      if (authError && !authError.message.includes("already exists")) {
        console.error(`❌ Auth error for ${user.email}:`, authError.message);
      } else if (authData) {
        console.log(`✅ Created auth user: ${user.email}`);
      }

      // Also insert into users table for app-level data
      const { data: dbData, error: dbError } = await supabase
        .from("users")
        .upsert(
          {
            email: user.email,
            name: user.name,
            role: user.role,
            password: hashedPassword, // Store hashed password
            email_verified: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "email",
          },
        )
        .select();

      if (dbError) {
        console.error(`❌ Database error for ${user.email}:`, dbError.message);
      } else {
        console.log(`✅ Created/updated database user: ${user.email}`);
      }
    } catch (error) {
      console.error(`❌ Error creating ${user.email}:`, error.message);
    }
  }

  console.log("\n📋 Demo User Credentials for Presentation:\n");
  console.log("========================================");
  DEMO_USERS.forEach((user) => {
    console.log(`\n${user.role.toUpperCase()} USER:`);
    console.log(`  Name:     ${user.name}`);
    console.log(`  Email:    ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log(`  Role:     ${user.role}`);
  });
  console.log("\n========================================");
  console.log("\n✅ Demo users ready for presentation!");
  console.log("🔗 App URL: https://dev-exitmvp-o5cgr.ondigitalocean.app");
}

// Run the script
createDemoUsers().catch(console.error);
