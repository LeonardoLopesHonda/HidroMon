-- Seed master data: 2 áreas + 11 monitored_items.
-- UUIDs derived deterministically (uuid5, namespace 00000000-0000-0000-0000-000000000001)
-- from the short string IDs that lived in mobile/data/mockData.ts. Stable across db resets.

insert into areas (id, name, frequency) values
    ('96a201e6-e616-5a32-9f59-1de01d26cdd5', 'Monjolinho', 'daily'),
    ('15821a5b-f5df-54db-89e3-827861e77c6f', 'Laís', 'weekly')
on conflict (id) do nothing;

insert into monitored_items (id, area_id, name, type, limite_outorgado, unit, horas_operacao, corrego_method) values
    -- Monjolinho — hidrômetros (daily)
    ('74bb71a3-45d1-5e29-8e24-45a894d52f68', '96a201e6-e616-5a32-9f59-1de01d26cdd5', 'Captação - Out3892 - DURH2450',         'hidrometro',  22.36, 'm³', 24, null),
    -- Captação NOVO replaced Captação (same outorga/limits). Migration 20260715120000 disables the
    -- old row and sets has_horimetro=true here (that column doesn't exist yet at this migration).
    ('4ad07ffc-818c-525b-bb54-2ca386044054', '96a201e6-e616-5a32-9f59-1de01d26cdd5', 'Captação NOVO - Out3892 - DURH2450',    'hidrometro',  22.36, 'm³', 24, null),
    ('7c414735-143a-514b-a22d-c19dde80b81e', '96a201e6-e616-5a32-9f59-1de01d26cdd5', 'Pavisan 02 - Out3895 - DURH19146',      'hidrometro',  65.00, 'm³', 24, null),
    ('9f510b30-d30d-56e6-915f-cc2ef2f4863b', '96a201e6-e616-5a32-9f59-1de01d26cdd5', 'Poço 1 Viveiro - Out4085 - DURH20484',  'hidrometro',  21.79, 'm³', 20, null),
    ('3807a67c-aa2a-536c-bd8e-f690f3b4e428', '96a201e6-e616-5a32-9f59-1de01d26cdd5', 'Poço 2 Captação - Out4085 - DURH20485', 'hidrometro',  41.89, 'm³', 20, null),
    ('7558b381-b25c-5be3-902b-f316758dd6f0', '96a201e6-e616-5a32-9f59-1de01d26cdd5', 'Poço 4 Novo - Out4085 - DURH20487',     'hidrometro',  16.60, 'm³', 20, null),
    -- Monjolinho — pluviômetro (daily)
    ('520237b6-f63f-564e-9255-1314b4875e59', '96a201e6-e616-5a32-9f59-1de01d26cdd5', 'Pluviômetro Mina Monjolinho',           'pluviometro', null,  'mm', 24, null),
    -- Laís — pluviômetros (weekly)
    ('4f55e8a3-0540-5650-8a5a-aae144e5dbae', '15821a5b-f5df-54db-89e3-827861e77c6f', 'Barragem Sul',                          'pluviometro', null,  'mm', 24, null),
    ('03510c52-7b04-5f9f-8609-9afb11fab966', '15821a5b-f5df-54db-89e3-827861e77c6f', 'Colúvio Sul PRAD',                      'pluviometro', null,  'mm', 24, null),
    ('7718b192-1512-5325-bd66-a40b2c2fbdc7', '15821a5b-f5df-54db-89e3-827861e77c6f', 'Mirante',                               'pluviometro', null,  'mm', 24, null),
    -- Laís — córregos (weekly)
    ('f5bf3e4b-2396-5268-998a-9e1758cf9cb8', '15821a5b-f5df-54db-89e3-827861e77c6f', 'Córrego das Pedras',                    'corrego',     null,  'm',  24, 'regua'),
    ('417b3a92-972b-503a-a8bd-21f0d827c948', '15821a5b-f5df-54db-89e3-827861e77c6f', 'Baia Sul',                              'corrego',     null,  'm',  24, 'regua'),
    ('5860979c-6716-5323-9ed8-76cf950a51a8', '15821a5b-f5df-54db-89e3-827861e77c6f', 'Córrego Arigolândia',                   'corrego',     null,  's',  24, 'tambor')
on conflict (id) do nothing;
