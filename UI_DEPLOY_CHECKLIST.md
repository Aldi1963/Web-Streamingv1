# UI Deploy Checklist

Run these before restarting production after a UI or CSS change.

## Commands

```sh
npm run ui:guard
npm run build
npm run smoke
```

## Mobile Pages

- `/`
- `/movies`
- `/dashboard`
- `/dashboard/history`
- `/watch/<content-id>`

## Visual Checks

- Hamburger drawer has no white native input.
- Drawer links fit in one column and the overlay covers the page.
- `/dashboard/history` keeps the poster card grid, with 3 columns on small mobile.
- `/movies` keeps poster cards, chips, and tabs aligned.
- Bottom navigation does not overlap cards or buttons.
- Buttons and text do not overflow their cards.

## CSS Rules

- Prefer page-specific classes for new UI, for example `dashboard-library-*` or `movies-*`.
- Avoid changing broad selectors like `.grid`, `.card`, `.search-form`, `.btn`, and `.panel` unless all pages above are checked.
- If a global selector must change, add a dedicated guard in `scripts/ui-guard.sh`.
