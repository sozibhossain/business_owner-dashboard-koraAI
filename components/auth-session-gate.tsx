"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthSessionGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?error=session_required&callbackUrl=${callbackUrl}`);
    }
  }, [pathname, router, status]);

  if (status !== "authenticated") {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#050d1a] text-gray-300">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading session...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
