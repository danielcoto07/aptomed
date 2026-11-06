import assert from "node:assert/strict";
import test from "node:test";
import { palabrasClinicas } from "../src/lib/guardian.ts";
import { coincideTexto } from "../src/lib/filtros.ts";
import { PREGUNTAS_HABITOS, PREGUNTAS_SALUD, TOKEN_VALIDO, armarAntecedentes, errorDatosGenerales, errorPaso, errorRespuestas, esNegativo, fechaConsentimiento } from "../src/lib/candidato.ts";

const base = { edad: "30", sexo: "Femenino", estado_civil: "Casado(a)", escolaridad: "Técnico", lateralidad: "Zurdo" };

test("el aviso detecta datos clínicos y respeta la capacidad", () => {
  assert.deepEqual(palabrasClinicas("No levantar más de 15 kg"), []);
  assert.deepEqual(palabrasClinicas("No trabajar en alturas mayores a 1,8 m sin arnés"), []);
  assert.ok(palabrasClinicas("Por su lumbalgia no debe cargar").length);
  assert.ok(palabrasClinicas("Según sus pruebas de laboratorio").length);
  assert.ok(palabrasClinicas("Glucosa 118 mg/dL").length);
});

test("la búsqueda ignora tildes y mayúsculas", () => {
  assert.ok(coincideTexto("jose", "José Pablo"));
  assert.ok(coincideTexto("", "x"));
  assert.equal(coincideTexto("ana", "Carlos"), false);
});

test("exige datos generales válidos", () => {
  assert.equal(errorDatosGenerales(base), null);
  assert.ok(errorDatosGenerales({ ...base, edad: "abc" }));
  assert.ok(errorDatosGenerales({ ...base, sexo: "<script>" }));
});

test("arma la forma que lee el médico y descarta campos extra", () => {
  const h = armarAntecedentes({ ...base, alergias: " Polen ", aptitud: "apto", empleos: [{ empresa: "ACME" }, {}] });
  assert.equal(h.datos_generales.edad, 30);
  assert.deepEqual(h.antecedentes_personales.alergias, ["Polen"]);
  assert.deepEqual(h.antecedentes_personales.quirurgicos, ["Ninguno"]);
  assert.equal(h.antecedentes_laborales.length, 1);
  assert.equal("aptitud" in h, false);
});

test("sin trabajos previos lo dice", () => {
  assert.deepEqual(armarAntecedentes(base).antecedentes_laborales, ["Sin experiencia laboral previa"]);
});

test("limita textos largos", () => {
  assert.equal(armarAntecedentes({ ...base, otros: "x".repeat(5000) }).sintomas_actuales.otros.length, 600);
});

test("rechaza horas de consentimiento no creíbles", () => {
  const ahora = new Date("2026-11-04T12:00:00Z");
  assert.equal(fechaConsentimiento("2026-11-04T11:50:00.000Z", ahora), "2026-11-04T11:50:00.000Z");
  assert.equal(fechaConsentimiento("2030-01-01T00:00:00Z", ahora), ahora.toISOString());
  assert.equal(fechaConsentimiento("nada", ahora), ahora.toISOString());
});

test("el token debe tener el formato generado", () => {
  assert.ok(TOKEN_VALIDO.test("a".repeat(64)));
  assert.equal(TOKEN_VALIDO.test("../x"), false);
});

const completo = {
  ...base,
  ...Object.fromEntries([...PREGUNTAS_SALUD, ...PREGUNTAS_HABITOS].map((p) => [p.campo, p.opciones[0]])),
  ha_trabajado: "No",
  empleos: [],
};

test("no deja campos vacíos en ningún paso", () => {
  assert.equal(errorRespuestas(completo), null);
  assert.match(errorRespuestas({ ...completo, actividad_fisica: "   " }), /Actividad física/);
  assert.match(errorPaso({ ...completo, alergias: "" }, 1), /Alergias/);
  assert.ok(errorRespuestas({ ...completo, ha_trabajado: "" }));
});

test("exige completar cada trabajo declarado", () => {
  const trabajo = { empresa: "ACME", puesto: "Cajero", tiempo: "2 años", riesgos: "Ninguno", accidentes: "Ninguno" };
  assert.equal(errorPaso({ ha_trabajado: "Sí", empleos: [trabajo] }, 2), null);
  assert.ok(errorPaso({ ha_trabajado: "Sí", empleos: [{ ...trabajo, tiempo: "" }] }, 2));
  assert.ok(errorPaso({ ha_trabajado: "Sí", empleos: [] }, 2));
});

test("unifica las respuestas negativas", () => {
  for (const v of ["ninguna", "Ninguno.", "N/A", "n/a", "nada", "no aplica", "Ninguna conocida."]) assert.ok(esNegativo(v), v);
  assert.equal(esNegativo("No fuma"), false);
  assert.equal(esNegativo("Ninguna regular"), false);
  const h = armarAntecedentes({ ...completo, alergias: "ninguna", medicamentos: "n/a", otros: "dolor leve" });
  assert.deepEqual(h.antecedentes_personales.alergias, ["Ninguno"]);
  assert.deepEqual(h.antecedentes_personales.medicamentos, ["Ninguno"]);
  assert.equal(h.sintomas_actuales.otros, "Dolor leve");
});

test("si dice que no trabajó, ignora trabajos enviados", () => {
  const h = armarAntecedentes({ ...completo, empleos: [{ empresa: "ACME" }] });
  assert.deepEqual(h.antecedentes_laborales, ["Sin experiencia laboral previa"]);
});
