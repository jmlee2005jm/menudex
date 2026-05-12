import type { Metadata } from "next";
import { AppSessionProvider } from "@/components/app-session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "MenuDex",
  description: "Personal restaurant and menu logging with annotated menu photos.",
  authors: [{ name: "JM Lee" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
