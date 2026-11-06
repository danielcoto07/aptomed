-- =====================================================================
-- Preempleo Digital · 01_tablas.sql
-- Tablas, seguridad por filas (RLS), función de firma y bucket privado.
-- Cómo usarlo: Supabase › SQL Editor › New query › pegar todo › Run.
-- Se ejecuta UNA sola vez. Va dentro de una transacción: si algo falla,
-- no queda nada a medias.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Tipos (listas cerradas de valores)
-- ---------------------------------------------------------------------
create type public.rol_usuario as enum ('medico', 'rrhh');

create type public.estado_preempleo as enum (
  'pendiente_candidato', 'listo_para_consulta', 'en_valoracion', 'firmado'
);

create type public.aptitud as enum (
  'apto', 'apto_con_restricciones', 'aplazado', 'no_apto'
);

-- ---------------------------------------------------------------------
-- 2. Tablas
-- ---------------------------------------------------------------------

-- Empresas cliente. medico_id = médico de la proveedora que las atiende.
create table public.empresas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  medico_id  uuid references auth.users (id),
  creado_en  timestamptz not null default now()
);

-- Un perfil por usuario con cuenta (médico o RRHH).
create table public.perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text not null,
  rol         public.rol_usuario not null,
  empresa_id  uuid references public.empresas (id),
  creado_en   timestamptz not null default now(),
  constraint rrhh_tiene_empresa check (rol <> 'rrhh' or empresa_id is not null)
);

-- Orden de preempleo. No contiene datos clínicos.
create table public.preempleos (
  id                     uuid primary key default gen_random_uuid(),
  empresa_id             uuid not null references public.empresas (id),
  medico_id              uuid references auth.users (id),
  candidato_nombre       text not null,
  candidato_cedula       text not null,
  puesto                 text not null,
  estado                 public.estado_preempleo not null default 'pendiente_candidato',
  token_candidato        text not null unique
                           default replace(gen_random_uuid()::text, '-', '')
                                || replace(gen_random_uuid()::text, '-', ''),
  token_usado_en         timestamptz,
  inicio_consulta        timestamptz,
  duracion_consulta_seg  integer,
  creado_por             uuid references auth.users (id) default auth.uid(),
  creado_en              timestamptz not null default now()
);

-- CLÍNICO · Historia que llena el candidato.
create table public.historias (
  preempleo_id                uuid primary key references public.preempleos (id) on delete cascade,
  consentimiento_aceptado_en  timestamptz not null,
  antecedentes                jsonb not null default '{}'::jsonb,
  enviado_en                  timestamptz not null default now()
);

-- CLÍNICO · Resultados de laboratorio leídos por la IA (y corregidos por el médico).
create table public.resultados_lab (
  id                   uuid primary key default gen_random_uuid(),
  preempleo_id         uuid not null references public.preempleos (id) on delete cascade,
  archivo_path         text,
  valores              jsonb not null default '[]'::jsonb,
  pruebas_descartadas  jsonb not null default '[]'::jsonb,
  creado_en            timestamptz not null default now()
);

-- CLÍNICO · Dictamen: borrador de la IA, texto final del médico y firma.
create table public.dictamenes (
  preempleo_id               uuid primary key references public.preempleos (id) on delete cascade,
  borrador_ia                text,
  texto_final                text,
  aptitud                    public.aptitud,
  restricciones_funcionales  text,
  firmado_en                 timestamptz,
  firmado_por                uuid references auth.users (id),
  actualizado_en             timestamptz not null default now()
);

-- ÚNICO que ve RRHH. Solo se crea con la función firmar_dictamen().
create table public.certificados (
  id                         uuid primary key default gen_random_uuid(),
  preempleo_id               uuid not null unique references public.preempleos (id) on delete cascade,
  empresa_id                 uuid not null references public.empresas (id),
  candidato_nombre           text not null,
  candidato_cedula           text not null,
  puesto                     text not null,
  aptitud                    public.aptitud not null,
  restricciones_funcionales  text,
  medico_nombre              text not null,
  emitido_en                 timestamptz not null default now(),
  codigo_verificacion        text not null unique
                               default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
);

create index on public.preempleos (empresa_id);
create index on public.preempleos (medico_id);
create index on public.resultados_lab (preempleo_id);
create index on public.certificados (empresa_id);

