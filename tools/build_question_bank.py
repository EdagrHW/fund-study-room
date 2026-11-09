"""Merge reviewed explanations and build the browser-ready question bank."""
from pathlib import Path
import json
import re
import sys

CATEGORIES = {
    "职业道德", "法律法规与合规", "基金运作与销售",
    "证券投资基金基础", "股权投资基金", "投资分析与风险管理",
}

TEXT_REPLACEMENTS = {
    "转基金份额的数量": "转入基金份额的数量",
    "III中期报告": "III.中期报告",
    "第大股东": "第一大股东",
    "投资经理内": "投资经理丙",
    "基金经理内": "基金经理丙",
    "一-系列": "一系列",
    "公司战路": "公司战略",
    "风险调警后": "风险调整后",
    "证券交 易所": "证券交易所",
    "购买人": "购买",
    "不厲于": "不属于",
    "交昜": "交易",
    "貝有": "具有",
    "可资于": "可投资于",
    "末来": "未来",
    "应应当": "应当",
    "另-家": "另一家",
    "下单时间况先": "下单时间优先",
    "价格作B基金": "价格作为B基金",
    "某QDI基金": "某QDII基金",
    "该2个账户": "这两个账户",
    "2,3万元": "2.3万元",
    "\n基金经理甲": "\nI.基金经理甲",
    "\n投资经理乙": "\nII.投资经理乙",
}


def clean_text(text):
    for old, new in TEXT_REPLACEMENTS.items():
        text = text.replace(old, new)
    text = re.sub(r"(?<=[IV])\.(?=\s*[IV])", "、", text)
    text = text.replace("I II、IV", "I、II、IV")
    text = re.sub(r"(?m)^1\.处于成熟行业", "I.处于成熟行业", text)
    text = re.sub(r"(?<=[一-鿿])[ \t]+(?=[一-鿿])", "", text)
    return text.strip()


def build(project_root):
    root = Path(project_root)
    data_dir = root / "data"
    questions = json.loads((data_dir / "questions.json").read_text(encoding="utf-8"))
    reviewed = {}
    for path in sorted((data_dir / "explanations").glob("*.json")):
        entries = json.loads(path.read_text(encoding="utf-8"))
        for entry in entries:
            question_id = entry["id"]
            if question_id in reviewed:
                raise ValueError(f"Duplicate reviewed ID {question_id}")
            reviewed[question_id] = entry

    expected_ids = set(range(1, 206))
    if set(reviewed) != expected_ids:
        raise ValueError(f"Reviewed IDs differ: missing={expected_ids - set(reviewed)}, extra={set(reviewed) - expected_ids}")
    if len(questions) != 205:
        raise ValueError(f"Expected 205 questions, got {len(questions)}")

    for question in questions:
        entry = reviewed[question["id"]]
        question["stem"] = clean_text(question["stem"])
        for option in question["options"]:
            option["text"] = clean_text(option["text"])
        question["sourceAnswer"] = question.get("sourceAnswer", question["answer"])
        question["answer"] = entry["answer"]
        question["explanation"] = entry["explanation"].strip()
        question["category"] = entry["category"]
        question["answerNote"] = entry.get("answerNote", "").strip()
        option_keys = {option["key"] for option in question["options"]}
        if question["answer"] not in option_keys:
            raise ValueError(f"Q{question['id']}: invalid answer {question['answer']}")
        if question["category"] not in CATEGORIES:
            raise ValueError(f"Q{question['id']}: invalid category")
        if len(question["explanation"]) < 40:
            raise ValueError(f"Q{question['id']}: explanation too short")
        if question["answer"] != question["sourceAnswer"] and not question["answerNote"]:
            raise ValueError(f"Q{question['id']}: corrected answer needs a note")

    json_text = json.dumps(questions, ensure_ascii=False, indent=2)
    (data_dir / "questions.json").write_text(json_text, encoding="utf-8")
    (data_dir / "questions.js").write_text(
        "/* Auto-generated from the supplied DOCX. Do not edit by hand. */\n"
        "window.QUESTION_BANK = " + json_text + ";\n",
        encoding="utf-8",
    )
    notes = [question["id"] for question in questions if question["answerNote"]]
    changed = [question["id"] for question in questions if question["answer"] != question["sourceAnswer"]]
    print(f"Built {len(questions)} questions with {sum(bool(q['explanation']) for q in questions)} explanations")
    print(f"Answer notes: {notes or 'none'}; corrected answers: {changed or 'none'}")
    print(f"Categories: {dict((category, sum(q['category'] == category for q in questions)) for category in sorted(CATEGORIES))}")


if __name__ == "__main__":
    build(sys.argv[1])
