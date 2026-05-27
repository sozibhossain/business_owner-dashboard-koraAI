"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { Save, Camera, Shield, Bell, Sliders, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [timezone, setTimezone] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => userApi.getProfile().then((r) => r.data.data),
  });

  useEffect(() => {
    if (!profile) return;
    setName(profile.name || "");
    setEmail(profile.email || "");
    setPhone(profile.phone || profile.phoneNumber || "");
    setJobTitle(profile.jobTitle || "");
    setBusinessName(profile.businessName || "");
    setBio(profile.bio || "");
    setBusinessAddress(profile.businessAddress || "");
    setBusinessEmail(profile.businessEmail || "");
    setWebsite(profile.website || "");
    setTimezone(profile.timezone || "");
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => userApi.updateProfile(data),
    onSuccess: () => {
      toast.success("Profile saved!");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile-dashboard"] });
    },
    onError: () => toast.error("Failed to save profile."),
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(file);
    const fd = new FormData();
    fd.append("profileImage", file);
    updateMutation.mutate(fd);
  };

  const handleSaveProfile = () => {
    const fd = new FormData();
    fd.append("name", name);
    fd.append("email", email);
    fd.append("phoneNumber", phone);
    fd.append("jobTitle", jobTitle);
    fd.append("businessName", businessName);
    fd.append("bio", bio);
    updateMutation.mutate(fd);
  };

  const handleSaveBusiness = () => {
    const fd = new FormData();
    fd.append("businessAddress", businessAddress);
    fd.append("businessEmail", businessEmail);
    fd.append("website", website);
    fd.append("timezone", timezone);
    updateMutation.mutate(fd);
  };

  const displayImage = previewImage || profile?.profileImage?.url || "";
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div>
      <Header
        title="Profile"
        subtitle="Manage your personal information and account preferences."
      />
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="profile-information">
              <TabsList className="mb-5 w-full sm:w-auto">
                <TabsTrigger value="profile-information" className="text-xs gap-1.5">
                  Profile
                </TabsTrigger>
                <TabsTrigger value="security" className="text-xs gap-1.5">
                  <Shield className="w-3 h-3" /> Security
                </TabsTrigger>
                <TabsTrigger value="notifications" className="text-xs gap-1.5">
                  <Bell className="w-3 h-3" /> Notifications
                </TabsTrigger>
                <TabsTrigger value="preferences" className="text-xs gap-1.5">
                  <Sliders className="w-3 h-3" /> Preferences
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile-information" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Profile Information</CardTitle>
                    <p className="text-xs text-gray-500">
                      Update your personal details and how others see you.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Avatar upload */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="w-16 h-16">
                          {displayImage ? (
                            <AvatarImage src={displayImage} alt={name} />
                          ) : null}
                          <AvatarFallback className="text-lg">
                            {getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                        >
                          <Camera className="w-3 h-3 text-white" />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">{name || "Your Name"}</p>
                        <p className="text-xs text-gray-400">{email}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Click the camera icon to upload a new photo
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Full Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email Address</Label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone Number</Label>
                        <Input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Job Title</Label>
                        <Input
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Business Name</Label>
                      <Input
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Bio</Label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell others about yourself..."
                        className="w-full text-sm bg-[#0d1526] border border-[#2a3547] rounded-lg px-3 py-2 text-gray-200 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-600"
                      />
                    </div>

                    <Button
                      onClick={handleSaveProfile}
                      disabled={updateMutation.isPending}
                      className="gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Business Information</CardTitle>
                    <p className="text-xs text-gray-500">
                      Update your business details and address.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Business Address</Label>
                        <Input
                          value={businessAddress}
                          onChange={(e) => setBusinessAddress(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Business Email</Label>
                        <Input
                          value={businessEmail}
                          onChange={(e) => setBusinessEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Website</Label>
                        <Input
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Timezone</Label>
                        <Input
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          placeholder="e.g. Europe/Berlin"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleSaveBusiness}
                      disabled={updateMutation.isPending}
                      className="gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Change Password</CardTitle>
                    <p className="text-xs text-gray-500">
                      Keep your account secure with a strong password.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {["Current Password", "New Password", "Confirm Password"].map((f) => (
                      <div key={f} className="space-y-1.5">
                        <Label>{f}</Label>
                        <Input
                          type="password"
                          placeholder={`Enter ${f.toLowerCase()}`}
                        />
                      </div>
                    ))}
                    <Button onClick={() => toast.success("Password changed!")} className="gap-2">
                      <Save className="w-4 h-4" /> Update Password
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Notification Preferences</CardTitle>
                    <p className="text-xs text-gray-500">
                      Choose what notifications you want to receive.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {[
                      "New appointments",
                      "Cancellations",
                      "Employee requests",
                      "Invoice paid",
                      "System updates",
                    ].map((n, i) => (
                      <div
                        key={n}
                        className="flex items-center justify-between py-3 border-b border-[#1e2d40] last:border-0"
                      >
                        <p className="text-sm text-gray-200">{n}</p>
                        <button
                          className={`w-10 h-5 rounded-full transition-colors ${
                            i < 3 ? "bg-blue-600" : "bg-[#2a3547]"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full mx-0.5 transition-transform ${
                              i < 3 ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preferences">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Preferences</CardTitle>
                    <p className="text-xs text-gray-500">
                      Customize how the dashboard looks and behaves.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: "Language", value: "English" },
                      { label: "Currency", value: "EUR (€)" },
                      { label: "Date Format", value: "DD/MM/YYYY" },
                      { label: "Time Format", value: "24-hour" },
                    ].map((p) => (
                      <div key={p.label} className="space-y-1.5">
                        <Label>{p.label}</Label>
                        <Input defaultValue={p.value} />
                      </div>
                    ))}
                    <Button
                      onClick={() => toast.success("Preferences saved!")}
                      className="gap-2"
                    >
                      <Save className="w-4 h-4" /> Save Preferences
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Account overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Account Overview</CardTitle>
                <p className="text-xs text-gray-500">Your account details at a glance.</p>
              </CardHeader>
              <CardContent className="space-y-0">
                {[
                  { label: "Account Type", value: "Business" },
                  { label: "Plan", value: "Pro Plan" },
                  { label: "Member Since", value: memberSince },
                  { label: "Account Status", value: "Active" },
                ].map((d) => (
                  <div
                    key={d.label}
                    className="flex justify-between py-2 border-b border-[#1e2d40] last:border-0 text-xs"
                  >
                    <span className="text-gray-400">{d.label}</span>
                    <span
                      className={`flex items-center gap-1 ${
                        d.label === "Account Status" ? "text-emerald-400" : "text-gray-200"
                      }`}
                    >
                      {d.label === "Account Status" && (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      {d.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Plan usage */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Plan Usage</CardTitle>
                  <Badge variant="secondary" className="text-[9px]">Pro</Badge>
                </div>
                <p className="text-xs text-gray-500">Your usage this month</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "AI Messages", value: 2450, max: 5000, pct: 49 },
                  { label: "Appointments", value: 38, max: 100, pct: 38 },
                  { label: "Team Members", value: 6, max: 10, pct: 60 },
                  { label: "Storage", value: "2.4 GB", max: "10 GB", pct: 24 },
                ].map((u) => (
                  <div key={u.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{u.label}</span>
                      <span className="text-gray-300">
                        {u.value} / {u.max}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#1e2d40] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${u.pct >= 80 ? "bg-amber-500" : "bg-blue-500"}`}
                        style={{ width: `${u.pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">{u.pct}% used</p>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full text-xs mt-1">
                  View Subscription
                </Button>
              </CardContent>
            </Card>

            <div className="text-center space-y-2">
              <p className="text-xs text-gray-500">© 2025 KoraAI. All rights reserved.</p>
              <div className="flex justify-center gap-3 text-xs text-gray-500">
                <button className="hover:text-gray-300 transition-colors">Privacy</button>
                <button className="hover:text-gray-300 transition-colors">Terms</button>
                <button className="hover:text-gray-300 transition-colors">Help</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
