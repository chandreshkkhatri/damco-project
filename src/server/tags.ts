export const demoSeedTag = "__damco_seed__";

const hiddenTags = new Set([demoSeedTag]);

export function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function splitStoredTags(tags: string | null) {
  if (!tags) {
    return [];
  }

  return normalizeTags(tags.split(","));
}

export function parseStoredTags(tags: string | null) {
  return splitStoredTags(tags).filter((tag) => !hiddenTags.has(tag));
}

export function getInternalStoredTags(tags: string | null) {
  return splitStoredTags(tags).filter((tag) => hiddenTags.has(tag));
}

export function serializeTags(tags: string[]) {
  const normalizedTags = normalizeTags(tags);

  return normalizedTags.length > 0 ? normalizedTags.join(",") : null;
}

export function parseTagInput(value: FormDataEntryValue | null) {
  if (!value) {
    return [];
  }

  return normalizeTags(value.toString().split(","));
}
