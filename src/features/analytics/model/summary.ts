type Grade =
  { kind: "objective"; correct: boolean } | { kind: "self"; rating: "met" | "partial" | "not_yet" };
type Counters = {
  exerciseCount: number;
  objectiveCount: number;
  objectiveCorrect: number;
  selfCount: number;
  selfMet: number;
  selfPartial: number;
  selfNotYet: number;
};
export type CompletedAttempt = {
  subject: { id: string };
  skills: { id: string; label: string }[];
  completedAt: string;
  results: Record<string, { skillIds: string[]; grade: Grade }>;
};
const empty = (): Counters => ({
  exerciseCount: 0,
  objectiveCount: 0,
  objectiveCorrect: 0,
  selfCount: 0,
  selfMet: 0,
  selfPartial: 0,
  selfNotYet: 0,
});
function count(counter: Counters, grade: Grade) {
  counter.exerciseCount++;
  if (grade.kind === "objective") {
    counter.objectiveCount++;
    if (grade.correct) counter.objectiveCorrect++;
  } else {
    counter.selfCount++;
    if (grade.rating === "met") counter.selfMet++;
    else if (grade.rating === "partial") counter.selfPartial++;
    else if (grade.rating === "not_yet") counter.selfNotYet++;
    else throw new Error("Invalid completed self-assessment");
  }
}
export function summarize(attempts: CompletedAttempt[], generatedAt: string) {
  const window = attempts.slice(0, 100);
  const totals = empty();
  const skills = new Map<
    string,
    Counters & { subjectId: string; skillId: string; label: string; lastPracticedAt: string }
  >();
  for (const attempt of window) {
    const labels = new Map(attempt.skills.map((skill) => [skill.id, skill.label]));
    for (const result of Object.values(attempt.results)) {
      count(totals, result.grade);
      for (const skillId of result.skillIds) {
        const key = JSON.stringify([attempt.subject.id, skillId]);
        if (!skills.has(key)) {
          const label = labels.get(skillId);
          if (label === undefined) throw new Error("Missing skill metadata");
          skills.set(key, {
            ...empty(),
            subjectId: attempt.subject.id,
            skillId,
            label,
            lastPracticedAt: attempt.completedAt,
          });
        }
        count(skills.get(key)!, result.grade);
      }
    }
  }
  return {
    schemaVersion: 1 as const,
    generatedAt,
    window: {
      limit: 100 as const,
      attemptCount: window.length,
      hasEarlierAttempts: attempts.length > 100,
      oldestCompletedAt: window.at(-1)?.completedAt ?? null,
    },
    totals,
    skills: [...skills.values()]
      .sort((a, b) =>
        a.subjectId < b.subjectId
          ? -1
          : a.subjectId > b.subjectId
            ? 1
            : a.skillId < b.skillId
              ? -1
              : a.skillId > b.skillId
                ? 1
                : 0,
      )
      .map((skill) => ({
        ...skill,
        objectiveAccuracy: skill.objectiveCount
          ? skill.objectiveCorrect / skill.objectiveCount
          : null,
      })),
  };
}
