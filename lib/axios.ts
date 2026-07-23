import axios from "axios";
import { getSession, signOut } from "next-auth/react";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

const publicApiPaths = [
  "/auth/login",
  "/auth/forget-password",
  "/auth/verify-reset-otp",
  "/auth/reset-password",
];

const sessionRetryDelays = [0, 100, 250, 500, 1000];

let signOutRequest: Promise<void> | null = null;

const signOutOnce = (error = "session_expired") => {
  if (!signOutRequest) {
    signOutRequest = signOut({ callbackUrl: `/login?error=${error}` }).then(() => undefined);
  }

  return signOutRequest;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isPublicApiRequest = (url?: string) => {
  if (!url) return false;

  const path = url.split("?")[0];
  return publicApiPaths.some((publicPath) => path === publicPath || path.endsWith(publicPath));
};

const getSessionWithAccessToken = async () => {
  let latestSession = await getSession();
  if (latestSession?.accessToken) return latestSession;

  for (const delay of sessionRetryDelays.slice(1)) {
    await sleep(delay);
    latestSession = await getSession();
    if (latestSession?.accessToken) return latestSession;
  }

  return latestSession;
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
  if (isPublicApiRequest(config.url)) {
    return config;
  }

  const session = await getSessionWithAccessToken();
  if (session?.accessToken) {
    if (isExpiredJwt(session.accessToken)) {
      await signOutOnce();
      throw new axios.CanceledError("Session expired. Please sign in again.");
    }

    config.headers.Authorization = `Bearer ${session.accessToken}`;
  } else {
    throw new axios.CanceledError("Session is not ready. Please try again.");
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const session = await getSession();
    const accessToken = session?.accessToken;
    const message = error.response?.data?.message;
    const tokenIsExpired = accessToken ? isExpiredJwt(accessToken) : false;
    const shouldSignOut =
      error.response?.status === 401 &&
      !isPublicApiRequest(error.config?.url) &&
      (tokenIsExpired || message === "User not found");

    if (shouldSignOut) {
      await signOutOnce();
    }
    return Promise.reject(error);
  }
);

export default api;
