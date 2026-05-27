import { Sidebar } from "@/components/layout/sidebar";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileNavProvider>
      <div className="flex h-screen overflow-hidden bg-[#050d1a]">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </MobileNavProvider>
  );
}
