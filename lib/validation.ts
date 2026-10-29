import * as validators from "./compiled-schemas.mjs";
import mapping from "../config/record-schemas.json";
import { DataError } from "./storage-backend";
export function schemaFor(path: string) {
  return Object.hasOwn(mapping, path)
    ? (mapping as Record<string, string>)[path]
    : "";
}
export function validateRecord(path: string, value: unknown) {
  const name = schemaFor(path).replaceAll("-", "_");
  const fn = (
    validators as unknown as Record<
      string,
      ((value: unknown) => boolean) & { errors?: unknown }
    >
  )[name];
  if (!fn || !fn(value))
    throw new DataError(
      "Record does not match " +
        name +
        " schema. " +
        (fn ? JSON.stringify(fn.errors) : "Path is not editable."),
      400,
    );
}
