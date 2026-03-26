# patchwork-ai

CLI tool that analyzes GitHub issues, generates fixes, and opens pull requests automatically. Point it at an issue URL and it handles the rest — cloning, branching, fixing, testing, and PR creation.

## Install

```bash
npx patchwork-ai --help
```

Or install globally:

```bash
npm install -g patchwork-ai
```

## Setup

### 1. Configure your AI provider

```bash
patchwork-ai config set api-key <your-api-key>
patchwork-ai config set provider anthropic   # or openai
patchwork-ai config set model claude-sonnet-4-6
```

### 2. Set your GitHub token

```bash
export GITHUB_TOKEN=ghp_xxxxx
```

The token needs `repo` and `workflow` scopes for forking repos and creating PRs.

## Usage

### Fix an issue

Analyze the issue, generate a fix, run quality checks, and create a PR:

```bash
patchwork-ai fix https://github.com/owner/repo/issues/42
```

Override the AI model:

```bash
patchwork-ai fix https://github.com/owner/repo/issues/42 --model claude-sonnet-4-6
```

### Analyze only (dry run)

Check whether an issue is suitable for auto-fixing without making changes:

```bash
patchwork-ai analyze https://github.com/owner/repo/issues/42
```

### Discover issues

Find issues tagged "good first issue", "help wanted", or "bug" in a repo:

```bash
patchwork-ai discover https://github.com/owner/repo
patchwork-ai discover https://github.com/owner/repo --limit 20
```

### Manage config

```bash
patchwork-ai config set api-key sk-xxxxx
patchwork-ai config get
```

Config is stored at `~/.patchwork-ai/config.yaml`.

## Quality Gate

Every fix goes through automated quality checks before a PR is created:

- **AI artifact detection** — strips any AI markers or co-authored-by lines
- **Scope check** — rejects changes touching more than 10 files
- **Necessity review** — AI verifies the fix is minimal and focused
- **Readability review** — checks code quality and style
- **Side effect analysis** — flags potential regressions
- **Test execution** — runs the repo's test suite

If any check fails, the pipeline stops and no PR is created.

## Supported Providers

| Provider | Status | Default Model |
|----------|--------|---------------|
| Anthropic | Recommended | claude-sonnet-4-6 |
| OpenAI | Supported | gpt-4o |

## How It Works

1. **Analyze** — Fetches the issue, checks for existing PRs and claims, asks AI to assess difficulty
2. **Repo setup** — Forks the repo, clones it, creates a feature branch
3. **Codebase analysis** — Maps the file tree, identifies relevant files and conventions
4. **Fix generation** — AI produces minimal code changes following the repo's style
5. **Quality gate** — Automated checks ensure the fix is clean and focused
6. **Test** — Runs the project's test suite
7. **PR creation** — Pushes the branch and opens a pull request referencing the issue

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
