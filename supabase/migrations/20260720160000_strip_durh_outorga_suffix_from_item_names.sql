-- Drop the "- Out<outorga> - DURH<durh>" suffix from hidrômetro names now that
-- those numbers live in their own durh_number/outorga_number columns (see
-- 20260720150000_backfill_durh_outorga_from_item_names.sql) and are surfaced
-- on the item detail page via DurhOutorgaInfo — the suffix is redundant.
-- Item ids are the literal ones seeded in 20260520000000_seed_master_data.sql.

update monitored_items set name = 'Captação'
    where id = '74bb71a3-45d1-5e29-8e24-45a894d52f68'; -- was: Captação - Out3892 - DURH2450

update monitored_items set name = 'Captação NOVO'
    where id = '4ad07ffc-818c-525b-bb54-2ca386044054'; -- was: Captação NOVO - Out3892 - DURH2450

update monitored_items set name = 'Pavisan 02'
    where id = '7c414735-143a-514b-a22d-c19dde80b81e'; -- was: Pavisan 02 - Out3895 - DURH19146

update monitored_items set name = 'Poço 1 Viveiro'
    where id = '9f510b30-d30d-56e6-915f-cc2ef2f4863b'; -- was: Poço 1 Viveiro - Out4085 - DURH20484

update monitored_items set name = 'Poço 2 Captação'
    where id = '3807a67c-aa2a-536c-bd8e-f690f3b4e428'; -- was: Poço 2 Captação - Out4085 - DURH20485

update monitored_items set name = 'Poço 4 Novo'
    where id = '7558b381-b25c-5be3-902b-f316758dd6f0'; -- was: Poço 4 Novo - Out4085 - DURH20487
