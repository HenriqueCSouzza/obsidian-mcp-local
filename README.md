# Obsidian MCP Local

MCP local em **Node.js + TypeScript** para expor seu **vault do Obsidian** ao **VS Code + GitHub Copilot**.

Ele foi pensado para uso local via **stdio**, com foco em ler e escrever notas Markdown dentro do seu vault.

## Install

npm install -g obsidian-mcp-local

## Features

### Tools disponíveis

- `search_notes(query)`
  - busca por texto no path, frontmatter e conteúdo das notas
  - retorna resultados ranqueados com pequeno excerpt

- `get_note(path)`
  - abre uma nota do vault
  - retorna `path`, `frontmatter` e `content`

- `create_note(path, content, overwrite?)`
  - cria uma nota nova
  - opcionalmente sobrescreve uma nota existente

- `append_to_note(path, content)`
  - adiciona conteúdo no final de uma nota existente

- `find_by_tag(tag)`
  - encontra notas por tag
  - suporta `tags` no frontmatter e tags inline no conteúdo

## Regras implementadas

- só acessa arquivos **dentro do vault configurado**
- ignora diretórios como:
  - `.obsidian`
  - `.git`
  - `node_modules`
- trabalha apenas com arquivos `.md`
- normaliza paths para evitar acesso fora do diretório base

## Estrutura do projeto

```txt
obsidian-mcp-local/
  package.json
  tsconfig.json
  README.md
  .vscode/
    mcp.example.json
  src/
    index.ts
```

## Pré-requisitos

- Node.js 20+
- npm
- VS Code com GitHub Copilot
- um vault do Obsidian local

## Instalação

No diretório do projeto:

```bash
npm install
npm run build
```

Para desenvolvimento:

```bash
npm run dev
```

Para rodar a versão compilada:

```bash
npm start
```

## Como usar no VS Code

### 1. Compile o projeto

```bash
npm install
npm run build
```

### 2. Ajuste o arquivo MCP do VS Code

Copie o conteúdo de `.vscode/mcp.example.json` para o seu `.vscode/mcp.json` no workspace onde você vai usar o Copilot.

Exemplo:
utilizando localmente:

```json
{
  "servers": {
    "obsidian-local-vault": {
      "type": "stdio",
      "command": "node",
      "args": ["C:/caminho/para/obsidian-mcp-local/dist/index.js"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "D:/Obsidian/Vault"
      }
    }
  }
}
```

utilizando via npx (sem necessidade de build local):

```json
{
  "servers": {
    "obsidian-local-vault": {
      "command": "npx",
      "args": ["-y", "obsidian-mcp-local"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "D:/Obsidian/Vault"
      }
    }
  }
}
```

### 3. Atualize os caminhos

Substitua:

- `C:/caminho/para/obsidian-mcp-local/dist/index.js`
- `D:/Obsidian/Vault`

pelos caminhos reais da sua máquina.

### 4. Reinicie/recarrregue o VS Code

Depois disso, o Copilot deve descobrir o servidor MCP.

## Exemplos de uso no Copilot Chat

- “Procure no meu vault notas sobre .NET”
- “Abra a nota `knowledge/backend/dotnet.md`”
- “Crie uma nota em `inbox/ideias-mcp.md` com um resumo do que discutimos”
- “Adicione no final da nota `daily/2026-04-06.md` o texto `- testar MCP local`”
- “Encontre notas com a tag `#arquitetura`”

## Possíveis melhorias futuras

- `append_under_heading`
- parsing de `[[wikilinks]]`
- `get_backlinks(note)`
- índice em SQLite para busca rápida
- whitelist de pastas para escrita (`inbox/`, `daily/`, `scratch/`)
- bloqueio configurável de escrita em determinadas pastas

## Observações importantes

- Este projeto **não depende do Obsidian aberto**.
- Ele opera diretamente sobre os arquivos do vault.
- Se você habilitar escrita tanto no Obsidian quanto no VS Code, o controle de concorrência fica por sua conta.
- O projeto hoje assume que o vault é uma pasta Markdown local.

## Arquivo principal

A implementação está em:

- `src/index.ts`

## Licença

Uso pessoal / base inicial para customização.
