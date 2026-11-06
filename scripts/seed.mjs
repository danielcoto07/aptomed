// Carga los datos de demostración en Supabase. Todo es FICTICIO.
// Uso: npm run seed   (lee las claves y usuarios de prueba de .env.local)
// Se puede correr varias veces: primero borra la demo anterior y la vuelve a crear.

import { createClient } from "@supabase/supabase-js";

const requeridas = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "DEMO_MEDICO_EMAIL",
  "DEMO_MEDICO_PASSWORD",
  "DEMO_RRHH_EMAIL",
  "DEMO_RRHH_PASSWORD",
];
const faltan = requeridas.filter((k) => !process.env[k]);
if (faltan.length) {
  console.error("Faltan variables en .env.local:", faltan.join(", "));
  process.exit(1);
}

const env = process.env;
// La clave secreta salta RLS: este script solo corre en tu computadora, nunca en el navegador.
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EMPRESA = "Constructora Demo S.A.";
const EMPRESA_2 = "Logística del Valle S.A.";

function check(error, paso) {
  if (error) {
    console.error(`Error en "${paso}":`, error.message);
    process.exit(1);
  }
}

const haceMinutos = (min) => new Date(Date.now() - min * 60_000).toISOString();

// ---------------------------------------------------------------------
// 1. Borrar la demo anterior (orden importa por las llaves foráneas)
// ---------------------------------------------------------------------
async function limpiar() {
  // El bucket solo tiene archivos de la demo: no deben quedar huérfanos.
  const { data: carpetas } = await admin.storage.from("laboratorios").list("", { limit: 1000 });
  for (const carpeta of carpetas ?? []) {
    const { data: archivos } = await admin.storage.from("laboratorios").list(carpeta.name, { limit: 1000 });
    const rutas = (archivos ?? []).map((a) => `${carpeta.name}/${a.name}`);
    if (rutas.length) await admin.storage.from("laboratorios").remove(rutas);
  }

  const { data: empresas, error } = await admin.from("empresas").select("id").in("nombre", [EMPRESA, EMPRESA_2]);
  check(error, "buscar empresa");
  for (const e of empresas) {
    check((await admin.from("preempleos").delete().eq("empresa_id", e.id)).error, "borrar preempleos");
    check((await admin.from("perfiles").delete().eq("empresa_id", e.id)).error, "borrar perfiles de RRHH");
    check((await admin.from("empresas").delete().eq("id", e.id)).error, "borrar empresa");
  }

  const { data: lista, error: e2 } = await admin.auth.admin.listUsers({ perPage: 1000 });
  check(e2, "listar usuarios");
  const correos = [env.DEMO_MEDICO_EMAIL, env.DEMO_RRHH_EMAIL].map((c) => c.toLowerCase());
  for (const u of lista.users.filter((u) => correos.includes(u.email?.toLowerCase()))) {
    check((await admin.auth.admin.deleteUser(u.id)).error, "borrar usuario");
  }
}

async function crearUsuario(email, password) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  check(error, `crear usuario ${email}`);
  return data.user.id;
}

// Inserta un preempleo y lo deja en el estado indicado.
// (El trigger de la base siempre lo crea como 'pendiente_candidato'.)
async function crearPreempleo(empresaId, rrhhId, datos, estado, extra = {}) {
  const { data, error } = await admin
    .from("preempleos")
    .insert({ empresa_id: empresaId, creado_por: rrhhId, ...datos })
    .select()
    .single();
  check(error, `crear preempleo ${datos.candidato_nombre}`);
  if (estado !== "pendiente_candidato" || Object.keys(extra).length) {
    check(
      (await admin.from("preempleos").update({ estado, ...extra }).eq("id", data.id)).error,
      "actualizar estado",
    );
  }
  return data.id;
}

