const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.SUPPORT_TEST_URL || 'http://127.0.0.1:15175';

(async () => {
  const browser = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1155/chrome-linux/chrome', args: ['--no-sandbox'] });
  try {
    for (const width of [1000, 390]) {
      for (const tool of ['claude', 'codex']) {
        const page = await browser.newPage({ viewport: { width, height: 844 } });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.addInitScript(() => {
          window.nativeCalls = [];
          window.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
            window.nativeCalls.push({ command, args });
            if (command === 'copy_text_to_clipboard') return true;
            if (command === 'open_external') return true;
            if (command === 'run_client_self_check') return {
              schema_version: 1, tool: args.tool, client_version: '1.0.16', platform: 'macos', arch: 'aarch64', runtime: 'claude-cli', runtime_version: '2.1.310', captured_at: '2026-10-27T01:00:00Z',
              checks: [
                { id: 'installation', label: '客户端安装', status: 'pass', detail: '已找到客户端运行环境' },
                { id: 'config', label: '配置文件', status: 'pass', detail: '配置可读取' },
                { id: 'gateway', label: '网关与 Key', status: 'pass', detail: '网关已响应，当前 Key 鉴权通过' },
                { id: 'launch', label: '启动状态', status: 'skipped', detail: '只读自检不启动终端，未验证客户端进程是否运行' },
                { id: 'inference', label: '生成与工具调用', status: 'skipped', detail: '未执行付费推理，流式输出、图片和工具调用仍需单独验证' },
              ],
            };
            throw new Error('Unexpected native command: ' + command);
          } };
        });
        await page.goto(`${base}/tests/client-support-preview.html?tool=${tool}`);
        await page.getByRole('button', { name: '自检', exact: true }).click();
        await page.getByRole('list', { name: '自检结果' }).waitFor();
        assert.equal(await page.getByText('未验证', { exact: true }).count(), 2);
        await page.getByLabel('问题描述', { exact: true }).fill('配置后没有终端窗口 sk-test-secret-key123');
        await page.getByText('脱敏反馈预览', { exact: true }).click();
        const preview = await page.getByRole('textbox', { name: '脱敏反馈预览' }).inputValue();
        assert.ok(!preview.includes('sk-test-secret-key123') && !preview.includes('/Users/private'));
        const submit = page.getByRole('button', { name: '打开反馈草稿' });
        assert.ok(await submit.isDisabled());
        await page.getByRole('checkbox').check();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const dialog = await page.getByRole('dialog').boundingBox();
        assert.ok(dialog.x >= 0 && dialog.x + dialog.width <= width);
        await page.screenshot({ path: `/tmp/modelswitch-support-${tool}-${width}.png`, fullPage: true });
        await submit.click();
        await page.waitForFunction(() => window.nativeCalls.some(c => c.command === 'open_external'));
        const calls = await page.evaluate(() => window.nativeCalls);
        assert.ok(calls.some(c => c.command === 'run_client_self_check' && c.args.tool === tool));
        const external = calls.find(c => c.command === 'open_external');
        assert.ok(external.args.url.startsWith('https://github.com/Gavin-Wells/mohuan-ai-tools/issues/new?'));
        assert.ok(!external.args.url.includes('sk-test-secret-key123'));
        assert.deepEqual(errors, []);
        console.log({ tool, width, diagnostics: true, redaction: true, consent: true, responsive: true });
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
