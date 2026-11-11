import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const firebase = JSON.parse(readFileSync(new URL("../../firebase.json", import.meta.url), "utf8"));
const config = JSON.parse(
  readFileSync(new URL(`../../${firebase.firestore.indexes}`, import.meta.url), "utf8"),
) as {
  fieldOverrides: {
    collectionGroup: string;
    fieldPath: string;
    indexes: { order: string; queryScope: string }[];
  }[];
};

it.each([
  ["learningWorks", "work.packId", "work"],
  ["teacherSnapshots", "snapshot.pack.id", "snapshot"],
])(
  "indexes the %s package lookup despite its parent exemption",
  (collectionGroup, fieldPath, parent) => {
    const overrides = config.fieldOverrides.filter(
      (field) => field.collectionGroup === collectionGroup && field.fieldPath === fieldPath,
    );
    expect(overrides).toHaveLength(1);
    expect(overrides[0].indexes).toContainEqual({ order: "ASCENDING", queryScope: "COLLECTION" });
    expect(config.fieldOverrides).toContainEqual({
      collectionGroup,
      fieldPath: parent,
      indexes: [],
    });
  },
);
