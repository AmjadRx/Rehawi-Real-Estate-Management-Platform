# Nightly encrypted backups (§10)

This folder is the **template** for the private `rehawi-estates-backups`
repository. Copy `backup.yml` into that repo at `.github/workflows/backup.yml`.

What the nightly Action does:

1. `pg_dump --format=custom` of the Neon database.
2. Encrypts the dump with [age](https://age-encryption.org) using the
   `BACKUP_PASSPHRASE` repository secret.
3. Snapshots **Blob files too**: lists every row in `documents` and downloads
   (then encrypts) any file not yet present in the repo — contracts and photos
   are backed up, not just the database.
4. Commits everything, so "everything saved in GitHub" holds for data as well.

## Setup (one-time)

1. Create the private repo `rehawi-estates-backups`.
2. Add repository secrets:
   - `DATABASE_URL` — the Neon connection string (read-only role recommended).
   - `BLOB_READ_WRITE_TOKEN` — Vercel Blob token (read scope is enough).
   - `BACKUP_PASSPHRASE` — a long random passphrase; store a copy somewhere
     safe offline. Without it backups cannot be decrypted.
3. Copy `backup.yml` to `.github/workflows/backup.yml` in that repo.

## Restore

```sh
age -d -o dump.pgsql backup-YYYY-MM-DD.pgsql.age   # prompts for passphrase
pg_restore --clean --if-exists -d "$DATABASE_URL" dump.pgsql
```

Neon's built-in point-in-time restore remains the first line of defense; this
Action is the independent, offline-decryptable second line.
