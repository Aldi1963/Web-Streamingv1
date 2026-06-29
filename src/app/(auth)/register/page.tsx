import { auth } from "@/services/auth-service";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage() {
  const user = await auth.currentUser();
  if (user) redirect("/dashboard");

  return <RegisterForm />;
}
