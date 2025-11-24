import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // Configure the password provider properly
      profile: (profile) => {
        const email = typeof profile.email === 'string' ? profile.email : '';
        const name = typeof profile.name === 'string' ? profile.name : '';
        return {
          email: email,
          // Ensure name is always populated, even if not provided
          name: name && name.trim() !== "" ? name : email.split("@")[0] || "User",
        };
      },
    }),
    Anonymous,
  ],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});