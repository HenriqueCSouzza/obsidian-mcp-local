import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createNote } from "../vault/notes.js";

export function register(server: McpServer): void {
  server.registerTool(
    "create_note",
    {
      inputSchema: {
        path: z.string().min(1),
        content: z.string(),
        overwrite: z.boolean().optional(),
      },
    },
    async ({ path, content, overwrite }) => {
      const result = await createNote(path, content, overwrite ?? false);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
