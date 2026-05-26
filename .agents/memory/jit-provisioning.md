---
name: JIT provisioning email collision
description: The requireAuth JIT provisioning logic must handle email collisions gracefully, especially when seed data exists with pre-Clerk emails.
---

## Rule
When JIT-provisioning a user (insert into DB on first Clerk login), the insert can fail with a duplicate email constraint if seed data or old pre-Clerk users share the same email. The fallback must:
1. Re-query by `clerk_user_id` (race condition case)
2. If still not found, re-query by `email` and **link** (`UPDATE users SET clerk_user_id = ? WHERE id = ?`) the existing account to the new Clerk identity
3. Only return 500 if both lookups fail — and log the error via `logger.error`

**Why:** The original code had a silent `res.status(500)` with no logging in the email-collision path. Since pino-http logs the 500 but not the application-level cause, this was invisible in production logs and caused all authenticated routes to fail. Seed data (users 1–10) had real emails that collided on first login.

## How to apply
Every new JIT provisioning middleware should include the email-based link fallback. Never leave the `res.status(500)` path unlogged.
