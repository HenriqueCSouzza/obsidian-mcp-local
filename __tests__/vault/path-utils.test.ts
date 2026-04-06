import { describe, it, expect } from "vitest";
import path from "node:path";
import {
  VAULT_ROOT,
  normalizeSlashes,
  isMarkdownFile,
  ensureMdExtension,
  resolveVaultPath,
  toRelativeVaultPath,
} from "../../src/vault/path-utils.js";

describe("normalizeSlashes", () => {
  it("replaces backslashes with forward slashes", () => {
    expect(normalizeSlashes("foo\\bar\\baz")).toBe("foo/bar/baz");
  });

  it("leaves forward slashes unchanged", () => {
    expect(normalizeSlashes("foo/bar/baz")).toBe("foo/bar/baz");
  });

  it("handles mixed slashes", () => {
    expect(normalizeSlashes("foo\\bar/baz\\qux")).toBe("foo/bar/baz/qux");
  });
});

describe("isMarkdownFile", () => {
  it("returns true for lowercase .md files", () => {
    expect(isMarkdownFile("note.md")).toBe(true);
  });

  it("returns true for uppercase .MD extension", () => {
    expect(isMarkdownFile("note.MD")).toBe(true);
  });

  it("returns false for .txt files", () => {
    expect(isMarkdownFile("note.txt")).toBe(false);
  });

  it("returns false for files with no extension", () => {
    expect(isMarkdownFile("note")).toBe(false);
  });

  it("returns false for .mdx files", () => {
    expect(isMarkdownFile("note.mdx")).toBe(false);
  });
});

describe("ensureMdExtension", () => {
  it("adds .md to a path without extension", () => {
    expect(ensureMdExtension("note")).toBe("note.md");
  });

  it("does not double-add .md", () => {
    expect(ensureMdExtension("note.md")).toBe("note.md");
  });

  it("adds .md when path already has a different extension", () => {
    expect(ensureMdExtension("note.txt")).toBe("note.txt.md");
  });
});

describe("resolveVaultPath", () => {
  it("resolves a simple relative path inside the vault", () => {
    const resolved = resolveVaultPath("note.md");
    expect(resolved).toBe(path.join(VAULT_ROOT, "note.md"));
  });

  it("resolves a nested relative path inside the vault", () => {
    const resolved = resolveVaultPath("folder/note.md");
    expect(resolved).toBe(path.join(VAULT_ROOT, "folder", "note.md"));
  });

  it("strips leading slashes from the input", () => {
    const resolved = resolveVaultPath("/note.md");
    expect(resolved).toBe(path.join(VAULT_ROOT, "note.md"));
  });

  it("throws on path traversal with ../", () => {
    expect(() => resolveVaultPath("../outside.md")).toThrow(
      "Access outside the vault is not allowed.",
    );
  });

  it("throws on deeply nested traversal", () => {
    expect(() => resolveVaultPath("../../etc/passwd")).toThrow(
      "Access outside the vault is not allowed.",
    );
  });

  it("converts backslashes before resolving", () => {
    const resolved = resolveVaultPath("folder\\note.md");
    expect(resolved).toBe(path.join(VAULT_ROOT, "folder", "note.md"));
  });
});

describe("toRelativeVaultPath", () => {
  it("converts an absolute vault path to a relative path", () => {
    const fullPath = path.join(VAULT_ROOT, "notes", "test.md");
    expect(toRelativeVaultPath(fullPath)).toBe("notes/test.md");
  });

  it("returns just the filename for a root-level note", () => {
    const fullPath = path.join(VAULT_ROOT, "test.md");
    expect(toRelativeVaultPath(fullPath)).toBe("test.md");
  });

  it("uses forward slashes on all platforms", () => {
    const fullPath = path.join(VAULT_ROOT, "a", "b", "c.md");
    expect(toRelativeVaultPath(fullPath)).not.toContain("\\");
  });
});
