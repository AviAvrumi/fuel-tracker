# Fuel Tracker

Fuel Tracker is a Hebrew-first React application for managing fuel fill-ups, vehicle details, and basic fuel efficiency insights.

## Stack

- React 19
- TypeScript
- Vite
- Supabase Auth + Database

## Current Features

- Email/password authentication
- Google login via Supabase
- Vehicle profile setup
- Fuel fill-up entry management
- Automatic efficiency and cost calculations
- RTL-friendly Hebrew interface

## Project Structure

```text
src/
  components/    UI building blocks
  data/          Static vehicle reference data
  services/      Supabase-facing data operations
  styles/        Shared inline style tokens
  types/         Shared TypeScript types
  utils/         Formatting and calculation helpers
```

## Environment Variables

Create a `.env` file with:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm run build
```

## Recommended Next Steps

- Add schema migration files for `profiles` and `fuel_entries`
- Replace `alert` flows with inline notifications
- Add edit/export/filter capabilities
- Connect the repo to Vercel for production deploy previews
