import "server-only";
import type { LearningPack } from "@/features/content/schema";
import type { learnerPack } from "@/features/content/projection";
import { matchesAccepted, type Answers, type Ratings } from "./answers";

type Exercise = ReturnType<typeof learnerPack>["exercises"][number];
type Key = LearningPack["exercises"][number]["answer"];
type Grade =
  | { kind: "objective"; correct: boolean; score: 0 | 1 }
  | { kind: "self"; rating: Ratings[string] | null; score: 0 | 0.5 | 1 | null };
export type Results = Record<string, { skillIds: string[]; type: Exercise["type"]; grade: Grade }>;

export function gradeAnswers(
  exercises: Exercise[],
  keys: Record<string, Key>,
  answers: Answers,
): Results {
  return Object.fromEntries(
    exercises.map((exercise) => {
      if (!Object.hasOwn(keys, exercise.id) || !Object.hasOwn(answers, exercise.id))
        throw new Error("Missing exercise data");
      const key = keys[exercise.id];
      const answer = answers[exercise.id];
      const self =
        exercise.type === "self_review" ||
        (exercise.type === "short_answer" && exercise.grading === "self");
      let grade: Grade;
      if (self) {
        if (!("modelAnswer" in key)) throw new Error("Invalid key");
        grade = { kind: "self", rating: null, score: null };
      } else {
        let correct: boolean;
        if (exercise.type === "multiple_choice" && "choiceId" in key && "choiceId" in answer)
          correct = key.choiceId === answer.choiceId;
        else if ("acceptedAnswers" in key && "text" in answer)
          correct = matchesAccepted(answer.text, key.acceptedAnswers);
        else throw new Error("Invalid key");
        grade = { kind: "objective", correct, score: correct ? 1 : 0 };
      }
      return [exercise.id, { skillIds: [...exercise.skillIds], type: exercise.type, grade }];
    }),
  );
}

export function applyRatings(results: Results, ratings: Ratings): Results | null {
  const selfIds = Object.entries(results)
    .filter(([, result]) => result.grade.kind === "self")
    .map(([id]) => id);
  if (
    selfIds.length === 0 ||
    Object.keys(ratings).length !== selfIds.length ||
    selfIds.some((id) => !Object.hasOwn(ratings, id))
  )
    return null;
  return Object.fromEntries(
    Object.entries(results).map(([id, result]) => [
      id,
      result.grade.kind === "self"
        ? {
            skillIds: [...result.skillIds],
            type: result.type,
            grade: {
              kind: "self",
              rating: ratings[id],
              score: ratings[id] === "met" ? 1 : ratings[id] === "partial" ? 0.5 : 0,
            },
          }
        : {
            skillIds: [...result.skillIds],
            type: result.type,
            grade: { kind: "objective", correct: result.grade.correct, score: result.grade.score },
          },
    ]),
  );
}
