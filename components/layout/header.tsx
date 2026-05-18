"use client";
import { Bell, Search } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface HeaderProps { title: string; subtitle?: string; action?: React.ReactNode; }

export function Header({ title, subtitle, action }: HeaderProps) {
  const { data: session } = useSession();
  return (
    <header className="h-16 border-b border-[#1e2d40] bg-[#070f1c] flex items-center px-6 gap-4 sticky top-0 z-30">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-white truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 truncate hidden sm:block">{subtitle}</p>}
      </div>
      {action}
      <div className="hidden md:flex items-center w-48">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input placeholder="Search anything..." className="pl-9 h-8 text-xs bg-[#0d1526] border-[#1e2d40]" />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-[#2a3547] px-1.5 py-0.5 text-[10px] text-gray-500">⌘K</kbd>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="w-4 h-4" />
        <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#1e2d40] transition-colors">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs">{getInitials(session?.user?.name || "AB")}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-gray-200 truncate max-w-[80px]">{session?.user?.name || "Alex Barber"}</p>
              <p className="text-[10px] text-gray-500">Owner</p>
            </div>
            <span className="text-gray-500 text-xs hidden sm:block">▾</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link href="/settings">Profile</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/settings">Subscription</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/settings">Billing</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="#">Help Center</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-400" onClick={() => signOut({ callbackUrl: "/login" })}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
