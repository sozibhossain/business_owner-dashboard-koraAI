import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

const allowedRoles = new Set(["business_owner", "employee"]);

class DashboardCredentialsError extends CredentialsSignin {
  constructor(code = "invalid_credentials") {
    super();
    this.code = code;
  }
}

function mapAuthErrorCode(message?: string) {
  switch (message) {
    case "User not found":
      return "user_not_found";
    case "Wrong password":
      return "wrong_password";
    case "Email not verified":
      return "email_not_verified";
    default:
      return "invalid_credentials";
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim();
        const password = String(credentials?.password ?? "");

        if (!email || !password) {
          throw new DashboardCredentialsError("missing_credentials");
        }

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/auth/login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password }),
            }
          );

          const data = await res.json().catch(() => null);

          if (!res.ok || !data?.success || !data?.data) {
            throw new DashboardCredentialsError(mapAuthErrorCode(data?.message));
          }

          if (!allowedRoles.has(data.data.role)) {
            throw new DashboardCredentialsError("role_not_allowed");
          }

          return {
            id: data.data._id,
            _id: data.data._id,
            email: data.data.email,
            role: data.data.role,
            name: data.data.name,
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          };
        } catch (error) {
          if (error instanceof CredentialsSignin) {
            throw error;
          }

          throw new DashboardCredentialsError("auth_service_unavailable");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token._id = user.id;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }
      return token;
    },
    async session({ session, token }) {
      session.user._id = token._id as string;
      session.user.role = token.role as string;
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
});
