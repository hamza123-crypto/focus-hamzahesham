export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
  // Add additional configuration for the password provider
  callbacks: {
    // Configure how to handle user profiles
    async profile(profile: any, account: any) {
      const email = typeof profile.email === 'string' ? profile.email : '';
      const name = typeof profile.name === 'string' ? profile.name : '';
      return {
        email: email,
        name: name && name.trim() !== "" ? name : email.split("@")[0] || "User",
      };
    },
  },
  // Session configuration
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};