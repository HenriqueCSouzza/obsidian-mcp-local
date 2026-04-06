import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import {
  VAULT_ROOT,
  ensureMdExtension,
  resolveVaultPath,
  toRelativeVaultPath,
} from "./path-utils.js";
import { pathExists, walkMarkdownFiles } from "./fs-utils.js";

export async function readNote(relativePath: string) {
  const finalPath = ensureMdExtension(relativePath);
  const fullPath = resolveVaultPath(finalPath);

  if (!(await pathExists(fullPath))) {
    throw new Error(`Note not found: ${finalPath}`);
  }

  const raw = await fs.readFile(fullPath, "utf-8");
  const parsed = matter(raw);

  return {
    path: finalPath,
    frontmatter: parsed.data,
    content: parsed.content,
  };
}

export async function searchNotes(query: string) {
  const q = query.trim().toLowerCase();

  if (!q) return [];

  const files = await walkMarkdownFiles(VAULT_ROOT);
  const matches: Array<{ path: string; score: number; excerpt: string }> = [];

  for (const fullPath of files) {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = matter(raw);
    const relativePath = toRelativeVaultPath(fullPath);

    const haystack =
      `${relativePath}\n${JSON.stringify(parsed.data)}\n${parsed.content}`.toLowerCase();
    const idx = haystack.indexOf(q);

    if (idx >= 0) {
      const contentLower = parsed.content.toLowerCase();
      const contentIdx = contentLower.indexOf(q);
      const excerpt =
        contentIdx >= 0
          ? parsed.content
              .slice(
                Math.max(0, contentIdx - 120),
                Math.min(parsed.content.length, contentIdx + 220),
              )
              .trim()
          : "";

      let score = 1;
      if (relativePath.toLowerCase().includes(q)) score += 4;
      if (JSON.stringify(parsed.data).toLowerCase().includes(q)) score += 2;
      if (contentIdx >= 0) score += 1;

      matches.push({ path: relativePath, score, excerpt });
    }
  }

  return matches
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, 20);
}

export async function findByTag(tag: string) {
  const normalizedTag = tag.replace(/^#/, "").trim().toLowerCase();

  if (!normalizedTag) return [];

  const files = await walkMarkdownFiles(VAULT_ROOT);
  const results: Array<{ path: string; matchedIn: string[] }> = [];

  for (const fullPath of files) {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = matter(raw);
    const relativePath = toRelativeVaultPath(fullPath);

    const matchedIn: string[] = [];

    const fmTags = parsed.data?.tags;
    if (Array.isArray(fmTags)) {
      const found = fmTags.some(
        (t) => String(t).replace(/^#/, "").toLowerCase() === normalizedTag,
      );
      if (found) matchedIn.push("frontmatter.tags");
    }

    const inlineTagRegex = /(^|\s)#([a-zA-Z0-9/_-]+)/g;
    for (const match of parsed.content.matchAll(inlineTagRegex)) {
      const foundTag = match[2]?.toLowerCase();
      if (foundTag === normalizedTag) {
        matchedIn.push("content");
        break;
      }
    }

    if (matchedIn.length > 0) {
      results.push({ path: relativePath, matchedIn });
    }
  }

  return results.sort((a, b) => a.path.localeCompare(b.path));
}

export async function createNote(
  relativePath: string,
  content: string,
  overwrite = false,
) {
  const finalPath = ensureMdExtension(relativePath);
  const fullPath = resolveVaultPath(finalPath);

  await fs.mkdir(path.dirname(fullPath), { recursive: true });

  const exists = await pathExists(fullPath);
  if (exists && !overwrite) {
    throw new Error(`Note already exists: ${finalPath}`);
  }

  await fs.writeFile(fullPath, content, "utf-8");

  return {
    path: finalPath,
    created: !exists,
    overwritten: exists && overwrite,
  };
}

export async function appendToNote(relativePath: string, content: string) {
  const finalPath = ensureMdExtension(relativePath);
  const fullPath = resolveVaultPath(finalPath);

  if (!(await pathExists(fullPath))) {
    throw new Error(`Note not found: ${finalPath}`);
  }

  const prefix = content.startsWith("\n") ? "" : "\n";
  await fs.appendFile(fullPath, `${prefix}${content}`, "utf-8");

  return {
    path: finalPath,
    appended: true,
  };
}
