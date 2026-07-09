import axios from "axios";
import { getSession, signOut } from "next-auth/react";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

let signOutRequest: Promise<void> | null = null;

const signOutWithSessionError = () => {
  if (!signOutRequest) {
    signOutRequest = signOut({ callbackUrl: "/login?error=session_expired" }).then(() => undefined);
  }

  return signOutRequest;
};

api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await signOutWithSessionError();
    }
    return Promise.reject(error);
  }
);

export default api;
