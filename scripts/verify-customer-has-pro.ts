/**
 * Lightweight checks for customerHasPro logic (no React Native import).
 * Run: bun run scripts/verify-customer-has-pro.ts
 */

const PRO_ENTITLEMENT_ID = 'pro';

function customerHasPro(info: {
  entitlements?: { active?: Record<string, unknown> };
  activeSubscriptions?: string[];
} | null | undefined): boolean {
  if (!info) return false;

  const activeEntitlements = info.entitlements?.active ?? {};
  const direct = activeEntitlements[PRO_ENTITLEMENT_ID];
  if (direct) return true;

  for (const [key, ent] of Object.entries(activeEntitlements)) {
    if (!ent) continue;
    if (key.toLowerCase() === PRO_ENTITLEMENT_ID.toLowerCase()) return true;
    if (key.toLowerCase().includes('pro')) return true;
  }

  if ((info.activeSubscriptions?.length ?? 0) > 0) return true;

  return false;
}

let failed = 0;
function assert(name: string, cond: boolean) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${name}`);
  } else {
    console.log(`PASS: ${name}`);
  }
}

assert('null → false', customerHasPro(null) === false);
assert('empty → false', customerHasPro({ entitlements: { active: {} }, activeSubscriptions: [] }) === false);
assert(
  'pro entitlement → true',
  customerHasPro({ entitlements: { active: { pro: {} } }, activeSubscriptions: [] }) === true,
);
assert(
  'Pro entitlement (case) → true',
  customerHasPro({ entitlements: { active: { Pro: {} } }, activeSubscriptions: [] }) === true,
);
assert(
  'active monthly subscription without entitlement → true',
  customerHasPro({
    entitlements: { active: {} },
    activeSubscriptions: ['sakescan_pro_monthly'],
  }) === true,
);
assert(
  'unrelated entitlement with pro in name → true',
  customerHasPro({
    entitlements: { active: { sakescan_pro: {} } },
    activeSubscriptions: [],
  }) === true,
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nAll customerHasPro checks passed');
