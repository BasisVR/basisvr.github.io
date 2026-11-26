# Events feed

`events.json` powers the **Events** section on the Home page of the Basis Package Manager app.
The app fetches it from `https://basisvr.org/events.json` on launch. To post an event, edit that
file, commit, and push. GitHub Pages redeploys and the app picks it up the next time it starts.
(This README is just documentation and is not read by the app.)

## Format

A JSON array. Order in the file doesn't matter. The app lists the soonest event first, shows times
in the viewer's local time, and drops an event once it has finished. Each entry:

| field         | required | notes |
|---------------|----------|-------|
| `id`          | yes      | Stable unique string. |
| `title`       | yes      | Short name of the event. |
| `start`       | yes      | ISO 8601 with `Z` or an offset, for example `2026-11-28T20:00:00Z`. An entry with no readable start is skipped. |
| `end`         | no       | Same format. Without it the event is treated as lasting three hours. |
| `repeat`      | no       | `weekly` repeats the event every seven days from `start`, so the entry never needs updating. Leave it out for a one-off event. |
| `description` | no       | Plain text. |
| `host`        | no       | Who is running it. Shown as "Hosted by ...". |
| `location`    | no       | Where it happens: a world, a server, a Discord stage. |
| `url`         | no       | Link opened by the card's button. |
| `linkText`    | no       | Label for that button (default "Event details"). |

## Example

    [
      {
        "id": "european-basis-meetup",
        "title": "European Basis Meetup",
        "start": "2026-11-28T20:00:00Z",
        "end": "2026-11-28T21:00:00Z",
        "repeat": "weekly",
        "location": "Basis European Meetup",
        "url": "https://discord.com/events/1239242259392757822/1512177749106757862",
        "linkText": "View on Discord"
      }
    ]

A weekly event keeps the same UTC time all year, so its local time moves by an hour when
daylight saving changes. Edit `start` and `end` if the meetup should follow local time instead.
