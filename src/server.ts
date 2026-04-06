import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as searchNotes from "./tools/search-notes.js";
import * as getNote from "./tools/get-note.js";
import * as createNote from "./tools/create-note.js";
import * as appendToNote from "./tools/append-to-note.js";
import * as findByTag from "./tools/find-by-tag.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "obsidian-local-vault",
    version: "1.0.0",
  });

  searchNotes.register(server);
  getNote.register(server);
  createNote.register(server);
  appendToNote.register(server);
  findByTag.register(server);

  return server;
}
