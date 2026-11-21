-- Tabela de sincronização do MeUsMe.
-- Idempotente: pode ser executado mais de uma vez.

create table if not exists public.registros (
  usuario uuid not null default auth.uid() references auth.users (id) on delete cascade,
  colecao text not null,
  id text not null,
  dados jsonb,
  apagado boolean not null default false,
  atualizado_em timestamptz not null default now(),
  primary key (usuario, colecao, id)
);

create index if not exists registros_usuario_atualizado on public.registros (usuario, atualizado_em);

-- Limites: protegem o banco de um aparelho com defeito (ou de alguém usando a chave pública fora do app) gravando
-- coleção inventada, identificador enorme ou registro gigante. O app confere os mesmos limites antes de enviar
-- (src/sync/planejar.ts, LIMITES_SERVIDOR) e deixa de fora o que o servidor recusaria.
do $$
begin
  alter table public.registros add constraint registros_colecao_valida
    check (colecao ~ '^(nucleo|financas|agenda|config)\.[A-Za-z0-9]{1,48}$');
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.registros add constraint registros_id_valido check (char_length(id) between 1 and 128);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.registros add constraint registros_dados_ate_256kb
    check (dados is null or octet_length(dados::text) <= 262144);
exception when duplicate_object then null;
end $$;

-- Timestamp definido pelo servidor (independe do relógio do aparelho).
create or replace function public.registros_carimbar() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists registros_carimbar on public.registros;
create trigger registros_carimbar before insert or update on public.registros
  for each row execute function public.registros_carimbar();

-- RLS: cada usuário acessa apenas as próprias linhas.
alter table public.registros enable row level security;

drop policy if exists "dono le" on public.registros;
drop policy if exists "dono grava" on public.registros;
drop policy if exists "dono altera" on public.registros;
create policy "dono le" on public.registros for select to authenticated using (auth.uid() = usuario);
create policy "dono grava" on public.registros for insert to authenticated with check (auth.uid() = usuario);
create policy "dono altera" on public.registros for update to authenticated using (auth.uid() = usuario) with check (auth.uid() = usuario);

-- Exclusão da própria conta e dos dados (exigida pelas lojas).
-- security definer é necessário para remover de auth.users; escopo limitado a auth.uid().
create or replace function public.apagar_minha_conta() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'precisa estar logado';
  end if;
  delete from public.registros where usuario = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.apagar_minha_conta() from public, anon;
grant execute on function public.apagar_minha_conta() to authenticated;

-- Realtime: notifica os outros aparelhos.
do $$
begin
  alter publication supabase_realtime add table public.registros;
exception when duplicate_object then null;
end $$;
