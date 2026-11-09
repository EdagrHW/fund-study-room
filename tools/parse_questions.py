"""Parse the extracted exam text into structured JSON."""
from pathlib import Path
import json
import re
import sys

QUESTION_RE = re.compile(r"^(?:(?:\(浅浅记下\)|（浅浅记下）)\s*)?(\d{1,3})(?:[.、]|\s)\s*(.*)$")
OPTION_RE = re.compile(r"^\s*([A-D])(?:[.、]|\s+|(?=[一-鿿]))\s*(.*)$")
ANSWER_RE = re.compile(r"[（(]\s*([A-D])(?:\s*[、,，/]\s*[A-D])*\s*[）)]")
EXPLANATION_RE = re.compile(r"^\s*解析\s*[:：]")


def clean_text(text):
    text = text.replace("外理方式", "处理方式")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def extract_answer(text):
    matches = ANSWER_RE.findall(text)
    answer = matches[-1] if matches else ""
    text = ANSWER_RE.sub("", text)
    text = re.sub(r"\s+", " ", text)
    return clean_text(text), answer


def parse(source):
    raw_lines = Path(source).read_text(encoding="utf-8").splitlines()
    lines = []
    for raw in raw_lines:
        line = raw.strip()
        if line.startswith("下列哪一项不属于基金与银行储蓄存款的差别"):
            line = "178、" + line
        if line == "尽量选用单一债券或债券类别":
            line = "A." + line
        lines.append(line)

    questions = []
    current = None
    section = "stem"
    current_option = None
    for line in lines:
        match = QUESTION_RE.match(line)
        expected_id = current["id"] + 1 if current else 1
        if match and int(match.group(1)) == expected_id:
            if current:
                questions.append(current)
            current = {
                "id": int(match.group(1)),
                "stem": match.group(2),
                "options": [],
                "answer": "",
                "explanation": "",
                "sourceExplanation": "",
                "category": "",
            }
            section = "stem"
            current_option = None
            continue
        if not current:
            continue
        option = OPTION_RE.match(line)
        if option and (not current["options"] or option.group(1) > current["options"][-1]["key"]):
            if section != "explanation":
                section = "options"
                current_option = {"key": option.group(1), "text": option.group(2)}
                current["options"].append(current_option)
                continue
        if EXPLANATION_RE.match(line):
            section = "explanation"
            current["sourceExplanation"] += EXPLANATION_RE.sub("", line)
            current_option = None
            continue
        if not line:
            continue
        if section == "options" and current_option:
            current_option["text"] += line
        elif section == "explanation":
            current["sourceExplanation"] += line
        else:
            current["stem"] += "\n" + line
    if current:
        questions.append(current)

    for question in questions:
        question["stem"], answer = extract_answer(question["stem"])
        question["answer"] = answer
        question["sourceExplanation"] = clean_text(question["sourceExplanation"])
        question["explanation"] = question["sourceExplanation"]
        for option in question["options"]:
            option["text"] = clean_text(option["text"])
    return questions


def validate(questions):
    ids = [q["id"] for q in questions]
    assert ids == list(range(1, 206)), f"Question IDs differ: {ids}"
    errors = []
    for question in questions:
        keys = [option["key"] for option in question["options"]]
        if len(keys) < 3 or keys != sorted(keys) or len(keys) != len(set(keys)):
            errors.append(f"Q{question['id']}: options {keys}")
        if question["answer"] not in keys:
            errors.append(f"Q{question['id']}: answer {question['answer']!r}")
        if not question["stem"]:
            errors.append(f"Q{question['id']}: empty stem")
    if errors:
        raise ValueError("\n".join(errors))


if __name__ == "__main__":
    questions = parse(sys.argv[1])
    validate(questions)
    output = Path(sys.argv[2])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Validated and wrote {len(questions)} questions to {output}")
    print(f"Existing explanations: {sum(bool(q['sourceExplanation']) for q in questions)}")
