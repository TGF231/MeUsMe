-- MeUsMe: tabela de sincronização entre aparelhos.
-- Cole tudo no SQL Editor do seu projeto Supabase e clique em "Run". Pode rodar de novo sem problema.

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

-- O horário de cada mudança vem do servidor, nunca do relógio do aparelho.
create or replace function public.registros_carimbar() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists registros_carimbar on public.registros;
create trigger registros_carimbar before insert or update on public.registros
  for each row execute function public.registros_carimbar();

-- Segurança: cada pessoa só enxerga e altera as próprias linhas.
alter table public.registros enable row level security;

drop policy if exists "dono le" on public.registros;
drop policy if exists "dono grava" on public.registros;
drop policy if exists "dono altera" on public.registros;
create policy "dono le" on public.registros for select to authenticated using (auth.uid() = usuario);
create policy "dono grava" on public.registros for insert to authenticated with check (auth.uid() = usuario);
create policy "dono altera" on public.registros for update to authenticated using (auth.uid() = usuario) with check (auth.uid() = usuario);

-- Apagar a própria conta e tudo o que está no servidor, de dentro do app (exigência do Google Play e da App Store).
-- Roda com permissão elevada só para apagar o próprio usuário: auth.uid() vem do login de quem chamou.
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

-- Tempo real: avisa os outros aparelhos assim que algo muda.
do $$
begin
  alter publication supabase_realtime add table public.registros;
exception when duplicate_object then null;
end $$;
