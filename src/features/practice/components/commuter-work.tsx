"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import type { TeacherContextV2 } from "@/features/analytics/model/teacher-schema-v2";
import type { LearningPackV2 } from "@/features/content/model/schema-v2";
import { CommuterDraft, editableWork, type DraftView } from "../drafts/commuter-draft";
import { isAnsweredV2, type LearningWorkV2 } from "../model/work-schema-v2";

type Props = {
  user: User;
  initialWork: LearningWorkV2;
  pack: LearningPackV2;
  context: TeacherContextV2 | null;
  onView: (view: DraftView) => void;
};
type RichSegment = { text: string; reading?: string };
function RichText({ value, showReading }: { value: RichSegment[]; showReading: boolean }) {
  return (
    <>
      {value.map((segment, index) =>
        segment.reading && showReading ? (
          <ruby key={index}>
            {segment.text}
            <rt>{segment.reading}</rt>
          </ruby>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}
const labels = { correct: "benar", partial: "sebagian", incorrect: "belum tepat" } as const;

export function CommuterWork({ user, initialWork, pack, context, onView }: Props) {
  const session = useRef<CommuterDraft | null>(null);
  const callback = useRef(onView);
  useEffect(() => {
    callback.current = onView;
  }, [onView]);
  const [view, setView] = useState<DraftView>({
    work: initialWork,
    editable: editableWork(initialWork),
    status: "loading",
    storageFailed: false,
    pending: false,
    submitting: false,
    branches: [],
    message: "Memuat draf…",
  });
  const [mode, setMode] = useState<"materials" | "exercise" | "reflection">("materials");
  const [index, setIndex] = useState(0);
  const [showReading, setShowReading] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const initialized = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const current = new CommuterDraft(user, initialWork, pack, (next) => {
      setView(next);
      callback.current(next);
      if (!initialized.current && next.status !== "loading") {
        initialized.current = true;
        const position = pack.exercises.findIndex(
          (exercise) => exercise.id === next.editable.currentExerciseId,
        );
        if (position >= 0) {
          setIndex(position);
          setMode("exercise");
        }
      }
    });
    session.current = current;
    void current.open();
    const online = () => current.retry();
    const accountChanged = () => current.close();
    window.addEventListener("online", online);
    window.addEventListener("learning:account-change", accountChanged);
    return () => {
      current.close();
      session.current = null;
      window.removeEventListener("online", online);
      window.removeEventListener("learning:account-change", accountChanged);
    };
  }, [user.uid, initialWork.id, pack.id]); // eslint-disable-line react-hooks/exhaustive-deps
  function navigate(nextMode: "materials" | "exercise" | "reflection", nextIndex = index) {
    setMode(nextMode);
    setIndex(nextIndex);
    if (nextMode === "exercise")
      session.current?.update({
        ...view.editable,
        currentExerciseId: pack.exercises[nextIndex].id,
      });
    requestAnimationFrame(() => heading.current?.focus());
  }
  function updateAnswer(id: string, answer: LearningWorkV2["answers"][string]) {
    session.current?.update({
      ...view.editable,
      currentExerciseId: id,
      answers: { ...view.editable.answers, [id]: answer },
    });
  }
  const disabled =
    view.status === "loading" ||
    view.branches.length > 1 ||
    view.work.status === "submitted" ||
    view.submitting;
  const exercise = pack.exercises[index];
  const answer = Object.hasOwn(view.editable.answers, exercise.id)
    ? view.editable.answers[exercise.id]
    : { response: null, comment: "" };
  const snapshot = context?.snapshots.find(
    (item) => item.work.id === view.work.id && item.work.revision === view.work.revision,
  );
  const assessment = context?.feedbackHistory
    .flatMap((feedback) =>
      feedback.mode === "assessment" && feedback.target.snapshotId === snapshot?.id
        ? feedback.assessments
        : [],
    )
    .find((item) => item.exerciseId === exercise.id);
  const show = pack.furigana === "toggle" && showReading;
  const inputClass = "w-full rounded-md border bg-background p-2 text-base";
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{pack.title}</h2>
      <p role="status">
        {view.message ||
          {
            loading: "Memuat draf…",
            saving: "Menyimpan…",
            local: "Tersimpan di HP",
            server: "Tersimpan di server",
            failed: "Gagal menyimpan",
            conflict: "Konflik",
            submitted: "Pekerjaan diakhiri",
          }[view.status]}
      </p>
      {copyNotice && <p role="status">{copyNotice}</p>}
      {view.storageFailed && (
        <div className="flex flex-wrap gap-2">
          <Button
            className="min-h-11"
            type="button"
            onClick={() => void session.current?.emergencySave()}
          >
            Simpan ke server
          </Button>
          <Button
            className="min-h-11"
            variant="outline"
            onClick={() => {
              void navigator.clipboard
                .writeText(JSON.stringify(view.editable, null, 2))
                .then(() => setCopyNotice("Input disalin."))
                .catch(() =>
                  setCopyNotice("Tidak dapat menyalin input. Pilih dan salin teks secara manual."),
                );
            }}
          >
            Salin input
          </Button>
        </div>
      )}
      {!view.storageFailed && view.status === "local" && (
        <Button className="min-h-11" variant="outline" onClick={() => session.current?.retry()}>
          Coba sinkronkan
        </Button>
      )}
      {view.branches.length > 1 && (
        <div className="flex flex-col gap-2">
          <p>Pilih draf perangkat untuk dipulihkan:</p>
          {view.branches.map((branch, branchIndex) => (
            <details key={branch.branchId} className="rounded-md border p-3">
              <summary>
                Draf {branchIndex + 1} · revisi {branch.baseRevision}
              </summary>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-sm">
                {JSON.stringify(branch.editable, null, 2)}
              </pre>
              <Button
                className="min-h-11"
                variant="outline"
                onClick={() => {
                  void session.current?.selectBranch(branch);
                  const position = pack.exercises.findIndex(
                    (exercise) => exercise.id === branch.editable.currentExerciseId,
                  );
                  if (position >= 0) {
                    setIndex(position);
                    setMode("exercise");
                  } else setMode("materials");
                }}
              >
                Pilih draf {branchIndex + 1}
              </Button>
            </details>
          ))}
        </div>
      )}
      {view.status === "conflict" && view.branches.length <= 1 && (
        <div className="flex flex-wrap gap-2">
          <Button
            className="min-h-11"
            variant="outline"
            onClick={() => {
              if (window.confirm("Gunakan versi server dan tinggalkan draf yang dipilih?"))
                void session.current?.resolve(false);
            }}
          >
            Gunakan versi server
          </Button>
          <Button
            className="min-h-11"
            variant="outline"
            onClick={() => {
              if (window.confirm("Terapkan draf HP ke revisi server terbaru?"))
                void session.current?.resolve(true);
            }}
          >
            Gunakan draf HP
          </Button>
        </div>
      )}
      {view.status === "submitted" && (
        <Button
          className="min-h-11"
          variant="outline"
          onClick={() => {
            if (window.confirm("Buat pekerjaan baru dari draf HP?"))
              void session.current?.createReplacement();
          }}
        >
          Buat pekerjaan baru dari draf
        </Button>
      )}
      {pack.furigana === "toggle" && (
        <Button className="min-h-11" variant="outline" onClick={() => setShowReading(!showReading)}>
          {showReading ? "Sembunyikan furigana" : "Tampilkan furigana"}
        </Button>
      )}
      <div className="flex flex-wrap gap-2">
        <Button className="min-h-11" variant="outline" onClick={() => navigate("materials")}>
          Materi
        </Button>
        <Button className="min-h-11" variant="outline" onClick={() => navigate("reflection")}>
          Refleksi
        </Button>
      </div>
      {mode === "materials" && (
        <div className="flex flex-col gap-3">
          <h3 ref={heading} tabIndex={-1} className="text-lg font-medium">
            Materi
          </h3>
          {pack.materials.length === 0 && <p>Tidak ada materi pada paket ini.</p>}
          {pack.materials.map((material) => (
            <article key={material.id}>
              <h4 className="font-medium">{material.title}</h4>
              <p className="whitespace-pre-wrap">
                <RichText value={material.content} showReading={show} />
              </p>
            </article>
          ))}
          <Button className="min-h-11" onClick={() => navigate("exercise", index)}>
            Mulai latihan
          </Button>
        </div>
      )}
      {mode === "exercise" && (
        <div className="flex flex-col gap-3">
          <p>
            Soal {index + 1} dari {pack.exercises.length}
          </p>
          <h3 ref={heading} tabIndex={-1} className="text-lg font-medium">
            <RichText value={exercise.prompt} showReading={show} />
          </h3>
          <p>
            {!isAnsweredV2(answer.response)
              ? "Belum dijawab"
              : view.status !== "server"
                ? "Perubahan belum dinilai"
                : !snapshot
                  ? "Muat snapshot untuk melihat penilaian"
                  : assessment
                    ? `Hasil guru: ${labels[assessment.outcome]}`
                    : "Belum dinilai"}
          </p>
          <fieldset disabled={disabled} className="flex flex-col gap-3">
            {exercise.type === "multiple_choice" ? (
              <fieldset className="flex flex-col gap-2">
                <legend>Jawaban</legend>
                {exercise.choices.map((choice) => (
                  <label className="flex min-h-11 items-center gap-3" key={choice.id}>
                    <input
                      type="radio"
                      name={`answer-${exercise.id}`}
                      checked={
                        !!answer.response &&
                        "choiceId" in answer.response &&
                        answer.response.choiceId === choice.id
                      }
                      onChange={() =>
                        updateAnswer(exercise.id, { ...answer, response: { choiceId: choice.id } })
                      }
                    />
                    <RichText value={choice.text} showReading={show} />
                  </label>
                ))}
              </fieldset>
            ) : (
              <label className="block">
                Jawaban
                <textarea
                  className={inputClass}
                  maxLength={2000}
                  value={answer.response && "text" in answer.response ? answer.response.text : ""}
                  onChange={(event) =>
                    updateAnswer(exercise.id, { ...answer, response: { text: event.target.value } })
                  }
                />
              </label>
            )}
            <label className="block">
              Komentar atau keraguan
              <textarea
                className={inputClass}
                maxLength={2000}
                value={answer.comment}
                onChange={(event) =>
                  updateAnswer(exercise.id, { ...answer, comment: event.target.value })
                }
              />
            </label>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button
              className="min-h-11"
              variant="outline"
              onClick={() =>
                index === 0 ? navigate("materials") : navigate("exercise", index - 1)
              }
            >
              Sebelumnya
            </Button>
            <Button
              className="min-h-11"
              onClick={() =>
                index + 1 === pack.exercises.length
                  ? navigate("reflection")
                  : navigate("exercise", index + 1)
              }
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
      {mode === "reflection" && (
        <div className="flex flex-col gap-3">
          <h3 ref={heading} tabIndex={-1} className="text-lg font-medium">
            Refleksi 3–2–1
          </h3>
          <fieldset disabled={disabled} className="flex flex-col gap-3">
            {(["understood", "unclear"] as const).map((field) => (
              <div className="flex flex-col gap-2" key={field}>
                <p>{field === "understood" ? "Hal yang dipahami" : "Hal yang belum jelas"}</p>
                {Array.from({ length: field === "understood" ? 3 : 2 }, (_, n) => (
                  <label className="block" key={n}>
                    {field === "understood" ? "Dipahami" : "Belum jelas"} {n + 1}
                    <input
                      className={inputClass}
                      maxLength={500}
                      value={view.editable.reflection[field][n] ?? ""}
                      disabled={n > view.editable.reflection[field].length}
                      onChange={(event) => {
                        const values = [...view.editable.reflection[field]];
                        if (event.target.value) values[n] = event.target.value;
                        else values.splice(n, 1);
                        session.current?.update({
                          ...view.editable,
                          reflection: { ...view.editable.reflection, [field]: values },
                        });
                      }}
                    />
                  </label>
                ))}
              </div>
            ))}
            <label className="block">
              Pertanyaan atau langkah berikutnya
              <textarea
                className={inputClass}
                maxLength={500}
                value={view.editable.reflection.nextStep}
                onChange={(event) =>
                  session.current?.update({
                    ...view.editable,
                    reflection: { ...view.editable.reflection, nextStep: event.target.value },
                  })
                }
              />
            </label>
          </fieldset>
          <Button
            className="min-h-11"
            variant="outline"
            onClick={() => navigate("exercise", pack.exercises.length - 1)}
          >
            Sebelumnya
          </Button>
        </div>
      )}
      {view.work.status === "in_progress" && (
        <Button
          className="min-h-11"
          variant="outline"
          disabled={view.status !== "server" || view.pending || view.storageFailed}
          onClick={() => {
            if (window.confirm("Akhiri pekerjaan? Pekerjaan tidak dapat diubah lagi."))
              void session.current?.submit();
          }}
        >
          Akhiri pekerjaan
        </Button>
      )}
    </section>
  );
}
