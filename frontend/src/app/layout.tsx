import type { Metadata } from "next";
import { AuthProvider } from "@/features/auth/auth-provider";
import { BranchProvider } from "@/features/branches/branch-provider";
import { QueryProvider } from "@/lib/query/provider";
import { ThemeProvider } from "@/features/theme/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plate & Place | Restaurant Operations",
  description: "Restaurant management workspace",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("quanan_theme_mode");if(t==="light"){document.documentElement.classList.remove("dark");document.documentElement.classList.add("light");document.documentElement.setAttribute("data-theme","light");document.documentElement.style.colorScheme="light";}else{document.documentElement.classList.remove("light");document.documentElement.classList.add("dark");document.documentElement.setAttribute("data-theme","dark");document.documentElement.style.colorScheme="dark";}}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            <BranchProvider>
              <ThemeProvider>{children}</ThemeProvider>
            </BranchProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
