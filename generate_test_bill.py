"""Generate a demo utility-bill PDF for manual/local testing of the upload flow.

Run inside the backend container (no local Python on the host):

    docker compose exec backend python generate_test_bill.py

Output path resolution:
    - If /project exists (mounted project root inside the backend container),
      the PDF is written there so it lands in the host project root.
    - Otherwise it is written next to this script (local/non-Docker run).
"""

from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

BILL_LINES = [
    "АстанаЭнергоСбыт",
    "Счет за электроэнергию",
    "",
    "Поставщик: АстанаЭнергоСбыт",
    "Тип: Пекарня",
    "Город: Астана",
    "Период: 30 дней",
    "Расход: 4200 кВт·ч",
    "Итого: 115000 тенге",
]


def resolve_output_path() -> Path:
    project_root = Path("/project")
    if project_root.is_dir():
        return project_root / "test_invoice.pdf"
    return Path(__file__).resolve().parent / "test_invoice.pdf"


def build_pdf(output_path: Path) -> None:
    c = canvas.Canvas(str(output_path), pagesize=A4)
    width, height = A4

    font_name = "DejaVuSans"
    try:
        c.setFont(font_name, 14)
    except KeyError:
        font_name = "Helvetica"
        c.setFont(font_name, 14)

    y = height - 60
    for line in BILL_LINES:
        c.drawString(50, y, line)
        y -= 24

    c.showPage()
    c.save()


def main() -> None:
    output_path = resolve_output_path()
    build_pdf(output_path)
    print(f"Test invoice generated at: {output_path}")


if __name__ == "__main__":
    main()
