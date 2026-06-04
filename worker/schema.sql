-- AURA SaaS · Multi-tenant Schema (SQLite/D1)

CREATE TABLE IF NOT EXISTS tenants (
  id            TEXT PRIMARY KEY,                 -- e.g. 'clinica-elvira'
  name          TEXT NOT NULL,                    -- 'Clínica Elvira'
  url           TEXT,                             -- la URL original
  city          TEXT,
  address       TEXT,
  whatsapp      TEXT,                             -- 34612345678 (sin +)
  email         TEXT,
  owner_name    TEXT,
  doctor_name   TEXT,
  advisor_name  TEXT DEFAULT 'Adrián',
  advisor_gender TEXT DEFAULT 'm',
  brand_primary TEXT DEFAULT '#5e1a2a',
  brand_accent  TEXT DEFAULT '#D4A574',
  hero_image_url TEXT,
  doctor_image_url TEXT,
  room_image_url TEXT,
  audio_welcome_url TEXT,                          -- nota de voz del asesor
  google_rating REAL DEFAULT 4.87,
  google_reviews INTEGER DEFAULT 0,
  treatments_done INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'demo',               -- 'demo' | 'active' | 'paused'
  plan          TEXT DEFAULT 'trial',
  ai_system_prompt TEXT,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS funnels (
  id            TEXT PRIMARY KEY,                  -- 'clinica-elvira__labios'
  tenant_id     TEXT NOT NULL REFERENCES tenants(id),
  treatment     TEXT NOT NULL,                     -- 'labios','botox','rino','hidratacion','perfilado','ojeras','hilos','depilacion','peelings','generic'
  headline      TEXT,
  subheadline   TEXT,
  lead_magnet   TEXT,
  hero_image_url TEXT,
  result_image_url TEXT,
  price_from    INTEGER,
  quiz_json     TEXT,                              -- JSON con 5 preguntas
  status        TEXT DEFAULT 'active',
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id),
  funnel_id     TEXT REFERENCES funnels(id),
  name          TEXT,
  phone         TEXT,
  email         TEXT,
  treatment     TEXT,
  motivo        TEXT,
  plazo         TEXT,
  objecion      TEXT,
  quiz_score    INTEGER DEFAULT 0,
  temperature   TEXT DEFAULT 'cold',               -- 'hot' | 'warm' | 'cold'
  status        TEXT DEFAULT 'new',                -- 'new'|'chatting'|'booked'|'no_show'|'attended'|'lost'
  source        TEXT,                              -- 'meta','google','direct','other'
  utm_campaign  TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_content   TEXT,
  notes         TEXT,
  last_message_at TEXT,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(tenant_id, status);

CREATE TABLE IF NOT EXISTS messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id     TEXT NOT NULL,
  lead_id       TEXT NOT NULL REFERENCES leads(id),
  role          TEXT NOT NULL,                     -- 'user' | 'assistant' | 'system'
  content       TEXT NOT NULL,
  channel       TEXT DEFAULT 'chat_web',           -- 'chat_web' | 'whatsapp' | 'sms' | 'email'
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages(lead_id, created_at);

CREATE TABLE IF NOT EXISTS appointments (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  lead_id       TEXT NOT NULL REFERENCES leads(id),
  treatment     TEXT,
  date_iso      TEXT NOT NULL,
  duration_min  INTEGER DEFAULT 30,
  status        TEXT DEFAULT 'booked',             -- 'booked'|'confirmed'|'no_show'|'attended'|'cancelled'
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_analyses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id     TEXT NOT NULL,
  lead_id       TEXT NOT NULL REFERENCES leads(id),
  summary       TEXT,
  interest      INTEGER,                            -- 0-100
  objections    TEXT,                               -- JSON array
  next_action   TEXT,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT REFERENCES tenants(id),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  role          TEXT DEFAULT 'owner',               -- 'owner' | 'staff' | 'admin'
  password_hash TEXT,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Disponibilidad: horario por día (0=Dom ... 6=Sáb)
CREATE TABLE IF NOT EXISTS schedule_by_day (
  tenant_id TEXT NOT NULL,
  dow       INTEGER NOT NULL,                  -- 0..6
  is_open   INTEGER DEFAULT 1,
  t1_start  TEXT DEFAULT '10:00',
  t1_end    TEXT DEFAULT '14:00',
  t2_start  TEXT,                              -- tramo tarde opcional (partido)
  t2_end    TEXT,
  PRIMARY KEY (tenant_id, dow)
);

-- Disponibilidad: vacaciones / días cerrados (rangos)
CREATE TABLE IF NOT EXISTS vacations (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL,
  start_date TEXT NOT NULL,                    -- YYYY-MM-DD
  end_date   TEXT NOT NULL,
  reason     TEXT,
  created_at INTEGER
);

-- Seed: tenant demo (Clínica Elvira)
INSERT OR IGNORE INTO tenants (id,name,city,address,whatsapp,doctor_name,advisor_name,brand_primary,brand_accent,google_rating,google_reviews,treatments_done,status,plan,ai_system_prompt)
VALUES ('clinica-elvira','Clínica Elvira','Madrid','Velázquez 84, Madrid','34612345678','Dra. Elvira Mateos','Adrián','#5e1a2a','#D4A574',4.87,312,12347,'active','demo',
'Eres Adrián, asesor de Clínica Elvira en Madrid. Hablas como una persona real desde su móvil, todo minúsculas, sin emojis decorativos, frases cortas. La doctora es Elvira Mateos. La valoración es gratuita 30 min. Tratamientos: labios glow (desde 380€), rino (desde 480€), botox (desde 280€), hidratación (desde 90€).');
