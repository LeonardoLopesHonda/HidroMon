create table areas (
    id uuid primary key,
    name text not null,
    frequency text not null check (frequency in ('daily', 'weekly')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table monitored_items (
    id uuid primary key,
    area_id uuid not null references areas(id),
    name text not null,
    type text not null check (type in ('hidrometro', 'pluviometro', 'corrego')),
    limite_outorgado numeric(12, 3),
    unit text,
    horas_operacao integer not null default 24,
    corrego_method text check (corrego_method in ('regua', 'tambor')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table readings (
    id uuid primary key,
    item_id uuid not null references monitored_items(id),
    date date not null,
    recorded_at timestamptz not null,
    valor numeric(12, 3),
    nivel numeric(8, 2),
    vazao numeric(10, 4),
    observacoes text,
    created_by uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- since= sync queries hit updated_at on every pull
create index on readings (updated_at);
create index on areas (updated_at);
create index on monitored_items (updated_at);

-- RLS: permissive for authenticated users; FastAPI uses service-role key and bypasses in practice
alter table areas enable row level security;
alter table monitored_items enable row level security;
alter table readings enable row level security;

create policy "authenticated_full_access" on areas for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on monitored_items for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on readings for all to authenticated using (true) with check (true);
