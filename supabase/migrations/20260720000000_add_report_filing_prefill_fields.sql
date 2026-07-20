-- Last-used Técnico Responsável / CREA for the IMASUL report dialog, so the
-- next generation on this item prefills instead of asking again.
-- Nullable and additive; meaningless until a report has been generated once.

alter table monitored_items
    add column last_tecnico_responsavel text,
    add column last_crea text;
