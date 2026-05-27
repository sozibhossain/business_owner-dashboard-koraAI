/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { InboxWorkspace } from "@/components/inbox-workspace";

export default function InboxPage() {
  return (
    <InboxWorkspace
      dashboardKey="business_owner"
      subtitle="Stay connected with your team and the sales partner who onboarded your business."
      recipientSearchPlaceholder="Search your employees or onboarding partner..."
      emptyConversationText="No conversations yet. Click + to start one with an employee or your onboarding sales partner."
      taskHref="/tasks"
    />
  );
}
