# Paper B · Daily Sheets

A digital flipbook of your MRCPsych Paper B study plan. 168 days, 21 April – 5 October 2026.

## What it does

- Shows one day per screen, with three tappable task boxes per day
- Swipe left/right (or use arrows / arrow keys) to flip through
- Saves your progress automatically in your browser (no accounts, no servers)
- Works offline once you've opened it once
- Installs like a native app on iOS and Android ("Add to Home Screen")
- Jumps to today's sheet on open
- Shows a 168-cell contents grid so you can hop to any day
- Tracks streaks, overall % complete, days to exam

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| ← / → | Flip pages |
| `c` | Open contents |
| `t` | Jump to today |
| `1` `2` `3` | Tick task 1 / 2 / 3 of the current day |

## Deploying to GitHub Pages (private repo, free)

1. **Create a new private repository** on GitHub. Call it something like `paperb-plan`.

2. **Upload every file** from this folder to that repo. You can do this either:
   - **Via the web:** click "Add file → Upload files", drag all files in, commit.
   - **Via git command line** (if you have it):
     ```
     cd paperb-app
     git init
     git add .
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin git@github.com:YOUR_USERNAME/paperb-plan.git
     git push -u origin main
     ```

3. **Enable GitHub Pages:**
   - Go to the repo on github.com
   - Click **Settings → Pages** (in the left sidebar)
   - Under "Build and deployment", set **Source** to **Deploy from a branch**
   - Select **Branch: main**, **Folder: / (root)**, click **Save**
   - Wait 30–60 seconds

4. **Open your app:** The URL will be shown on the Pages settings screen. It looks like:
   `https://YOUR_USERNAME.github.io/paperb-plan/`

   (Even though the repo is private, the built site is technically public. The URL is not guessable unless someone knows your username and repo name.)

5. **Add to your phone's home screen:**
   - **iOS (Safari):** Share → Add to Home Screen
   - **Android (Chrome):** menu → Install app / Add to Home Screen

## Files

| File | Purpose |
|------|---------|
| `index.html` | The app shell |
| `style.css` | Everything visual |
| `app.js` | Flipbook logic, state, keyboard, swipe |
| `days.json` | All 168 days of content |
| `sw.js` | Service worker (offline support) |
| `manifest.webmanifest` | PWA manifest (install support) |
| `icon.svg`, `icon-192.png`, `icon-512.png` | App icons |

## Data & privacy

Your progress lives in your browser's localStorage. It never leaves your device. If you clear your browser data, your progress is lost — use **Settings → Export progress** to back up a JSON file, and **Import progress** to restore it.

## Updating content

If you ever need to change a day's content, edit `days.json` and re-deploy. The structure is:

```json
{
  "date": "Mon 21 Apr",
  "dayNum": 1,
  "phase": 1,
  "phaseLabel": "PHASE 1 — CLINICAL FOUNDATION",
  "topic": "Week 1: PREVENTATIVE STRATEGIES in psychiatry",
  "iso": "2026-04-21",
  "tasks": [
    { "type": "morning", "label": "🎧 MORNING (commute)", "resource": "...", "action": "..." },
    ...
  ]
}
```

`phase` is 1–5 for the five plan phases (P1 clinical, P2 stats/EBM, P3 recalls, P4 mocks, P5 final week).
`type` is one of `morning`, `lunch`, `evening`, `mock`, `rest`, `plan` — this controls the task's colour.
