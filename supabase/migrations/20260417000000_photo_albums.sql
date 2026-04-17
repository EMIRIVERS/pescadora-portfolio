-- Photo albums for portfolio photography section
create table if not exists photo_albums (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  label       text not null,
  sort_order  integer not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Individual photos inside an album
create table if not exists portfolio_photos (
  id            uuid primary key default gen_random_uuid(),
  album_id      uuid not null references photo_albums(id) on delete cascade,
  storage_path  text not null,           -- relative path inside the "media" bucket
  alt_text      text not null default '',
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

-- RLS
alter table photo_albums     enable row level security;
alter table portfolio_photos enable row level security;

-- Public can read visible albums
create policy "Public read photo_albums" on photo_albums
  for select using (is_visible = true);

-- Public can read photos from visible albums
create policy "Public read portfolio_photos" on portfolio_photos
  for select using (
    exists (
      select 1 from photo_albums a
      where a.id = portfolio_photos.album_id and a.is_visible = true
    )
  );
