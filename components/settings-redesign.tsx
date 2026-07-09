"use client";

import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowRight,
  BarChart3,
  Bell,
  Brain,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Cloud,
  CreditCard,
  Crown,
  Database,
  Download,
  Eye,
  FileText,
  Globe,
  HardDrive,
  HeartPulse,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Monitor,
  MoreVertical,
  Plus,
  Receipt,
  RefreshCw,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  aiDataApi,
  employeesApi,
  notificationsApi,
  subscriptionApi,
  userApi,
} from "@/lib/api";
import { asArray, getInitials } from "@/lib/utils";
import { toast } from "sonner";

type TabId =
  | "general"
  | "business"
  | "team"
  | "notifications"
  | "billing"
  | "integrations"
  | "security"
  | "ai"
  | "advanced";

type QuickActionId = "profile" | "team" | "billing" | "security";

const tabs: Array<{ id: TabId; label: string; title: string; subtitle: string }> = [
  { id: "general", label: "General", title: "Settings", subtitle: "Manage your account, business and preferences." },
  { id: "business", label: "Business", title: "Settings", subtitle: "Manage your account, business and preferences." },
  { id: "team", label: "Team & Roles", title: "Settings", subtitle: "Manage your account, business and preferences." },
  { id: "notifications", label: "Notifications", title: "Settings", subtitle: "Manage your account, business and preferences." },
  { id: "billing", label: "Billing & Subscription", title: "Settings", subtitle: "Manage your account, business and preferences." },
  { id: "integrations", label: "Integrations", title: "Settings", subtitle: "Manage your account, business and preferences." },
  { id: "security", label: "Security", title: "Settings", subtitle: "Manage your account, business and preferences." },
  { id: "ai", label: "AI Settings", title: "AI Settings", subtitle: "Customize your AI assistant and configure how Kora AI works for your business." },
  { id: "advanced", label: "Advanced", title: "Advanced Settings", subtitle: "Configure advanced options and system preferences for your workspace." },
];

const tabIcons: Record<TabId, ElementType> = {
  general: Monitor,
  business: Building2,
  team: Users,
  notifications: Bell,
  billing: CreditCard,
  integrations: Globe,
  security: ShieldCheck,
  ai: Sparkles,
  advanced: Database,
};

const card = "overflow-hidden border-[#182a40] bg-[#071725]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]";
const panel = "rounded-xl border border-[#182a40] bg-[#0b1a2c]/90";
const input = "h-9 border-[#1c3048] bg-[#081523] text-sm text-gray-200 placeholder:text-gray-600 focus-visible:ring-blue-500 2xl:h-10";

type ProfileData = {
  name?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  businessName?: string;
  businessEmail?: string;
  businessAddress?: string;
  website?: string;
  timezone?: string;
  bio?: string;
  createdAt?: string;
  profileImage?: { url?: string };
  settings?: {
    interface?: Record<string, string>;
    business?: Record<string, string>;
    notifications?: Record<string, boolean>;
    ai?: Record<string, string>;
  };
};

type EmployeeData = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  status?: string;
  lastActive?: string;
};

type SubscriptionData = {
  plan?: { name?: string; price?: number; amount?: number; currency?: string };
  planName?: string;
  currentPlan?: { name?: string };
  status?: string;
  billingCycle?: string;
  nextBillingDate?: string;
};

function unwrapData(response: unknown) {
  const envelope = response as { data?: { data?: unknown } | unknown };
  const data = envelope?.data;
  return (data as { data?: unknown })?.data ?? data ?? response;
}

function profileValue(profile: ProfileData | undefined, key: keyof ProfileData, fallback: string) {
  const value = profile?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function inputValue(name: string, fallback = "") {
  if (typeof document === "undefined") return fallback;
  return document.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value?.trim() || fallback;
}

function fileValue(name: string) {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.files?.[0] || null;
}

function IconBox({ icon: Icon, color = "text-blue-400", bg = "bg-blue-600/15" }: { icon: ElementType; color?: string; bg?: string }) {
  return <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg 2xl:h-9 2xl:w-9 ${bg}`}><Icon className={`h-4 w-4 ${color}`} /></span>;
}

function Toggle({ on = true, purple = false }: { on?: boolean; purple?: boolean }) {
  return <button type="button" className={`flex h-5 w-10 shrink-0 items-center rounded-full p-0.5 ${on ? (purple ? "bg-purple-600" : "bg-blue-600") : "bg-[#2a3547]"}`}><span className={`h-4 w-4 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} /></button>;
}

function Field({ label, value, type = "text", name }: { label: string; value?: string; type?: string; name?: string }) {
  return <div className="space-y-1.5"><Label className="text-xs text-gray-300">{label}</Label><Input key={value} name={name || label} type={type} autoComplete={type === "password" ? "new-password" : "off"} defaultValue={value} className={input} /></div>;
}

function SelectField({ label, value, icon: Icon = Globe }: { label: string; value: string; icon?: ElementType }) {
  return <div className="space-y-1.5"><Label className="text-xs text-gray-300">{label}</Label><input type="hidden" name={label} value={value} readOnly /><button type="button" className="flex h-9 w-full items-center justify-between rounded-lg border border-[#1c3048] bg-[#081523] px-3 text-sm text-gray-200 2xl:h-10"><span className="flex min-w-0 items-center gap-2"><Icon className="h-4 w-4 shrink-0 text-gray-400" /><span className="truncate">{value}</span></span><ChevronDown className="h-4 w-4 shrink-0 text-gray-500" /></button></div>;
}

function Section({ title, subtitle, action, children, className = "" }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <Card className={`${card} ${className}`}><CardHeader className="flex-row items-start justify-between gap-3 space-y-0 p-4 pb-3 2xl:p-5 2xl:pb-4"><div className="min-w-0"><CardTitle className="text-base text-white 2xl:text-lg">{title}</CardTitle>{subtitle ? <p className="mt-1 line-clamp-2 text-xs text-gray-400">{subtitle}</p> : null}</div>{action}</CardHeader><CardContent className="p-4 pt-0 2xl:p-5 2xl:pt-0">{children}</CardContent></Card>;
}

function Row({ icon, title, sub, right }: { icon: ElementType; title: string; sub: string; right?: ReactNode }) {
  return <div className="flex items-center gap-3 border-b border-[#182a40] py-2.5 last:border-0"><IconBox icon={icon} color="text-gray-300" bg="bg-[#101f35]" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-100">{title}</p><p className="truncate text-xs text-gray-500">{sub}</p></div>{right ?? <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />}</div>;
}

function Metric({ icon, value, label, color = "text-blue-300" }: { icon: ElementType; value: string; label: string; color?: string }) {
  return <div className={`${panel} p-3 2xl:p-4`}><div className="flex items-center gap-3"><IconBox icon={icon} color={color} /><div><p className="text-xl font-semibold leading-none text-white 2xl:text-2xl">{value}</p><p className="mt-1 text-xs text-gray-300">{label}</p></div></div></div>;
}

