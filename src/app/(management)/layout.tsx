import type { Metadata } from "next";
import { AuthBoundary } from "@/components/auth-boundary";


export const metadata: Metadata = {
  title: "Learning management | Personalized Learning PWA",
  description: "Import learning packs and review progress.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthBoundary>{children}</AuthBoundary>
  );
}