// ---------------------------------------------------------------------
// Historias clínicas ficticias
// ---------------------------------------------------------------------
const historiaCarlos = {
  datos_generales: {
    edad: 34,
    sexo: "Masculino",
    estado_civil: "Unión libre",
    escolaridad: "Secundaria completa",
    lateralidad: "Diestro",
  },
  antecedentes_personales: {
    patologicos: ["Lumbalgia mecánica en 2023, tratada con fisioterapia. Sin recurrencias."],
    quirurgicos: ["Apendicectomía (2012)."],
    traumaticos: ["Esguince de tobillo derecho (2019), sin secuelas."],
    alergias: ["Ninguna conocida."],
    medicamentos: ["Ninguno de uso habitual."],
    hospitalizaciones: ["Por la apendicectomía (2012)."],
  },
  antecedentes_familiares: ["Padre con diabetes tipo 2.", "Madre con hipertensión arterial."],
  antecedentes_laborales: [
    {
      empresa: "Constructora Valle Central",
      puesto: "Ayudante de construcción",
      tiempo: "4 años",
      riesgos: "Cargas, trabajo a la intemperie, ruido",
      accidentes: "Ninguno",
    },
    {
      empresa: "Andamios del Este",
      puesto: "Armador de andamios",
      tiempo: "2 años",
      riesgos: "Trabajo en alturas (hasta 12 m), cargas",
      accidentes: "Ninguno",
    },
  ],
  habitos: {
    tabaco: "Sí, 5 cigarrillos al día desde hace 10 años",
    alcohol: "Social, fines de semana",
    actividad_fisica: "Fútbol 1 vez por semana",
    sueno: "6 horas por noche",
  },
  sintomas_actuales: {
    vertigo_o_mareos: "No",
    dolor_de_espalda: "Ocasional, al final de jornadas largas",
    vision: "Usa lentes para ver de lejos",
    audicion: "Sin problemas percibidos",
    otros: "Ninguno",
  },
  vacunas: { tetanos: "Al día (2022)", hepatitis_b: "No recuerda" },
};

const historiaJose = {
  datos_generales: {
    edad: 41,
    sexo: "Masculino",
    estado_civil: "Casado",
    escolaridad: "Primaria completa",
    lateralidad: "Diestro",
  },
  antecedentes_personales: {
    patologicos: ["Hipertensión arterial diagnosticada en 2021, en control en el EBAIS."],
    quirurgicos: ["Ninguno."],
    traumaticos: ["Ninguno."],
    alergias: ["Penicilina."],
    medicamentos: ["Losartán 50 mg una vez al día."],
    hospitalizaciones: ["Ninguna."],
  },
  antecedentes_familiares: ["Padre fallecido por infarto a los 60 años."],
  antecedentes_laborales: [
    {
      empresa: "Movimientos de Tierra Guanacaste",
      puesto: "Operador de retroexcavadora",
      tiempo: "9 años",
      riesgos: "Vibración, ruido, jornadas largas",
      accidentes: "Ninguno",
    },
  ],
  habitos: {
    tabaco: "No",
    alcohol: "Ocasional",
    actividad_fisica: "Ninguna regular",
    sueno: "7 horas por noche",
  },
  sintomas_actuales: {
    vertigo_o_mareos: "No",
    dolor_de_espalda: "No",
    vision: "Sin problemas",
    audicion: "Le cuesta escuchar en lugares ruidosos",
    otros: "Ninguno",
  },
  vacunas: { tetanos: "Al día (2020)", hepatitis_b: "Completa" },
};

