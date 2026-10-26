import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Learning management | Personalized Learning PWA",
  description: "Import learning packs and review progress.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <>
    {children}</>
  );
}
