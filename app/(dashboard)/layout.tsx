import { Sidebar } from "@/components/layout/sidebar";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";
import { AuthSessionGate } from "@/components/auth-session-gate";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSessionGate>
      <MobileNavProvider>
        <div className="flex h-dvh overflow-hidden bg-[#050d1a]">
          <Sidebar />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
          </main>
        </div>
      </MobileNavProvider>
    </AuthSessionGate>
  );
}
