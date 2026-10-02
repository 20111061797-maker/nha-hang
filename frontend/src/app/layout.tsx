import type { Metadata } from "next";
import { AuthProvider } from "@/features/auth/auth-provider";
import { BranchProvider } from "@/features/branches/branch-provider";
import { QueryProvider } from "@/lib/query/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plate & Place | Restaurant Operations",
  description: "Restaurant management workspace",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body><QueryProvider><AuthProvider><BranchProvider>{children}</BranchProvider></AuthProvider></QueryProvider></body>
    </html>
  );
}
