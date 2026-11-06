// Prueba de seguridad (Ley 8968): RRHH NO puede leer datos clínicos.
// Inicia sesión como cada usuario de prueba con la clave pública (igual que el navegador)
// e intenta leer y escribir cada tabla. Uso: npm run test:rls

import { createClient } from "@supabase/supabase-js";

const env = process.env;
let fallos = 0;

function ok(condicion, mensaje) {
  console.log(`  ${condicion ? "✓" : "✗ FALLA:"} ${mensaje}`);
  if (!condicion) fallos++;
}

async function entrar(email, password) {
  const cliente = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await cliente.auth.signInWithPassword({ email, password });
  if (error) {
    console.error(`No se pudo iniciar sesión como ${email}:`, error.message);
    process.exit(1);
  }
  return cliente;
}

async function contar(cliente, tabla) {
  const { data, error } = await cliente.from(tabla).select("*");
  return { filas: data?.length ?? 0, error };
}

console.log("\nRRHH (Constructora Demo S.A.)");
const rrhh = await entrar(env.DEMO_RRHH_EMAIL, env.DEMO_RRHH_PASSWORD);
for (const tabla of ["historias", "resultados_lab", "dictamenes"]) {
  const { filas } = await contar(rrhh, tabla);
  ok(filas === 0, `no ve ninguna fila de ${tabla} (vio ${filas})`);
}
{
  const { filas } = await contar(rrhh, "certificados");
  ok(filas >= 1, `sí ve los certificados de su empresa (${filas})`);
  const { data: pre } = await rrhh.from("preempleos").select("id").limit(1).single();
  const { error } = await rrhh.from("certificados").insert({
    preempleo_id: pre.id, empresa_id: pre.id, candidato_nombre: "x", candidato_cedula: "x",
    puesto: "x", aptitud: "apto", medico_nombre: "x",
  });
  ok(!!error, "no puede inventar un certificado");
  const { error: eFirma } = await rrhh.rpc("firmar_dictamen", {
    p_preempleo_id: pre.id, p_texto_final: "x", p_examen_fisico: "x", p_aptitud: "apto",
  });
  ok(!!eFirma, "no puede firmar un dictamen");
  const { error: eHist } = await rrhh.from("historias").insert({
    preempleo_id: pre.id, consentimiento_aceptado_en: new Date().toISOString(),
  });
  ok(!!eHist, "no puede escribir en historias");
  const { error: eCorrige } = await rrhh.rpc("corregir_historia", {
    p_preempleo_id: pre.id, p_ruta: "datos_generales.edad", p_valor: "99",
  });
  ok(!!eCorrige, "no puede corregir la historia");
}

console.log("\nMédica (control: ella sí debe ver lo clínico)");
const medica = await entrar(env.DEMO_MEDICO_EMAIL, env.DEMO_MEDICO_PASSWORD);
{
  const { filas } = await contar(medica, "historias");
  ok(filas >= 1, `ve las historias de sus preempleos (${filas})`);
  const { filas: pre } = await contar(medica, "preempleos");
  ok(pre >= 1, `ve sus preempleos (${pre})`);
  const { data: firmado } = await medica.from("preempleos").select("id").eq("estado", "firmado").limit(1).single();
  const { data: editado } = await medica
    .from("dictamenes").update({ texto_final: "cambio después de firmar" })
    .eq("preempleo_id", firmado.id).select();
  ok((editado?.length ?? 0) === 0, "no puede editar un dictamen ya firmado");
  const { data: historia } = await medica
    .from("historias").update({ antecedentes: {} })
    .eq("preempleo_id", firmado.id).select();
  ok((historia?.length ?? 0) === 0, "no puede reemplazar directamente la historia del candidato");
  const { error: eCorrige } = await medica.rpc("corregir_historia", {
    p_preempleo_id: firmado.id, p_ruta: "datos_generales.edad", p_valor: "99",
  });
  ok(!!eCorrige, "no puede corregir la historia después de firmar");
  const { data: lab } = await medica
    .from("resultados_lab").update({ valores: [] })
    .eq("preempleo_id", firmado.id).select();
  ok((lab?.length ?? 0) === 0, "no puede cambiar laboratorios después de firmar");
  const { data: reabierto } = await medica
    .from("preempleos").update({ estado: "en_valoracion" })
    .eq("id", firmado.id).select();
  ok((reabierto?.length ?? 0) === 0, "no puede reabrir un preempleo firmado");
}

