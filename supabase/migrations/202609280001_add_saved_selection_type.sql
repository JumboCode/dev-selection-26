-- "Saved" is a team's private shortlist: it neither selects nor waitlists the
-- developer, and submission/approval counts ignore it. Kept in its own
-- migration because a new enum value can't be used in the transaction that
-- adds it.
alter type public.developer_selection_type add value if not exists 'saved';
