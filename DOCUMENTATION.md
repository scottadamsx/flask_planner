# Flask Planner - Documentation

A personal planner web application built with Flask. Features reminders, a journal, a calendar with events, and a tic-tac-toe game on the home page.

Created by Scott Adams.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Setup & Running](#setup--running)
3. [Architecture Overview](#architecture-overview)
4. [Backend](#backend)
   - [app.py - Routes](#apppy---routes)
   - [file.py - Data Layer](#filepy---data-layer)
5. [Frontend](#frontend)
   - [Templates](#templates)
   - [JavaScript Modules](#javascript-modules)
   - [Styling](#styling)
6. [Data Storage](#data-storage)
7. [API Reference](#api-reference)
8. [Features](#features)

---

## Project Structure

```
flask_planner/
├── app.py                  # Flask application and route definitions
├── file.py                 # File I/O utilities (JSON read/write/update/delete)
├── reminders.json          # Reminder data store (gitignored)
├── journal.json            # Journal entry data store (gitignored)
├── events.json             # Calendar event data store
├── reminders.csv           # Legacy CSV storage (unused)
├── templates/
│   ├── template.html       # Base layout template (header, nav, content block)
│   ├── index.html          # Home page with tic-tac-toe game
│   ├── reminders.html      # Reminders page (active & completed tables)
│   ├── journal.html        # Journal page (entry form & entry list)
│   └── calendar.html       # Calendar page (monthly grid, event form, completed-today)
├── static/
│   ├── style.css           # Global stylesheet (Slate & Indigo theme)
│   ├── reminders.js        # Reminders page logic
│   ├── journal.js          # Journal page logic
│   ├── calendar.js         # Calendar page logic
│   └── tictactoe.js        # Tic-tac-toe game logic
└── .gitignore
```

---

## Setup & Running

### Prerequisites

- Python 3.x
- Flask (`pip install flask`)

### Start the Server

```bash
python app.py
```

The app starts in debug mode on `http://127.0.0.1:5000`.

---

## Architecture Overview

The app follows a simple server-rendered architecture with client-side interactivity:

- **Backend**: Flask serves HTML pages using Jinja2 templates and exposes JSON API endpoints for CRUD operations.
- **Frontend**: Jinja2 templates handle initial page rendering. JavaScript modules (`type="module"`) handle dynamic interactions via `fetch()` calls to the API.
- **Storage**: All data is persisted to local JSON files (no database). Each data type has its own file (`reminders.json`, `journal.json`, `events.json`).

---

## Backend

### app.py - Routes

The main Flask application. On startup, it runs `migrateReminders()` to ensure all reminders have `id`, `completed`, and `completedDate` fields.

#### Page Routes (GET - return HTML)

| Route | Function | Description |
|-------|----------|-------------|
| `/` | `home()` | Home page. Loads reminders and renders `index.html`. |
| `/journal` | `journal()` | Renders the journal page (`journal.html`). |
| `/reminders` | `reminder()` | Loads reminders and renders `reminders.html`. |
| `/calendar` | `calendar()` | Renders the calendar page (`calendar.html`). |

#### API Routes (JSON endpoints)

| Route | Method | Description |
|-------|--------|-------------|
| `/newReminder` | POST | Creates a new reminder. Auto-assigns `id`, `completed=False`, `completedDate=None`. |
| `/completeReminder` | POST | Marks a reminder as completed. Sets `completed=True` and `completedDate` to today. |
| `/deleteReminder` | POST | Deletes a reminder by `id`. |
| `/loadData` | GET | Returns all reminders as JSON. |
| `/newJournalEntry` | POST | Saves a new journal entry. |
| `/loadJournal` | GET | Returns all journal entries as JSON. |
| `/newEvent` | POST | Creates a new calendar event. Auto-assigns `id`. |
| `/loadEvents` | GET | Returns all calendar events as JSON. |
| `/deleteEvent` | POST | Deletes a calendar event by `id`. |

### file.py - Data Layer

Utility functions for JSON file-based data persistence.

| Function | Description |
|----------|-------------|
| `saveToJSON(filename, new_data)` | Appends an item to a JSON array file. Creates the file if it doesn't exist. |
| `loadFromJSON(filename)` | Reads and returns the full JSON array from a file. |
| `generateId()` | Returns a random 8-character hex string (UUID-based) for use as item IDs. |
| `updateItemInJSON(filename, item_id, updates)` | Finds an item by `id` and merges the `updates` dict into it. |
| `deleteFromJSON(filename, item_id)` | Removes an item by `id` from the JSON array. |
| `migrateReminders(filename)` | Migration function that adds `id`, `completed`, and `completedDate` fields to any legacy reminders missing them. |
| `saveReminder(filename, reminder)` | **(Legacy)** Appends a reminder to a CSV file. No longer used. |
| `readReminders(filename)` | **(Legacy)** Reads reminders from a CSV file. No longer used. |

---

## Frontend

### Templates

All templates extend `template.html`, which provides the base HTML structure:

- **Sticky header** with the app title ("My Planner") and navigation links (Home, Journal, Reminders, Calendar).
- A `{% block content %}` area where child templates inject their content.

#### index.html (Home Page)
- Welcome text and a playable **tic-tac-toe game** rendered as an HTML `<table>`.
- Loads `tictactoe.js` for game logic.

#### reminders.html (Reminders Page)
- A toggle button to show/hide the new-reminder form (name + due date).
- **Active Reminders** table: displays incomplete reminders with "Complete" and "Delete" action buttons.
- **Completed Reminders** table: displays completed reminders with strikethrough styling, showing the completion date.
- Reminders are rendered server-side via Jinja2 `{% for %}` loops.

#### journal.html (Journal Page)
- A toggle button to show/hide the entry form (title + textarea).
- A `#entries-list` container populated dynamically by `journal.js`.
- Entries appear as collapsible cards (click header to expand/collapse).

#### calendar.html (Calendar Page)
- Month navigation controls (previous/next buttons + month/year label).
- A `#calendar-grid` container rendered dynamically by `calendar.js`.
- A modal overlay form for adding events to a specific date.
- A "Completed Today" section showing reminders completed on the current date.

### JavaScript Modules

All page scripts are loaded as ES modules (`type="module"`), enabling top-level `await`.

#### reminders.js
- **Reminder class**: Simple data class with `name` and `date`.
- `loadInReminders()`: Fetches reminders from `/loadData`.
- New reminder form toggle and submission (POST to `/newReminder`, then page reload).
- Complete/Delete button handlers: POST to `/completeReminder` or `/deleteReminder`, then page reload. Delete prompts for confirmation.

#### journal.js
- Auto-expanding textarea (grows as user types, capped at 60% viewport height).
- Form show/hide with focus management.
- `loadEntries()`: Fetches entries from `/loadJournal` and renders them as collapsible cards (newest first).
- Submits new entries via POST to `/newJournalEntry`, then refreshes the entry list without a full page reload.

#### calendar.js
- Maintains state: `currentYear`, `currentMonth`, `selectedDate`, `allReminders`, `allEvents`.
- `loadAllData()`: Fetches both reminders and events in parallel using `Promise.all`.
- `renderCalendar()`: Builds the full month grid dynamically. Each day cell shows:
  - Active reminders (blue badges) due on that date.
  - Events (pink badges) on that date.
  - Today's cell is highlighted.
- Clicking a day opens the event form overlay.
- `renderCompletedToday()`: Shows reminders completed on the current date.
- Month navigation updates the grid without a page reload.

#### tictactoe.js
- Two-player (X and O) tic-tac-toe on a 3x3 grid.
- `switchPlayer()`: Alternates between "x" and "o".
- `checkForWin()`: Checks all 8 possible winning lines (3 rows, 3 columns, 2 diagonals) and stalemate condition.
- On game end, displays a "Play Again" button that reloads the page.
- X plays in blue, O plays in orange.

### Styling (style.css)

The app uses a custom CSS design system with CSS custom properties:

- **Color Theme**: Slate & Indigo palette (`--primary-color: #4f46e5`).
- **Font**: Inter / system-ui font stack.
- **Layout**: Flexbox-based with a sticky header and centered main content (max-width 1200px).
- **Components**:
  - Tables with rounded corners, hover effects, and separated borders.
  - Buttons with hover lift effects and active press states.
  - Primary (indigo) and secondary (ghost/outline) button variants.
  - Specialized action buttons: green "Complete" (`#10b981`) and red "Delete" (`#ef4444`).
  - Form inputs with focus glow rings.
  - Journal cards with expand/collapse animation.
  - Calendar grid with day cells, color-coded item badges (blue for reminders, pink for events), and today highlighting.
  - Modal overlay for the event creation form.

---

## Data Storage

All data is stored as JSON arrays in flat files. No database is required.

### reminders.json

```json
[
    {
        "name": "Reminder name",
        "date": "YYYY-MM-DD",
        "id": "8-char-hex",
        "completed": false,
        "completedDate": null
    }
]
```

When completed, `completed` becomes `true` and `completedDate` is set to the ISO date string of completion.

### journal.json

```json
[
    {
        "title": "Entry Title",
        "entry": "Entry body text...",
        "date": "M/D/YYYY"
    }
]
```

Note: Journal dates are formatted by the browser's `toLocaleDateString()`, so the format depends on the user's locale.

### events.json

```json
[
    {
        "title": "Event title",
        "date": "YYYY-MM-DD",
        "description": "Optional description",
        "id": "8-char-hex"
    }
]
```

---

## API Reference

All API endpoints accept and return JSON. Request bodies should use `Content-Type: application/json`.

### Reminders

```
POST /newReminder
Body: { "name": "string", "date": "YYYY-MM-DD" }
Response: "ok"

POST /completeReminder
Body: { "id": "string" }
Response: "ok"

POST /deleteReminder
Body: { "id": "string" }
Response: "ok"

GET /loadData
Response: [ { "name", "date", "id", "completed", "completedDate" }, ... ]
```

### Journal

```
POST /newJournalEntry
Body: { "title": "string", "entry": "string", "date": "string" }
Response: "ok"

GET /loadJournal
Response: [ { "title", "entry", "date" }, ... ]
```

### Calendar Events

```
POST /newEvent
Body: { "title": "string", "date": "YYYY-MM-DD", "description": "string" }
Response: "ok"

GET /loadEvents
Response: [ { "title", "date", "description", "id" }, ... ]

POST /deleteEvent
Body: { "id": "string" }
Response: "ok"
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Reminders** | Create reminders with a name and due date. Mark as complete or delete. Completed reminders show in a separate table with strikethrough styling. |
| **Journal** | Write titled journal entries. Entries display as collapsible cards, newest first. Auto-expanding textarea. |
| **Calendar** | Monthly calendar grid showing reminders and events as color-coded badges. Click any day to add an event. Navigate between months. "Completed Today" section tracks daily progress. |
| **Tic-Tac-Toe** | Two-player game on the home page. Detects wins and stalemates. Play again to restart. |
| **Data Migration** | On startup, legacy reminders without IDs are automatically migrated to include `id`, `completed`, and `completedDate` fields. |