console.log("\nArchivos de laboratorio (bucket privado)");
{
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
  const { data: pre } = await medica.from("preempleos").select("id").limit(1).single();
  const ruta = `${pre.id}/prueba-rls.jpg`;
  const bytes = new Blob([new Uint8Array([255, 216, 255])], { type: "image/jpeg" });

  const { error: eSube } = await medica.storage.from("laboratorios").upload(ruta, bytes, { upsert: false });
  ok(!eSube, `la médica puede subir a su preempleo${eSube ? ` (${eSube.message})` : ""}`);
  const { data: bajaMedica } = await medica.storage.from("laboratorios").download(ruta);
  ok(!!bajaMedica, "la médica puede descargar su archivo");
  const { data: bajaRrhh } = await rrhh.storage.from("laboratorios").download(ruta);
  ok(!bajaRrhh, "RRHH no puede descargar el archivo");
  const { error: eSubeRrhh } = await rrhh.storage.from("laboratorios").upload(`${pre.id}/rrhh.jpg`, bytes);
  ok(!!eSubeRrhh, "RRHH no puede subir archivos");
  await admin.storage.from("laboratorios").remove([ruta]);
}

console.log("\nOtra empresa (una empresa no ve a otra)");
{
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
  const { data: otra, error: eOtra } = await admin
    .from("empresas").insert({ nombre: "Empresa temporal de prueba" }).select().single();
  ok(!eOtra, `se crea una empresa temporal${eOtra ? ` (${eOtra.message})` : ""}`);
  try {
    const { data: orden } = await admin.from("preempleos")
      .insert({ empresa_id: otra.id, candidato_nombre: "Otra", candidato_cedula: "0", puesto: "Otro" })
      .select().single();
    const { error: eCert } = await admin.from("certificados").insert({
      preempleo_id: orden.id, empresa_id: otra.id, candidato_nombre: "Otra", candidato_cedula: "0",
      puesto: "Otro", aptitud: "apto", medico_nombre: "x",
    });
    ok(!eCert, `se crea un certificado ajeno${eCert ? ` (${eCert.message})` : ""}`);

    const { data: veOrden } = await rrhh.from("preempleos").select("id").eq("id", orden.id);
    ok((veOrden?.length ?? 0) === 0, "RRHH no ve órdenes de otra empresa");
    const { data: veCert } = await rrhh.from("certificados").select("id").eq("empresa_id", otra.id);
    ok((veCert?.length ?? 0) === 0, "RRHH no ve certificados de otra empresa");
    const { data: veEmpresa } = await rrhh.from("empresas").select("id").eq("id", otra.id);
    ok((veEmpresa?.length ?? 0) === 0, "RRHH no ve otra empresa");
    const { error: eCrea } = await rrhh.from("preempleos")
      .insert({ empresa_id: otra.id, candidato_nombre: "x", candidato_cedula: "x", puesto: "x" });
    ok(!!eCrea, "RRHH no puede crear órdenes para otra empresa");
    const { data: veMedica } = await medica.from("preempleos").select("id").eq("id", orden.id);
    ok((veMedica?.length ?? 0) === 0, "la médica no ve órdenes que no le asignaron");
  } finally {
    await admin.from("certificados").delete().eq("empresa_id", otra.id);
    await admin.from("preempleos").delete().eq("empresa_id", otra.id);
    await admin.from("empresas").delete().eq("id", otra.id);
  }
}

console.log("\nVisitante sin sesión");
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
for (const tabla of ["preempleos", "historias", "certificados"]) {
  const { filas } = await contar(anon, tabla);
  ok(filas === 0, `no ve ${tabla} (vio ${filas})`);
}

console.log(fallos === 0 ? "\nRESULTADO: todas las pruebas pasaron ✓\n" : `\nRESULTADO: ${fallos} prueba(s) fallaron ✗\n`);
process.exit(fallos === 0 ? 0 : 1);
