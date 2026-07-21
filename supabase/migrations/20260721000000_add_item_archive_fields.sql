-- Archive metadata for retiring a monitored item: who archived it, when, and why.
-- `disabled` (existing boolean) stays as the flag mobile/web already read; these
-- columns are additive/nullable audit detail kept in sync by the service layer.

alter table monitored_items
    add column archived_at timestamptz,
    add column archived_reason text,
    add column archived_by uuid;
