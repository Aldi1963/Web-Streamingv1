import { auth } from "@/services/auth-service";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";

function safeRedirect(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const user = await auth.currentUser();
  const { redirect: redirectTo } = await searchParams;
  if (user) redirect(safeRedirect(redirectTo));

  return <RegisterForm redirectTo={safeRedirect(redirectTo)} />;
}
