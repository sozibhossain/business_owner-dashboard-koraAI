"use client";
import { useEffect, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const loginErrorMessages: Record<string, string> = {
  credentials: "Invalid email or password.",
  CredentialsSignin: "Invalid email or password.",
  user_not_found: "No account found for this email.",
  wrong_password: "Incorrect password.",
  email_not_verified: "Email not verified. Please verify your email first.",
  role_not_allowed: "You are not a business owner. Please use a business owner account.",
  missing_credentials: "Email and password are required.",
  auth_service_unavailable: "Login service is unavailable. Please try again.",
  session_required: "Please sign in to continue.",
  session_expired: "Your session expired. Please sign in again.",
};

const allowedRoles = new Set(["business_owner", "employee"]);

function getLoginErrorMessage(result?: {
  code?: string | null;
  error?: string | null;
  url?: string | null;
}) {
  const code = getLoginErrorCode(result);

  return loginErrorMessages[code] || "Invalid email or password.";
}

function getLoginErrorCode(result?: {
  code?: string | null;
  error?: string | null;
  url?: string | null;
}) {
  const url = result?.url ? new URL(result.url, window.location.origin) : null;
  return (
    result?.code ||
    url?.searchParams.get("code") ||
    url?.searchParams.get("error") ||
    result?.error ||
    ""
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("businessowner@gmail.com");
  const [password, setPassword] = useState("123456");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  function showLoginError(code: string) {
    const message = loginErrorMessages[code] || "Invalid email or password.";
    setFormError(message);
    toast.error(message);
  }

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code") || searchParams.get("error");
    if (!code) return;

    const message = loginErrorMessages[code] || "Invalid email or password.";
    setFormError(message);
    toast.error(message);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setFormError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });
      const authErrorCode = getLoginErrorCode(result);
      if (!result?.ok || authErrorCode) {
        const message = getLoginErrorMessage(result);
        setFormError(message);
        toast.error(message);
        return;
      }

      const session = await getSession();
      const role = session?.user?.role ?? "";

      if (!session) {
        showLoginError("session_required");
        return;
      }

      if (!allowedRoles.has(role)) {
        showLoginError("role_not_allowed");
        return;
      }

      toast.success("Login successful!");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      const message = "Something went wrong. Please try again.";
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#0a1628] border border-[#1e2d40] rounded-2xl p-8 shadow-2xl">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">KoraAI</h1>
          <p className="text-xs text-gray-500">Business Dashboard</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
      <p className="text-gray-400 text-sm mb-6">Sign in to your business account</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (formError) setFormError("");
            }}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (formError) setFormError("");
              }}
              required
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {formError ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {formError}
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-gray-500 mt-6">
        Protected by KoraAI Security
      </p>
    </div>
  );
}
