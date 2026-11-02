-- 0002_feed: store the feed (30 simulated social-media reactions) with each judgment.
--
-- What:   one nullable jsonb column, judgments.feed, holding a FeedResult (lib/feed.ts).
-- Why:    the grade is now sharks 70% + feed 30% (docs/DECISIONS.md F2), and the share page shows the feed's
--         counts and best one-liners. Without the column the app still works: the feed is just not saved,
--         and shared verdicts fall back to the sharks-only grade.
-- Apply:  Supabase dashboard > SQL Editor > paste this file > Run. Safe to run twice (if not exists).
-- Verify: the checks at the bottom return as noted. Then grade one idea and confirm the new row has feed set.
-- Undo:   alter table public.judgments drop column feed;   (loses saved feeds; verdicts keep working)

alter table public.judgments add column if not exists feed jsonb; -- FeedResult; null until the feed finishes

comment on column public.judgments.feed is
  'FeedResult (lib/feed.ts): 30 simulated people, both rounds, counts, score 0-100. Written once by /api/feed.';

-- RLS is already on with no policies (0001), so the new column is as locked as the rest of the row.

-- Checks after running:
--   select column_name, data_type from information_schema.columns
--     where table_schema = 'public' and table_name = 'judgments' and column_name = 'feed';   -- feed | jsonb
--   select count(*) from public.judgments where feed is not null;                           -- 0 right after applying
