---
name: Drizzle push hangs in post-merge
description: drizzle-kit push prompts interactively for destructive operations and bails when no TTY; symptoms and how to recover.
---

# `drizzle-kit push` silently failing in post-merge

When `lib/db/src/schema/*.ts` changes touch a column that drizzle considers potentially destructive (e.g. adding a unique constraint to a column that already has multiple rows, dropping a column, changing a type), drizzle-kit prints an interactive yes/no prompt like:

> You're about to add users_clerk_user_id_unique unique constraint to the table, which contains 11 items. Do you want to truncate users table?

In the post-merge container there is no TTY, so the CLI throws `Interactive prompts require a TTY terminal` and **exits before any of the safe ALTERs run**. The migration appears to "succeed" in the post-merge log header but in reality nothing was applied. The app then 500s on every query that references a new column.

**Why:** the post-merge script ran `pnpm --filter db push` with no input wired to stdin, and `set -e` masked the failure because the non-zero exit happened inside a `pnpm` subprocess whose own exit code wasn't always propagated cleanly.

**How to apply:**
- The post-merge script now pipes `No` into the push so destructive prompts auto-answer "do not truncate" and the safe ALTERs still proceed: `echo "No" | pnpm --filter db push || echo "WARNING..."`.
- After any post-merge that touches schema, sanity-check the actual DB columns/tables via `information_schema` rather than trusting the push exit code.
- If the prompt is fundamentally about a constraint that already exists under a different name (e.g. drizzle wants `users_clerk_user_id_unique` but DB has `users_clerk_user_id_key`), the safe answer is "No" — the existing constraint already enforces uniqueness; renaming would be a no-op DROP/ADD that risks data loss.
- To recover from a missed migration without running push: apply the diff manually with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` against the production/dev DB.
