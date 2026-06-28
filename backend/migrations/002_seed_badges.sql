-- Seed the initial recognition badges. criteria_json is { metric, gte }
-- evaluated by services/badgeEngine.js against computeMetrics().

INSERT INTO badges (key, name, description, icon, criteria_json) VALUES
  ('rising_star', 'Rising Star', 'Recorded your first match.', '🌟',
   '{"metric":"matches_played","gte":1}'),
  ('top_server', 'Top Server', 'Reached a serving rating of 70+.', '🎯',
   '{"metric":"serving","gte":70}'),
  ('consistent_performer', 'Consistent Performer', 'Won 3 matches in a row.', '🔥',
   '{"metric":"win_streak","gte":3}'),
  ('community_favorite', 'Community Favorite', 'Played 10 matches in your community.', '💛',
   '{"metric":"matches_played","gte":10}'),
  ('tournament_mvp', 'Tournament MVP', 'Earned MVP in a match.', '🏆',
   '{"metric":"mvp_count","gte":1}')
ON CONFLICT (key) DO NOTHING;
