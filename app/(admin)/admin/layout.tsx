import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { requireProfile } from "@/core/auth/session";
import { FacadeRoot } from "@/components/shared/facade-root";
import { SpaceHeader } from "@/components/shared/space-header";

// Back office: admin role required (CLAUDE.md section 3). Anyone else gets a
// 404, so the area is not even revealed.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  if (!profile.roles.includes("admin")) notFound();
  return (
    <FacadeRoot className="min-h-dvh bg-lk-bg">
      <SpaceHeader />
      <main>{children}</main>
    </FacadeRoot>
  );
}
