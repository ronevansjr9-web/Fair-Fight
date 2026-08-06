-- Canonical case workspace schema. Execute this file as one transaction.
-- This migration is intentionally conservative for databases that predate it:
-- it adds only nullable/defaulted columns that can be backfilled without guessing.
-- Existing cases.id, cases.user_id, cases.title, and their required constraints must
-- already be compatible; otherwise the transaction aborts before changing the table.
BEGIN;

DO $preflight$
DECLARE
  col record;
  id_type text;
  has_primary_key boolean;
  invalid_statuses bigint;
BEGIN
  IF to_regclass('public.cases') IS NULL THEN
    CREATE TABLE public.cases (
      id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      case_type TEXT NOT NULL DEFAULT 'Civil',
      status TEXT NOT NULL DEFAULT 'active',
      jurisdiction TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT cases_status_check CHECK (status IN ('active', 'resolved', 'closed'))
    );
    RETURN;
  END IF;

  -- Text and varchar IDs are the only legacy representations accepted. Numeric,
  -- UUID, nullable, or unkeyed IDs are rejected rather than silently adapted.
  SELECT format_type(a.atttypid, a.atttypmod) INTO id_type
  FROM pg_attribute a
  WHERE a.attrelid = 'public.cases'::regclass AND a.attname = 'id' AND NOT a.attisdropped;
  IF id_type IS NULL OR id_type NOT IN ('text', 'character varying') THEN
    RAISE EXCEPTION 'cases schema incompatible: id must be a non-null text-compatible key';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public.cases'::regclass AND c.contype = 'p'
      AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = c.conrelid AND attname = 'id' AND NOT attisdropped)]::smallint[]
  ) INTO has_primary_key;
  IF NOT has_primary_key THEN
    RAISE EXCEPTION 'cases schema incompatible: id must have a single-column primary key';
  END IF;

  FOR col IN SELECT * FROM (VALUES ('user_id'), ('title')) required_columns(name) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.cases'::regclass AND attname = col.name AND NOT attisdropped) THEN
      RAISE EXCEPTION 'cases schema incompatible: required column is missing';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_attribute a JOIN pg_type t ON t.oid = a.atttypid
      WHERE a.attrelid = 'public.cases'::regclass AND a.attname = col.name AND NOT a.attisdropped
        AND t.typname IN ('text', 'varchar') AND a.attnotnull
    ) THEN
      RAISE EXCEPTION 'cases schema incompatible: required column type or nullability is unsupported';
    END IF;
  END LOOP;

  -- These additions are safe: every row receives the declared constant/default.
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.cases'::regclass AND attname = 'case_type' AND NOT attisdropped) THEN ALTER TABLE public.cases ADD COLUMN case_type TEXT NOT NULL DEFAULT 'Civil'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.cases'::regclass AND attname = 'status' AND NOT attisdropped) THEN ALTER TABLE public.cases ADD COLUMN status TEXT NOT NULL DEFAULT 'active'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.cases'::regclass AND attname = 'jurisdiction' AND NOT attisdropped) THEN ALTER TABLE public.cases ADD COLUMN jurisdiction TEXT NOT NULL DEFAULT ''; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.cases'::regclass AND attname = 'description' AND NOT attisdropped) THEN ALTER TABLE public.cases ADD COLUMN description TEXT NOT NULL DEFAULT ''; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.cases'::regclass AND attname = 'created_at' AND NOT attisdropped) THEN ALTER TABLE public.cases ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.cases'::regclass AND attname = 'updated_at' AND NOT attisdropped) THEN ALTER TABLE public.cases ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now(); END IF;

  SELECT count(*) INTO invalid_statuses FROM public.cases WHERE status IS NULL OR status NOT IN ('active', 'resolved', 'closed');
  IF invalid_statuses > 0 THEN RAISE EXCEPTION 'cases schema incompatible: status contains unsupported values'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.cases'::regclass AND conname = 'cases_status_check') THEN
    ALTER TABLE public.cases ADD CONSTRAINT cases_status_check CHECK (status IN ('active', 'resolved', 'closed'));
  END IF;
END
$preflight$;

CREATE INDEX IF NOT EXISTS cases_user_updated_idx ON public.cases(user_id, updated_at DESC);
COMMIT;
