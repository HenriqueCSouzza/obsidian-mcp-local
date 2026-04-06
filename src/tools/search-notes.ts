import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchNotes } from "../vault/notes.js";

export function register(server: McpServer): void {
  server.registerTool(
    "search_notes",
    { inputSchema: { query: z.string().min(1) } },
    async ({ query }) => {
      const results = await searchNotes(query);
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    },
  );
}
