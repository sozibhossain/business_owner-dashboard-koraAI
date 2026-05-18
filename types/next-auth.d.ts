import "next-auth";

declare module "next-auth" {
  interface User {
    _id: string;
    role: string;
    accessToken: string;
    refreshToken: string;
  }
  interface Session {
    user: {
      _id: string;
      role: string;
      name: string;
      email: string;
    };
    accessToken: string;
    refreshToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    _id: string;
    role: string;
    accessToken: string;
    refreshToken: string;
  }
}
