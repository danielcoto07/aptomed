-- =====================================================================
-- Preempleo Digital · 02_examen_fisico_y_formato.sql
-- Ajustes según los formatos reales que usaba la Dra.:
--   · Examen físico en el dictamen (obligatorio para firmar).
--   · Código del profesional en el perfil y en el certificado.
--   · Nota "Faltan los resultados..." en el certificado, si el médico la marca
--     (qué laboratorios se piden depende de cada empresa).
--   · Las razones de "No compatible" también van al certificado.
-- Cómo usarlo: Supabase › SQL Editor › New query › pegar todo › Run.
-- Se puede correr más de una vez sin problema.
-- =====================================================================

begin;

-- CLÍNICO: va en dictamenes, que RRHH no puede leer.
alter table public.dictamenes add column if not exists examen_fisico text;

alter table public.perfiles add column if not exists codigo_profesional text;

alter table public.certificados add column if not exists medico_codigo text;
alter table public.certificados add column if not exists nota text;

drop function if exists public.firmar_dictamen(uuid, text, public.aptitud, text);
drop function if exists public.firmar_dictamen(uuid, text, text, public.aptitud, text);

create function public.firmar_dictamen(
  p_preempleo_id   uuid,
  p_texto_final    text,
  p_examen_fisico  text,
  p_aptitud        public.aptitud,
  p_restricciones  text default null,
  p_faltan_laboratorios boolean default false
)
returns public.certificados
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pre     public.preempleos;
  v_perfil  public.perfiles;
  v_nota    text;
  v_cert    public.certificados;
begin
  select * into v_pre from public.preempleos where id = p_preempleo_id for update;

  if v_pre.id is null or v_pre.medico_id is distinct from auth.uid() then
    raise exception 'Solo el médico asignado puede firmar este preempleo.';
  end if;

  if v_pre.estado = 'firmado' then
    raise exception 'Este preempleo ya fue firmado.';
  end if;

  -- Acto médico: sin examen físico registrado no hay firma.
  if coalesce(trim(p_examen_fisico), '') = '' then
    raise exception 'Registre el examen físico antes de firmar.';
  end if;

  if coalesce(trim(p_texto_final), '') = '' then
    raise exception 'El dictamen final no puede estar vacío.';
  end if;

  if p_aptitud in ('apto_con_restricciones', 'no_apto') and coalesce(trim(p_restricciones), '') = '' then
    raise exception 'Indique las recomendaciones o razones para la empresa.';
  end if;

  select * into v_perfil from public.perfiles where id = auth.uid();

  if p_aptitud = 'apto' and p_faltan_laboratorios then
    v_nota := 'Faltan los resultados de los exámenes de laboratorio.';
  end if;

  insert into public.dictamenes as d
    (preempleo_id, texto_final, examen_fisico, aptitud, restricciones_funcionales,
     firmado_en, firmado_por, actualizado_en)
  values
    (p_preempleo_id, p_texto_final, p_examen_fisico, p_aptitud, nullif(trim(p_restricciones), ''),
     now(), auth.uid(), now())
  on conflict (preempleo_id) do update
    set texto_final               = excluded.texto_final,
        examen_fisico             = excluded.examen_fisico,
        aptitud                   = excluded.aptitud,
        restricciones_funcionales = excluded.restricciones_funcionales,
        firmado_en                = excluded.firmado_en,
        firmado_por               = excluded.firmado_por,
        actualizado_en            = excluded.actualizado_en;

  insert into public.certificados
    (preempleo_id, empresa_id, candidato_nombre, candidato_cedula, puesto,
     aptitud, restricciones_funcionales, medico_nombre, medico_codigo, nota)
  values
    (v_pre.id, v_pre.empresa_id, v_pre.candidato_nombre, v_pre.candidato_cedula, v_pre.puesto,
     p_aptitud, nullif(trim(p_restricciones), ''), coalesce(v_perfil.nombre, 'Médico'),
     v_perfil.codigo_profesional, v_nota)
  returning * into v_cert;

  update public.preempleos
     set estado = 'firmado',
         duracion_consulta_seg = case
           when inicio_consulta is not null
             then extract(epoch from (now() - inicio_consulta))::integer
         end
   where id = v_pre.id;

  return v_cert;
end;
$$;

revoke execute on function public.firmar_dictamen(uuid, text, text, public.aptitud, text, boolean) from public, anon;
grant  execute on function public.firmar_dictamen(uuid, text, text, public.aptitud, text, boolean) to authenticated;

commit;

-- Comprobación: debe mostrar 1 fila con examen_fisico = 1 y firma = 1
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'dictamenes' and column_name = 'examen_fisico') as examen_fisico,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'firmar_dictamen') as firma;
