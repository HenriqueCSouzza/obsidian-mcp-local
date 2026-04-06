import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { findByTag } from "../vault/notes.js";

export function register(server: McpServer): void {
  server.registerTool(
    "find_by_tag",
    { inputSchema: { tag: z.string().min(1) } },
    async ({ tag }) => {
      const results = await findByTag(tag);
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    },
  );
}