const historiaGabriela = {
  datos_generales: {
    edad: 34,
    sexo: "Femenino",
    estado_civil: "Unión libre",
    escolaridad: "Secundaria completa",
    lateralidad: "Diestro",
  },
  antecedentes_personales: {
    patologicos: ["Ninguno."],
    quirurgicos: ["Cesárea (2018)."],
    traumaticos: ["Ninguno."],
    alergias: ["Ninguna conocida."],
    medicamentos: ["Ninguno."],
    hospitalizaciones: ["Por la cesárea (2018)."],
  },
  antecedentes_familiares: ["Madre con diabetes tipo 2."],
  antecedentes_laborales: [
    {
      empresa: "Mensajería Central",
      puesto: "Repartidora",
      tiempo: "5 años",
      riesgos: "Jornadas largas al volante, cargas livianas",
      accidentes: "Ninguno",
    },
  ],
  habitos: { tabaco: "No", alcohol: "Ocasional", actividad_fisica: "Camina 3 veces por semana", sueno: "7 horas por noche" },
  sintomas_actuales: {
    vertigo_o_mareos: "No",
    dolor_de_espalda: "Ocasional",
    vision: "Usa lentes para conducir",
    audicion: "Sin problemas",
    otros: "Ninguno",
  },
  vacunas: { tetanos: "Al día (2023)", hepatitis_b: "Completa" },
};

