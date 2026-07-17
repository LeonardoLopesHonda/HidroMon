-- IMASUL filing identifiers for hidrômetro capture points.
-- Nullable and additive; meaningless for pluviômetros/córregos, left null there.

alter table monitored_items
    add column durh_number text,
    add column outorga_number text,
    add column barramento_durh text;
