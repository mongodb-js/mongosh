import { test, expect } from '@playwright/test';

/**
 * Multi-tab tests use two pages in the *same* BrowserContext (shared OPFS + Web Locks).
 */

async function waitReady(page) {
  await page.waitForFunction(() => window.smongoOpfsReady === true, null, { timeout: 30_000 });
}

test.describe('OPFS multi-tab (Web Lock owner + BroadcastChannel RPC)', () => {
  test('sequential: second page connects as RPC client while first is owner', async ({ context }) => {
    const dbName = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const p1 = await context.newPage();
    const p2 = await context.newPage();

    await p1.goto('/tests/opfs-multitab-harness.html');
    await waitReady(p1);
    const r1 = await p1.evaluate(async (name) => window.smongoOpfsInit(name), dbName);
    expect(r1.ok).toBe(true);

    await p2.goto('/tests/opfs-multitab-harness.html');
    await waitReady(p2);
    const r2 = await p2.evaluate(async (name) => window.smongoOpfsInit(name), dbName);
    expect(r2.ok).toBe(true);

    await p1.close();
    await new Promise((r) => setTimeout(r, 400));

    await p2.goto('/tests/opfs-multitab-harness.html');
    await waitReady(p2);
    const r3 = await p2.evaluate(async (name) => window.smongoOpfsInit(name), dbName);
    expect(r3.ok).toBe(true);

    await p2.close();
  });

  test('simultaneous: both pages can open (one owner, one RPC client)', async ({ context }) => {
    const dbName = `ps_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const p1 = await context.newPage();
    const p2 = await context.newPage();

    await Promise.all([
      p1.goto('/tests/opfs-multitab-harness.html'),
      p2.goto('/tests/opfs-multitab-harness.html'),
    ]);
    await waitReady(p1);
    await waitReady(p2);

    const [res1, res2] = await Promise.all([
      p1.evaluate(async (name) => window.smongoOpfsInit(name), dbName),
      p2.evaluate(async (name) => window.smongoOpfsInit(name), dbName),
    ]);

    const okCount = [res1, res2].filter((r) => r.ok).length;
    expect(okCount).toBe(2);

    await p1.close();
    await p2.close();
  });

  test('cross-tab: client tab reads document inserted on owner tab', async ({ context }) => {
    const dbName = `pc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const p1 = await context.newPage();
    const p2 = await context.newPage();

    await p1.goto('/tests/opfs-multitab-harness.html');
    await waitReady(p1);
    expect(await p1.evaluate(async (name) => window.smongoOpfsInit(name), dbName)).toEqual({ ok: true });
    expect(await p1.evaluate(async (name) => window.smongoOpfsInsertOne(name), dbName)).toEqual({ ok: true });

    await p2.goto('/tests/opfs-multitab-harness.html');
    await waitReady(p2);
    expect(await p2.evaluate(async (name) => window.smongoOpfsInit(name), dbName)).toEqual({ ok: true });

    const r = await p2.evaluate(async (name) => window.smongoOpfsFindCount(name), dbName);
    expect(r.ok).toBe(true);
    expect(r.count).toBeGreaterThanOrEqual(1);

    await p1.close();
    await p2.close();
  });
});
