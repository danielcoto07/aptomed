import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { LOGO_PDF_BASE64 } from "./logo-pdf.ts";
import { INTRO_INFORME, OPCIONES_INFORME, ORDEN_INFORME, formatearFechaLarga, type Aptitud } from "./tipos.ts";

export type DatosCertificado = {
  candidato_nombre: string;
  candidato_cedula: string;
  puesto: string;
  aptitud: Aptitud;
  restricciones_funcionales: string | null;
  medico_nombre: string;
  medico_codigo: string | null;
  nota: string | null;
  emitido_en: string;
  codigo_verificacion: string;
  empresa: string;
};

const ANCHO = 612;
const ALTO = 792;
const MARGEN = 54;
const URL_VERIFICAR = "https://preempleo-digital.vercel.app/verificar";
const TEXTO = 10.5;
const TINTA = rgb(0.024, 0.235, 0.255);
const LINEA = rgb(0.72, 0.75, 0.74);
const BLANCO = rgb(1, 1, 1);
const AVISO =
  "Este informe resume la decisión del profesional y no contiene datos clínicos. " +
  "Prototipo de demostración: la firma es simulada y el documento no tiene validez legal.";

// Las fuentes estándar del PDF solo admiten caracteres WinAnsi: cualquier otro haría fallar la descarga.
const limpiar = (texto: string) =>
  texto
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[  \t]/g, " ")
    .replace(/[^\x20-\x7e¡-ÿ\n—–•“”‘’]/g, "?");

function partir(texto: string, fuente: PDFFont, tamano: number, ancho: number) {
  const lineas: string[] = [];
  for (const parrafo of limpiar(texto).split("\n")) {
    let linea = "";
    for (const palabra of parrafo.split(" ")) {
      const prueba = linea ? `${linea} ${palabra}` : palabra;
      if (linea && fuente.widthOfTextAtSize(prueba, tamano) > ancho) {
        lineas.push(linea);
        linea = palabra;
      } else {
        linea = prueba;
      }
    }
    lineas.push(linea);
  }
  return lineas;
}

// Médico y RRHH reciben el mismo informe fijo: los campos se aplanan al final.
export async function crearCertificadoPdf(c: DatosCertificado) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Informe final ${c.codigo_verificacion}`);
  pdf.setProducer("AptoMed");

  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const form = pdf.getForm();

  let pagina: PDFPage = pdf.addPage([ANCHO, ALTO]);
  let y = ALTO - MARGEN;

  const espacio = (alto: number) => {
    if (y - alto < MARGEN) {
      pagina = pdf.addPage([ANCHO, ALTO]);
      y = ALTO - MARGEN;
    }
  };

  const escribir = (texto: string, fuente: PDFFont, tamano = TEXTO, x = MARGEN) => {
    for (const linea of partir(texto, fuente, tamano, ANCHO - MARGEN - x)) {
      espacio(tamano * 1.4);
      pagina.drawText(linea, { x, y: y - tamano, size: tamano, font: fuente, color: TINTA });
      y -= tamano * 1.4;
    }
  };

  const raya = () => {
    pagina.drawLine({ start: { x: MARGEN, y }, end: { x: ANCHO - MARGEN, y }, thickness: 0.8, color: TINTA });
    y -= 12;
  };

  // Campo de texto cuya altura crece con el contenido: en la versión aplanada nada se recorta.
  const caja = (nombre: string, texto: string, lineasMinimas: number, x = MARGEN) => {
    const ancho = ANCHO - MARGEN - x;
    const lineas = Math.max(lineasMinimas, partir(texto, normal, TEXTO, ancho - 10).length);
    const alto = lineas * 14 + 8;
    espacio(alto + 6);
    const campo = form.createTextField(nombre);
    if (lineasMinimas > 1) campo.enableMultiline();
    campo.setText(limpiar(texto));
    campo.addToPage(pagina, {
      x,
      y: y - alto,
      width: ancho,
      height: alto,
      borderWidth: 0.6,
      borderColor: LINEA,
      backgroundColor: BLANCO,
      textColor: TINTA,
    });
    campo.setFontSize(TEXTO);
    y -= alto + 6;
  };

  // Encabezado: logo de AptoMed en lugar del "[ LOGO ]" del formato.
  const qr = await pdf.embedPng(
    await QRCode.toBuffer(`${URL_VERIFICAR}/${c.codigo_verificacion}`, { margin: 0, width: 180, errorCorrectionLevel: "M" }),
  );
  pagina.drawImage(qr, { x: ANCHO - MARGEN - 50, y: y - 42, width: 50, height: 50 });
  const logo = await pdf.embedPng(LOGO_PDF_BASE64);
  pagina.drawImage(logo, { x: MARGEN, y: y - 21, width: 22.7, height: 21 });
  pagina.drawText("AptoMed", { x: MARGEN + 28, y: y - 16, size: 15, font: negrita, color: TINTA });
  y -= 34;
  escribir("Informe Final a la Empresa", negrita, 13);
  y -= 6;
  raya();

  escribir("Nombre del candidato:", negrita);
  caja("candidato", c.candidato_nombre, 1);
  y -= 2;
  escribir(INTRO_INFORME, normal);
  y -= 8;

  const resultado = form.createRadioGroup("resultado");

  for (const aptitud of ORDEN_INFORME) {
    const opcion = OPCIONES_INFORME[aptitud];
    espacio(44);
    resultado.addOptionToPage(opcion.letra, pagina, {
      x: MARGEN,
      y: y - 12,
      width: 12,
      height: 12,
      borderWidth: 0.8,
      borderColor: TINTA,
      backgroundColor: BLANCO,
      textColor: TINTA,
    });
    escribir(`${opcion.letra}. ${opcion.titulo}`, negrita, TEXTO, MARGEN + 18);
    y -= 2;
    escribir(opcion.texto, normal, TEXTO, MARGEN + 18);
    y -= 3;

    if (aptitud === "apto") {
      if (c.nota) {
        escribir("Nota:", negrita, TEXTO, MARGEN + 18);
        caja("nota", c.nota ?? "", 1, MARGEN + 18);
      }
    } else {
      const propio = c.aptitud === aptitud ? (c.restricciones_funcionales ?? "") : "";
      caja(aptitud === "no_apto" ? "razones" : "recomendaciones", propio, 3, MARGEN + 18);
    }

    if (opcion.cierre) escribir(opcion.cierre, normal, TEXTO, MARGEN + 18);
    y -= 8;
  }

  resultado.select(OPCIONES_INFORME[c.aptitud].letra);

  espacio(70);
  escribir("Nombre, código y firma del profesional:", negrita);
  caja("profesional", `${c.medico_nombre} · Código ${c.medico_codigo ?? "—"}`, 1);
  escribir(`Firma simulada registrada en AptoMed el ${formatearFechaLarga(c.emitido_en)}.`, normal, 9.5);
  y -= 8;
  raya();

  escribir(
    `Código de certificado: ${c.codigo_verificacion} · Puesto: ${c.puesto} · Empresa: ${c.empresa} · ` +
      `Cédula: ${c.candidato_cedula}`,
    normal,
    9,
  );
  y -= 3;
  escribir(AVISO, negrita, 8.5);

  form.updateFieldAppearances(normal);
  form.flatten();

  return pdf.save();
}
