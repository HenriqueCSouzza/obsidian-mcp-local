import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import {
  readNote,
  createNote,
  appendToNote,
  searchNotes,
  findByTag,
} from "../../src/vault/notes.js";
import { VAULT_ROOT } from "../../src/vault/path-utils.js";

// Use the VAULT_ROOT set by the setup file (/tmp/test-vault)
const VAULT = VAULT_ROOT;

// Unique prefix for each test file to avoid cross-test collisions
let noteCounter = 0;
function uniqueName() {
  return `__test_note_${Date.now()}_${++noteCounter}`;
}

beforeEach(async () => {
  await fs.mkdir(VAULT, { recursive: true });
});

afterEach(async () => {
  // Clean up only files created by tests (prefixed with __test_note_)
  let entries: string[] = [];
  try {
    entries = await fs.readdir(VAULT);
  } catch {
    // vault may not exist — nothing to clean
  }
  for (const entry of entries) {
    if (entry.startsWith("__test_note_") || entry.startsWith("__test_dir_")) {
      await fs.rm(path.join(VAULT, entry), { recursive: true, force: true });
    }
  }
});

// ---------------------------------------------------------------------------
// readNote
// ---------------------------------------------------------------------------

describe("readNote", () => {
  it("reads a note and returns its content", async () => {
    const name = uniqueName();
    await fs.writeFile(path.join(VAULT, `${name}.md`), "Hello world");

    const result = await readNote(`${name}.md`);
    expect(result.path).toBe(`${name}.md`);
    expect(result.content.trim()).toBe("Hello world");
    expect(result.frontmatter).toEqual({});
  });

  it("parses frontmatter correctly", async () => {
    const name = uniqueName();
    const raw = `---\ntitle: My Note\ntags: [test]\n---\nBody text`;
    await fs.writeFile(path.join(VAULT, `${name}.md`), raw);

    const result = await readNote(`${name}.md`);
    expect(result.frontmatter.title).toBe("My Note");
    expect(result.frontmatter.tags).toEqual(["test"]);
    expect(result.content.trim()).toBe("Body text");
  });

  it("auto-adds .md extension when missing", async () => {
    const name = uniqueName();
    await fs.writeFile(path.join(VAULT, `${name}.md`), "content");

    const result = await readNote(name); // no .md
    expect(result.path).toBe(`${name}.md`);
  });

  it("throws when the note does not exist", async () => {
    await expect(readNote("nonexistent_note_xyz.md")).rejects.toThrow(
      "Note not found",
    );
  });

  it("throws on path traversal attempts", async () => {
    await expect(readNote("../outside.md")).rejects.toThrow(
      "Access outside the vault is not allowed.",
    );
  });
});

// ---------------------------------------------------------------------------
// createNote
// ---------------------------------------------------------------------------

describe("createNote", () => {
  it("creates a new note with the given content", async () => {
    const name = uniqueName();
    const result = await createNote(`${name}.md`, "New content");

    expect(result.path).toBe(`${name}.md`);
    expect(result.created).toBe(true);
    expect(result.overwritten).toBe(false);

    const written = await fs.readFile(path.join(VAULT, `${name}.md`), "utf-8");
    expect(written).toBe("New content");
  });

  it("auto-adds .md extension when missing", async () => {
    const name = uniqueName();
    const result = await createNote(name, "content");
    expect(result.path).toBe(`${name}.md`);
  });

  it("throws when note already exists and overwrite is false", async () => {
    const name = uniqueName();
    await fs.writeFile(path.join(VAULT, `${name}.md`), "original");

    await expect(createNote(`${name}.md`, "new")).rejects.toThrow(
      "Note already exists",
    );
  });

  it("overwrites an existing note when overwrite is true", async () => {
    const name = uniqueName();
    await fs.writeFile(path.join(VAULT, `${name}.md`), "original");

    const result = await createNote(`${name}.md`, "replaced", true);
    expect(result.created).toBe(false);
    expect(result.overwritten).toBe(true);

    const written = await fs.readFile(path.join(VAULT, `${name}.md`), "utf-8");
    expect(written).toBe("replaced");
  });

  it("creates intermediate directories as needed", async () => {
    const dirName = `__test_dir_${Date.now()}`;
    const result = await createNote(`${dirName}/sub/note.md`, "deep");
    expect(result.created).toBe(true);

    const written = await fs.readFile(
      path.join(VAULT, dirName, "sub", "note.md"),
      "utf-8",
    );
    expect(written).toBe("deep");
  });
});

// ---------------------------------------------------------------------------
// appendToNote
// ---------------------------------------------------------------------------

