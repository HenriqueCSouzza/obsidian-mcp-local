import path from "node:path";

const vaultPath = process.env.OBSIDIAN_VAULT_PATH;

if (!vaultPath) {
  throw new Error("Environment variable OBSIDIAN_VAULT_PATH is required.");
}

export const VAULT_ROOT = path.resolve(vaultPath);

export function normalizeSlashes(input: string): string {
  return input.replace(/\\/g, "/");
}

export function isMarkdownFile(filePath: string): boolean {
  return filePath.toLowerCase().endsWith(".md");
}

export function ensureMdExtension(filePath: string): string {
  return isMarkdownFile(filePath) ? filePath : `${filePath}.md`;
}

export function resolveVaultPath(relativePath: string): string {
  const safeRelativePath = normalizeSlashes(relativePath).replace(/^\/+/, "");
  const fullPath = path.resolve(VAULT_ROOT, safeRelativePath);

  const rootWithSep = VAULT_ROOT.endsWith(path.sep)
    ? VAULT_ROOT
    : `${VAULT_ROOT}${path.sep}`;
  const isInsideVault =
    fullPath === VAULT_ROOT || fullPath.startsWith(rootWithSep);

  if (!isInsideVault) {
    throw new Error("Access outside the vault is not allowed.");
  }

  return fullPath;
}

export function toRelativeVaultPath(fullPath: string): string {
  return normalizeSlashes(path.relative(VAULT_ROOT, fullPath));
}
