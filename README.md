# Outreach Year Planner

A shared outreach calendar running on one Cloudflare Worker and D1 database. The interface follows the approved white calendar design, with programmes, automatic preparation deadlines, tasks and team progress.

## Features

- Public calendar and programme/task views, with username/password sign-in and HttpOnly sessions for editing.
- Administrator, editor and viewer access. Editors manage all units; viewers and signed-out visitors cannot change data.
- Programme creation and editing, annual repeats, relative preparation tasks, and preservation of original approval templates.
- Custom task creation, editing, completion and removal.
- Calendar, task list, search, unit filtering and annual programme overview.
- Automatic refresh every minute while visible; manual Refresh is also available.
- Daily planner snapshots at 02:00 UTC, kept for 30 days inside D1.
- Snapshot before every restore; JSON downloads and atomic restore with concurrent-edit checks.
- Full SQL export script for separate account-level backups.

## Run locally

Use Node 22.13+ (Node 24 recommended).

```sh
npm ci
npx wrangler d1 migrations apply outreach-planner --local
```

Create an ignored `.dev.vars` file containing a long random `BOOTSTRAP_TOKEN`. Run:

```sh
npm run dev
```

Open the printed local URL. On the first visit, use the setup key to create an administrator. The first setup is atomic and cannot create a second initial administrator. The production database and local development database are separate.

## Deploy to your Cloudflare account

```sh
npx wrangler login
```

`wrangler.jsonc` points to the D1 database provisioned for this app. For a different account, create a new database with `npx wrangler d1 create outreach-planner` and replace its `database_id` first.

```sh
npm run db:remote
npx wrangler secret put BOOTSTRAP_TOKEN
npm run deploy
```

Create the first administrator on the deployed site with the private setup key. Then remove the no-longer-needed bootstrap secret:

```sh
npx wrangler secret delete BOOTSTRAP_TOKEN
```

All routes, including API and static files, use the same Worker origin. No Google OAuth, external database, R2 bucket, paid email service, or domain purchase is required. The public address is `https://outreach-year-planner.pages.dev`. Pages serves the app against the same D1 database; the Worker keeps the daily backup schedule. `npm run deploy` updates both deployments.

## Everyday use

1. Open the calendar without signing in. To update data, select **Sign in**, then open **Programmes** to populate the calendar. Original programme dates are placeholders.
2. Add a programme date and responsible unit. Choose whether it repeats each year.
3. Optional preparation tasks use `Task name | weeks before programme`, one per line. A negative lead time means follow-up after the programme.
4. Use **New task** for stand-alone dated work.
5. Administrators use **Manage people** to create accounts, change roles, reset passwords or disable access. Share credentials privately. Members can change their own password in Account.
6. Use **Download backup** regularly and store the downloaded file outside Cloudflare.

When editing an existing programme, fixed-date template tasks, cross-unit tasks and approval-chain steps are retained. Moving its date changes relative deadlines. Matching task names keep their template identifiers and completion status; replacing a task name creates a new task identifier. Programme removal hides generated tasks; completion history is retained in the database and backups.

## Backups and recovery

There are three layers:

1. **D1 Time Travel:** Cloudflare automatically provides seven days of point-in-time recovery on the Free plan. This is managed through the Cloudflare dashboard or Wrangler.
2. **Daily snapshots:** the Worker Cron Trigger saves programme/task/completion data daily and removes snapshots older than 30 days. The administrator can also create a snapshot immediately. Snapshots remain in the same Cloudflare account and do not protect against losing the entire account.
3. **Independent downloads:** use Download backup (JSON planner data) or `npm run backup` (full SQL database) and store a copy on your own device or another location. Downloads do not happen automatically to your computer.

JSON backup restore replaces programmes, tasks and completion, while preserving current people, passwords and sessions. The restore form checks for changes since the backup review and saves the current data before replacing it. JSON imports are limited to 1.9 MB in the interface; larger databases use full SQL exports. Restoring original seed data is optional: migrations run only once and never reset existing team changes on deploy.

Full SQL export:

```sh
npm run backup
```

The private, ignored `backups/` directory contains SQL exports including accounts and password hashes. Do not commit or publish them. To recover the complete database, import the SQL into a **new empty D1 database**, change the binding to the recovered database, and redeploy. Verify access and data before removing the old database.

## Tests

```sh
npm test
npx wrangler deploy --dry-run
```

Tests use a real local SQLite engine behind a small D1-compatible adapter and cover authentication, permissions, origin checks, conflicts, backup/restore, session revocation and login throttling. Browser QA also checks the interface against the local Worker/D1 runtime.

## Free plan and ownership

No paid services are required by this repository. Stay on Workers Free; existing account subscriptions are controlled in your Cloudflare account. Daily request/database quotas and the free database size limit still apply. See [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).

No secrets are checked in. `.dev.vars`, backups, local database files and `node_modules` are ignored. The repository's D1 identifier is configuration, not a credential.
