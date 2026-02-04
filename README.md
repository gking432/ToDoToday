# ToDoToday

A personal productivity app combining a persistent to-do list, calendar view, and private journal — all wrapped in a refined, Augusta National–inspired aesthetic.

## Features

- **Persistent To-Do List**: Always-visible left column with tasks, priorities, and due dates
- **Daily View**: Day header, due items summary, and journal panel with whimsical prompts
- **Hourly Timeline**: Drag-and-drop task scheduling with hourly slots
- **Monthly Calendar**: Grid view with journal indicators and task counts
- **Journal**: Rich text entries with auto-save, keyed by date

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- TipTap (rich text editor)
- Lucide React (icons)
- date-fns (date utilities)
- localStorage (data persistence)

## Data Storage

All data is stored locally in your browser's localStorage. No data is sent to any server.

## Design

The app uses a custom color palette inspired by Augusta National:
- Masters Green (#006747) - Primary color
- Azalea Pink (#F78FB3) - Overdue/due today indicators
- Tournament Yellow (#FFD700) - Due soon indicators
- Parchment (#FDFCF8) - Background
- Deep Forest (#1A2E1A) - Primary text
- Faded Green (#5A7A5E) - Secondary text

Typography:
- Playfair Display - Headers and titles
- DM Sans - Body text and UI
