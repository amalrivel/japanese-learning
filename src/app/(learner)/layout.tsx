import { AuthBoundary } from "@/components/auth-boundary";

export default function LearnerLayout({ children }: LayoutProps<"/">) {
  return <AuthBoundary>{children}</AuthBoundary>;
}
