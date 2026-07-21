-- REQ-15: Unsent Letter — flag-gated access without Pro tier (Addendum).

UPDATE public.path
SET tier = 'free'
WHERE id = 'c8e1f0a2-4b3d-5e6f-9a0b-1c2d3e4f5a6b'
  AND name = 'The Unsent Letter';