-- ---------------------------------------------------------------------
-- 3. Al crear una orden, se asigna sola al médico de la empresa y
--    siempre arranca en 'pendiente_candidato' (RRHH no puede elegir).
-- ---------------------------------------------------------------------
create function public.preparar_preempleo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select e.medico_id into new.medico_id
  from public.empresas e
  where e.id = new.empresa_id;

  new.estado := 'pendiente_candidato';
  new.token_usado_en := null;
  new.inicio_consulta := null;
  new.duracion_consulta_seg := null;
  return new;
end;
$$;

create trigger preparar_preempleo
  before insert on public.preempleos
  for each row execute function public.preparar_preempleo();

-- ---------------------------------------------------------------------
-- 4. Funciones de ayuda para las reglas de seguridad
--    (security definer evita que las reglas se llamen a sí mismas en bucle)
-- ---------------------------------------------------------------------
create function public.mi_rol()
returns public.rol_usuario
language sql stable security definer set search_path = ''
as $$ select rol from public.perfiles where id = auth.uid() $$;

create function public.mi_empresa()
returns uuid
language sql stable security definer set search_path = ''
as $$ select empresa_id from public.perfiles where id = auth.uid() $$;

-- ---------------------------------------------------------------------
-- 5. RLS activado en TODAS las tablas
-- ---------------------------------------------------------------------
alter table public.empresas        enable row level security;
alter table public.perfiles        enable row level security;
alter table public.preempleos      enable row level security;
alter table public.historias       enable row level security;
alter table public.resultados_lab  enable row level security;
alter table public.dictamenes      enable row level security;
alter table public.certificados    enable row level security;

-- Los visitantes sin sesión (anon) no tocan ninguna tabla.
-- El formulario del candidato pasa por una ruta del servidor que valida el token.
revoke all on all tables in schema public from anon;

-- empresas: RRHH ve la suya; el médico ve las que atiende.
create policy "empresas: ver la propia o las atendidas"
  on public.empresas for select to authenticated
  using (id = public.mi_empresa() or medico_id = auth.uid());

-- perfiles: cada quien ve solo su propio perfil.
create policy "perfiles: ver el propio"
  on public.perfiles for select to authenticated
  using (id = auth.uid());

-- preempleos
create policy "preempleos: médico ve los suyos"
  on public.preempleos for select to authenticated
  using (medico_id = auth.uid());

create policy "preempleos: médico actualiza los suyos"
  on public.preempleos for update to authenticated
  using (medico_id = auth.uid())
  with check (medico_id = auth.uid());

create policy "preempleos: RRHH ve los de su empresa"
  on public.preempleos for select to authenticated
  using (public.mi_rol() = 'rrhh' and empresa_id = public.mi_empresa());

create policy "preempleos: RRHH crea en su empresa"
  on public.preempleos for insert to authenticated
  with check (public.mi_rol() = 'rrhh' and empresa_id = public.mi_empresa());

-- historias (CLÍNICO): solo el médico del preempleo. RRHH: cero acceso.
create policy "historias: solo el médico del preempleo"
  on public.historias for all to authenticated
  using (exists (select 1 from public.preempleos p
                 where p.id = preempleo_id and p.medico_id = auth.uid()))
  with check (exists (select 1 from public.preempleos p
                      where p.id = preempleo_id and p.medico_id = auth.uid()));

-- resultados_lab (CLÍNICO): solo el médico del preempleo. RRHH: cero acceso.
create policy "resultados_lab: solo el médico del preempleo"
  on public.resultados_lab for all to authenticated
  using (exists (select 1 from public.preempleos p
                 where p.id = preempleo_id and p.medico_id = auth.uid()))
  with check (exists (select 1 from public.preempleos p
                      where p.id = preempleo_id and p.medico_id = auth.uid()));

-- dictamenes (CLÍNICO): el médico lee y edita el borrador, pero NO puede
-- marcarlo como firmado a mano ni editarlo después de firmar.
-- La firma solo ocurre con firmar_dictamen().
create policy "dictamenes: médico lee los suyos"
  on public.dictamenes for select to authenticated
  using (exists (select 1 from public.preempleos p
                 where p.id = preempleo_id and p.medico_id = auth.uid()));

create policy "dictamenes: médico crea borrador sin firmar"
  on public.dictamenes for insert to authenticated
  with check (firmado_en is null and firmado_por is null
              and exists (select 1 from public.preempleos p
                          where p.id = preempleo_id and p.medico_id = auth.uid()));

create policy "dictamenes: médico edita mientras no esté firmado"
  on public.dictamenes for update to authenticated
  using (firmado_en is null
         and exists (select 1 from public.preempleos p
                     where p.id = preempleo_id and p.medico_id = auth.uid()))
  with check (firmado_en is null and firmado_por is null);

