#!/bin/bash
set -e
pnpm install --frozen-lockfile
echo "No" | pnpm --filter db push || echo "WARNING: drizzle-kit push failed or was skipped — review schema drift manually"
