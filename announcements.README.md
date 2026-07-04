# Announcements feed

`announcements.json` powers the **Announcements** tab in the Basis Package Manager app.
The app fetches it from `https://basisvr.org/announcements.json` on launch. To post an
announcement, edit that file, commit, and push — GitHub Pages redeploys and the app picks
it up the next time it starts. (This README is just documentation and is not read by the app.)

## Format

A JSON array. Order in the file doesn't matter — the app sorts pinned items first, then by
date (newest first). Each entry:

| field      | required | notes |
|------------|----------|-------|
| `id`       | yes      | Stable unique string. Tracks which announcements a user has already seen — **don't reuse or change it** once posted. |
| `title`    | yes      | Short headline. |
| `body`     | yes      | The message. Plain text. |
| `date`     | no       | `YYYY-MM-DD`. Shown on the card and used for ordering. |
| `level`    | no       | `info` (default), `update`, or `alert` — sets the coloured pill (blue / purple / red). |
| `url`      | no       | Optional link opened by the card's button. |
| `linkText` | no       | Label for that button (default "Learn more"). |
| `pinned`   | no       | `true` keeps the item at the top of the list. |

## Example

    [
      {
        "id": "2026-07-04-early-preview",
        "level": "info",
        "pinned": true,
        "date": "2026-07-04",
        "title": "This is a preview — and still very early",
        "body": "Thanks for trying the Basis Package Manager! ...",
        "url": "https://discord.gg/v6ve6WT562",
        "linkText": "Share feedback on Discord"
      }
    ]

The app ships with an embedded copy of this first announcement as an offline fallback
(`src/BasisPM.Core/announcements.json` in the BasisPackageManager repo), so the section is
never empty even with no network.
