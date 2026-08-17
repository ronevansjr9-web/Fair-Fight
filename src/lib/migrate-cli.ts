/**
 * `bun run migrate` — explicit, controlled migration entry point.
 *
 * Applies migrations/*.sql transactionally with an advisory lock and a
 * checksum ledger (see src/lib/migrate.ts). Requires DATABASE_URL. This is a
 * deploy-time action; it must NOT be triggered at request time.
 */
import { sql } from "~/db";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — cannot run migrations.");
    process.exit(1);
  }
  const { runMigrations } = await import("./migrate");
  const db = sql();
  const plan = await runMigrations({ sql: db });
  console.log(
    `migrations: applied ${plan.toApply.map((f) => f.version).join(", ") || "(none)"}; skipped ${plan.skipped.join(", ") || "(none)"}`,
  );
  if (plan.toApply.length > 0) {
    console.log("Applied. Verify rows in schema_migrations, then run the authenticated smoke checks before serving traffic.");
  }
}

main().catch((err) => {
  console.error("migrate failed:", err);
  process.exit(1);
});
