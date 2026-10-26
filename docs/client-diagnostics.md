# Client Self-Check And Feedback

The Claude Code and Codex setup pages share `ClientSupport`. The entry points
are available without a ModelSwitch account login. Opening feedback does not
automatically start diagnostics or transmit a report.

## Checks

`run_client_self_check` accepts only `claude` or `codex`. It performs read-only
installation discovery and bounded configuration reads, then optionally calls
the fixed ModelSwitch `/v1/me` and `/v1/models` URLs with the key currently in the
setup form. Redirects are rejected; each HTTP request has a ten-second deadline
and a one-MiB response limit. The native operation has a 45-second deadline and
the UI has a 50-second safety deadline.

The report includes tool/app version, platform, architecture and static check
messages. It does not export config contents, local paths, account balances,
API keys, raw HTTP responses, provider errors or conversation history. CLI
discovery can run a version probe. It never runs a credential helper, installs
software, opens a terminal, changes settings or initiates model inference.

Configuration parsing checks gateway routing, protocol, credential presence and
selected model availability. Directory overrides and profiles can affect what
the launched process actually loads; managed policy, keyring credentials and a
running client's effective settings require separate verification. Codex Desktop
version detection is not implemented; its runtime version remains null.

The results explicitly distinguish pass, warning, failure and unverified checks.
A successful model-list request is not evidence that inference, vision,
streaming or tools work. Launch and inference are therefore listed as unverified.

## Feedback Privacy And Delivery

Feedback contains the user's description, the recent error and an allowlisted
report. A second redaction pass removes the current key, common token formats,
credential assignments, URL credentials/query strings, home-directory usernames
and email addresses. Arbitrary user text is not guaranteed to be free of other
sensitive data: users can inspect the redacted preview before continuing.

Copying the report stays local. Opening a feedback draft requires a non-empty
description and explicit consent. The app copies the complete redacted report
and opens a bounded prefilled URL for
`https://github.com/Gavin-Wells/mohuan-ai-tools/issues/new`. Large reports are
truncated in the URL but remain complete in the clipboard. If clipboard
preparation fails, the external page is not opened.

This is a GitHub draft, not an in-app ticket submission. The user may need to sign
in to GitHub and must submit the issue there. Do not claim a report was submitted
when only the browser was opened. No automatic telemetry, scheduled checks or
backend feedback database was added.

## Verification

Frontend unit tests:

```sh
pnpm exec vitest run tests/utils/clientDiagnostics.test.ts tests/components/ClientSupport.test.tsx tests/components/ClaudeSetupPage.test.tsx
```

Native checks without a desktop/WebKit SDK:

```sh
cargo +stable test --manifest-path tests/native-diagnostics/Cargo.toml
```

This harness compiles the production diagnostics code with the Tauri command
attribute removed by a build step. Configuration paths and installation discovery
are stubbed; parsing, command orchestration and networking code compile normally.
Tests do not send real credentials or inference requests. It is not a substitute
for a platform-native application build or testing the installed app on macOS.

Browser fixture:

```sh
pnpm exec vite . --host 127.0.0.1 --port 15175
NODE_PATH=/tmp/vowfilm-layout-check/node_modules node tests/client-support.browser.cjs
```

The browser fixture mocks native commands and checks both client types at 1000px
and 390px. Real native command registration, system credential behavior, proxy
behavior and user consent flows must also be checked before release. Follow the
release-time-only policy in `client-configuration-audit.md`.
