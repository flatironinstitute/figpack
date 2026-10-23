-- Migration number: 0011 	 2026-10-23T00:00:00.000Z

-- Provenance of figures made by POST /figures/copy (NULL for uploaded figures).
--   copied_from_url         → the figure this one was copied from
--   copied_from_owner_email → owner of that figure at copy time (NULL if it was an anonymous ephemeral upload)
--   original_url            → the first figure in the chain of copies
--   original_owner_email    → owner of that first figure (NULL if it was an anonymous ephemeral upload)
ALTER TABLE figures ADD COLUMN copied_from_url TEXT;
ALTER TABLE figures ADD COLUMN copied_from_owner_email TEXT;
ALTER TABLE figures ADD COLUMN original_url TEXT;
ALTER TABLE figures ADD COLUMN original_owner_email TEXT;
