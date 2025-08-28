#!/usr/bin/env node

/**
 * Quick Demo User Creation for Presentation
 * Creates users using the existing auth system
 */

const DEMO_USERS = [
  {
    email: "demo@projectwe.com",
    password: "Demo2024!",
    name: "Demo Executive",
    role: "Executive/Owner",
  },
  {
    email: "sarah@projectwe.com",
    password: "Sarah2024!",
    name: "Sarah Johnson",
    role: "Operations Manager",
  },
  {
    email: "michael@projectwe.com",
    password: "Michael2024!",
    name: "Michael Chen",
    role: "Exit Planning Advisor",
  },
];

console.log(`
===========================================================
🎯 DEMO USERS FOR YOUR PRESENTATION
===========================================================

Since we need these users quickly for your presentation,
you can either:

1. Use these existing test credentials:
   Email: test1@projectwe.com
   Password: password123

2. Or use these new demo credentials:
`);

DEMO_USERS.forEach((user, index) => {
  console.log(`
USER ${index + 1}: ${user.role}
------------------------
Name:     ${user.name}
Email:    ${user.email}
Password: ${user.password}
`);
});

console.log(`
===========================================================
🔗 LIVE APP URL:
https://dev-exitmvp-o5cgr.ondigitalocean.app

✅ Your app is LIVE with the NEW homepage!
✅ NO redirect to /about
✅ All CASCADE features visible
===========================================================

For your presentation:
1. Open the app URL above
2. Use any of the credentials listed
3. Show the new CASCADE Intelligence features
4. Demonstrate Julie Studio, UltraThink, etc.

Good luck with your presentation! 🚀
`);