-- certificados: RRHH ve los de su empresa; el médico ve los de sus preempleos.
-- Nadie los inserta ni edita directamente (no hay políticas de insert/update/delete).
create policy "certificados: RRHH ve los de su empresa"
  on public.certificados for select to authenticated
  using (public.mi_rol() = 'rrhh' and empresa_id = public.mi_empresa());

create policy "certificados: médico ve los de sus preempleos"
  on public.certificados for select to authenticated
  using (exists (select 1 from public.preempleos p
                 where p.id = preempleo_id and p.medico_id = auth.uid()));

-- ---------------------------------------------------------------------
-- 6. Firma del dictamen: el ÚNICO camino para emitir un certificado.
--    Verifica que quien firma sea el médico del preempleo, guarda el
--    dictamen firmado, crea el certificado (sin datos clínicos) y
--    detiene el cronómetro de la consulta.
-- ---------------------------------------------------------------------
create function public.firmar_dictamen(
  p_preempleo_id   uuid,
  p_texto_final    text,
  p_aptitud        public.aptitud,
  p_restricciones  text default null
)
returns public.certificados
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pre     public.preempleos;
  v_medico  text;
  v_cert    public.certificados;
begin
  select * into v_pre from public.preempleos where id = p_preempleo_id for update;

  if v_pre.id is null or v_pre.medico_id is distinct from auth.uid() then
    raise exception 'Solo el médico asignado puede firmar este preempleo.';
  end if;

  if v_pre.estado = 'firmado' then
    raise exception 'Este preempleo ya fue firmado.';
  end if;

  if coalesce(trim(p_texto_final), '') = '' then
    raise exception 'El dictamen final no puede estar vacío.';
  end if;

  if p_aptitud = 'apto_con_restricciones' and coalesce(trim(p_restricciones), '') = '' then
    raise exception 'Indique las restricciones funcionales.';
  end if;

  select nombre into v_medico from public.perfiles where id = auth.uid();

  insert into public.dictamenes as d
    (preempleo_id, texto_final, aptitud, restricciones_funcionales, firmado_en, firmado_por, actualizado_en)
  values
    (p_preempleo_id, p_texto_final, p_aptitud, nullif(trim(p_restricciones), ''), now(), auth.uid(), now())
  on conflict (preempleo_id) do update
    set texto_final               = excluded.texto_final,
        aptitud                   = excluded.aptitud,
        restricciones_funcionales = excluded.restricciones_funcionales,
        firmado_en                = excluded.firmado_en,
        firmado_por               = excluded.firmado_por,
        actualizado_en            = excluded.actualizado_en;

  insert into public.certificados
    (preempleo_id, empresa_id, candidato_nombre, candidato_cedula, puesto,
     aptitud, restricciones_funcionales, medico_nombre)
  values
    (v_pre.id, v_pre.empresa_id, v_pre.candidato_nombre, v_pre.candidato_cedula, v_pre.puesto,
     p_aptitud, nullif(trim(p_restricciones), ''), coalesce(v_medico, 'Médico'))
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

revoke execute on function public.firmar_dictamen(uuid, text, public.aptitud, text) from public, anon;
grant  execute on function public.firmar_dictamen(uuid, text, public.aptitud, text) to authenticated;

revoke execute on function public.mi_rol() from public, anon;
revoke execute on function public.mi_empresa() from public, anon;
grant  execute on function public.mi_rol() to authenticated;
grant  execute on function public.mi_empresa() to authenticated;

-- ---------------------------------------------------------------------
-- 7. Bucket PRIVADO para archivos de laboratorio.
--    Ruta de cada archivo: <id_del_preempleo>/<nombre_del_archivo>
--    Solo el médico de ese preempleo puede subir o ver sus archivos.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('laboratorios', 'laboratorios', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']);

create policy "laboratorios: médico sube a sus preempleos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'laboratorios'
              and exists (select 1 from public.preempleos p
                          where p.id::text = (storage.foldername(name))[1]
                            and p.medico_id = auth.uid()));

create policy "laboratorios: médico ve los de sus preempleos"
  on storage.objects for select to authenticated
  using (bucket_id = 'laboratorios'
         and exists (select 1 from public.preempleos p
                     where p.id::text = (storage.foldername(name))[1]
                       and p.medico_id = auth.uid()));

commit;

-- ---------------------------------------------------------------------
-- Comprobación: las 7 tablas deben decir rls_activado = true
-- ---------------------------------------------------------------------
select tablename as tabla, rowsecurity as rls_activado
from pg_tables
where schemaname = 'public'
order by tablename;
