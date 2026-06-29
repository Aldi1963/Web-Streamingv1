import { auth } from "@/services/auth-service";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const user = await auth.currentUser();
  if (user) redirect("/dashboard");

  return <LoginForm />;
}
