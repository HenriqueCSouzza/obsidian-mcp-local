# RFC-0001 — obsidian-mcp-local

| Campo       | Valor      |
| ----------- | ---------- |
| **Status**  | Accepted   |
| **Versão**  | 1.0.0      |
| **Data**    | 2026-04-06 |
| **Autores** | henrique   |

---

## 1. Sumário

Este documento especifica o design, as regras de negócio e os contratos das ferramentas (tools) do servidor MCP `obsidian-local-vault`. O servidor expõe operações de leitura e escrita sobre um vault Obsidian local via protocolo MCP (Model Context Protocol), consumido por agentes de IA como GitHub Copilot.

---

## 2. Motivação

Agentes de IA precisam acessar e editar notas de um vault Obsidian de forma segura e estruturada. Uma API ad-hoc sem contrato explícito levaria a comportamentos inconsistentes e riscos de segurança (leitura/escrita fora do vault). Este RFC define o contrato estável do servidor.

---

## 3. Arquitetura

```
src/
  index.ts          ← entry point: instancia o transport e conecta o servidor
  server.ts         ← factory: cria o McpServer e registra todas as tools
  tools/
    search-notes.ts
    get-note.ts
    create-note.ts
    append-to-note.ts
    find-by-tag.ts
  vault/
    path-utils.ts   ← VAULT_ROOT, helpers de path e segurança
    fs-utils.ts     ← pathExists, walkMarkdownFiles
    notes.ts        ← lógica de negócio (read / search / create / append / tag)
```

### 3.1 Camadas

| Camada                | Responsabilidade                                                                 |
| --------------------- | -------------------------------------------------------------------------------- |
| `tools/`              | Adaptadores MCP: receber input validado pelo Zod e delegar para `vault/notes.ts` |
| `vault/notes.ts`      | Lógica de negócio pura (sem conhecimento do MCP)                                 |
| `vault/path-utils.ts` | Segurança de path: resolve e valida que o alvo está dentro do vault              |
| `vault/fs-utils.ts`   | Operações de sistema de arquivos reutilizáveis                                   |

---

## 4. Configuração

### 4.1 Variável de ambiente

| Variável              | Obrigatória | Descrição                                      |
| --------------------- | ----------- | ---------------------------------------------- |
| `OBSIDIAN_VAULT_PATH` | Sim         | Caminho absoluto para a raiz do vault Obsidian |

O servidor falha na inicialização (`throw`) se a variável estiver ausente.

### 4.2 Carregamento

A variável é carregada via `--env-file=.env` (flag nativa do Node 20+), configurado no script `start` do `package.json`. Não há dependência de `dotenv`.

---

## 5. Regras de Segurança de Path

Todas as operações de arquivo passam obrigatoriamente por `resolveVaultPath()` antes de qualquer I/O.

**Algoritmo de validação:**

