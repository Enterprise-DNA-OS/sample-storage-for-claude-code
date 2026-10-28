create table storage_units (
 id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
 min_c numeric not null, max_c numeric not null, check(min_c < max_c),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table boxes (
 id uuid primary key default gen_random_uuid(), code text not null unique,
 storage_unit_id uuid not null references storage_units, rows integer not null check(rows between 1 and 100),
 columns integer not null check(columns between 1 and 100),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table samples (
 id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, material text not null,
 quantity numeric(18,6) check(quantity >= 0), unit text check(unit in ('mL','uL','g','mg','count')),
 owner text not null default '', review_due date, expires date,
 status text not null default 'unverified' check(status in ('unverified','stored','checked_out','consumed','disposed')),
 box_id uuid references boxes, position integer check(position > 0), parent_id uuid references samples,
 held boolean not null default false, hold_reason text not null default '',
 borrower text, return_due date, freeze_thaws integer not null default 0 check(freeze_thaws>=0),
 source text, source_key text, source_row jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(source,source_key), check(parent_id is distinct from id),
 check((box_id is null) = (position is null)),
 check(quantity is null or unit is not null), check(unit is distinct from 'count' or quantity=trunc(quantity)),
 check(not held or length(trim(hold_reason))>0),
 check(status not in ('stored','checked_out') or (box_id is not null and quantity>0 and unit is not null and length(trim(owner))>0 and review_due is not null)),
 check((status='checked_out') = (borrower is not null and return_due is not null)),
 check(status not in ('disposed','consumed') or (box_id is null and position is null)),
 check(status!='consumed' or quantity=0)
);
create unique index reserved_slot on samples(box_id,position) where box_id is not null;
create table observations (
 id uuid primary key default gen_random_uuid(), storage_unit_id uuid not null references storage_units,
 temperature_c numeric not null, observed_at timestamptz not null, actor text not null, note text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table events (
 id uuid primary key default gen_random_uuid(), sample_id uuid references samples,
 action text not null, actor text not null check(length(trim(actor))>0), note text not null,
 before_record jsonb, after_record jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table imports (
 id uuid primary key default gen_random_uuid(), source text not null, filename text not null, digest text not null,
 row_count integer not null, actor text not null, raw_csv text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function touch_record() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
create function immutable_record() returns trigger language plpgsql as $$ begin raise exception 'History records are append-only'; end $$;
create function validate_position() returns trigger language plpgsql as $$
declare capacity integer;
begin
 if new.box_id is not null then
  select rows*columns into capacity from boxes where id=new.box_id;
  if new.position>capacity then raise exception 'Position exceeds box capacity';end if;
 end if;
 return new;
end $$;
create trigger sample_position before insert or update on samples for each row execute function validate_position();
DO $$ declare t text;begin
 foreach t in array array['storage_units','boxes','samples','observations','events','imports'] loop
  execute format('create trigger touch_updated before update on %I for each row execute function touch_record()',t);
  execute format('alter table %I enable row level security',t);
  execute format('revoke all on %I from public',t);
 end loop;
 foreach t in array array['events','imports','observations'] loop
  execute format('create trigger immutable before update or delete on %I for each row execute function immutable_record()',t);
 end loop;
end $$;
create view sample_inventory as
 select s.id,s.code,s.name,s.material,s.quantity,s.unit,s.status,s.owner,u.code as freezer,b.code as box,s.position,
 s.held,s.hold_reason,s.expires,s.review_due,s.borrower,s.return_due,s.freeze_thaws,s.parent_id
 from samples s left join boxes b on b.id=s.box_id left join storage_units u on u.id=b.storage_unit_id;
create view returns_due as select code,name,borrower,return_due,current_date-return_due as days_late,box,position,held
 from sample_inventory where status='checked_out';
create view storage_capacity as
 select b.id,b.code as box,u.code as freezer,b.rows*b.columns as capacity,count(s.id)::int as reserved,
 (b.rows*b.columns-count(s.id))::int as available
 from boxes b join storage_units u on u.id=b.storage_unit_id left join samples s on s.box_id=b.id
 group by b.id,b.code,u.code,b.rows,b.columns;
create view attention as
 select code,name,'Return overdue'::text as issue,borrower as responsible,return_due as due from samples where status='checked_out' and return_due<current_date
 union all select code,name,'Inventory review due',owner,review_due from samples where status in ('stored','checked_out') and review_due<current_date
 union all select code,name,'Expiry within 30 days',owner,expires from samples where status in ('stored','checked_out') and expires<=current_date+30
 union all select code,name,'Hold: '||hold_reason,owner,null::date from samples where held and status not in ('consumed','disposed')
 union all select code,name,'Imported record needs reconciliation',owner,null::date from samples where status='unverified';
create view storage_conditions as
 select u.id,u.code,u.name,u.min_c,u.max_c,o.temperature_c,o.observed_at,
 case when o.id is null then 'No reading'
 when o.observed_at<now()-interval '24 hours' then 'Reading older than 24 hours'
 when o.temperature_c<u.min_c or o.temperature_c>u.max_c then 'Outside local range'
 else 'Within local range' end as finding
 from storage_units u left join lateral (select * from observations where storage_unit_id=u.id order by observed_at desc,created_at desc limit 1) o on true;
revoke all on sample_inventory,returns_due,storage_capacity,attention,storage_conditions from public;
