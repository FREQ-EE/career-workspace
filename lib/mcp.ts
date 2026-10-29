import { timingSafeEqual } from "node:crypto";
import { readJSON, DataError } from "./storage-backend";
import { saveEdits } from "./save-edits";
import { validateRecord } from "./validation";
import { config } from "./runtime";
import { recordPaths } from "./career";
import cvSchema from "../schemas/cv.schema.json";
import profileSchema from "../schemas/profile.schema.json";
import workspaceSchema from "../schemas/workspace.schema.json";
const readable = Object.keys(recordPaths),
  editable = ["workspace", "profile", "cv", "documents", "journey"];
const input = {
  type: "object",
  properties: { record: { type: "string", enum: readable } },
  required: ["record"],
  additionalProperties: false,
};
export const mcpTools = [
  {
    name: "career_read",
    description:
      "Read the latest confirmed career record and its revision. Includes profile, goals, evidence, inbox, shortlist, application pipeline, documents, settings and search history. Read before proposing or saving changes. Credentials are never returned.",
    inputSchema: input,
    annotations: { readOnlyHint: true },
  },
  {
    name: "career_contract",
    description:
      "Get the data contract and onboarding workflow before creating or editing records. Interview one question at a time; record only user-confirmed or source-verified facts. Keep aspirations separate from evidence. Never infer successful application submission.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "career_edit",
    description:
      "Save small, user-authorised field edits to a current career record. Supply before values from career_read; unrelated edits merge and conflicting fields are refused. Do not change stage to Applied without explicit confirmation from the user. This tool cannot change AI permissions, credentials or schedules.",
    inputSchema: {
      type: "object",
      properties: {
        record: { type: "string", enum: editable },
        edits: {
          type: "array",
          maxItems: 500,
          items: {
            type: "object",
            properties: {
              path: { type: "array", items: { type: "string" } },
              before: {},
              value: {},
              remove: { type: "boolean" },
            },
            required: ["path"],
            additionalProperties: false,
          },
        },
        userConfirmedApplied: { type: "boolean" },
      },
      required: ["record", "edits"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
];
export function authorisedMCP(value: string | null) {
  const expected = config("CW_MCP_TOKEN");
  if (!expected || !value?.startsWith("Bearer ")) return false;
  const a = Buffer.from(expected),
    b = Buffer.from(value.slice(7));
  return a.length === b.length && timingSafeEqual(a, b);
}
function text(value: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(value) }] };
}
export async function callCareerTool(name: string, args: any) {
  if (!args || typeof args !== "object" || Array.isArray(args))
    throw new DataError("Tool arguments must be an object.", 400);
  if (name === "career_contract")
    return text({
      workflow: [
        "Read the current profile and CV.",
        "Explain which information is shared with the AI service.",
        "Gather evidence, direction and constraints from the user. Confirm uncertain facts.",
        "Use real vacancies to calibrate preference and capability independently.",
        "Ask the user to configure the routine in the application.",
        "Read the current records at the start of each future task.",
      ],
      schemas: {
        profile: profileSchema,
        cv: cvSchema,
        workspace: workspaceSchema,
      },
      editableRecords: editable,
      edits:
        "An array of {path:[field,...], before:currentValue, value:confirmedNewValue}. For ID-keyed arrays use @ followed by the stable item ID. Unknown salary, dates and languages remain unknown. Related tasks reference an existing opportunity ID.",
    });
  if (!readable.includes(args.record))
    throw new DataError("This record is not available to the connector.", 400);
  const path = recordPaths[args.record as keyof typeof recordPaths];
  if (name === "career_read") {
    const { data, sha } = await readJSON(path);
    return text({ record: args.record, data, revision: sha });
  }
  if (name === "career_edit") {
    if (
      !editable.includes(args.record) ||
      !Array.isArray(args.edits) ||
      args.edits.length > 500
    )
      throw new DataError("These edits are not permitted.", 400);
    if (
      args.record === "workspace" &&
      !args.userConfirmedApplied &&
      args.edits.some(
        (e: any) =>
          e.value === "Applied" ||
          /"stage"\s*:\s*"Applied"/.test(JSON.stringify(e.value) || ""),
      )
    )
      throw new DataError(
        "The user must explicitly confirm application submission before Applied can be recorded.",
        403,
      );
    return text(
      await saveEdits(
        path,
        args.edits,
        (value) => {
          validateRecord(path, value);
          return true;
        },
        "Career Workshop: save confirmed conversation update",
      ),
    );
  }
  throw new DataError("Unknown career tool.", 400);
}
export async function handleMCP(message: any) {
  if (
    !message ||
    message.jsonrpc !== "2.0" ||
    typeof message.method !== "string"
  )
    return {
      jsonrpc: "2.0",
      id: message?.id ?? null,
      error: { code: -32600, message: "Invalid JSON-RPC request." },
    };
  if (message.id === undefined) return null;
  try {
    let result: any;
    switch (message.method) {
      case "initialize":
        result = {
          protocolVersion: ["2025-03-26", "2025-06-18", "2025-11-25"].includes(
            message.params?.protocolVersion,
          )
            ? message.params.protocolVersion
            : "2025-11-25",
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: "Career Workshop", version: "2.0.0" },
          instructions:
            "Read career_contract and current records before each task. Work only with this career workspace. Ask clear onboarding questions and save user-confirmed facts using small edits. Preserve unrelated data. Never send applications, contact employers, alter privacy permissions or create schedules through this connector.",
        };
        break;
      case "ping":
        result = {};
        break;
      case "tools/list":
        result = { tools: mcpTools };
        break;
      case "tools/call":
        try {
          result = await callCareerTool(
            message.params?.name,
            message.params?.arguments || {},
          );
        } catch (error) {
          result = {
            ...text({
              error:
                error instanceof Error ? error.message : "Tool request failed.",
            }),
            isError: true,
          };
        }
        break;
      case "resources/list":
        result = {
          resources: readable.map((name) => ({
            uri: "career://" + name,
            name,
            mimeType: "application/json",
          })),
        };
        break;
      case "resources/read": {
        const name = String(message.params?.uri || "").replace(
          /^career:\/\//,
          "",
        );
        if (!readable.includes(name))
          throw new Error("Unknown career resource.");
        const { data } = await readJSON(
          recordPaths[name as keyof typeof recordPaths],
        );
        result = {
          contents: [
            {
              uri: "career://" + name,
              mimeType: "application/json",
              text: JSON.stringify(data),
            },
          ],
        };
        break;
      }
      default:
        return {
          jsonrpc: "2.0",
          id: message.id,
          error: { code: -32601, message: "Method not supported." },
        };
    }
    return { jsonrpc: "2.0", id: message.id, result };
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id: message.id,
      error: {
        code: -32602,
        message: error instanceof Error ? error.message : "Invalid request.",
      },
    };
  }
}
