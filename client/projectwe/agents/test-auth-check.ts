import { NextRequest } from "next/server";

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

// Edge-compatible auth check - just checks for cookie presence
// Actual JWT verification happens in API routes
export function getTestUser(req: NextRequest): TestUser | null {
  const token = req.cookies.get("test-auth-token")?.value;
  
  if (!token) {
    return null;
  }

  // In middleware, we just check if token exists
  // Return a placeholder user object to indicate authenticated
  return {
    id: "test-user",
    email: "test@projectwe.com",
    name: "Test User",
    role: "USER",
    organizationId: "test-org"
  };
}

export function isTestAuthenticated(req: NextRequest): boolean {
  const token = req.cookies.get("test-auth-token")?.value;
  return !!token;
}