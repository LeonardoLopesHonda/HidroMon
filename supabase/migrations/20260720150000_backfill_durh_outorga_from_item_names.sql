-- Backfill DURH/outorga identity fields for existing hidrômetros (issue #11).
-- Values parsed from the pre-existing item-name convention
-- ("<nome> - Out<outorga> - DURH<durh>"), which already encoded these
-- numbers before durh_number/outorga_number existed as their own columns.
-- Item ids are the literal ones seeded in 20260520000000_seed_master_data.sql.

update monitored_items set outorga_number = '3892', durh_number = '2450'
    where id = '74bb71a3-45d1-5e29-8e24-45a894d52f68'; -- Captação - Out3892 - DURH2450

update monitored_items set outorga_number = '3892', durh_number = '2450'
    where id = '4ad07ffc-818c-525b-bb54-2ca386044054'; -- Captação NOVO - Out3892 - DURH2450

update monitored_items set outorga_number = '3895', durh_number = '19146'
    where id = '7c414735-143a-514b-a22d-c19dde80b81e'; -- Pavisan 02 - Out3895 - DURH19146

update monitored_items set outorga_number = '4085', durh_number = '20484'
    where id = '9f510b30-d30d-56e6-915f-cc2ef2f4863b'; -- Poço 1 Viveiro - Out4085 - DURH20484

update monitored_items set outorga_number = '4085', durh_number = '20485'
    where id = '3807a67c-aa2a-536c-bd8e-f690f3b4e428'; -- Poço 2 Captação - Out4085 - DURH20485

update monitored_items set outorga_number = '4085', durh_number = '20487'
    where id = '7558b381-b25c-5be3-902b-f316758dd6f0'; -- Poço 4 Novo - Out4085 - DURH20487
