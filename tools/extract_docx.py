"""Extract paragraphs and tables from a DOCX without third-party packages."""
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
import zipfile

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def paragraph_text(paragraph):
    parts = []
    for node in paragraph.iter():
        if node.tag in (W + "t", W + "delText"):
            parts.append(node.text or "")
        elif node.tag == W + "tab":
            parts.append("\t")
        elif node.tag in (W + "br", W + "cr"):
            parts.append("\n")
    return "".join(parts)


def extract(source, destination):
    with zipfile.ZipFile(source) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    body = root.find(W + "body")
    lines = []
    for child in body:
        if child.tag == W + "p":
            lines.append(paragraph_text(child))
        elif child.tag == W + "tbl":
            for row in child.findall(W + "tr"):
                cells = []
                for cell in row.findall(W + "tc"):
                    cells.append("\n".join(paragraph_text(p) for p in cell.findall(W + "p")))
                lines.append("\t".join(cells))
    Path(destination).write_text("\n".join(lines), encoding="utf-8")
    print(f"Extracted {len(lines)} paragraphs/rows to {destination}")


if __name__ == "__main__":
    extract(sys.argv[1], sys.argv[2])
