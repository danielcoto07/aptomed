-- =====================================================================
-- AptoMed · 03_historia_editable.sql
-- El médico corrige la historia durante la consulta sin borrar lo que
-- declaró el candidato, y lo clínico queda bloqueado al firmar.
--   · historias.antecedentes sigue siendo la respuesta original.
--   · historias.correcciones guarda solo lo que cambió el médico.
--   · corregir_historia() es el único camino para corregir.
--   · Laboratorios: se cambian solo durante la consulta.
--   · Un preempleo firmado no se puede reabrir ni cambiar.
-- Cómo usarlo: Supabase › SQL Editor › New query › pegar todo › Run.
-- Se puede correr más de una vez sin problema.
-- =====================================================================

begin;

alter table public.historias
  add column if not exists correcciones jsonb not null default '{}'::jsonb;

-- Quita las reglas anteriores por tabla, sin depender de que sus nombres tengan bien los acentos.
do $$
declare
  v_regla record;
begin
  for v_regla in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and (tablename in ('historias', 'resultados_lab')
           or (tablename = 'preempleos' and cmd = 'UPDATE'))
  loop
    execute format('drop policy %I on public.%I', v_regla.policyname, v_regla.tablename);
  end loop;
end;
$$;

-- historias (CLÍNICO): el médico lee; nadie escribe directamente.
create policy "historias: médico lee las suyas"
  on public.historias for select to authenticated
  using (exists (select 1 from public.preempleos p
                 where p.id = preempleo_id and p.medico_id = auth.uid()));

-- resultados_lab (CLÍNICO): el médico lee siempre y cambia solo durante la consulta.
create policy "resultados_lab: médico lee los suyos"
  on public.resultados_lab for select to authenticated
  using (exists (select 1 from public.preempleos p
                 where p.id = preempleo_id and p.medico_id = auth.uid()));
create policy "resultados_lab: médico cambia durante la consulta"
  on public.resultados_lab for all to authenticated
  using (exists (select 1 from public.preempleos p
                 where p.id = preempleo_id and p.medico_id = auth.uid()
                   and p.estado = 'en_valoracion'))
  with check (exists (select 1 from public.preempleos p
                      where p.id = preempleo_id and p.medico_id = auth.uid()
                        and p.estado = 'en_valoracion'));

-- preempleos: firmar solo ocurre con firmar_dictamen(), y lo firmado no se reabre.
create policy "preempleos: médico actualiza los suyos"
  on public.preempleos for update to authenticated
  using (medico_id = auth.uid() and estado <> 'firmado')
  with check (medico_id = auth.uid() and estado <> 'firmado');

-- Corrige un dato de la historia. Si vuelve al valor del candidato, quita la corrección.
create or replace function public.corregir_historia(
  p_preempleo_id  uuid,
  p_ruta          text,
  p_valor         text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pre       public.preempleos;
  v_historia  public.historias;
  v_ruta      text[] := string_to_array(p_ruta, '.');
  v_valor     text := trim(coalesce(p_valor, ''));
  v_original  text;
  v_nuevas    jsonb;
begin
  select * into v_pre from public.preempleos where id = p_preempleo_id for update;

  if v_pre.id is null or v_pre.medico_id is distinct from auth.uid() then
    raise exception 'Solo el médico asignado puede corregir esta historia.';
  end if;

  if v_pre.estado <> 'en_valoracion' then
    raise exception 'La historia solo se puede corregir durante la consulta.';
  end if;

  select * into v_historia from public.historias where preempleo_id = p_preempleo_id;

  if v_historia.preempleo_id is null then
    raise exception 'Este preempleo no tiene historia.';
  end if;

  if v_historia.antecedentes #> v_ruta is null
     or jsonb_typeof(v_historia.antecedentes #> v_ruta) in ('object', 'array') then
    raise exception 'El dato que intenta corregir no existe.';
  end if;

  v_original := trim(coalesce(v_historia.antecedentes #>> v_ruta, ''));

  if v_valor = v_original then
    v_nuevas := v_historia.correcciones - p_ruta;
  else
    v_nuevas := v_historia.correcciones || jsonb_build_object(
      p_ruta,
      jsonb_build_object('valor', v_valor, 'corregido_en', now(), 'corregido_por', auth.uid())
    );
  end if;

  update public.historias set correcciones = v_nuevas where preempleo_id = p_preempleo_id;

  return v_nuevas;
end;
$$;

revoke execute on function public.corregir_historia(uuid, text, text) from public, anon;
grant  execute on function public.corregir_historia(uuid, text, text) to authenticated;

commit;

notify pgrst, 'reload schema';

-- Comprobación: debe mostrar 1 fila con correcciones = 1, funcion = 1 y reglas = 4
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'historias' and column_name = 'correcciones') as correcciones,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'corregir_historia') as funcion,
  (select count(*) from pg_policies
    where schemaname = 'public'
      and policyname in ('historias: médico lee las suyas',
                         'resultados_lab: médico lee los suyos',
                         'resultados_lab: médico cambia durante la consulta',
                         'preempleos: médico actualiza los suyos')) as reglas;
