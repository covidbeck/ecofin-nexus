"""Generate test_invoice.pdf.

Run inside the backend container so the file lands on the host repo root:
  docker compose exec backend python generate_test_bill.py
"""

from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


def resolve_output() -> Path:
    docker_root = Path("/project")
    if docker_root.is_dir():
        return docker_root / "test_invoice.pdf"
    return Path(__file__).resolve().parent / "test_invoice.pdf"


OUTPUT = resolve_output()

FONT_CANDIDATES = [
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
    Path(r"C:\Windows\Fonts\arial.ttf"),
]


def resolve_font() -> str:
    for candidate in FONT_CANDIDATES:
        if candidate.exists():
            pdfmetrics.registerFont(TTFont("BillFont", str(candidate)))
            return "BillFont"
    return "Helvetica"


def main() -> None:
    font_name = resolve_font()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    page = canvas.Canvas(str(OUTPUT), pagesize=A4)
    _width, height = A4
    y = height - 80
    page.setFont(font_name, 16)
    page.drawString(50, y, "Квитанция за электроэнергию")
    y -= 36
    page.setFont(font_name, 12)
    lines = [
        "Поставщик АстанаЭнергоСбыт",
        "Тип: Пекарня",
        "Город: Астана",
        "Период: 30 дней",
        "Расход: 4200 кВт·ч",
        "Итого: 115000 тенге",
    ]
    for line in lines:
        page.drawString(50, y, line)
        y -= 24
    page.save()
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
