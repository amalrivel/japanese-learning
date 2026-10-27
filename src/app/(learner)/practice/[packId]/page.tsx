import { PracticeSession } from "@/features/practice/session";
export const instant = false;
export default async function PackPracticePage({ params }: PageProps<"/practice/[packId]">) {
  const { packId } = await params;
  return <PracticeSession key={packId} packId={packId} />;
}
