import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schema validation (mirrors each tool's inputSchema)
// ---------------------------------------------------------------------------

describe("get_note schema", () => {
  const schema = z.object({ path: z.string().min(1) });

  it("accepts a valid path", () => {
    expect(() => schema.parse({ path: "notes/test.md" })).not.toThrow();
  });

  it("rejects an empty path", () => {
    expect(() => schema.parse({ path: "" })).toThrow();
  });

  it("rejects missing path", () => {
    expect(() => schema.parse({})).toThrow();
  });
});

describe("create_note schema", () => {
  const schema = z.object({
    path: z.string().min(1),
    content: z.string(),
    overwrite: z.boolean().optional(),
  });

  it("accepts path and content without overwrite", () => {
    expect(() =>
      schema.parse({ path: "note.md", content: "hello" }),
    ).not.toThrow();
  });

  it("accepts overwrite: true", () => {
    expect(() =>
      schema.parse({ path: "note.md", content: "hello", overwrite: true }),
    ).not.toThrow();
  });

  it("accepts omitted overwrite (optional)", () => {
    const result = schema.parse({ path: "note.md", content: "hello" });
    expect(result.overwrite).toBeUndefined();
  });

  it("rejects empty path", () => {
    expect(() => schema.parse({ path: "", content: "hello" })).toThrow();
  });
});

describe("append_to_note schema", () => {
  const schema = z.object({
    path: z.string().min(1),
    content: z.string().min(1),
  });

  it("accepts valid path and content", () => {
    expect(() =>
      schema.parse({ path: "note.md", content: "appended" }),
    ).not.toThrow();
  });

  it("rejects empty content", () => {
    expect(() => schema.parse({ path: "note.md", content: "" })).toThrow();
  });

  it("rejects empty path", () => {
    expect(() =>
      schema.parse({ path: "", content: "appended" }),
    ).toThrow();
  });
});

describe("search_notes schema", () => {
  const schema = z.object({ query: z.string().min(1) });

  it("accepts a valid query", () => {
    expect(() => schema.parse({ query: "obsidian" })).not.toThrow();
  });

  it("rejects an empty query", () => {
    expect(() => schema.parse({ query: "" })).toThrow();
  });
});

describe("find_by_tag schema", () => {
  const schema = z.object({ tag: z.string().min(1) });

  it("accepts a valid tag", () => {
    expect(() => schema.parse({ tag: "mytag" })).not.toThrow();
  });

  it("accepts a tag with leading #", () => {
    expect(() => schema.parse({ tag: "#mytag" })).not.toThrow();
  });

  it("rejects an empty tag", () => {
    expect(() => schema.parse({ tag: "" })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Tool registration — verify each tool calls server.registerTool once
// ---------------------------------------------------------------------------

describe("tool registration", () => {
  function makeMockServer() {
    return { registerTool: vi.fn() };
  }

  it("get_note registers itself", async () => {
    const server = makeMockServer();
    const { register } = await import("../../src/tools/get-note.js");
    register(server as never);
    expect(server.registerTool).toHaveBeenCalledOnce();
    expect(server.registerTool.mock.calls[0][0]).toBe("get_note");
  });

  it("create_note registers itself", async () => {
    const server = makeMockServer();
    const { register } = await import("../../src/tools/create-note.js");
    register(server as never);
    expect(server.registerTool).toHaveBeenCalledOnce();
    expect(server.registerTool.mock.calls[0][0]).toBe("create_note");
  });

  it("append_to_note registers itself", async () => {
    const server = makeMockServer();
    const { register } = await import("../../src/tools/append-to-note.js");
    register(server as never);
    expect(server.registerTool).toHaveBeenCalledOnce();
    expect(server.registerTool.mock.calls[0][0]).toBe("append_to_note");
  });

  it("search_notes registers itself", async () => {
    const server = makeMockServer();
    const { register } = await import("../../src/tools/search-notes.js");
    register(server as never);
    expect(server.registerTool).toHaveBeenCalledOnce();
    expect(server.registerTool.mock.calls[0][0]).toBe("search_notes");
  });

  it("find_by_tag registers itself", async () => {
    const server = makeMockServer();
    const { register } = await import("../../src/tools/find-by-tag.js");
    register(server as never);
    expect(server.registerTool).toHaveBeenCalledOnce();
    expect(server.registerTool.mock.calls[0][0]).toBe("find_by_tag");
  });
});
