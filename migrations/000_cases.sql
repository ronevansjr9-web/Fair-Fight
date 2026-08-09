-- Canonical case workspace schema. The runner owns the surrounding transaction.
-- Existing schemas fail closed unless every canonical contract is proven compatible.
DO $preflight$
DECLARE
  expected record;
  actual_type text;
  actual_default text;
  actual_not_null boolean;
  id_pk_columns integer;
  id_pk_ok boolean;
  id_default_ok boolean;
  status_constraint_count integer;
  canonical_status_count integer;
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

  -- Do not silently adapt bounded varchar, domains, or other look-alike types.
  FOR expected IN
    SELECT * FROM (VALUES
      ('id', 'text', true, NULL::text),
      ('user_id', 'text', true, NULL::text),
      ('title', 'text', true, NULL::text),
      ('case_type', 'text', true, '''Civil'''),
      ('status', 'text', true, '''active'''),
      ('jurisdiction', 'text', true, ''''''),
      ('description', 'text', true, ''''''),
      ('created_at', 'timestamp with time zone', true, 'now()'),
      ('updated_at', 'timestamp with time zone', true, 'now()')
    ) canonical(name, type_name, required_not_null, default_expr)
  LOOP
    SELECT format_type(a.atttypid, a.atttypmod), pg_get_expr(d.adbin, d.adrelid), a.attnotnull
      INTO actual_type, actual_default, actual_not_null
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
    IF actual_type <> expected.type_name THEN
      RAISE EXCEPTION 'cases schema incompatible: canonical column % has unsupported type %', expected.name, actual_type;
    END IF;
    IF expected.required_not_null AND NOT actual_not_null THEN
      RAISE EXCEPTION 'cases schema incompatible: canonical column % must be NOT NULL', expected.name;
    END IF;
    IF expected.default_expr IS NULL AND actual_default IS NOT NULL THEN
      RAISE EXCEPTION 'cases schema incompatible: canonical column % has an unexpected default', expected.name;
    ELSIF expected.default_expr IS NOT NULL AND (actual_default IS NULL OR (expected.name IN ('case_type','status','jurisdiction','description') AND actual_default NOT IN (expected.default_expr, expected.default_expr || '::text'))) THEN
      RAISE EXCEPTION 'cases schema incompatible: canonical column % has an incompatible default', expected.name;
    END IF;
  END LOOP;

  SELECT count(*) INTO id_pk_columns
    FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'public.cases'::regclass AND i.indisprimary;
  SELECT EXISTS (SELECT 1 FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
    WHERE i.indrelid='public.cases'::regclass AND i.indisprimary AND i.indnkeyatts=1 AND a.attname='id') INTO id_pk_ok;
  SELECT pg_get_expr(d.adbin, d.adrelid) ~* '^md5\(\(random\(\)::text \|\| clock_timestamp\(\)::text\)\)(::text)?$' INTO id_default_ok
    FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid='public.cases'::regclass AND a.attname='id' AND NOT a.attisdropped;
  IF id_pk_columns <> 1 OR NOT id_pk_ok OR NOT COALESCE(id_default_ok, false) THEN
    RAISE EXCEPTION 'cases schema incompatible: id requires a single-column primary key and canonical safe default';
  END IF;

  IF EXISTS (SELECT 1 FROM public.cases WHERE status IS NULL OR status NOT IN ('active','resolved','closed')) THEN
    RAISE EXCEPTION 'cases schema incompatible: status contains unsupported values';
  END IF;
  SELECT count(*) INTO status_constraint_count FROM pg_constraint c
    WHERE c.conrelid='public.cases'::regclass AND c.contype='c' AND pg_get_constraintdef(c.oid) ILIKE '%status%';
  SELECT count(*) INTO canonical_status_count FROM pg_constraint c
    WHERE c.conrelid='public.cases'::regclass AND c.contype='c'
      AND regexp_replace(lower(pg_get_constraintdef(c.oid, true)), '\s+', '', 'g') =
        'check((status=any(array[''active''::text,''resolved''::text,''closed''::text])))';
  IF status_constraint_count > 0 AND canonical_status_count <> 1 THEN
    RAISE EXCEPTION 'cases schema incompatible: existing status constraint is noncanonical';
  ELSIF status_constraint_count = 0 THEN
    ALTER TABLE public.cases ADD CONSTRAINT cases_status_check CHECK (status IN ('active', 'resolved', 'closed'));
  END IF;
END
$preflight$;
CREATE INDEX IF NOT EXISTS cases_user_updated_idx ON public.cases(user_id, updated_at DESC);
