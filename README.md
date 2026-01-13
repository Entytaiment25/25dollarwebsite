# 25dollarphone Server Backup Website

Download page for 25dollarphone Minecraft server backups with magnet links and HTTPS downloads.

## Run Locally

```bash
bunx serve .
```

## Add New Version

Edit `versions.json`:

```json
{
    "date": "2026-01-13",
    "magnetLink": "magnet:?xt=urn:btih:...",
    "httpsLink": "https://...",
    "size": "2.7 GB",
    "checksum": "sha256sum..."
}
```