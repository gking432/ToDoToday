-- Enable Supabase Realtime for the four sync tables.
-- Run this once in your Supabase SQL Editor.
-- Without this, the postgres_changes subscriptions in hooks/useRealtimeSync.ts
-- silently never fire and live cross-device updates don't propagate.

ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE journal_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
