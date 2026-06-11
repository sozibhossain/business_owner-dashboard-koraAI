/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { subscriptionApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { asArray, formatDate } from "@/lib/utils";
import {
  Send,
  Zap,
  BarChart3,
  Crown,
  Check,
  Users,
  UserCheck,
  Database,
  Sparkles,
  Workflow,
  Headphones,
  Settings2,
  CreditCard,
  HelpCircle,
  ArrowRight,
} from "lucide-react";

const ICONS: Record<string, any> = {
  send: Send,
  zap: Zap,
  "bar-chart": BarChart3,
  crown: Crown,
};

const CURRENCY_SYMBOL: Record<string, string> = { eur: "€", usd: "$", gbp: "£" };

const STATUS_BADGE: Record<string, { label: string; variant: any }> = {
  active: { label: "Active", variant: "success" },
  trialing: { label: "Trial", variant: "default" },
  past_due: { label: "Past Due", variant: "warning" },
  canceled: { label: "Canceled", variant: "destructive" },
  incomplete: { label: "Incomplete", variant: "warning" },
  none: { label: "No Plan", variant: "secondary" },
};

const USAGE_METRICS: Array<{ key: string; label: string; icon: any; unit?: string }> = [
  { key: "employees", label: "Employees", icon: Users },
  { key: "customers", label: "Customers", icon: UserCheck },
  { key: "storageGb", label: "Storage", icon: Database, unit: " GB" },
  { key: "aiCredits", label: "AI Credits", icon: Sparkles },
  { key: "automations", label: "Automations", icon: Workflow },
  { key: "supportRequests", label: "Support Requests", icon: Headphones },
];

export default function SubscriptionPage() {
  const queryClient = useQueryClient();
  const [annual, setAnnual] = useState(true);

  // Read Stripe redirect result without useSearchParams (avoids Suspense boundary).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const sessionId = params.get("session_id");
    if (status === "success") {
      // Confirm server-side for instant sync, then refetch (webhook is the long-term source of truth).
      const finish = async () => {
        if (sessionId) {
          try {
            await subscriptionApi.confirm(sessionId);
          } catch {
            // Non-fatal — the webhook will reconcile shortly.
          }
        }
        queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
        toast.success("Subscription activated!");
      };
      finish();
    } else if (status === "cancelled") {
      toast.info("Checkout cancelled.");
    }
    if (status) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [queryClient]);

  const { data: plansResponse, isLoading: plansLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => subscriptionApi.getPlans().then((response) => response.data),
  });

  const { data: mineResponse, isLoading: mineLoading } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => subscriptionApi.getMine().then((response) => response.data),
  });

  const plans = asArray(plansResponse?.data) as any[];
  const subscription = mineResponse?.data?.subscription || {};
  const usage = mineResponse?.data?.usage || {};
  const currentPlan = subscription.plan_id || null;
  const isActive = ["active", "trialing", "past_due"].includes(subscription.status);

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) =>
      subscriptionApi
        .checkout({ planId, billingCycle: annual ? "annual" : "monthly" })
        .then((response) => response.data),
    onSuccess: (response) => {
      const url = response?.data?.url;
      if (url) window.location.href = url;
      else toast.error("Could not start checkout");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Could not start checkout"),
  });

  const portalMutation = useMutation({
    mutationFn: () => subscriptionApi.portal().then((response) => response.data),
    onSuccess: (response) => {
      const url = response?.data?.url;
      if (url) window.location.href = url;
      else toast.error("Could not open billing portal");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Could not open billing portal"),
  });

  const symbol = (currency: string) => CURRENCY_SYMBOL[currency] || "€";
  const statusInfo = STATUS_BADGE[subscription.status] || STATUS_BADGE.none;

  function planButton(plan: any) {
    const isCurrent = currentPlan?._id === plan._id && isActive;
    if (isCurrent) {
      return (
        <Button className="w-full" disabled>
          Current Plan
        </Button>
      );
    }
    if (plan.isCustom) {
      return (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => toast.info("Our team will reach out about Enterprise.")}
        >
          Contact Us
        </Button>
      );
    }
    const isPending = checkoutMutation.isPending && checkoutMutation.variables === plan._id;
    return (
      <Button
        variant={plan.highlight ? "default" : "secondary"}
        className="w-full"
        onClick={() => checkoutMutation.mutate(plan._id)}
        disabled={checkoutMutation.isPending}
      >
        {isPending ? "Redirecting…" : isActive ? "Switch Plan" : "Upgrade Plan"}
      </Button>
    );
  }

  return (
    <div>
      <Header
        title="Subscription"
        subtitle="Manage your subscription, plan details and billing information."
      />

      <div className="grid grid-cols-1 gap-5 p-3 sm:p-4 lg:grid-cols-3 lg:p-6">
        {/* Left: plans + billing */}
        <div className="space-y-5 lg:col-span-2">
          {/* Choose your plan */}
          <Card>
            <CardContent className="pt-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white">Choose Your Plan</h2>
                  <p className="text-xs text-gray-500">
                    Select the perfect plan for your business. You can upgrade or downgrade
                    anytime.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAnnual((value) => !value)}
                  className="flex items-center gap-2 text-xs text-gray-300"
                >
                  Annual Billing
                  <span
                    className={`relative h-5 w-9 rounded-full transition-colors ${annual ? "bg-blue-600" : "bg-[#2a3547]"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${annual ? "left-[18px]" : "left-0.5"}`}
                    />
                  </span>
                  <Badge variant="success" className="text-[10px]">
                    Save 20%
                  </Badge>
                </button>
              </div>

              {plansLoading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-80 w-full" />
                  ))}
                </div>
              ) : plans.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  No plans available yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {plans.map((plan) => {
                    const Icon = ICONS[plan.icon] || Zap;
                    const isCurrent = currentPlan?._id === plan._id && isActive;
                    const perMonth = annual
                      ? Math.round((plan.annualPrice || 0) / 12)
                      : plan.monthlyPrice || 0;
                    return (
                      <div
                        key={plan._id}
                        className={`flex flex-col rounded-xl border p-4 ${
                          isCurrent
                            ? "border-blue-600 bg-blue-600/5"
                            : plan.highlight
                              ? "border-blue-600/40 bg-[#0f1c30]"
                              : "border-[#1e2d40] bg-[#0d1a2d]"
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400">
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-3 text-base font-semibold text-white">{plan.name}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
                          {plan.description}
                        </p>

                        <div className="mt-3 min-h-[52px]">
                          {plan.isCustom ? (
                            <>
                              <p className="text-2xl font-bold text-white">Custom</p>
                              <p className="text-[11px] text-gray-500">Tailored to your needs</p>
                            </>
                          ) : (
                            <>
                              <p className="text-2xl font-bold text-white">
                                {symbol(plan.currency)}
                                {perMonth}
                                <span className="text-xs font-normal text-gray-500"> /month</span>
                              </p>
                              <p className="text-[11px] text-gray-500">
                                {annual
                                  ? `Billed annually ${symbol(plan.currency)}${(plan.annualPrice || 0).toLocaleString()}`
                                  : "Billed monthly"}
                              </p>
                            </>
                          )}
                        </div>

                        <ul className="mt-3 flex-1 space-y-1.5">
                          {asArray<string>(plan.features).map((feature: string) => (
                            <li
                              key={feature}
                              className="flex items-start gap-2 text-[11px] text-gray-300"
                            >
                              <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-400" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <div className="mt-4">{planButton(plan)}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="mt-4 text-center text-[11px] text-gray-500">
                All plans include access to core features, updates and our Kora Assistant.
              </p>
            </CardContent>
          </Card>

          {/* Billing information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Billing Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-[11px] text-gray-500">Current Plan</p>
                  <p className="text-sm font-medium text-gray-100">
                    {currentPlan?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Billing Cycle</p>
                  <p className="text-sm font-medium text-gray-100 capitalize">
                    {subscription.billingCycle || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Next Billing Date</p>
                  <p className="text-sm font-medium text-gray-100">
                    {subscription.currentPeriodEnd
                      ? formatDate(subscription.currentPeriodEnd)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Amount</p>
                  <p className="text-sm font-medium text-gray-100">
                    {subscription.amount
                      ? `${symbol(currentPlan?.currency || "eur")}${subscription.amount.toLocaleString()}`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1e2d40] bg-[#0f1c30] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-12 items-center justify-center rounded-md bg-[#1e2d40] text-[10px] font-bold uppercase text-gray-300">
                    {subscription.paymentMethod?.brand || "Card"}
                  </div>
                  <div>
                    <p className="text-sm text-gray-200">
                      {subscription.paymentMethod?.last4
                        ? `•••• ${subscription.paymentMethod.last4}`
                        : "No card on file"}
                    </p>
                    {subscription.paymentMethod?.expMonth ? (
                      <p className="text-[11px] text-gray-500">
                        Expires {subscription.paymentMethod.expMonth}/
                        {String(subscription.paymentMethod.expYear).slice(-2)}
                      </p>
                    ) : null}
                  </div>
                  {subscription.paymentMethod?.last4 ? (
                    <Badge variant="success" className="text-[10px]">
                      Primary
                    </Badge>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Update Payment Method
                </Button>
              </div>

              <button
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                className="mt-3 inline-flex items-center gap-1 text-xs text-blue-400 hover:underline disabled:opacity-50"
              >
                View billing history <ArrowRight className="h-3 w-3" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Right: overview + usage + help */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <CreditCard className="h-4 w-4 text-blue-400" />
                Subscription Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mineLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <>
                  <Row label="Plan">
                    <span className="text-sm font-medium text-blue-400">
                      {currentPlan?.name || "No plan"}
                    </span>
                  </Row>
                  <Row label="Status">
                    <Badge variant={statusInfo.variant} className="text-[10px]">
                      {statusInfo.label}
                    </Badge>
                  </Row>
                  <Row label="Member Since">
                    <span className="text-sm text-gray-200">
                      {subscription.memberSince ? formatDate(subscription.memberSince) : "—"}
                    </span>
                  </Row>
                  <Row label="Next Billing Date">
                    <span className="text-sm text-gray-200">
                      {subscription.currentPeriodEnd
                        ? formatDate(subscription.currentPeriodEnd)
                        : "—"}
                    </span>
                  </Row>
                  <Row label="Billing Cycle">
                    <span className="text-sm capitalize text-gray-200">
                      {subscription.billingCycle || "—"}
                    </span>
                  </Row>
                  {subscription.cancelAtPeriodEnd ? (
                    <p className="rounded-lg bg-amber-600/10 px-3 py-2 text-[11px] text-amber-400">
                      Cancels at the end of the current period.
                    </p>
                  ) : null}
                  <Button
                    variant="outline"
                    className="mt-1 w-full gap-1.5"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                  >
                    <Settings2 className="h-4 w-4" />
                    Manage Subscription
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Plan Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {USAGE_METRICS.map((metric) => {
                const used = Number(usage[metric.key] || 0);
                const limit = Number(currentPlan?.limits?.[metric.key] ?? 0);
                const unlimited = limit === -1;
                const pct = unlimited || limit <= 0 ? 0 : Math.min(100, (used / limit) * 100);
                const Icon = metric.icon;
                return (
                  <div key={metric.key}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs text-gray-300">
                        <Icon className="h-3.5 w-3.5 text-gray-500" />
                        {metric.label}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {used}
                        {metric.unit || ""} /{" "}
                        {unlimited ? "∞" : `${limit}${metric.unit || ""}`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1e2d40]">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <HelpCircle className="h-4 w-4 text-blue-400" />
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-400">
                Our support team is here to help you with any questions.
              </p>
              <Button
                variant="outline"
                className="mt-3 w-full gap-1.5"
                onClick={() => toast.info("Opening support…")}
              >
                Contact Us <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      {children}
    </div>
  );
}
