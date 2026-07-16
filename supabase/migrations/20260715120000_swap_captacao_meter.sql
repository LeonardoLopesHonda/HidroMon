-- Meter swap: "Captação - Out3892 - DURH2450" was physically replaced by
-- "Captação NOVO - Out3892 - DURH2450" (same outorga, same limits, name-only change).
-- The new meter carries a horímetro; the old one is retired.
--
-- updated_at is bumped so the mobile ?since= sync re-pulls both rows and picks up
-- the new flags. Idempotent: safe to re-run.

update monitored_items
    set has_horimetro = true, updated_at = now()
    where name = 'Captação NOVO - Out3892 - DURH2450';

update monitored_items
    set disabled = true, updated_at = now()
    where name = 'Captação - Out3892 - DURH2450';
