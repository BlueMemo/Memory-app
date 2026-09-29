import type { Metadata } from "next";
import { ResetPasswordView } from "@/components/ResetPasswordView";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return <ResetPasswordView />;
}