// ---------------------------------------------------------------------
// 2. Crear la demo
// ---------------------------------------------------------------------
async function main() {
  console.log("Borrando la demo anterior (si existe)...");
  await limpiar();

  console.log("Creando usuarios de prueba...");
  const medicoId = await crearUsuario(env.DEMO_MEDICO_EMAIL, env.DEMO_MEDICO_PASSWORD);
  const rrhhId = await crearUsuario(env.DEMO_RRHH_EMAIL, env.DEMO_RRHH_PASSWORD);

  console.log("Creando empresa y perfiles...");
  const { data: empresa, error: eEmp } = await admin
    .from("empresas")
    .insert({ nombre: EMPRESA, medico_id: medicoId })
    .select()
    .single();
  check(eEmp, "crear empresa");

  check(
    (
      await admin.from("perfiles").insert([
        { id: medicoId, nombre: "Dra. Laura Méndez Vargas", rol: "medico", codigo_profesional: "MED-00000 (ficticio)" },
        { id: rrhhId, nombre: "Sofía Araya Brenes", rol: "rrhh", empresa_id: empresa.id },
      ])
    ).error,
    "crear perfiles",
  );

  console.log("Creando preempleos...");

  // Caso principal de la demo: listo para la consulta, con historia completa.
  const carlos = await crearPreempleo(
    empresa.id,
    rrhhId,
    {
      candidato_nombre: "Carlos Mora Solís",
      candidato_cedula: "1-1456-0789",
      puesto: "Operario de construcción en alturas",
    },
    "listo_para_consulta",
    { token_usado_en: haceMinutos(60 * 20) },
  );
  check(
    (
      await admin.from("historias").insert({
        preempleo_id: carlos,
        consentimiento_aceptado_en: haceMinutos(60 * 20 + 6),
        enviado_en: haceMinutos(60 * 20),
        antecedentes: historiaCarlos,
      })
    ).error,
    "historia de Carlos",
  );

  // Otro listo para consulta, para que la lista tenga más de uno.
  const jose = await crearPreempleo(
    empresa.id,
    rrhhId,
    {
      candidato_nombre: "José Pablo Vargas Ureña",
      candidato_cedula: "5-0388-0412",
      puesto: "Operador de maquinaria pesada",
    },
    "listo_para_consulta",
    { token_usado_en: haceMinutos(60 * 5) },
  );
  check(
    (
      await admin.from("historias").insert({
        preempleo_id: jose,
        consentimiento_aceptado_en: haceMinutos(60 * 5 + 4),
        enviado_en: haceMinutos(60 * 5),
        antecedentes: historiaJose,
      })
    ).error,
    "historia de José",
  );

  // Pendiente: el candidato todavía no llena su historia.
  await crearPreempleo(
    empresa.id,
    rrhhId,
    {
      candidato_nombre: "María Fernanda Rojas Quesada",
      candidato_cedula: "1-1702-0563",
      puesto: "Asistente administrativa",
    },
    "pendiente_candidato",
  );

  // Ya firmado ayer, con su certificado emitido.
  const firmadoEn = haceMinutos(60 * 26);
  const andres = await crearPreempleo(
    empresa.id,
    rrhhId,
    {
      candidato_nombre: "Andrés Jiménez Castro",
      candidato_cedula: "3-0491-0927",
      puesto: "Electricista de obra",
    },
    "firmado",
    { token_usado_en: haceMinutos(60 * 50), inicio_consulta: haceMinutos(60 * 26 + 11), duracion_consulta_seg: 660 },
  );
  check(
    (
      await admin.from("historias").insert({
        preempleo_id: andres,
        consentimiento_aceptado_en: haceMinutos(60 * 50 + 5),
        enviado_en: haceMinutos(60 * 50),
        antecedentes: {
          datos_generales: { edad: 28, sexo: "Masculino", escolaridad: "Técnico en electricidad (INA)" },
          antecedentes_personales: { patologicos: ["Ninguno."], alergias: ["Ninguna conocida."] },
          habitos: { tabaco: "No", alcohol: "Ocasional" },
        },
      })
    ).error,
    "historia de Andrés",
  );
  check(
    (
      await admin.from("dictamenes").insert({
        preempleo_id: andres,
        borrador_ia:
          "[Ficticio] Candidato de 28 años sin antecedentes patológicos relevantes. Laboratorios dentro de rangos de referencia. Se propone: compatible.",
        texto_final:
          "Candidato de 28 años sin antecedentes patológicos relevantes. Examen físico normal. Laboratorios dentro de rangos de referencia. Compatible con el puesto.",
        examen_fisico: "Buen estado general, signos vitales estables.\nAV 20/20.\nRuidos cardiacos rítmicos sin soplos agregados.\nCampos pulmonares limpios, MV conservado.\nFuerza y tono muscular conservados.",
        aptitud: "apto",
        firmado_en: firmadoEn,
        firmado_por: medicoId,
      })
    ).error,
    "dictamen de Andrés",
  );
  check(
    (
      await admin.from("certificados").insert({
        preempleo_id: andres,
        empresa_id: empresa.id,
        candidato_nombre: "Andrés Jiménez Castro",
        candidato_cedula: "3-0491-0927",
        puesto: "Electricista de obra",
        aptitud: "apto",
        medico_nombre: "Dra. Laura Méndez Vargas",
        medico_codigo: "MED-00000 (ficticio)",
        emitido_en: firmadoEn,
      })
    ).error,
    "certificado de Andrés",
  );

  // Segunda empresa de la misma médica: sirve para el filtro por empresa.
  const { data: empresa2, error: eEmp2 } = await admin
    .from("empresas")
    .insert({ nombre: EMPRESA_2, medico_id: medicoId })
    .select()
    .single();
  check(eEmp2, "crear segunda empresa");
  const gabriela = await crearPreempleo(
    empresa2.id,
    null,
    {
      candidato_nombre: "Gabriela Solano Mena",
      candidato_cedula: "2-0733-0918",
      puesto: "Conductora de reparto",
    },
    "listo_para_consulta",
    { token_usado_en: haceMinutos(60 * 3) },
  );
  check(
    (
      await admin.from("historias").insert({
        preempleo_id: gabriela,
        consentimiento_aceptado_en: haceMinutos(60 * 3 + 5),
        enviado_en: haceMinutos(60 * 3),
        antecedentes: historiaGabriela,
      })
    ).error,
    "historia de Gabriela",
  );
  await crearPreempleo(
    empresa2.id,
    null,
    { candidato_nombre: "Luis Diego Araya Rojas", candidato_cedula: "4-0219-0654", puesto: "Bodeguero" },
    "pendiente_candidato",
  );

  console.log("\nListo. Demo cargada:");
  console.log(`  Empresa: ${EMPRESA}`);
  console.log(`  Médica:  ${env.DEMO_MEDICO_EMAIL}`);
  console.log(`  RRHH:    ${env.DEMO_RRHH_EMAIL}`);
  console.log("  Preempleos: 6 en 2 empresas (3 listos para consulta, 2 pendientes, 1 firmado)");
  console.log("  Contraseñas: ver README.md o .env.local");
}

main();
