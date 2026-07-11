import { auth } from "@/services/auth-service";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";

function safeRedirect(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const user = await auth.currentUser();
  const { redirect: redirectTo } = await searchParams;
  if (user) redirect(safeRedirect(redirectTo));

  return <LoginForm />;
}
