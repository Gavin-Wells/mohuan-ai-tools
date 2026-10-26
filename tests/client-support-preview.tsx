import { createRoot } from "react-dom/client";
import { ClientSupport } from "@/components/mohuan/ClientSupport";
import "@/index.css";

const tool =
  new URLSearchParams(location.search).get("tool") === "codex"
    ? "codex"
    : "claude";
createRoot(document.getElementById("root")!).render(
  <main className="mx-auto max-w-md px-6 py-12 space-y-6">
    <h1 className="text-xl font-semibold">
      {tool === "claude" ? "Claude Code" : "Codex"} 快速配置
    </h1>
    <ClientSupport
      tool={tool}
      apiKey="sk-test-secret-key123"
      lastError="启动失败 /Users/private/.claude/settings.json"
    />
  </main>,
);