describe("appendToNote", () => {
  it("appends content to an existing note", async () => {
    const name = uniqueName();
    await fs.writeFile(path.join(VAULT, `${name}.md`), "original");

    const result = await appendToNote(`${name}.md`, "\nappended line");
    expect(result.appended).toBe(true);

    const written = await fs.readFile(path.join(VAULT, `${name}.md`), "utf-8");
    expect(written).toBe("original\nappended line");
  });

  it("prepends a newline when content does not start with one", async () => {
    const name = uniqueName();
    await fs.writeFile(path.join(VAULT, `${name}.md`), "first line");

    await appendToNote(`${name}.md`, "second line");

    const written = await fs.readFile(path.join(VAULT, `${name}.md`), "utf-8");
    expect(written).toBe("first line\nsecond line");
  });

  it("throws when the note does not exist", async () => {
    await expect(appendToNote("ghost_note_xyz.md", "text")).rejects.toThrow(
      "Note not found",
    );
  });
});

// ---------------------------------------------------------------------------
// searchNotes
// ---------------------------------------------------------------------------

describe("searchNotes", () => {
  it("returns empty array for an empty query", async () => {
    const results = await searchNotes("  ");
    expect(results).toHaveLength(0);
  });

  it("finds a note by its content", async () => {
    const name = uniqueName();
    await fs.writeFile(
      path.join(VAULT, `${name}.md`),
      "This note contains uniquexyz123 keyword",
    );

    const results = await searchNotes("uniquexyz123");
    expect(results.some((r) => r.path.includes(name))).toBe(true);
  });

  it("returns results sorted by score (path match scores higher)", async () => {
    const keyword = `srchkw${Date.now()}`;
    const nameInPath = `${keyword}_${uniqueName()}`;
    const nameInContent = uniqueName();

    await fs.writeFile(path.join(VAULT, `${nameInPath}.md`), "generic body");
    await fs.writeFile(
      path.join(VAULT, `${nameInContent}.md`),
      `body contains ${keyword}`,
    );

    const results = await searchNotes(keyword);
    expect(results.length).toBeGreaterThanOrEqual(2);
    // The note whose path contains the keyword should rank first
    expect(results[0].path).toContain(keyword);
  });

  it("returns an excerpt for content matches", async () => {
    const name = uniqueName();
    await fs.writeFile(
      path.join(VAULT, `${name}.md`),
      "Some preamble. Target term excerptkw. Some suffix.",
    );

    const results = await searchNotes("excerptkw");
    const match = results.find((r) => r.path.includes(name));
    expect(match).toBeDefined();
    expect(match!.excerpt).toContain("excerptkw");
  });
});

// ---------------------------------------------------------------------------
// findByTag
// ---------------------------------------------------------------------------

describe("findByTag", () => {
  it("returns empty array for an empty tag", async () => {
    const results = await findByTag("  ");
    expect(results).toHaveLength(0);
  });

  it("finds a note by frontmatter tag", async () => {
    const name = uniqueName();
    const raw = `---\ntags: [mytag${Date.now()}]\n---\nbody`;
    const tag = raw.match(/mytag\d+/)![0];
    await fs.writeFile(path.join(VAULT, `${name}.md`), raw);

    const results = await findByTag(tag);
    expect(results.some((r) => r.path.includes(name))).toBe(true);
    expect(
      results.find((r) => r.path.includes(name))!.matchedIn,
    ).toContain("frontmatter.tags");
  });

  it("finds a note by inline tag in content", async () => {
    const tag = `inlinetag${Date.now()}`;
    const name = uniqueName();
    await fs.writeFile(
      path.join(VAULT, `${name}.md`),
      `Some text #${tag} more text`,
    );

    const results = await findByTag(tag);
    expect(results.some((r) => r.path.includes(name))).toBe(true);
    expect(
      results.find((r) => r.path.includes(name))!.matchedIn,
    ).toContain("content");
  });

  it("strips leading # from the search tag", async () => {
    const tag = `hashtag${Date.now()}`;
    const name = uniqueName();
    await fs.writeFile(
      path.join(VAULT, `${name}.md`),
      `Some text #${tag} more`,
    );

    const results = await findByTag(`#${tag}`);
    expect(results.some((r) => r.path.includes(name))).toBe(true);
  });

  it("returns results sorted alphabetically by path", async () => {
    const tag = `sorttag${Date.now()}`;
    const nameA = `__test_note_aaa_${Date.now()}`;
    const nameB = `__test_note_zzz_${Date.now()}`;
    await fs.writeFile(path.join(VAULT, `${nameB}.md`), `#${tag}`);
    await fs.writeFile(path.join(VAULT, `${nameA}.md`), `#${tag}`);

    const results = await findByTag(tag);
    const paths = results.map((r) => r.path);
    expect(paths.indexOf(`${nameA}.md`)).toBeLessThan(
      paths.indexOf(`${nameB}.md`),
    );
  });
});