function Ring({ value, label }: { value: string; label: string }) {
  return <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[conic-gradient(#2563eb_0_68%,#1e2d40_68%_100%)] 2xl:h-28 2xl:w-28"><div className="flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center rounded-full bg-[#071725] 2xl:h-20 2xl:w-20"><span className="text-xl font-semibold text-white 2xl:text-2xl">{value}</span><span className="text-xs text-gray-400">{label}</span></div></div>;
}

function Progress({ icon, label, value, pct }: { icon: ElementType; label: string; value: string; pct: number }) {
  return <div className="grid grid-cols-[36px_1fr_auto] items-center gap-3"><IconBox icon={icon} bg="bg-[#101f35]" /><div><p className="text-xs font-medium text-gray-200">{label}</p><div className="mt-1 h-1.5 rounded-full bg-[#1e2d40]"><div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} /></div></div><span className="text-xs text-gray-300">{value}</span></div>;
}

function RightRail({ profile, onAskKora, onQuickAction }: { profile?: ProfileData; onAskKora?: () => void; onQuickAction?: (action: QuickActionId) => void } = {}) {
  const firstName = profileValue(profile, "name", "Alex Barber").split(" ")[0] || "Alex";
  return (
    <aside className="settings-right-rail min-h-0 space-y-3 xl:sticky xl:top-3">
      <Card className={card}>
        <CardContent className="p-4 2xl:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-white 2xl:text-lg">Kora AI Assistant</h3>
            <span className="rounded-md bg-purple-600/40 px-2 py-1 text-xs font-semibold text-purple-100">BETA</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden 2xl:h-24 2xl:w-24">
              <Image src="/kora.png" alt="Kora" width={96} height={96} unoptimized className="kora-image h-full w-full object-contain" />
            </div>
            <p className="text-sm leading-6 text-gray-200">Hi {firstName}! I can help you manage your settings and optimize your experience.</p>
          </div>
          <button type="button" onClick={onAskKora} className="mt-4 flex h-10 w-full items-center justify-between rounded-lg border border-[#1e2d40] bg-[#081523] px-4 text-sm font-medium text-gray-100 2xl:h-11">
            <span className="flex min-w-0 items-center gap-2"><Sparkles className="h-4 w-4 shrink-0 text-blue-400" /><span className="truncate">Ask Kora anything...</span></span>
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
          </button>
        </CardContent>
      </Card>
      <Card className={`${card} dashboard-secondary`}>
        <CardHeader className="p-4 pb-1 2xl:p-5 2xl:pb-2"><CardTitle className="text-base 2xl:text-lg">Quick Actions</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 2xl:p-5 2xl:pt-0">
          <button type="button" onClick={() => onQuickAction?.("profile")} className="block w-full text-left"><Row icon={CreditCard} title="View Profile" sub="View and edit your profile" /></button>
          <button type="button" onClick={() => onQuickAction?.("team")} className="block w-full text-left"><Row icon={Users} title="Manage Team" sub="Add or manage team members" /></button>
          <button type="button" onClick={() => onQuickAction?.("billing")} className="block w-full text-left"><Row icon={Receipt} title="Billing Portal" sub="Update payment methods" /></button>
          <button type="button" onClick={() => onQuickAction?.("security")} className="block w-full text-left"><Row icon={ShieldCheck} title="Security Settings" sub="Manage 2FA and sessions" /></button>
        </CardContent>
      </Card>
      <Card className={`${card} settings-help-card hidden`}>
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold text-white">Need Help?</h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">Our support team is here to help you succeed.</p>
          <button type="button" className="mt-4 flex h-10 items-center gap-2 rounded-lg border border-[#1e2d40] px-4 text-sm font-medium text-white">Visit Help Center<ArrowRight className="h-4 w-4" /></button>
        </CardContent>
      </Card>
    </aside>
  );
}

function ProTip({ children }: { children: ReactNode }) {
  return <div className="dashboard-secondary flex items-center justify-between rounded-xl border border-purple-500/20 bg-purple-950/25 px-4 py-3 2xl:px-5 2xl:py-4"><div className="flex min-w-0 items-center gap-3"><Sparkles className="h-5 w-5 shrink-0 text-purple-300 2xl:h-6 2xl:w-6" /><p className="truncate text-sm text-gray-200"><span className="font-semibold text-purple-300">Pro Tip from Kora</span><span className="ml-3">{children}</span></p></div><Button size="sm" className="shrink-0 bg-purple-700 hover:bg-purple-600">Learn More</Button></div>;
}

function ToggleList({ title, items, badge }: { title: string; items: string[]; badge?: string }) {
  return <Section title={title} action={badge ? <span className="rounded bg-emerald-600/20 px-3 py-1 text-xs text-emerald-400">{badge}</span> : null}><div className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">{items.map((item) => <div key={item} className="flex items-center justify-between gap-4"><span className="min-w-0 text-sm text-gray-300">{item}</span><Toggle purple={badge === "Early Access"} /></div>)}</div></Section>;
}

function General({
  profile,
  onSave,
  onChangePassword,
  onPhotoChange,
  photoPreview,
  isSaving = false,
}: {
  profile?: ProfileData;
  onSave?: () => void;
  onChangePassword?: () => void;
  onPhotoChange?: (file: File | null) => void;
  photoPreview?: string;
  isSaving?: boolean;
} = {}) {
  const name = profileValue(profile, "name", "Alex Barber");
  const email = profileValue(profile, "email", "alex@fademasters-barbershop.com");
  const timezone = profileValue(profile, "timezone", "(GMT+1) Berlin, Germany");
  const interfaceSettings = profile?.settings?.interface || {};
  return (
    <div className="space-y-3 2xl:space-y-4">
      <div className="grid gap-3 lg:grid-cols-2 2xl:gap-4">
        <Section title="Account Information" subtitle="Update your account details and preferences.">
          <div className="grid gap-4 lg:grid-cols-[7.5rem_1fr] 2xl:grid-cols-[8.5rem_1fr]">
            <div className="flex flex-col items-center rounded-xl border border-dashed border-[#1e2d40] p-3">
              <Avatar className="h-20 w-20 2xl:h-24 2xl:w-24">
                <AvatarImage src={photoPreview || profile?.profileImage?.url || ""} />
                <AvatarFallback className="text-xl">{getInitials(name)}</AvatarFallback>
              </Avatar>
              <label className="mt-3 flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#1e2d40] px-3 text-xs text-gray-200">
                <Upload className="h-3.5 w-3.5" />
                Change Photo
                <input
                  name="profileImage"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="sr-only"
                  onChange={(event) => onPhotoChange?.(event.target.files?.[0] || null)}
                />
              </label>
              {photoPreview ? <p className="mt-2 text-center text-[11px] text-emerald-400">Preview ready. Save to upload.</p> : null}
              <p className="dashboard-secondary mt-2 text-center text-[11px] text-gray-500">PNG, JPG or SVG<br />Max. 2MB</p>
            </div>
            <div className="grid content-start gap-3 sm:grid-cols-2">
              <Field label="Full Name" value={name} />
              <Field label="Email Address" value={email} />
              <SelectField label="Language" value="English (EN)" />
              <SelectField label="Timezone" value={timezone} icon={Clock} />
              <div className="flex justify-end pt-1 sm:col-span-2">
                <Button onClick={onSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Change Password" subtitle="Keep your account secure with a strong password.">
          <div className="space-y-3">
            <Field label="Current Password" type="password" value="" />
            <Field label="New Password" type="password" value="" />
            <Field label="Confirm New Password" type="password" value="" />
            <div className="flex justify-end pt-1">
              <Button onClick={onChangePassword}>Update Password</Button>
            </div>
          </div>
        </Section>
      </div>

      <div className="grid gap-3 lg:grid-cols-3 2xl:gap-4">
        <Section title="Interface Preferences" subtitle="Customize your dashboard experience.">
          <div className="space-y-3">
            <SelectField label="Theme" value={interfaceSettings.theme || "Dark"} icon={Clock} />
            <SelectField label="Sidebar Style" value={interfaceSettings.sidebarStyle || "Expanded"} icon={Monitor} />
            <SelectField label="Date Format" value={interfaceSettings.dateFormat || "DD.MM.YYYY"} icon={Calendar} />
            <SelectField label="Number Format" value={interfaceSettings.numberFormat || "1.234,56 (DE)"} icon={BarChart3} />
            <Button className="w-full" onClick={onSave}>Save Changes</Button>
          </div>
        </Section>
        <ToggleList title="Dashboard Preferences" items={["Show Analytics Overview", "Show Upcoming Appointments", "Show Revenue Summary", "Show Task Overview", "Show Recent Activity"]} />
        <Section title="Account Status" subtitle="Overview of your account status and limits.">
          <div className="space-y-2 text-sm">
            <Pair label="Plan" value="Professional" success />
            <Pair label="Member Since" value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "May 20, 2025"} />
            <Pair label="Website" value="Live" success />
            <Pair label="Team Members" value="4 / 10" />
            <Progress icon={HardDrive} label="Storage Used" value="2.4 GB / 50 GB" pct={24} />
            <Button variant="outline" className="w-full">View Billing & Plan</Button>
          </div>
        </Section>
      </div>

      <ProTip>Complete your business profile to unlock advanced features and get better results.</ProTip>
    </div>
  );
}

function Pair({ label, value, success = false }: { label: string; value: string; success?: boolean }) {
  return <div className="flex items-center justify-between border-b border-[#1e2d40] py-2 last:border-0"><span className="text-gray-400">{label}</span><span className={success ? "font-medium text-emerald-400" : "text-gray-200"}>{value}</span></div>;
}

function Business({ profile, onSave, isSaving = false }: { profile?: ProfileData; onSave?: () => void; isSaving?: boolean } = {}) {
  const businessName = profileValue(profile, "businessName", "KoraAI");
  const businessEmail = profileValue(profile, "businessEmail", profileValue(profile, "email", "info@koraai.de"));
  const phone = profileValue(profile, "phoneNumber", profileValue(profile, "phone", "+49 30 12345678"));
  const website = profileValue(profile, "website", "https://koraai.de");
  const businessSettings = profile?.settings?.business || {};
  return <div className="space-y-5"><div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]"><Section title="Company Information" subtitle="Update your business details."><div className="grid gap-5 lg:grid-cols-[160px_1fr]"><div className="flex flex-col items-center rounded-xl border border-dashed border-[#1e2d40] p-4"><div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white"><Sparkles className="h-12 w-12 text-blue-600" /></div><button type="button" className="mt-4 text-sm text-blue-400">Change Logo</button><p className="mt-2 text-center text-xs text-gray-500">PNG, JPG or SVG<br />Max. 2MB</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Business Name" value={businessName} /><Field label="Business Email" value={businessEmail} /><Field label="Business Phone" value={phone} /><Field label="Website" value={website} /><SelectField label="Industry" value={businessSettings.industry || "Software & Technology"} icon={Building2} /><div className="sm:col-span-2 flex justify-end pt-4"><Button onClick={onSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button></div></div></div></Section><Section title="Business Profile" subtitle="Complete your business profile to unlock all features."><div className="grid items-center gap-6 sm:grid-cols-[140px_1fr]"><Ring value="65%" label="Complete" /><div className="space-y-3">{["Company Information", "Business Address", "Branding", "Business Locations", "Services & AI Context", "Working Hours", "Tax & Legal"].map((label, index) => <div key={label} className="flex items-center justify-between text-sm"><span className="text-gray-300">{label}</span>{index < 4 ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <span className="h-3 w-3 rounded-full bg-amber-400" />}</div>)}<Button className="mt-4 w-full" onClick={onSave}>Complete Profile</Button></div></div></Section></div><div className="grid gap-5 lg:grid-cols-3"><Section title="Business Address" subtitle="Your primary business address."><div className="space-y-4"><Field label="Address" value={profileValue(profile, "businessAddress", "Unter den Linden 10")} /><Field label="Address Line 2 (Optional)" value="Suite 5A" /><div className="grid grid-cols-2 gap-3"><Field label="ZIP Code" value="10117" /><Field label="City" value="Berlin" /></div><Button onClick={onSave} className="w-full">Save Changes</Button></div></Section><Section title="Branding" subtitle="Customize your brand identity."><div className="space-y-4">{[["Primary Color", "#2563EB", "bg-blue-600"], ["Secondary Color", "#1E293B", "bg-[#1e293b]"], ["Accent Color", "#7C3AED", "bg-purple-600"]].map(([label, value, color]) => <div key={label} className="grid grid-cols-[1fr_120px] gap-3"><Field label={label} value={value} /><div className={`mt-5 h-10 rounded-lg border border-[#1e2d40] ${color}`} /></div>)}<Button className="w-full" onClick={onSave}>Save Changes</Button></div></Section><Section title="Business Locations" subtitle="Manage all your business locations." action={<Button size="sm" className="gap-2" onClick={onSave}><Plus className="h-4 w-4" />Add Location</Button>}>{["Berlin (Main Location)", "Hamburg", "Munich"].map((city) => <div key={city} className={`${panel} mb-3 flex items-center gap-3 p-3`}><IconBox icon={MapPin} bg="bg-[#101f35]" color="text-gray-400" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-gray-100">{city}</p><p className="truncate text-xs text-gray-500">Unter den Linden 10, 10117 Berlin, Germany</p></div><MoreVertical className="h-4 w-4 text-gray-500" /></div>)}</Section></div><div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]"><Section title="AI Business Context" subtitle="Help Kora AI understand your business to provide better assistance."><textarea name="AI Business Context" className="h-32 w-full resize-none rounded-lg border border-[#1c3048] bg-[#081523] p-3 text-sm text-gray-300 outline-none" defaultValue={businessSettings.aiContext || profile?.bio || `${businessName} is an all-in-one business platform for service-based businesses.`} /></Section><Section title="Business Preferences" subtitle="Set default preferences for your business."><div className="grid gap-4 sm:grid-cols-2"><Field label="Working Hours" value={businessSettings.workingHours || "Mon - Fri, 09:00 - 18:00"} /><SelectField label="Default Currency" value={businessSettings.defaultCurrency || "Euro (EUR)"} icon={Wallet} /><SelectField label="Default Appointment Duration" value={businessSettings.defaultAppointmentDuration || "60 minutes"} icon={Clock} /><SelectField label="Default Language" value={businessSettings.defaultLanguage || "English (EN)"} /></div><Button className="mt-5 w-full" onClick={onSave}>Save Changes</Button></Section></div><ProTip>Complete your business profile to unlock advanced features and get better results.</ProTip></div>;
}

function Team({ employees = [] }: { employees?: EmployeeData[] } = {}) {
  const fallbackRows: EmployeeData[] = [
    { name: "Andreas Mehlich", email: "andreas@koraai.de", role: "Owner", department: "Management", status: "Active" },
    { name: "Lisa Weber", email: "lisa@koraai.de", role: "Admin", department: "Management", status: "Active" },
    { name: "Max Bauer", email: "max@koraai.de", role: "Staff", department: "Sales", status: "Active" },
    { name: "Anna Schmidt", email: "anna@koraai.de", role: "Staff", department: "Support", status: "Invited" },
  ];
  const rows = (employees.length ? employees : fallbackRows).slice(0, 4);
  const teamCount = employees.length || fallbackRows.length;
  const activeCount = rows.filter((employee) => employee.status?.toLowerCase() !== "invited").length;
  const invitedCount = rows.filter((employee) => employee.status?.toLowerCase() === "invited").length;
  return <div className="space-y-5"><Section title="Team Overview" subtitle="Manage your team members and their access." action={<Button className="gap-2"><UserPlus className="h-4 w-4" />Invite Member</Button>}><div className="grid gap-4 sm:grid-cols-4"><Metric icon={Users} value={String(teamCount)} label="Team Members" /><Metric icon={Shield} value="1" label="Owner" color="text-emerald-300" /><Metric icon={Crown} value="1" label="Admin" /><Metric icon={Users} value={String(Math.max(teamCount - 2, 0))} label="Staff" color="text-purple-300" /></div></Section><div className="grid gap-5 lg:grid-cols-[1.35fr_0.8fr]"><Section title="Team Members" subtitle="View and manage your team members."><div className="overflow-hidden rounded-xl border border-[#1e2d40]">{rows.map((employee, index) => { const name = employee.name || "Team Member"; const status = employee.status || (index === 3 ? "Invited" : "Active"); return <div key={employee._id || employee.id || name} className="grid grid-cols-[1.4fr_0.8fr_1fr_0.8fr_40px] items-center border-b border-[#1e2d40] px-4 py-3 text-sm last:border-0"><div className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarFallback>{getInitials(name)}</AvatarFallback></Avatar><div><p className="font-medium text-gray-100">{name}</p><p className="text-xs text-gray-500">{employee.email || `${name.toLowerCase().replace(" ", ".")}@koraai.de`}</p></div></div><span className="w-fit rounded bg-blue-600/20 px-2 py-1 text-xs text-blue-300">{employee.role || (index === 0 ? "Owner" : index === 1 ? "Admin" : "Staff")}</span><span>{employee.department || (index < 2 ? "Management" : index === 2 ? "Sales" : "Support")}</span><span className={status.toLowerCase() === "invited" ? "text-amber-400" : "text-emerald-400"}>{status}</span><MoreVertical className="h-4 w-4 text-gray-500" /></div>; })}</div></Section><Section title="Team Usage" subtitle="Track your team seat usage."><div className="flex flex-col items-center"><Ring value={`${teamCount} / 10`} label="Members" /><Button className="mt-5 w-full">Upgrade Plan</Button></div></Section></div><div className="grid gap-5 lg:grid-cols-[1.35fr_0.8fr]"><ToggleList title="Roles & Permissions" items={["Full Access", "Billing & Subscription", "Team Management", "All Modules & Features", "Settings & Integrations", "Reports"]} /><Section title="Team Activity" subtitle="Overview of your team activity."><Row icon={Users} title="Active Today" sub="Team members active today" right={<span className="text-2xl text-emerald-400">{activeCount}</span>} /><Row icon={UserPlus} title="Pending Invites" sub="Invitations waiting for response" right={<span className="text-2xl text-amber-400">{invitedCount}</span>} /><Row icon={Globe} title="Online Now" sub="Currently online" right={<span className="text-2xl text-emerald-400">{Math.min(activeCount, 2)}</span>} /></Section></div></div>;
}

function Notifications({ unreadCount = 0, profile }: { unreadCount?: number; profile?: ProfileData } = {}) {
  return <div className="space-y-5"><div className="grid gap-5 lg:grid-cols-2"><ToggleList title="Notification Overview" items={["Email Notifications", "Push Notifications (Mobile App)", "SMS Notifications", "Browser Notifications"]} /><Section title="Notification Status" subtitle="Check the status of your notification channels."><Row icon={Mail} title="Email Address" sub={profileValue(profile, "email", "alex@koraai.de")} right={<span className="text-sm text-emerald-400">Verified</span>} /><Row icon={Smartphone} title="Phone Number" sub={profileValue(profile, "phoneNumber", profileValue(profile, "phone", "+49 30 12345678"))} right={<span className="text-sm text-emerald-400">Verified</span>} /><Row icon={Bell} title="Unread Notifications" sub="Loaded from /notification/unread-count" right={<span className="text-sm text-blue-400">{unreadCount}</span>} /></Section></div><Section title="Email Notifications" subtitle="Receive email alerts for important updates and activities."><div className="grid gap-6 md:grid-cols-3">{["Customer Activity", "Team Activity", "Billing & Payments"].map((group) => <div key={group}><h4 className="mb-3 text-sm font-medium text-gray-100">{group}</h4>{["New Customer Created", "New Appointment Booked", "Appointment Cancelled", "New Lead Captured", "New Review Received"].map((item) => <label key={item} className="mb-2 flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" defaultChecked className="h-4 w-4 rounded accent-blue-600" />{item}</label>)}</div>)}</div></Section><div className="grid gap-5 lg:grid-cols-2"><ToggleList title="Push Notifications (Mobile App)" items={["New Appointment", "Incoming Message", "New Task Assigned", "Payment Received", "New Review", "New Lead Captured"]} /><ToggleList title="Browser Notifications" items={["New Appointment", "Incoming Message", "New Task Assigned", "Payment Received", "New Review", "New Lead Captured"]} /><ToggleList title="Kora AI Notifications" items={["AI found missed opportunities", "AI found unanswered leads", "AI recommends follow-up", "Weekly AI Performance Report"]} /><Section title="Notification Schedule" subtitle="Choose when and how often you want to receive notifications."><div className="grid gap-6 sm:grid-cols-2"><div className="grid grid-cols-2 gap-3"><SelectField label="Start" value="22:00" icon={Clock} /><SelectField label="End" value="08:00" icon={Clock} /></div><div>{["Instant (Real-time)", "Hourly Digest", "Daily Summary", "Weekly Summary"].map((item, index) => <label key={item} className="mb-2 flex items-center gap-2 text-sm text-gray-300"><input type="radio" defaultChecked={index === 2} name="digest" className="accent-blue-600" />{item}</label>)}</div></div></Section></div><ProTip>Configure your notifications to never miss important updates.</ProTip></div>;
}

function Billing({ subscription, teamCount = 4, onOpenPortal }: { subscription?: SubscriptionData; teamCount?: number; onOpenPortal?: () => void } = {}) {
  const planName = subscription?.plan?.name || subscription?.planName || subscription?.currentPlan?.name || "Professional";
  const status = subscription?.status || "Active";
  const price = subscription?.plan?.price ?? subscription?.plan?.amount ?? 49.99;
  const cycle = subscription?.billingCycle || "month";
  const nextBilling = subscription?.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Jul 15, 2026";
  return <div className="space-y-5"><div className="grid gap-5 lg:grid-cols-[1.25fr_0.9fr]"><Section title="Current Plan"><div className="flex items-start gap-6"><IconBox icon={Crown} bg="bg-blue-600/15" color="text-white" /><div className="flex-1"><div className="flex items-center gap-3"><h3 className="text-2xl font-semibold text-white">{planName} Plan</h3><span className="rounded bg-emerald-600/20 px-2 py-1 text-xs text-emerald-400">{status}</span></div><p className="mt-3 text-2xl text-white">EUR {price} <span className="text-sm text-gray-400">/{cycle}</span></p><p className="mt-2 text-sm text-gray-400">Next billing: {nextBilling}</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{["Unlimited AI Assistant", "Inbox", "Calendar", "Accounting", "Website Builder", "10 Employees", "Live View"].map((item) => <p key={item} className="flex items-center gap-2 text-sm text-gray-300"><Check className="h-4 w-4 text-emerald-400" />{item}</p>)}</div><div className="mt-7 grid grid-cols-2 gap-3"><Button onClick={onOpenPortal}>Upgrade Plan</Button><Button variant="outline" onClick={onOpenPortal}>Change Plan</Button></div></div></div></Section><Section title="Billing Summary"><Row icon={Crown} title="Current Plan" sub={planName} /><Row icon={CreditCard} title={cycle === "annual" ? "Annual" : "Monthly"} sub={`EUR ${price}`} /><Row icon={Calendar} title="Next Payment" sub={nextBilling} /><Row icon={CheckCircle2} title="Status" sub={status} right={<span className="text-emerald-400">{status}</span>} /></Section></div><div className="grid gap-5 lg:grid-cols-2"><Section title="Payment Method"><Row icon={CreditCard} title="Mastercard" sub="**** 2845, expires 08 / 2029" right={<MoreVertical className="h-4 w-4 text-gray-500" />} /><Button className="mt-4 w-full" onClick={onOpenPortal}>Update Payment Method</Button></Section><Section title="Billing Address"><Row icon={Building2} title="KoraAI GmbH" sub="Unter den Linden 10, 10117 Berlin, Germany" right={null} /><p className="mt-2 text-sm text-gray-400">VAT Number: DE123456789</p><Button className="mt-5 w-full">Edit Address</Button></Section></div><Section title="Billing History">{["INV-2026-001", "INV-2026-002", "INV-2026-003"].map((invoice, index) => <div key={invoice} className="grid grid-cols-[1fr_1fr_1fr_1fr_90px] items-center border-b border-[#1e2d40] py-3 text-sm last:border-0"><span>{invoice}</span><span>{["Jun 15, 2026", "May 15, 2026", "Apr 15, 2026"][index]}</span><span>EUR {price}</span><span className="text-emerald-400">Paid</span><Button size="sm" variant="outline">PDF</Button></div>)}</Section><div className="grid gap-5 lg:grid-cols-2"><Section title="Usage & Limits"><div className="space-y-5"><Progress icon={Users} label="AI Credits" value="9,200 / 10,000" pct={92} /><Progress icon={Cloud} label="Storage" value="2.4 GB / 50 GB" pct={24} /><Progress icon={Users} label="Team Members" value={`${teamCount} / 10`} pct={Math.min(teamCount * 10, 100)} /></div></Section><ToggleList title="Subscription Features" items={["AI Assistant", "Website Builder", "Live View", "Inbox", "Accounting", "API Access", "Priority Support"]} /></div></div>;
}

function Integrations() {
  const groups = [["Communication", ["Gmail", "Outlook", "Twilio", "WhatsApp Business", "Zoom", "Microsoft Teams"]], ["Calendar", ["Google Calendar", "Apple Calendar", "Outlook Calendar", "Microsoft Exchange"]], ["Payments", ["Stripe", "PayPal", "Klarna", "Apple Pay", "Google Pay"]], ["Website & CMS", ["WordPress", "Shopify", "Webflow", "Wix", "Squarespace", "Framer"]]] as const;
  return <div className="space-y-5"><Section title="Recommended for your business" subtitle="These integrations are popular for businesses like yours." action={<button className="text-sm text-blue-400">View All Integrations</button>}><div className="grid gap-4 lg:grid-cols-4">{["Google Calendar", "Stripe", "Resend", "Instagram"].map((name, index) => <Integration key={name} name={name} connected={index < 3} />)}</div></Section><Section title="All Integrations" action={<div className="flex gap-3"><Input className={`${input} w-64`} placeholder="Search integrations..." /><Button variant="outline">All Categories</Button></div>}><div className="space-y-6">{groups.map(([group, apps]) => <div key={group}><div className="mb-3 flex items-center justify-between"><h4 className="font-semibold text-gray-100">{group}</h4><button className="text-sm text-blue-400">View All</button></div><div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">{apps.map((name, index) => <Integration key={name} name={name} connected={index === 0} compact />)}</div></div>)}</div></Section></div>;
}

function Integration({ name, connected = false, compact = false }: { name: string; connected?: boolean; compact?: boolean }) {
  return <div className={`${panel} p-4`}><div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600/20 text-lg font-semibold text-white">{name.charAt(0)}</div><div className="min-w-0"><p className="font-semibold text-gray-100">{name}</p><p className="mt-1 line-clamp-2 text-xs text-gray-500">{compact ? "Connect and sync with your workspace." : "Sync appointments, payments and customer data."}</p></div></div><button className={`mt-4 rounded-lg px-4 py-2 text-xs font-semibold ${connected ? "bg-emerald-600/15 text-emerald-400" : "bg-blue-600/20 text-blue-300"}`}>{connected ? "Connected" : "Connect"}</button></div>;
}

function Security({ onChangePassword }: { onChangePassword?: () => void } = {}) {
  return <div className="space-y-5"><div className="grid gap-5 lg:grid-cols-2"><Section title="Account Security" subtitle="Update your password to keep your account secure."><div className="grid gap-4 sm:grid-cols-2"><Field label="Current Password" type="password" value="" /><Field label="New Password" type="password" value="" /><Field label="Confirm Password" type="password" value="" /></div><div className="mt-5 flex justify-end"><Button onClick={onChangePassword}>Update Password</Button></div></Section><Section title="Security Status" subtitle="Your overall account security."><div className="flex items-center gap-8"><Ring value="92%" label="Security Score" /><div className="space-y-3">{["Strong Password", "2FA Enabled", "Email Verified", "Phone Verified"].map((item) => <p key={item} className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{item}</p>)}<p className="border-t border-[#1e2d40] pt-4 text-sm text-emerald-400">Status: Protected</p></div></div></Section></div><div className="grid gap-5 lg:grid-cols-2"><Section title="Two-Factor Authentication" subtitle="Add an extra layer of security to your account."><h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-emerald-400"><ShieldCheck className="h-6 w-6" />Enabled</h3><Row icon={Shield} title="Authenticator App" sub="Use an authenticator app to generate codes" right={null} /><Row icon={Monitor} title="SMS Verification" sub="Receive verification codes via SMS" right={null} /><Row icon={Lock} title="Backup Recovery Codes" sub="Use recovery codes when needed" right={<Button variant="outline">Manage 2FA</Button>} /></Section><Section title="Trusted Devices" subtitle="Devices you trust and have access to your account."><Row icon={Monitor} title="MacBook Pro" sub="macOS - Safari" right={<Trash2 className="h-4 w-4 text-gray-500" />} /><Row icon={Smartphone} title="iPhone 16 Pro" sub="iOS - Safari" right={<Trash2 className="h-4 w-4 text-gray-500" />} /><Row icon={Monitor} title="Windows Desktop" sub="Windows - Chrome" right={<Trash2 className="h-4 w-4 text-gray-500" />} /></Section></div><div className="grid gap-5 lg:grid-cols-2"><Section title="Active Sessions" subtitle="Manage your active sessions across all devices.">{["Windows Desktop", "iPhone 16 Pro", "MacBook Pro"].map((device) => <Row key={device} icon={Monitor} title={device} sub="Berlin, Germany" right={<Button size="sm" variant="outline">Disconnect</Button>} />)}<Button variant="destructive" className="mt-4">Log Out All Devices</Button></Section><Section title="Danger Zone" subtitle="These actions are permanent and cannot be undone." className="border-red-500/30 bg-red-950/15"><Row icon={Download} title="Download Account Data" sub="Download a copy of your data." right={<Button size="sm" variant="outline">Download</Button>} /><Row icon={Lock} title="Deactivate Account" sub="Temporarily disable your account." right={<Button size="sm" variant="outline">Deactivate</Button>} /><Row icon={Trash2} title="Delete Account" sub="Permanently delete your account and all data." right={<Button size="sm" variant="destructive">Delete Account</Button>} /></Section></div></div>;
}

function AI({ aiHistoryCount = 0, profile, onSave }: { aiHistoryCount?: number; profile?: ProfileData; onSave?: () => void } = {}) {
  const aiSettings = profile?.settings?.ai || {};
  return <div className="space-y-5"><div className="grid gap-5 lg:grid-cols-[1.3fr_0.85fr]"><Section title="AI Assistant Profile" subtitle="Customize the personality and behavior of your AI assistant."><div className="grid gap-5 sm:grid-cols-2"><Field label="AI Name" value={aiSettings.name || "Kora"} /><SelectField label="AI Language" value={aiSettings.language || "English (US)"} /></div><h4 className="mb-3 mt-5 text-sm font-medium text-gray-100">Tone of Voice</h4><div className="grid gap-3 sm:grid-cols-4">{["Professional", "Friendly", "Casual", "Luxury"].map((tone) => <button key={tone} type="button" className={`rounded-lg border px-4 py-4 text-sm ${tone === (aiSettings.tone || "Professional") ? "border-blue-500 bg-blue-600/10 text-blue-400" : "border-[#1e2d40] text-gray-300"}`}>{tone}</button>)}</div><h4 className="mb-3 mt-5 text-sm font-medium text-gray-100">Response Length</h4><div className="grid gap-3 sm:grid-cols-3">{["Short", "Balanced", "Detailed"].map((tone) => <button key={tone} type="button" className={`rounded-lg border px-4 py-4 text-sm ${tone === (aiSettings.responseLength || "Balanced") ? "border-blue-500 bg-blue-600/10 text-blue-400" : "border-[#1e2d40] text-gray-300"}`}>{tone}</button>)}</div><div className="mt-5 flex justify-end"><Button onClick={onSave}>Save Changes</Button></div></Section><Section title="Meet Your AI"><div className="flex items-center gap-6"><div className="flex h-36 w-36 items-center justify-center overflow-hidden"><Image src="/kora.png" alt="Kora" width={144} height={144} unoptimized className="kora-image h-36 w-36 object-contain" /></div><div><h3 className="text-xl font-semibold text-white">Kora AI</h3><p className="mt-2 text-sm text-emerald-400">Online</p></div></div><div className={`${panel} mt-5 p-4 text-sm leading-6 text-gray-200`}>Hi Alex! I learned your business context and I am ready to help manage appointments, customers and daily operations.</div><Progress icon={Brain} label="Business Knowledge" value="92%" pct={92} /></Section></div><div className="grid gap-5 lg:grid-cols-2"><ToggleList title="AI Capabilities" items={["Email Writing", "Appointment Assistant", "Lead Qualification", "Customer Support", "Marketing Suggestions", "Website Content Generation", "Task Automation", "Business Insights"]} /><ToggleList title="AI Permissions" items={["Read Calendar", "Read Tasks", "Read Contacts", "Read Emails", "Access CRM", "Generate Reports"]} /></div><Section title="Business Context" subtitle="Help Kora AI understand your business better."><div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]"><div className="space-y-3">{["Business Description", "Services", "Target Audience", "Brand Voice", "Business Goals"].map((label) => <Field key={label} label={label} value="Professional, friendly, modern and premium." />)}</div><div className="flex flex-col items-center justify-center text-center"><IconBox icon={FileText} bg="bg-purple-600/20" color="text-purple-300" /><p className="mt-4 max-w-xs text-sm text-gray-400">This information helps Kora provide more accurate and personalized responses.</p></div></div></Section><div className="grid gap-5 lg:grid-cols-2"><ToggleList title="AI Memory" badge="Enabled" items={["Remember customer preferences", "Remember business preferences", "Learn from previous conversations", "Improve future responses"]} /><ToggleList title="AI Suggestions" items={["Weekly Business Report", "AI Growth Suggestions", "Marketing Ideas", "Sales Opportunities", "Customer Retention Tips"]} /></div><Section title="AI Usage Overview" subtitle="See how Kora AI is helping your business."><div className="grid gap-4 md:grid-cols-4"><Metric icon={MessageCircle} value={String(aiHistoryCount || 4281)} label="AI Requests" color="text-purple-300" /><Metric icon={Clock} value="63" label="Hours Saved" /><Metric icon={Zap} value="1.1" label="Avg. Response" color="text-emerald-300" /><Metric icon={Star} value="98%" label="Satisfaction" color="text-amber-300" /></div></Section></div>;
}

function Advanced({ aiHistoryCount = 0 }: { aiHistoryCount?: number } = {}) {
  return <div className="grid gap-5 xl:grid-cols-2"><Section title="System Preferences" subtitle="Set default preferences for your workspace."><div className="space-y-3">{["Default Language", "Default Timezone", "Date Format", "Time Format", "Default Currency"].map((item, index) => <SelectField key={item} label={item} value={["English (US)", "(GMT+01:00) Berlin, Germany", "DD MMM YYYY (31 May 2026)", "24-Hour (14:30)", "EUR - Euro"][index]} />)}<div className="flex justify-end pt-2"><Button>Save Preferences</Button></div></div></Section><Section title="Workspace Health" subtitle="Everything is running smoothly." action={<span className="rounded bg-emerald-600/20 px-3 py-1 text-xs text-emerald-400">Excellent</span>}>{["Database", "AI Services", "Integrations", "Storage", "AI Records"].map((item, index) => <Pair key={item} label={item} value={["Healthy", "Online", "8 Connected", "24% Used", String(aiHistoryCount)][index]} success={index < 4} />)}<div className="mt-6 flex items-center gap-5"><Ring value="98" label="/100" /><div><h4 className="font-semibold text-white">Health Score</h4><p className="mt-1 text-sm text-gray-400">Your workspace is optimized and performing at peak efficiency.</p></div></div></Section><ToggleList title="Data & Privacy" items={["Usage Analytics", "Performance Analytics", "Crash Reports", "Product Improvements", "Personalized Recommendations"]} /><Section title="Backup & Export" subtitle="Manage your data backups and export options."><Row icon={Upload} title="Export Workspace Data" sub="Export all workspace data to a file." /><Row icon={Download} title="Download Account Data" sub="Download a copy of all your account data." /><Row icon={Archive} title="Import Data" sub="Import data from external sources." /></Section><ToggleList title="Default Preferences" items={["Auto Save", "Remember Filters", "Open Last Workspace", "Compact Mode", "Enable Beta Features"]} /><ToggleList title="Experimental Features" badge="Early Access" items={["AI Beta Features", "Experimental UI", "Upcoming Dashboard Widgets", "Smart Recommendations"]} /><Section title="Data Management" subtitle="Manage storage, cache and synchronization."><div className="space-y-4"><Progress icon={HardDrive} label="Storage Used" value="12 GB / 50 GB" pct={24} /><Progress icon={Database} label="Cache Size" value="256 MB" pct={15} /><Row icon={Trash2} title="Clear Cache" sub="Free up temporary data." /><Row icon={RefreshCw} title="Sync Workspace" sub="Sync all data now." /></div></Section><Section title="Workspace Maintenance" subtitle="Maintain and optimize your workspace performance."><Row icon={RefreshCw} title="Refresh Workspace" sub="Reload workspace configuration." /><Row icon={Database} title="Reindex Data" sub="Rebuild search index for better performance." /><Row icon={HeartPulse} title="Check System Health" sub="Run a comprehensive system check." /></Section></div>;
}

function QuickActionDialog({
  action,
  profile,
  teamCount,
  onOpenChange,
  onSelectTab,
  onBillingPortal,
}: {
  action: QuickActionId | null;
  profile?: ProfileData;
  teamCount: number;
  onOpenChange: (open: boolean) => void;
  onSelectTab: (tab: TabId) => void;
  onBillingPortal: () => void;
}) {
  const title =
    action === "profile" ? "Profile Overview" :
    action === "team" ? "Team Management" :
    action === "billing" ? "Billing Portal" :
    action === "security" ? "Security Center" :
    "Quick Action";

  const goToTab = (tab: TabId) => {
    onSelectTab(tab);
    onOpenChange(false);
  };

  return (
    <Dialog open={Boolean(action)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {action === "profile" ? (
          <div className="space-y-4">
            <div className={`${panel} flex items-center gap-4 p-4`}>
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.profileImage?.url || ""} />
                <AvatarFallback>{getInitials(profileValue(profile, "name", "Business Owner"))}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-white">{profileValue(profile, "name", "Business Owner")}</p>
                <p className="truncate text-sm text-gray-400">{profileValue(profile, "email", "businessowner@gmail.com")}</p>
                <p className="mt-1 truncate text-xs text-blue-300">{profileValue(profile, "businessName", "KoraAI")}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Pair label="Phone" value={profileValue(profile, "phoneNumber", "Not added")} />
              <Pair label="Website" value={profileValue(profile, "website", "Not added")} />
            </div>
            <Button className="w-full" onClick={() => goToTab("general")}>Edit Profile</Button>
          </div>
        ) : null}

        {action === "team" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric icon={Users} value={String(teamCount)} label="Team Members" />
              <Metric icon={Crown} value="1" label="Owner" color="text-emerald-300" />
              <Metric icon={Shield} value="10" label="Seat Limit" color="text-purple-300" />
            </div>
            <p className="text-sm leading-6 text-gray-400">Review roles, invites, permissions, and current team usage from one place.</p>
            <Button className="w-full" onClick={() => goToTab("team")}>Open Team & Roles</Button>
          </div>
        ) : null}

        {action === "billing" ? (
          <div className="space-y-4">
            <Row icon={Crown} title="Current Plan" sub="Professional" right={<span className="text-emerald-400">Active</span>} />
            <Row icon={CreditCard} title="Payment Method" sub="Update cards and invoices in billing portal" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={onBillingPortal}>Open Billing Portal</Button>
              <Button variant="outline" onClick={() => goToTab("billing")}>View Billing Settings</Button>
            </div>
          </div>
        ) : null}

        {action === "security" ? (
          <div className="space-y-4">
            <Row icon={ShieldCheck} title="Security Score" sub="Password, 2FA, trusted devices and sessions" right={<span className="text-emerald-400">92%</span>} />
            <Row icon={Monitor} title="Active Sessions" sub="Review signed-in devices" />
            <Row icon={Lock} title="Password" sub="Change password and recovery settings" />
            <Button className="w-full" onClick={() => goToTab("security")}>Open Security Settings</Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsRedesign() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [quickAction, setQuickAction] = useState<QuickActionId | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const queryClient = useQueryClient();
  const current = useMemo(() => tabs.find((tab) => tab.id === activeTab) || tabs[0], [activeTab]);
  const fullWidth = activeTab === "ai" || activeTab === "advanced";

  useEffect(() => {
    if (!profilePhotoFile) {
      setProfilePhotoPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(profilePhotoFile);
    setProfilePhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [profilePhotoFile]);

  const { data: profileResponse } = useQuery({
    queryKey: ["settings-profile"],
    queryFn: () => userApi.getProfile().then(unwrapData),
  });
  const { data: employeesResponse } = useQuery({
    queryKey: ["settings-employees"],
    queryFn: () => employeesApi.getAll({ limit: 100 }).then(unwrapData),
  });
  const { data: unreadResponse } = useQuery({
    queryKey: ["settings-notifications-unread"],
    queryFn: () => notificationsApi.getUnreadCount().then(unwrapData),
  });
  const { data: subscriptionResponse } = useQuery({
    queryKey: ["settings-subscription"],
    queryFn: () => subscriptionApi.getMine().then(unwrapData),
  });
  const { data: aiHistoryResponse } = useQuery({
    queryKey: ["settings-ai-history"],
    queryFn: () => aiDataApi.getAll().then(unwrapData),
  });

  const profile = profileResponse as ProfileData | undefined;
  const employees = asArray<EmployeeData>(employeesResponse);
  const aiHistory = asArray(aiHistoryResponse);
  const unreadEnvelope = unreadResponse as { count?: number; unreadCount?: number } | undefined;
  const unreadCount =
    typeof unreadResponse === "number"
      ? unreadResponse
      : Number(unreadEnvelope?.count ?? unreadEnvelope?.unreadCount ?? 0);
  const subscription = (subscriptionResponse || {}) as SubscriptionData;

  const updateProfileMutation = useMutation({
    mutationFn: (form: FormData) => userApi.updateProfile(form),
    onSuccess: () => {
      toast.success("Settings saved");
      setProfilePhotoFile(null);
      queryClient.invalidateQueries({ queryKey: ["settings-profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: object) => userApi.changePassword(data),
    onSuccess: () => toast.success("Password updated"),
    onError: () => toast.error("Failed to update password"),
  });

  const portalMutation = useMutation({
    mutationFn: () => subscriptionApi.portal(),
    onSuccess: (response) => {
      const data = unwrapData(response) as { url?: string; portalUrl?: string };
      const url = data?.url || data?.portalUrl;
      if (url) {
        window.location.href = url;
        return;
      }
      toast.success("Billing portal requested");
    },
    onError: () => toast.error("Failed to open billing portal"),
  });

  const askKoraMutation = useMutation({
    mutationFn: () => aiDataApi.create({ message: "Help me optimize my business settings." }),
    onSuccess: () => {
      toast.success("Kora request sent");
      queryClient.invalidateQueries({ queryKey: ["settings-ai-history"] });
    },
    onError: () => toast.error("Failed to send Kora request"),
  });

  const saveProfile = () => {
    const form = new FormData();
    form.append("name", inputValue("Full Name", profileValue(profile, "name", "Alex Barber")));
    form.append("email", inputValue("Email Address", profileValue(profile, "email", "alex@fademasters-barbershop.com")));
    form.append("phoneNumber", inputValue("Business Phone", profileValue(profile, "phoneNumber", profileValue(profile, "phone", "+49 30 12345678"))));
    form.append("businessName", inputValue("Business Name", profileValue(profile, "businessName", "KoraAI")));
    form.append("businessEmail", inputValue("Business Email", profileValue(profile, "businessEmail", profileValue(profile, "email", "info@koraai.de"))));
    form.append("website", inputValue("Website", profileValue(profile, "website", "https://koraai.de")));
    form.append("businessAddress", inputValue("Address", profileValue(profile, "businessAddress", "Unter den Linden 10")));
    form.append("timezone", inputValue("Timezone", profileValue(profile, "timezone", "(GMT+1) Berlin, Germany")));
    form.append("bio", inputValue("AI Business Context", profile?.bio || ""));
    form.append("settings", JSON.stringify({
      interface: {
        theme: inputValue("Theme", profile?.settings?.interface?.theme || "Dark"),
        sidebarStyle: inputValue("Sidebar Style", profile?.settings?.interface?.sidebarStyle || "Expanded"),
        dateFormat: inputValue("Date Format", profile?.settings?.interface?.dateFormat || "DD.MM.YYYY"),
        numberFormat: inputValue("Number Format", profile?.settings?.interface?.numberFormat || "1.234,56 (DE)"),
      },
      business: {
        industry: inputValue("Industry", profile?.settings?.business?.industry || "Software & Technology"),
        workingHours: inputValue("Working Hours", profile?.settings?.business?.workingHours || "Mon - Fri, 09:00 - 18:00"),
        defaultCurrency: inputValue("Default Currency", profile?.settings?.business?.defaultCurrency || "Euro (EUR)"),
        defaultAppointmentDuration: inputValue("Default Appointment Duration", profile?.settings?.business?.defaultAppointmentDuration || "60 minutes"),
        defaultLanguage: inputValue("Default Language", profile?.settings?.business?.defaultLanguage || "English (EN)"),
        aiContext: inputValue("AI Business Context", profile?.settings?.business?.aiContext || ""),
      },
      ai: {
        name: inputValue("AI Name", profile?.settings?.ai?.name || "Kora"),
        language: inputValue("AI Language", profile?.settings?.ai?.language || "English (US)"),
      },
    }));
    const profileImage = profilePhotoFile || fileValue("profileImage");
    if (profileImage) form.append("profileImage", profileImage);
    updateProfileMutation.mutate(form);
  };

  const changePassword = () => {
    const currentPassword = inputValue("Current Password");
    const newPassword = inputValue("New Password");
    const confirmPassword = inputValue("Confirm New Password") || inputValue("Confirm Password");
    if (!currentPassword || !newPassword) {
      toast.error("Enter current and new password");
      return;
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      toast.error("Password confirmation does not match");
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword, confirmNewPassword: confirmPassword || newPassword });
  };

  const content =
    activeTab === "business" ? <Business profile={profile} onSave={saveProfile} isSaving={updateProfileMutation.isPending} /> :
    activeTab === "team" ? <Team employees={employees} /> :
    activeTab === "notifications" ? <Notifications unreadCount={unreadCount} profile={profile} /> :
    activeTab === "billing" ? <Billing subscription={subscription} teamCount={employees.length} onOpenPortal={() => portalMutation.mutate()} /> :
    activeTab === "integrations" ? <Integrations /> :
    activeTab === "security" ? <Security onChangePassword={changePassword} /> :
    activeTab === "ai" ? <AI aiHistoryCount={aiHistory.length} profile={profile} onSave={saveProfile} /> :
    activeTab === "advanced" ? <Advanced aiHistoryCount={aiHistory.length} /> :
    <General
      profile={profile}
      onSave={saveProfile}
      onChangePassword={changePassword}
      onPhotoChange={setProfilePhotoFile}
      photoPreview={profilePhotoPreview}
      isSaving={updateProfileMutation.isPending}
    />;

  return (
    <div className="dashboard-page flex flex-col">
      <Header
        title={current.title}
        subtitle={current.subtitle}
        action={
          <Button variant="outline" size="sm" onClick={() => { window.location.href = "/dashboard"; }} className="hidden gap-2 md:inline-flex">
            <Eye className="h-4 w-4" />
            Preview Dashboard
          </Button>
        }
      />

      <div className="dashboard-content flex flex-col gap-3 bg-[radial-gradient(circle_at_48%_0%,rgba(37,99,235,0.16),transparent_30%),linear-gradient(180deg,#050d1a_0%,#06101e_46%,#050b16_100%)]">
        <nav className="shrink-0 rounded-xl border border-[#182a40] bg-[#071725]/90 p-1.5">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-9">
            {tabs.map((tab) => {
              const Icon = tabIcons[tab.id];
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-2.5 text-xs font-semibold transition-colors 2xl:text-sm ${
                    selected
                      ? "bg-blue-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.25)]"
                      : "text-gray-300 hover:bg-[#0b1a2c] hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto pr-1">
          {fullWidth ? (
            <main className="settings-section-flow">{content}</main>
          ) : (
            <div className="grid min-h-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] 2xl:grid-cols-[minmax(0,1fr)_340px] 2xl:gap-4">
              <main className="settings-section-flow min-w-0">{content}</main>
              <RightRail
                profile={profile}
                onAskKora={() => askKoraMutation.mutate()}
                onQuickAction={setQuickAction}
              />
            </div>
          )}
        </div>
      </div>

      <QuickActionDialog
        action={quickAction}
        profile={profile}
        teamCount={employees.length || 4}
        onOpenChange={(open) => {
          if (!open) setQuickAction(null);
        }}
        onSelectTab={setActiveTab}
        onBillingPortal={() => {
          setQuickAction(null);
          portalMutation.mutate();
        }}
      />
    </div>
  );
}
