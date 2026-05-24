"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { Save, Camera } from "lucide-react";

export default function SettingsPage() {
  const [name, setName] = useState("Alex Barber");
  const [email, setEmail] = useState("alex@fademasters.com");
  const [phone, setPhone] = useState("+353 87 123 4567");
  const [jobTitle, setJobTitle] = useState("Owner");
  const [businessName, setBusinessName] = useState("Fade Masters Barbershop");
  const [bio, setBio] = useState("Passionate about delivering the best experience and keeping our clients looking and feeling great.");
  const [businessAddress, setBusinessAddress] = useState("123 Fade Street, Dublin 2, Ireland");
  const [businessEmail, setBusinessEmail] = useState("info@fademasters.com");
  const [website, setWebsite] = useState("https://www.fademasters.com");
  const [timezone, setTimezone] = useState("(GMT+01:00) Dublin, Ireland");

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => userApi.getProfile().then(r => r.data.data),
  });

  return (
    <div>
      <Header title="Profile" subtitle="Manage your personal information and account preferences." />
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Settings */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="profile">
              <TabsList className="mb-5">
                {["Profile Information", "Security", "Notifications", "Preferences"].map(t => (
                  <TabsTrigger key={t} value={t.toLowerCase().replace(" ", "-")} className="text-xs">{t}</TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="profile-information">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Profile Information</CardTitle>
                    <p className="text-xs text-gray-500">Update your personal details and how others see you.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="w-16 h-16">
                          <AvatarFallback className="text-lg">{getInitials(name)}</AvatarFallback>
                        </Avatar>
                        <button className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700">
                          <Camera className="w-3 h-3 text-white" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-400">
                        <p>Upload a new photo</p>
                        <p className="text-[10px] text-gray-500">JPG, PNG up to 5MB</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Full Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email Address</Label>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone Number</Label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Job Title</Label>
                        <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Business Name</Label>
                      <Input value={businessName} onChange={e => setBusinessName(e.target.value)} />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Bio</Label>
                      <textarea value={bio} onChange={e => setBio(e.target.value)}
                        className="w-full text-sm bg-[#0d1526] border border-[#2a3547] rounded-lg px-3 py-2 text-gray-200 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>

                    <Button onClick={() => toast.success("Profile saved!")}><Save className="w-4 h-4" />Save Changes</Button>
                  </CardContent>
                </Card>

                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Business Information</CardTitle>
                    <p className="text-xs text-gray-500">Update your business details and address.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Business Address</Label>
                        <Input value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Business Email</Label>
                        <Input value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Website</Label>
                        <Input value={website} onChange={e => setWebsite(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Timezone</Label>
                        <Input value={timezone} onChange={e => setTimezone(e.target.value)} />
                      </div>
                    </div>
                    <Button onClick={() => toast.success("Business info saved!")}><Save className="w-4 h-4" />Save Changes</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Change Password</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {["Current Password", "New Password", "Confirm Password"].map(f => (
                      <div key={f} className="space-y-1.5">
                        <Label>{f}</Label>
                        <Input type="password" placeholder={`Enter ${f.toLowerCase()}`} />
                      </div>
                    ))}
                    <Button onClick={() => toast.success("Password changed!")}><Save className="w-4 h-4" />Update Password</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Notification Preferences</CardTitle></CardHeader>
                  <CardContent>
                    {["New appointments", "Cancellations", "Employee requests", "Invoice paid", "System updates"].map((n, i) => (
                      <div key={n} className="flex items-center justify-between py-3 border-b border-[#1e2d40] last:border-0">
                        <p className="text-sm text-gray-200">{n}</p>
                        <button className={`w-10 h-5 rounded-full transition-colors ${i < 3 ? "bg-blue-600" : "bg-[#2a3547]"}`}>
                          <div className={`w-4 h-4 bg-white rounded-full mx-0.5 transition-transform ${i < 3 ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preferences">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Preferences</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[{ label: "Language", value: "English" }, { label: "Currency", value: "EUR (€)" }, { label: "Date Format", value: "DD/MM/YYYY" }, { label: "Time Format", value: "24-hour" }].map(p => (
                        <div key={p.label} className="space-y-1.5">
                          <Label>{p.label}</Label>
                          <Input defaultValue={p.value} />
                        </div>
                      ))}
                      <Button onClick={() => toast.success("Preferences saved!")}><Save className="w-4 h-4" />Save Preferences</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Account Overview */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Account Overview</CardTitle><p className="text-xs text-gray-500">Your account details at a glance.</p></CardHeader>
              <CardContent>
                {[
                  { label: "Account Type", value: "Business" },
                  { label: "Plan", value: "Pro Plan" },
                  { label: "Member Since", value: "Jan 15, 2024" },
                  { label: "Account Status", value: "Active" },
                ].map(d => (
                  <div key={d.label} className="flex justify-between py-1.5 border-b border-[#1e2d40] last:border-0 text-xs">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-gray-400" />{d.label}
                    </span>
                    <span className={`${d.label === "Account Status" ? "text-emerald-400" : "text-gray-200"}`}>{d.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Plan Usage</CardTitle><p className="text-xs text-gray-500">Your usage this month</p></CardHeader>
              <CardContent>
                {[
                  { label: "AI Messages", value: 2450, max: 5000, pct: 49 },
                  { label: "Appointments", value: 38, max: 100, pct: 38 },
                  { label: "Team Members", value: 6, max: 10, pct: 60 },
                  { label: "Storage", value: "2.4 GB", max: "10 GB", pct: 24 },
                ].map(u => (
                  <div key={u.label} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{u.label}</span>
                      <span className="text-gray-300">{u.value} / {u.max}</span>
                    </div>
                    <div className="h-1.5 bg-[#1e2d40] rounded-full">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${u.pct}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">{u.pct}%</p>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full text-xs mt-2">View Subscription</Button>
              </CardContent>
            </Card>

            <p className="text-xs text-gray-500 text-center">© 2025 KoraAI. All rights reserved.</p>
            <div className="flex justify-center gap-3 text-xs text-gray-500">
              <button className="hover:text-gray-300">Privacy Policy</button>
              <button className="hover:text-gray-300">Terms of Service</button>
              <button className="hover:text-gray-300">Help Center</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
