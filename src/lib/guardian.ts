// Revisa el texto que leerá la empresa. No bloquea la firma: avisa y el médico decide.
const PATRONES: [RegExp, string][] = [
  [/\bdiagn[oó]stic/i, "diagnóstico"],
  [/\blaboratorio/i, "laboratorio"],
  [/\b(ex[aá]men|ex[aá]menes|prueba|pruebas|resultados?)\b/i, "exámenes o resultados"],
  [/\b(doping|drogas?|coca[ií]na|marihuana|thc)\b/i, "prueba de drogas"],
  [/\b(vih|hiv|sida|embaraz)/i, "VIH o embarazo"],
  [/\b(positiv[oa]|negativ[oa]|fuera de rango)\b/i, "resultado clínico"],
  [/\b(glucosa|colesterol|triglic[eé]ridos|hemoglobina|creatinina|hematocrito|presi[oó]n arterial)\b/i, "valor clínico"],
  [/\b(hipertensi[oó]n|hipertens|diabetes|diab[eé]tic|lumbalgia|hernia|asma|epilepsia|depresi[oó]n|ansiedad|obesidad|cardiopat[ií]a|hipoacusia)/i, "enfermedad"],
  [/\b(medicamento|tratamiento|losart[aá]n|insulina|metformina)/i, "tratamiento"],
  [/\d\s*(mg|mmol|mmhg|g\/dl|ml|ui)\b/i, "valor con unidad clínica"],
];

export function palabrasClinicas(texto: string) {
  return [...new Set(PATRONES.filter(([p]) => p.test(texto)).map(([, nombre]) => nombre))];
}
