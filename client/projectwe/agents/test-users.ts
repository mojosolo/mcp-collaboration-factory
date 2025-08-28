// Test users for development and demo purposes
export const TEST_USERS = [
  {
    id: "test-user-1",
    email: "test1@projectwe.com",
    password: "password123", // In production, these would be hashed
    name: "Test User 1",
    role: "OWNER",
    organizationId: "test-org-1",
    organization: {
      id: "test-org-1",
      name: "Test Organization 1",
      slug: "test-org-1",
    },
  },
  {
    id: "test-user-2",
    email: "test2@projectwe.com",
    password: "password123",
    name: "Test User 2",
    role: "ADMIN",
    organizationId: "test-org-1",
    organization: {
      id: "test-org-1",
      name: "Test Organization 1",
      slug: "test-org-1",
    },
  },
  {
    id: "test-user-3",
    email: "test3@projectwe.com",
    password: "password123",
    name: "Test User 3",
    role: "MEMBER",
    organizationId: "test-org-2",
    organization: {
      id: "test-org-2",
      name: "Test Organization 2",
      slug: "test-org-2",
    },
  },
  {
    id: "demo-user",
    email: "demo@projectwe.com",
    password: "demo123",
    name: "Demo User",
    role: "OWNER",
    organizationId: "demo-org",
    organization: {
      id: "demo-org",
      name: "Demo Company Inc",
      slug: "demo-company",
    },
  },
  {
    id: "investor-user",
    email: "investor@projectwe.com",
    password: "investor123",
    name: "Investor User",
    role: "INVESTOR",
    organizationId: "investor-org",
    organization: {
      id: "investor-org",
      name: "Capital Partners LLC",
      slug: "capital-partners",
    },
  },
];

// Helper function to find user by email
export function findTestUser(email: string) {
  return TEST_USERS.find((user) => user.email === email);
}

// Helper function to validate credentials
export function validateTestUser(email: string, password: string) {
  const user = findTestUser(email);
  if (!user) return null;

  // Simple password check (in production, use bcrypt)
  if (user.password !== password) return null;

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
