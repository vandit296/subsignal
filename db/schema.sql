-- Central index — Step 1 schema. Run once in the Neon SQL editor.
-- (pgvector column is added now but unused until Step 2.)

create extension if not exists vector;

create table if not exists posts (
  id           text primary key,         -- reddit post id (t3_...)
  subreddit    text not null,
  title        text not null,
  selftext     text default '',
  permalink    text,
  score        int default 0,
  num_comments int default 0,
  created_utc  bigint,
  ingested_at  timestamptz default now(),
  -- full-text search vector (Step 1)
  tsv tsvector generated always as (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(selftext,''))
  ) stored
  -- embedding vector(1536) will be added in Step 2
);

create index if not exists posts_tsv_idx     on posts using gin (tsv);
create index if not exists posts_created_idx on posts (created_utc desc);
create index if not exists posts_sub_idx     on posts (subreddit);
