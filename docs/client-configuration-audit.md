# Codex / Claude Code Configuration Audit

Reviewed: 2026-10-27 (Asia/Shanghai).

Scope: the ModelSwitch one-click client, its generated configuration, and the
gateway contract. This is a documentation and source review, not proof that a
particular customer machine or upstream model works. No client release or paid
inference request was performed during this review.

## Official Sources

The following primary sources were fetched or opened during this review:

1. [Codex configuration basics](https://learn.chatgpt.com/docs/config-file/config-basic)
2. [Codex advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced)
3. [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
4. [Codex authentication](https://learn.chatgpt.com/docs/auth)
5. [Codex gateway configuration](https://learn.chatgpt.com/docs/enterprise/connect-to-a-gateway)
6. [Codex gateway compatibility](https://learn.chatgpt.com/docs/enterprise/gateway-compatibility)
7. [Codex CLI reference](https://learn.chatgpt.com/docs/cli/reference)
8. [Claude Code settings precedence](https://code.claude.com/docs/en/settings)
9. [Claude Code installation and updates](https://code.claude.com/docs/en/setup)
10. [Claude Code authentication](https://code.claude.com/docs/en/authentication)
11. [Claude Code gateway configuration](https://code.claude.com/docs/en/llm-gateway-connect)
12. [Claude Code gateway compatibility](https://code.claude.com/docs/en/llm-gateway-protocol)
13. [Claude Code model configuration](https://code.claude.com/docs/en/model-config)
14. [Claude Code environment variables](https://code.claude.com/docs/en/env-vars)
15. [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference)
16. [Claude Code installation/login troubleshooting](https://code.claude.com/docs/en/troubleshoot-install)
17. [Claude Code runtime troubleshooting](https://code.claude.com/docs/en/troubleshooting)
18. [Claude Code changelog](https://code.claude.com/docs/en/changelog)

The large Claude changelog was retrieved through its official `.md` endpoint
after the browser fetch failed. Its first release entry was 2.1.310, dated
2026-10-23. The entry describes gateway retries for rejected effort beta headers
and mid-conversation system messages. This establishes that release's behavior;
it does not establish what is installed on customer machines.

[Codex changelog](https://learn.chatgpt.com/docs/changelog) search results showed
0.164.0 dated 2026-10-23. Direct retrieval failed (size limit / HTTP 403); do not
treat the search result as a fully verified latest-version baseline. Verify the
release page and installed `codex --version` before choosing an upgrade target.

## Confirmed Configuration Rules

### Codex

- Provider routing belongs in user-level configuration, not a project-local
  `.codex/config.toml`. Respect `CODEX_HOME`, selected profiles, and managed policy.
- Use a unique custom provider ID and `wire_api = "responses"`. A successful
  `/models` or Chat Completions request does not validate Codex compatibility.
- Test incremental SSE delivery through `response.completed`, multi-turn replay,
  and a function-call / function-result / final-answer loop. Test WebSocket
  continuation separately when enabled.
- Official gateway examples use provider-scoped `env_key` or a credential helper.
  Desktop applications must actually receive that credential; shell-only exports
  are not a reliable desktop credential delivery mechanism.
- `requires_openai_auth = true` uses OpenAI authentication and ignores `env_key`.
  It is supported, but is not interchangeable with isolated provider credentials.
- Custom model aliases need matching catalog metadata. Check actual upstream
  context, reasoning and tools; changing catalog declarations adds no capability.
- Use `/status` and `/debug-config`, plus gateway records, to validate the route.
  A model describing itself is not route evidence.

### Claude Code

- For an Anthropic-format gateway, use its base URL plus a bearer credential in
  `ANTHROPIC_AUTH_TOKEN`, or an x-api-key credential in `ANTHROPIC_API_KEY`.
  Avoid conflicting credential sources. User settings can supply an `env` block.
- A gateway credential can take precedence over a saved claude.ai login. Do not
  send users through account login or delete their credentials as a generic fix.
- Settings sources and managed restrictions affect the final configuration.
  `--settings` overrides supplied keys for a session; it is not a clean-room mode.
- CLI, VS Code and Desktop need separate verification. The VS Code extension has
  its own environment configuration; Desktop's third-party inference routing is
  not supplied by `ANTHROPIC_BASE_URL` in the CLI settings file.
- Preserve Messages streaming, tool blocks and results, thinking/signatures,
  caching markers, and version/beta headers according to the compatibility guide.
  Token counting is optional; absence alone is not proof of a broken gateway.
- Native installations update in the background; Homebrew and WinGet have their
  own update behavior. Record installation origin before selecting an update path.
- `ANTHROPIC_MODEL` forces the launch model; newer versions also support
  `ANTHROPIC_DEFAULT_MODEL` as a weaker default. Do not swap these blindly when
  the product intentionally pins an explicitly requested model.
- Use `claude doctor`, `claude auth status`, `/status`, and redacted gateway
  request records to separate installation, auth, configuration and upstream errors.

## Source Review Findings And Follow-Up

| Priority | Finding | Location | Status / next check |
| --- | --- | --- | --- |
| P0 | Codex restore deletes the entire config and auth files | `src-tauri/src/commands/misc.rs`, `restore_codex_defaults` | Open: design backup/selective restore; test preservation of unrelated settings and sessions |
| P1 | Codex setup writes the gateway credential through the OpenAI auth path | `src/config/codexProviderPresets.ts`, `setup_and_launch_codex` | Open: evaluate provider-scoped secrets and desktop credential delivery without silently invalidating existing login |
| P1 | Launch request was reported as a confirmed running CLI | `ClaudeSetupPage.tsx`, `setup_and_launch_claude` | Local patch: truthful request status; real Mac validation still required |
| P1 | Default Mac Terminal AppleScript had no timeout or fallback | `launch_macos_terminal_app` | Local patch: bounded request and Launch Services fallback; not released or tested on macOS |
| P1 | CLI discovery ran synchronously inside the async setup command | `setup_and_launch_claude` | Local patch: moved version probing to blocking worker |
| P1 | Generated catalog assigns common capability settings to multiple aliases | `src/utils/mohuanCodexCatalog.ts` | Open: qualify by actual upstream and deployed client version |
| P1 | Account/model-list success is not inference/tool compatibility evidence | `ClaudeSetupPage.tsx`, `CodexSetupPage.tsx` | Open: separate readiness stages and add opt-in diagnostics with explicit costs |
| P2 | `disable_response_storage` is generated but absent from the fetched current config reference | `src/config/codexProviderPresets.ts` | Unverified: check the deployed CLI schema / strict-config before removal or replacement |
| P2 | Configuration directory overrides may differ from the tool's defaults | config-path helpers | Open: test `CODEX_HOME` and `CLAUDE_CONFIG_DIR`; do not assume a mismatch without inspection |

## Release Qualification Checklist

- Record tool version, CLI version, OS/architecture, installation origin, and
  active config directory. Never include raw keys or unredacted auth files.
- Verify fresh install and existing install; native and package-manager updates;
  paths containing spaces, apostrophes, and non-ASCII characters.
- Preserve unrelated user configuration, policies, permissions, MCP, and login.
- Verify setup failure, denied terminal permission, timeout, retry, and accurate
  progress reporting. Distinguish launcher accepted, CLI running, and inference OK.
- On macOS test Terminal with automation allowed and denied, plus the preferred
  terminal fallback. On Windows test native PowerShell/Git Bash and WSL separately.
- Verify text, streaming completion, tools and results, images, reasoning options,
  multiple turns, and correct gateway route for every advertised client/model pair.
- Test 401, missing model, rate limit, upstream 5xx, stream error with HTTP 200,
  empty stream, and cancellation without hiding useful errors or duplicating bills.
- Confirm update/rollback behavior before publishing. Document unsupported client
  surfaces rather than assuming CLI settings configure every app.

## Tracking Policy

Recheck the official configuration references, gateway compatibility guides and
release notes before each client release. Keep observations separate from locally
tested behavior and customer-machine evidence. New settings require a minimum
client version and regression coverage before being generated by default.

The user confirmed release-time checks only on 2026-10-27 (Asia/Shanghai).
Do not create daily monitoring. Before publishing each client release, compare
the current official references and release notes with this baseline, complete
the qualification checklist, and record results and unresolved limitations.

## Local Verification For The Launch Patch

- Six Claude setup UI tests and six Claude model-selection tests passed.
- Two standalone Rust helper tests passed: quoting, success/failure, bounded hang.
- Renderer production build passed.
- Full TypeScript check still reports four errors in untouched App/dashboard/test
  files; it is not green. No full macOS native build or Mac UI test was performed.
- No new application package has been published.
