import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { pathExists, walkMarkdownFiles } from "../../src/vault/fs-utils.js";

const TEMP_DIR = "/tmp/obsidian-test-fs-utils";

beforeEach(async () => {
  await fs.mkdir(TEMP_DIR, { recursive: true });
});

afterEach(async () => {
  await fs.rm(TEMP_DIR, { recursive: true, force: true });
});

describe("pathExists", () => {
  it("returns true for an existing file", async () => {
    const filePath = path.join(TEMP_DIR, "test.md");
    await fs.writeFile(filePath, "hello");
    expect(await pathExists(filePath)).toBe(true);
  });

  it("returns true for an existing directory", async () => {
    expect(await pathExists(TEMP_DIR)).toBe(true);
  });

  it("returns false for a non-existing file", async () => {
    expect(await pathExists(path.join(TEMP_DIR, "ghost.md"))).toBe(false);
  });
});

describe("walkMarkdownFiles", () => {
  it("finds a markdown file at the root of the directory", async () => {
    await fs.writeFile(path.join(TEMP_DIR, "note.md"), "");
    const files = await walkMarkdownFiles(TEMP_DIR);
    expect(files).toHaveLength(1);
    expect(files[0]).toContain("note.md");
  });

  it("finds markdown files recursively in subdirectories", async () => {
    const sub = path.join(TEMP_DIR, "subdir");
    await fs.mkdir(sub, { recursive: true });
    await fs.writeFile(path.join(TEMP_DIR, "root.md"), "");
    await fs.writeFile(path.join(sub, "nested.md"), "");

    const files = await walkMarkdownFiles(TEMP_DIR);
    expect(files).toHaveLength(2);
    expect(files.some((f) => f.endsWith("root.md"))).toBe(true);
    expect(files.some((f) => f.endsWith("nested.md"))).toBe(true);
  });

  it("ignores non-markdown files", async () => {
    await fs.writeFile(path.join(TEMP_DIR, "note.md"), "");
    await fs.writeFile(path.join(TEMP_DIR, "image.png"), "");
    await fs.writeFile(path.join(TEMP_DIR, "data.json"), "");

    const files = await walkMarkdownFiles(TEMP_DIR);
    expect(files).toHaveLength(1);
    expect(files[0]).toContain("note.md");
  });

  it("ignores the .obsidian directory", async () => {
    const obsidianDir = path.join(TEMP_DIR, ".obsidian");
    await fs.mkdir(obsidianDir, { recursive: true });
    await fs.writeFile(path.join(obsidianDir, "config.md"), "");
    await fs.writeFile(path.join(TEMP_DIR, "note.md"), "");

    const files = await walkMarkdownFiles(TEMP_DIR);
    expect(files).toHaveLength(1);
    expect(files[0]).toContain("note.md");
  });

  it("ignores the .git directory", async () => {
    const gitDir = path.join(TEMP_DIR, ".git");
    await fs.mkdir(gitDir, { recursive: true });
    await fs.writeFile(path.join(gitDir, "COMMIT_EDITMSG.md"), "");
    await fs.writeFile(path.join(TEMP_DIR, "note.md"), "");

    const files = await walkMarkdownFiles(TEMP_DIR);
    expect(files).toHaveLength(1);
  });

  it("ignores the node_modules directory", async () => {
    const nmDir = path.join(TEMP_DIR, "node_modules");
    await fs.mkdir(nmDir, { recursive: true });
    await fs.writeFile(path.join(nmDir, "readme.md"), "");
    await fs.writeFile(path.join(TEMP_DIR, "note.md"), "");

    const files = await walkMarkdownFiles(TEMP_DIR);
    expect(files).toHaveLength(1);
  });

  it("returns an empty array when no markdown files exist", async () => {
    const files = await walkMarkdownFiles(TEMP_DIR);
    expect(files).toHaveLength(0);
  });
});
