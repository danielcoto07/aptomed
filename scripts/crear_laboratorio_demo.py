# Genera el resultado de laboratorio FICTICIO de Carlos Mora para la demo.
# Salida: public/demo/laboratorio-carlos-mora.pdf (escaneado) y .jpg (foto de celular).
# Incluye a propósito una prueba de VIH: el sistema debe descartarla y avisar al médico.
# Uso: python crear_laboratorio_demo.py  (requiere Pillow)

import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

SALIDA = Path(sys.argv[1] if len(sys.argv) > 1 else "public/demo")
FUENTES = "/System/Library/Fonts/Supplemental/"
f = lambda tam, negrita=False: ImageFont.truetype(FUENTES + ("Arial Bold.ttf" if negrita else "Arial.ttf"), tam)

SECCIONES = [
    ("HEMOGRAMA", [
        ("Hemoglobina", "15.2", "g/dL", "13.5 - 17.5"),
        ("Hematocrito", "45.1", "%", "41.0 - 53.0"),
        ("Leucocitos", "7.2", "x10³/µL", "4.5 - 11.0"),
        ("Plaquetas", "265", "x10³/µL", "150 - 400"),
    ]),
    ("QUÍMICA CLÍNICA", [
        ("Glucosa en ayunas", "112", "mg/dL", "70 - 100"),
        ("Creatinina", "0.95", "mg/dL", "0.70 - 1.30"),
        ("Colesterol total", "198", "mg/dL", "< 200"),
        ("Triglicéridos", "214", "mg/dL", "< 150"),
        ("AST (TGO)", "28", "U/L", "10 - 40"),
        ("ALT (TGP)", "34", "U/L", "7 - 56"),
    ]),
    ("EXAMEN GENERAL DE ORINA", [
        ("Densidad", "1.020", "", "1.005 - 1.030"),
        ("pH", "6.0", "", "5.0 - 8.0"),
        ("Proteínas", "Negativo", "", "Negativo"),
        ("Glucosa en orina", "Negativo", "", "Negativo"),
    ]),
    ("SEROLOGÍA", [
        ("VIH 1/2 (anticuerpos)", "No reactivo", "", "No reactivo"),
    ]),
]

W, H = 1700, 2200
hoja = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(hoja)
TINTA = (25, 30, 45)
AZUL = (24, 72, 120)

d.rectangle((0, 0, W, 170), fill=AZUL)
d.text((90, 42), "LABORATORIO CLÍNICO DEMO", font=f(52, True), fill="white")
d.text((90, 108), "Documento ficticio para demostración · HackaToB 2026", font=f(30), fill=(215, 228, 240))

y = 215
for etiqueta, valor, x in [
    ("Paciente:", "Carlos Mora Solís", 90),
    ("Cédula:", "1-1456-0789", 980),
]:
    d.text((x, y), etiqueta, font=f(31, True), fill=TINTA)
    d.text((x + 165, y), valor, font=f(31), fill=TINTA)
y += 50
for etiqueta, valor, x in [
    ("Edad / sexo:", "34 años / Masculino", 90),
    ("Fecha:", "02/11/2026", 980),
]:
    d.text((x, y), etiqueta, font=f(31, True), fill=TINTA)
    d.text((x + 195 if x == 90 else x + 165, y), valor, font=f(31), fill=TINTA)
y += 75

COLS = [90, 760, 1040, 1270]
d.line((90, y, W - 90, y), fill=TINTA, width=3)
y += 12
for titulo, x in zip(["Análisis", "Resultado", "Unidad", "Valor de referencia"], COLS):
    d.text((x, y), titulo, font=f(29, True), fill=TINTA)
y += 48
d.line((90, y, W - 90, y), fill=TINTA, width=3)
y += 22

for seccion, filas in SECCIONES:
    d.text((90, y), seccion, font=f(29, True), fill=AZUL)
    y += 50
    for nombre, valor, unidad, rango in filas:
        d.text((COLS[0] + 20, y), nombre, font=f(30), fill=TINTA)
        d.text((COLS[1], y), valor, font=f(30), fill=TINTA)
        d.text((COLS[2], y), unidad, font=f(30), fill=TINTA)
        d.text((COLS[3], y), rango, font=f(30), fill=TINTA)
        y += 50
    y += 22

d.line((90, y, W - 90, y), fill=(170, 170, 170), width=2)
y += 22
d.text((90, y), "Validado por: Lic. Ana Pérez Rojas (ficticia) · Microbióloga química clínica", font=f(27), fill=TINTA)

SALIDA.mkdir(parents=True, exist_ok=True)
hoja.save(SALIDA / "laboratorio-carlos-mora.pdf", "PDF", resolution=200)

# Versión "foto de celular": papel sobre una mesa, un poco girado, con sombra suave y grano.
random.seed(7)
mesa = Image.new("RGB", (W + 260, H + 260), (120, 104, 88))
papel = hoja.filter(ImageFilter.GaussianBlur(0.7)).convert("RGBA")
girado = papel.rotate(-1.6, expand=True, resample=Image.BICUBIC)
mesa.paste(girado, (110, 110), girado)
luz = Image.linear_gradient("L").resize(mesa.size).point(lambda v: 205 + v // 6)
foto = Image.composite(mesa, Image.new("RGB", mesa.size, (60, 55, 50)), luz)
foto.thumbnail((1600, 2100))
foto.save(SALIDA / "laboratorio-carlos-mora.jpg", quality=82)
print("Listo:", SALIDA)
