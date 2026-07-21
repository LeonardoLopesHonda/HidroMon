# Telos — Monitoramento Ambiental

---

## 🇧🇷 Português

### Sobre o projeto

Sistema de monitoramento ambiental desenvolvido para a **Vetria Mineração S.A.** para substituir planilhas manuais e digitalizar a coleta de dados de campo.

O sistema é composto por dois aplicativos:

- **`mobile/`** — App de campo (React Native + Expo) usado pelo operador para registrar leituras dos instrumentos de monitoramento. Funciona offline e sincroniza com o backend assim que houver sinal.
- **`backend/`** — API (FastAPI + Python) que armazena os dados, serve o painel do supervisor e fornece o contrato de sincronização para o app mobile.

### Contexto de negócio

A empresa opera **Áreas** (propriedades com outorgas de uso de água) que contêm instrumentos de monitoramento ambiental de três tipos:

| Tipo | O que mede | Finalidade |
|---|---|---|
| **Hidrômetro** | Consumo acumulado (m³) | Conformidade com a outorga — consumo mensal não pode ultrapassar o limite outorgado |
| **Pluviômetro** | Precipitação (mm) | Registro observacional para relatórios e correlação com outros dados |
| **Córrego** | Nível (cm) e vazão (m³/s) | Evidência ambiental em área desativada — prova de impacto ou ausência de impacto em auditorias |

O operador de campo registra leituras diariamente (de segunda a sábado) nas áreas ativas, e semanalmente na área desativada. As leituras ficam armazenadas no dispositivo e são enviadas ao backend quando há conexão.

### Estrutura do projeto

```
/
├── mobile/                  # App mobile (Expo + React Native)
│   ├── app/                 # Rotas (Expo Router — file-based)
│   │   ├── _layout.tsx
│   │   ├── auth.tsx
│   │   ├── index.tsx
│   │   └── (app)/
│   │       ├── areas.tsx
│   │       └── [areaId]/
│   │           ├── index.tsx
│   │           └── [type]/
│   │               ├── index.tsx
│   │               └── [itemId]/
│   │                   ├── index.tsx
│   │                   └── form.tsx
│   ├── components/          # Componentes de UI reutilizáveis
│   ├── constants/           # Tema (cores, tipografia, espaçamento)
│   ├── context/             # AppContext — estado global e persistência local
│   ├── data/                # Dados mock para desenvolvimento
│   ├── hooks/               # Hooks customizados
│   └── types/               # Tipos TypeScript do domínio
├── backend/                 # API (FastAPI + Python) — a ser criado
├── docs/
│   └── adr/                 # Decisões de arquitetura
│       ├── 0001-offline-first-sync.md
│       └── 0002-monorepo-structure.md
├── CONTEXT.md               # Glossário e modelo de domínio
└── README.md
```

### Como rodar o app mobile

```bash
cd mobile
bun install
bun start
# Pressione 'w' para web, 'a' para Android, 'i' para iOS
```

---

## 🇺🇸 English

### About

Environmental monitoring system built for **Vetria Mineração S.A.** to replace manual spreadsheets and digitize field data collection.

The system consists of two applications:

- **`mobile/`** — Field app (React Native + Expo) used by the operator to record readings from monitoring instruments. Works offline and syncs to the backend once internet is available.
- **`backend/`** — API (FastAPI + Python) that stores data, serves the supervisor dashboard, and provides the sync contract for the mobile app.

### Business context

The company operates **Áreas** (licensed properties with water-use permits) that contain environmental monitoring instruments of three types:

| Type | Measures | Purpose |
|---|---|---|
| **Hidrômetro** (Water meter) | Cumulative consumption (m³) | Permit compliance — monthly consumption must not exceed the granted limit |
| **Pluviômetro** (Rain gauge) | Precipitation (mm) | Observational record for reports and data correlation |
| **Córrego** (Stream monitor) | Water level (cm) and flow rate (m³/s) | Environmental evidence at decommissioned site — proves impact or absence of impact during audits |

The field operator records readings daily (Monday–Saturday) at active sites, and weekly at the decommissioned site. Readings are stored on the device and pushed to the backend when connectivity is available.

### Project structure

```
/
├── mobile/                  # Mobile app (Expo + React Native)
│   ├── app/                 # Routes (Expo Router — file-based)
│   ├── components/          # Reusable UI components
│   ├── constants/           # Theme (colors, typography, spacing)
│   ├── context/             # AppContext — global state and local persistence
│   ├── data/                # Mock data for development
│   ├── hooks/               # Custom hooks
│   └── types/               # Domain TypeScript types
├── backend/                 # API (FastAPI + Python) — to be scaffolded
├── docs/
│   └── adr/                 # Architecture decision records
│       ├── 0001-offline-first-sync.md
│       └── 0002-monorepo-structure.md
├── CONTEXT.md               # Domain glossary and model
└── README.md
```

### Running the mobile app

```bash
cd mobile
bun install
bun start
# Press 'w' for web, 'a' for Android, 'i' for iOS
```
