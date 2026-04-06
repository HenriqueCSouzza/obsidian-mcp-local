import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readNote } from "../vault/notes.js";

export function register(server: McpServer): void {
  server.registerTool(
    "get_note",
    { inputSchema: { path: z.string().min(1) } },
    async ({ path }) => {
      const note = await readNote(path);
      return {
        content: [{ type: "text", text: JSON.stringify(note, null, 2) }],
      };
    },
  );
}
