import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { appendToNote } from "../vault/notes.js";

export function register(server: McpServer): void {
  server.registerTool(
    "append_to_note",
    {
      inputSchema: {
        path: z.string().min(1),
        content: z.string().min(1),
      },
    },
    async ({ path, content }) => {
      const result = await appendToNote(path, content);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