1. Normalizar separadores: substituir `\` por `/`.
2. Remover barras iniciais para evitar paths absolutos disfarçados.
3. Resolver o path completo com `path.resolve(VAULT_ROOT, relativePath)`.
4. Verificar que o resultado é igual a `VAULT_ROOT` **ou** começa com `VAULT_ROOT + path.sep`.
5. Se falhar: lançar `Error("Access outside the vault is not allowed.")`.

**Garantia:** nenhuma operação pode escapar do diretório configurado, prevenindo path traversal.

---

## 6. Enumeração de Arquivos

`walkMarkdownFiles(dir)` percorre o vault recursivamente com as seguintes regras:

- Inclui apenas arquivos com extensão `.md` (case-insensitive).
- Ignora os diretórios: `.obsidian`, `.git`, `node_modules`.
- Retorna caminhos absolutos.

---

## 7. Tools Expostas

Todas as tools seguem o contrato MCP (`registerTool`). O input é validado por Zod antes de chegar à lógica de negócio.

### 7.1 `search_notes`

**Descrição:** busca textual full-scan no vault.

**Input:**

| Campo   | Tipo   | Restrição |
| ------- | ------ | --------- |
| `query` | string | `min(1)`  |

**Algoritmo de pontuação:**

| Condição                                       | Pontos adicionados |
| ---------------------------------------------- | ------------------ |
| Query encontrada em qualquer lugar no haystack | +1 (base)          |
| Query no caminho relativo da nota              | +4                 |
| Query no frontmatter (serializado como JSON)   | +2                 |
| Query no corpo da nota                         | +1                 |

**Comportamento:**

- Busca case-insensitive.
- Haystack = `path + frontmatter + content`.
- Retorna no máximo **20** resultados, ordenados por score decrescente e path crescente como desempate.
- Retorna um excerpt de até 340 caracteres centrado na primeira ocorrência no conteúdo (120 chars antes + 220 chars depois).
- Query vazia retorna `[]` sem varrer o vault.

**Output:** `Array<{ path: string; score: number; excerpt: string }>`.

---

### 7.2 `get_note`

**Descrição:** lê uma nota e retorna frontmatter + conteúdo separados.

**Input:**

| Campo  | Tipo   | Restrição |
| ------ | ------ | --------- |
| `path` | string | `min(1)`  |

**Regras:**

- A extensão `.md` é adicionada automaticamente se ausente.
- Lança erro se a nota não existir.

**Output:** `{ path: string; frontmatter: object; content: string }`.

---

### 7.3 `create_note`

**Descrição:** cria uma nova nota. Pode criar diretórios intermediários.

**Input:**

| Campo       | Tipo    | Restrição | Default |
| ----------- | ------- | --------- | ------- |
| `path`      | string  | `min(1)`  | —       |
| `content`   | string  | —         | `""`    |
| `overwrite` | boolean | opcional  | `false` |

**Regras:**

- A extensão `.md` é adicionada automaticamente se ausente.
- Diretórios intermediários são criados automaticamente (`mkdir -p`).
- Se a nota já existir e `overwrite = false`: lança `Error("Note already exists: <path>")`.
- Se `overwrite = true`: sobrescreve sem erro.

**Output:** `{ path: string; created: boolean; overwritten: boolean }`.

---

### 7.4 `append_to_note`

**Descrição:** adiciona conteúdo ao final de uma nota existente.

**Input:**

| Campo     | Tipo   | Restrição |
| --------- | ------ | --------- |
| `path`    | string | `min(1)`  |
| `content` | string | `min(1)`  |

**Regras:**

- A extensão `.md` é adicionada automaticamente se ausente.
- Lança erro se a nota não existir.
- Se o conteúdo não começar com `\n`, uma quebra de linha é inserida antes automaticamente para separar do conteúdo existente.

**Output:** `{ path: string; appended: true }`.

---

### 7.5 `find_by_tag`

**Descrição:** encontra todas as notas que possuem uma tag específica.

**Input:**

| Campo | Tipo   | Restrição |
| ----- | ------ | --------- |
| `tag` | string | `min(1)`  |

**Regras:**

- O prefixo `#` é removido da tag antes da comparação (ex: `#projeto` → `projeto`).
- A comparação é case-insensitive.
- São verificadas duas origens de tags:
  1. **Frontmatter:** campo `tags` do YAML (deve ser um array). Cada item é normalizado (remoção de `#`).
  2. **Conteúdo inline:** regex `/(^|\s)#([a-zA-Z0-9/_-]+)/g` aplicada ao corpo da nota.
- Tag vazia retorna `[]` sem varrer o vault.

**Output:** `Array<{ path: string; matchedIn: ("frontmatter.tags" | "content")[] }>`, ordenado por path crescente.

---

## 8. Convenções de Extensão

- Toda função que recebe um `relativePath` deve chamá-la de `relativePath` internamente e passar por `ensureMdExtension` e `resolveVaultPath` antes de qualquer I/O.
- Novas tools devem:
  1. Criar um arquivo em `src/tools/<nome>.ts` exportando `register(server: McpServer): void`.
  2. Registrar a tool com `server.registerTool()` (não `server.tool()`, que está deprecated).
  3. Importar e chamar `register` em `src/server.ts`.
  4. Implementar a lógica de negócio em `src/vault/notes.ts`.

---

## 9. Decisões de Design

| Decisão                                    | Alternativa considerada                    | Motivo da escolha                                                                       |
| ------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `--env-file` nativo do Node 20+            | `dotenv` como dependência                  | Zero dependências adicionais                                                            |
| `gray-matter` para parsing de frontmatter  | Parser manual                              | Biblioteca madura e amplamente usada no ecossistema Obsidian/MDX                        |
| Score numérico na busca                    | Busca por relevância semântica (embedding) | Simplicidade e zero latência de rede; busca semântica pode ser adicionada em RFC futuro |
| Máximo de 20 resultados no `search_notes`  | Sem limite                                 | Evita payloads excessivos no contexto do agente                                         |
| Separar `path-utils`, `fs-utils` e `notes` | Tudo em um módulo único                    | Testabilidade e separação de preocupações                                               |

---

## 10. Não está no escopo (v1.0)

- Busca semântica / embeddings
- Renomear ou mover notas
- Deletar notas
- Listar diretórios ou estrutura do vault
- Suporte a formatos não-Markdown (canvas, CSV, etc.)
- Autenticação ou multi-vault

Esses itens podem ser endereçados em RFCs subsequentes.
