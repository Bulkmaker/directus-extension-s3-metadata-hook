# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Directus hook extension that sets `Content-Disposition` header on S3 uploads. This allows files to be downloaded with their original filenames when accessed directly via S3 or CDN URL (e.g., `files.site.ru`).

## Problem Solved

Without this hook:
```
files.site.ru/abc123-def456.jpg → Browser downloads as "abc123-def456.jpg"
```

With this hook:
```
files.site.ru/abc123-def456.jpg → Browser downloads as "original-photo.jpg"
```

## Build & Deploy

```bash
npm install
npm run build
./deploy.sh            # Local deployment (ignored from git)
```

**IMPORTANT:** `deploy.sh` is ignored by git but can be used for local development to build, copy to extensions, and restart Directus.

## How It Works

1. Listens to `files.upload` event (after Directus uploads to S3)
2. Gets original filename from `payload.filename_download`
3. Uses S3 `CopyObjectCommand` to update object metadata in-place
4. Sets `Content-Disposition: inline; filename="original-name.jpg"`

## Technical Details

### Why CopyObject?

S3 doesn't allow updating object metadata directly. The workaround is to copy the object to itself with `MetadataDirective: REPLACE`.

### Content-Disposition Format

Uses RFC 5987 format for Unicode filename support:
```
Content-Disposition: inline; filename="photo.jpg"; filename*=UTF-8''%D1%84%D0%BE%D1%82%D0%BE.jpg
```

- `inline` — Display in browser if possible
- `filename` — ASCII fallback
- `filename*` — UTF-8 encoded for Cyrillic/Unicode names

### Environment Variables Used

| Variable | Purpose |
|----------|---------|
| `STORAGE_S3_DRIVER` | Must be "s3" for hook to activate |
| `STORAGE_S3_REGION` | AWS region |
| `STORAGE_S3_ENDPOINT` | S3-compatible endpoint URL |
| `STORAGE_S3_KEY` | Access key |
| `STORAGE_S3_SECRET` | Secret key |
| `STORAGE_S3_BUCKET` | Bucket name |
| `STORAGE_S3_ROOT` | Optional prefix for objects |

## Dependencies

- `@aws-sdk/client-s3` — AWS SDK for S3 operations
- `@directus/extensions-sdk` — Directus extension framework

## Limitations

- Adds ~50-100ms to each file upload (S3 CopyObject call)
- Requires S3 credentials with `s3:GetObject` and `s3:PutObject` permissions
- Only runs for new uploads, not existing files

## Migrate Existing Files

To add Content-Disposition to existing files, run a migration script:

```bash
# See scripts/migrate-s3-metadata.sh
```
