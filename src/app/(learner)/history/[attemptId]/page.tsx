import { PracticeSession } from "@/features/practice/session";
export const instant = false;
export default async function AttemptPage({ params }: PageProps<"/history/[attemptId]">) {
  const { attemptId } = await params;
  return <PracticeSession key={attemptId} attemptId={attemptId} />;
}
