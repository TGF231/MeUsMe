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

-- Cota por conta: até 100 mil registros. Contar as linhas a cada inserção seria lento, então um contador por usuário
-- sobe a cada linha nova e desce quando a linha sai (inclusive no "apagar minha conta", pelo cascade). Atualizar um
-- registro existente não mexe na cota. Uso real de uma pessoa fica muito abaixo disso; o limite só barra abuso.
create table if not exists public.registros_cota (
  usuario uuid primary key references auth.users (id) on delete cascade,
  total integer not null default 0
);
alter table public.registros_cota enable row level security;
-- Sem política: ninguém lê nem grava direto pela API; só as funções abaixo, que rodam como dono da tabela.

create or replace function public.registros_conferir_cota() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  atual integer;
begin
  -- O app grava com upsert: o gatilho de inserção dispara mesmo quando a linha já existe e vira atualização.
  -- Linha que já existe não ocupa cota nova.
  if exists (select 1 from public.registros r where r.usuario = new.usuario and r.colecao = new.colecao and r.id = new.id) then
    return new;
  end if;
  insert into public.registros_cota (usuario, total) values (new.usuario, 0) on conflict (usuario) do nothing;
  select total into atual from public.registros_cota where usuario = new.usuario for update;
  if atual >= 100000 then
    raise exception 'cota de 100000 registros atingida' using errcode = 'P0001';
  end if;
  update public.registros_cota set total = total + 1 where usuario = new.usuario;
  return new;
end;
$$;

create or replace function public.registros_liberar_cota() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.registros_cota set total = greatest(total - 1, 0) where usuario = old.usuario;
  return old;
end;
$$;

drop trigger if exists registros_conferir_cota on public.registros;
create trigger registros_conferir_cota before insert on public.registros
  for each row execute function public.registros_conferir_cota();
drop trigger if exists registros_liberar_cota on public.registros;
create trigger registros_liberar_cota after delete on public.registros
  for each row execute function public.registros_liberar_cota();

-- Contas que já tinham registros antes da cota: o contador começa no total atual.
insert into public.registros_cota (usuario, total)
  select usuario, count(*) from public.registros group by usuario
  on conflict (usuario) do update set total = excluded.total;

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
