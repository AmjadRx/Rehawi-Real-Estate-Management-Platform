import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { authCapabilities } from "@/lib/auth/mode";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  // §3.2.4 v3: the login screen adapts to the enabled sign-in methods.
  const caps = authCapabilities();
  return (
    <main className="relative flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <ThemeToggle className="absolute end-4 top-4" />
      <Suspense>
        <LoginForm
          mode={caps.mode}
          firstTimeSetup={caps.firstTimeSetup}
          emailOtp={caps.emailOtp}
          phoneOtp={caps.phoneOtp}
        />
      </Suspense>
    </main>
  );
}
