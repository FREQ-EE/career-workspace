import { readJSON, writeJSON, DataError } from "./storage-backend.ts";
import { validateRecord } from "./validation.ts";
export async function mutateRecord<T>(
  path: string,
  fn: (data: T) => T | Promise<T>,
  message = "Career Workshop: update record",
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await readJSON<T>(path);
    const data = await fn(structuredClone(current.data));
    validateRecord(path, data);
    if (JSON.stringify(data) === JSON.stringify(current.data))
      return { data, revision: current.sha };
    try {
      const saved = await writeJSON(path, data, current.sha, message);
      return { data, revision: saved.sha };
    } catch (error) {
      if (
        !(error instanceof DataError) ||
        error.status !== 409 ||
        attempt === 4
      )
        throw error;
    }
  }
  throw new DataError("The workspace is busy. Please retry.", 409);
}
