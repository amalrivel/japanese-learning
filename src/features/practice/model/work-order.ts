import { isAnsweredV2, type LearningWorkV2 } from "./work-schema-v2";

// Prefer real answers over an empty duplicate, then the most recently edited work.
export function compareWorks(a: LearningWorkV2, b: LearningWorkV2) {
  const answered = (work: LearningWorkV2) =>
    Object.values(work.answers).filter((item) => isAnsweredV2(item.response)).length;
  return (
    answered(b) - answered(a) || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)
  );
}
