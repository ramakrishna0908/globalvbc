-- Seed local volleyball communities.
INSERT INTO communities (name, slug, city) VALUES
  ('Bay Area Volleyball', 'bay-area', 'San Francisco'),
  ('Austin Beach Club', 'austin-beach', 'Austin'),
  ('Seattle Spikers', 'seattle-spikers', 'Seattle')
ON CONFLICT (slug) DO NOTHING;
