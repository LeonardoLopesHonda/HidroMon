-- Horímetro: an hour-counter captured per-reading on horímetro-equipped hidrômetros.
-- Disabled: retired items that no longer accept new readings (history preserved).
-- All additive with safe defaults; existing rows backfill to false / null.

alter table monitored_items
    add column has_horimetro boolean not null default false,
    add column disabled boolean not null default false;

alter table readings
    add column horimetro numeric(12, 3);
