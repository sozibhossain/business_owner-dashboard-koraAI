import axios from "axios";
import { getSession, signOut } from "next-auth/react";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

let signOutRequest: Promise<void> | null = null;

const signOutOnce = () => {
  if (!signOutRequest) {
    signOutRequest = signOut({ callbackUrl: "/login?error=session_expired" }).then(() => undefined);
  }

  return signOutRequest;
};

const getJwtExpiry = (token: string) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalizedPayload = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const decodedPayload = JSON.parse(atob(normalizedPayload)) as { exp?: number };

    return decodedPayload.exp ? decodedPayload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const isExpiredJwt = (token: string) => {
  const expiry = getJwtExpiry(token);
  if (!expiry) return false;

  return expiry <= Date.now() + 30_000;
};

api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.accessToken) {
    if (isExpiredJwt(session.accessToken)) {
      await signOutOnce();
      throw new axios.CanceledError("Session expired. Please sign in again.");
    }

    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await signOutOnce();
    }
    return Promise.reject(error);
  }
);

export default api;
