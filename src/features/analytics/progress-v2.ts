import type { LearningPackV2 } from "@/features/content/schema-v2";
import { isAnsweredV2, type LearningWorkV2 } from "@/features/practice/work-schema-v2";
import type { TeacherContextV2, TeacherFeedbackV2 } from "./teacher-schema-v2";

type Snapshot = TeacherContextV2["snapshots"][number];
type Assessment = Extract<TeacherFeedbackV2, { mode: "assessment" }>;
export function summarizeV2(
  works: { work: LearningWorkV2; pack: LearningPackV2 }[],
  assessments: { feedback: Assessment; importedAt: string; snapshot: Snapshot }[],
) {
  let answered = 0,
    questions = 0;
  for (const { work, pack } of works) {
    questions += pack.exercises.length;
    answered += pack.exercises.filter((exercise) =>
      isAnsweredV2(work.answers[exercise.id]?.response ?? null),
    ).length;
  }
  const skills: Record<
    string,
    { label: string; correct: number; partial: number; incorrect: number }
  > = {};
  const results = assessments.map(({ feedback, importedAt, snapshot }) => {
    const outcomes = { correct: 0, partial: 0, incorrect: 0 };
    for (const item of feedback.assessments) {
      outcomes[item.outcome]++;
      const exercise = snapshot.pack.exercises.find((entry) => entry.id === item.exerciseId)!;
      for (const id of exercise.skillIds) {
        const skill = snapshot.pack.skills.find((entry) => entry.id === id)!;
        const key = `${snapshot.pack.subject.id}:${id}`;
        skills[key] ??= {
          label: `${snapshot.pack.subject.label} · ${skill.label}`,
          correct: 0,
          partial: 0,
          incorrect: 0,
        };
        skills[key][item.outcome]++;
      }
    }
    return {
      id: feedback.id,
      importedAt,
      teacherCreatedAt: feedback.createdAt,
      title: snapshot.pack.title,
      revision: snapshot.work.revision,
      ...outcomes,
    };
  });
  return { answered, questions, skills: Object.values(skills), results };
}
