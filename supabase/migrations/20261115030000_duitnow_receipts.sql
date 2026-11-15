-- DuitNow 收款码和收据。可以重复执行。
-- 不要改店名、号码或已经保存的订单。
--
-- 匿名可以读 settings。所以下单策略直接看 duitnow_qr_url：
-- 有收款码时，收据路径必须有内容；没有收款码时，收据可以空着。
-- 已登录的妈妈不受这条限制。
-- 收据桶是私有的。匿名只能上传，不能读、改、删。妈妈登录后用签名链接查看。

alter table public.settings
  add column if not exists duitnow_qr_url text;

alter table public.orders
  add column if not exists receipt_path text;

comment on column public.settings.duitnow_qr_url is 'DuitNow 收款码的公开图片地址。空着表示下单不用收据。';
comment on column public.orders.receipt_path is '私有 receipts 桶里的对象名，或演示模式的 data URL。';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists receipts_anon_insert on storage.objects;
create policy receipts_anon_insert
on storage.objects
for insert
to anon
with check (bucket_id = 'receipts');

drop policy if exists receipts_auth_select on storage.objects;
create policy receipts_auth_select
on storage.objects
for select
to authenticated
using (bucket_id = 'receipts');

drop policy if exists orders_anon_insert on public.orders;
create policy orders_anon_insert
on public.orders
for insert
to anon
with check (
  status = '待确认'
  and (
    (receipt_path is not null and length(btrim(receipt_path)) > 0)
    or not exists (
      select 1
      from public.settings
      where id = 1
        and duitnow_qr_url is not null
        and length(btrim(duitnow_qr_url)) > 0
    )
  )
);
