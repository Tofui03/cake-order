-- 妈妈的蛋糕
-- 可以重复执行。不会改掉已经保存的店名、号码或蛋糕价格。
-- 在 Supabase SQL Editor 里整段运行。

create table if not exists public.settings (
  id smallint primary key default 1,
  shop_name text not null,
  whatsapp text not null,
  constraint settings_singleton check (id = 1),
  constraint settings_shop_name_len check (char_length(shop_name) between 1 and 40),
  constraint settings_whatsapp_digits check (whatsapp ~ '^[0-9]{8,20}$')
);

create table if not exists public.cakes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10, 2) not null,
  photo_url text,
  emoji text not null default '🎂',
  color text not null default '#f0e0d4',
  active boolean not null default true,
  sort_order integer not null default 0,
  constraint cakes_name_len check (char_length(name) between 1 and 40),
  constraint cakes_price_positive check (price > 0 and price < 100000)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null,
  customer_name text not null,
  phone text not null,
  pickup_date date not null,
  fulfillment text not null,
  items jsonb not null,
  total numeric(10, 2) not null,
  status text not null default '待确认',
  created_at timestamptz not null default now(),
  constraint orders_name_len check (char_length(customer_name) between 1 and 40),
  constraint orders_phone_len check (char_length(phone) between 1 and 30),
  constraint orders_order_no_len check (char_length(order_no) between 4 and 8),
  constraint orders_fulfillment check (fulfillment in ('自取', '送货')),
  constraint orders_status check (status in ('待确认', '已确认', '已完成', '取消')),
  constraint orders_items_array check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 20),
  constraint orders_total_nonnegative check (total >= 0 and total < 100000)
);

create index if not exists orders_pickup_date_idx on public.orders (pickup_date);
create index if not exists cakes_sort_idx on public.cakes (sort_order);

comment on table public.settings is '店名和 WhatsApp 号码。匿名可读。';
comment on table public.cakes is '在售蛋糕。匿名只能看见 active = true。';
comment on table public.orders is '客人订单。匿名只能新增待确认，不能读取。';
comment on column public.orders.items is 'jsonb 数组：[{cakeId,name,qty,price}]，下单时的名称和价格。';

alter table public.settings enable row level security;
alter table public.cakes enable row level security;
alter table public.orders enable row level security;

drop policy if exists settings_anon_select on public.settings;
create policy settings_anon_select on public.settings
  for select to anon
  using (true);

drop policy if exists settings_auth_all on public.settings;
create policy settings_auth_all on public.settings
  for all to authenticated
  using (true)
  with check (true);

drop policy if exists cakes_anon_select_active on public.cakes;
create policy cakes_anon_select_active on public.cakes
  for select to anon
  using (active = true);

drop policy if exists cakes_auth_all on public.cakes;
create policy cakes_auth_all on public.cakes
  for all to authenticated
  using (true)
  with check (true);

drop policy if exists orders_anon_insert on public.orders;
create policy orders_anon_insert on public.orders
  for insert to anon
  with check (status = '待确认');

drop policy if exists orders_auth_all on public.orders;
create policy orders_auth_all on public.orders
  for all to authenticated
  using (true)
  with check (true);

revoke all on table public.settings from PUBLIC;
revoke all on table public.cakes from PUBLIC;
revoke all on table public.orders from PUBLIC;

revoke all on table public.settings from anon;
revoke all on table public.cakes from anon;
revoke all on table public.orders from anon;

grant select on table public.settings to anon;
grant select on table public.cakes to anon;
grant insert on table public.orders to anon;

grant select, insert, update, delete on table public.settings to authenticated;
grant select, insert, update, delete on table public.cakes to authenticated;
grant select, insert, update, delete on table public.orders to authenticated;

insert into public.settings (id, shop_name, whatsapp)
values (1, '妈妈的蛋糕', '60123456789')
on conflict (id) do nothing;

insert into public.cakes (id, name, price, photo_url, emoji, color, active, sort_order)
values
  ('a1111111-1111-4111-8111-111111111111', '巧克力蛋糕 6寸', 68, null, '🍫', '#f0e0d4', true, 1),
  ('a2222222-2222-4222-8222-222222222222', '芝士蛋糕 6寸', 75, null, '🧀', '#fbf0cf', true, 2),
  ('a3333333-3333-4333-8333-333333333333', '班兰戚风', 45, null, '🌿', '#e2f1dc', true, 3),
  ('a4444444-4444-4444-8444-444444444444', '草莓鲜奶油 8寸', 98, null, '🍓', '#fbe1e4', true, 4),
  ('a5555555-5555-4555-8555-555555555555', '杯子蛋糕（6个）', 30, null, '🧁', '#ece3f6', true, 5)
on conflict (id) do nothing;

-- 公开桶：知道链接就能看照片。不给匿名 list 权限，避免被人翻目录。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cake-photos',
  'cake-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists cake_photos_insert on storage.objects;
create policy cake_photos_insert
on storage.objects
for insert
to authenticated
with check (bucket_id = 'cake-photos');

drop policy if exists cake_photos_select_own on storage.objects;
create policy cake_photos_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cake-photos'
  and owner_id = (select auth.uid()::text)
);

drop policy if exists cake_photos_update_own on storage.objects;
create policy cake_photos_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'cake-photos'
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'cake-photos'
  and owner_id = (select auth.uid()::text)
);

drop policy if exists cake_photos_delete_own on storage.objects;
create policy cake_photos_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cake-photos'
  and owner_id = (select auth.uid()::text)
);
