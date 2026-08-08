-- Canonical case workspace schema. The runner owns the surrounding transaction.
-- Existing schemas fail closed unless every canonical column is compatible.
DO $preflight$
DECLARE
  col record;
  expected record;
  actual_type text;
  actual_default text;
  status_ok boolean;
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

  -- text and varchar are deliberately interchangeable for this schema. No other
  -- type (including domains, uuid, or numeric) is silently adapted.
  FOR expected IN
    SELECT * FROM (VALUES
      ('id', 'text-compatible', true, NULL::text),
      ('user_id', 'text-compatible', true, NULL::text),
      ('title', 'text-compatible', true, NULL::text),
      ('case_type', 'text-compatible', true, '''Civil'''),
      ('status', 'text-compatible', true, '''active'''),
      ('jurisdiction', 'text-compatible', true, '''''' ),
      ('description', 'text-compatible', true, '''''' ),
      ('created_at', 'timestamp with time zone', true, 'now()'),
      ('updated_at', 'timestamp with time zone', true, 'now()')
    ) canonical(name, type_kind, required_not_null, default_expr)
  LOOP
    SELECT format_type(a.atttypid, a.atttypmod), a.atttypid::regtype::text,
           pg_get_expr(d.adbin, d.adrelid)
      INTO actual_type, col.type_name, actual_default
      FROM pg_attribute a
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = 'public.cases'::regclass AND a.attname = expected.name
        AND NOT a.attisdropped;
    IF actual_type IS NULL THEN
      IF expected.name IN ('case_type','status','jurisdiction','description','created_at','updated_at') THEN
        IF expected.name = 'case_type' THEN ALTER TABLE public.cases ADD COLUMN case_type TEXT NOT NULL DEFAULT 'Civil';
        ELSIF expected.name = 'status' THEN ALTER TABLE public.cases ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
        ELSIF expected.name = 'jurisdiction' THEN ALTER TABLE public.cases ADD COLUMN jurisdiction TEXT NOT NULL DEFAULT '';
        ELSIF expected.name = 'description' THEN ALTER TABLE public.cases ADD COLUMN description TEXT NOT NULL DEFAULT '';
        ELSIF expected.name = 'created_at' THEN ALTER TABLE public.cases ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
        ELSE ALTER TABLE public.cases ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now(); END IF;
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'cases schema incompatible: canonical column % is missing', expected.name;
    END IF;
    IF expected.type_kind = 'text-compatible' AND actual_type <> 'text' AND actual_type NOT LIKE 'character varying%' THEN
      RAISE EXCEPTION 'cases schema incompatible: canonical column % has unsupported type', expected.name;
    ELSIF expected.type_kind <> 'text-compatible' AND actual_type <> expected.type_kind THEN
      RAISE EXCEPTION 'cases schema incompatible: canonical column % has unsupported type', expected.name;
    END IF;
    IF expected.required_not_null AND NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid='public.cases'::regclass AND attname=expected.name AND attnotnull AND NOT attisdropped) THEN
      RAISE EXCEPTION 'cases schema incompatible: canonical column % must be NOT NULL', expected.name;
    END IF;
    IF expected.default_expr IS NULL AND actual_default IS NOT NULL THEN
      RAISE EXCEPTION 'cases schema incompatible: canonical column % has an unexpected default', expected.name;
    ELSIF expected.default_expr IS NOT NULL AND (actual_default IS NULL OR (expected.name IN ('case_type','status','jurisdiction','description') AND actual_default NOT IN (expected.default_expr, expected.default_expr || '::text'))) THEN
      RAISE EXCEPTION 'cases schema incompatible: canonical column % has an incompatible default', expected.name;
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM public.cases WHERE status IS NULL OR status NOT IN ('active','resolved','closed')) THEN
    RAISE EXCEPTION 'cases schema incompatible: status contains unsupported values';
  END IF;
  SELECT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid='public.cases'::regclass AND c.contype='c'
    AND pg_get_constraintdef(c.oid) ~* 'status.*active.*resolved.*closed') INTO status_ok;
  IF NOT status_ok THEN
    ALTER TABLE public.cases ADD CONSTRAINT cases_status_check CHECK (status IN ('active', 'resolved', 'closed'));
  END IF;
END
$preflight$;
CREATE INDEX IF NOT EXISTS cases_user_updated_idx ON public.cases(user_id, updated_at DESC);
