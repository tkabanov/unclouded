from pathlib import Path

from apply_camelcase_codemod import REPLACEMENTS

p = Path(__file__).resolve().parents[1] / "frontend" / "src" / "integrations" / "supabase" / "types.ts"
raw = p.read_bytes()
encoding = "utf-16" if raw.startswith(b"\xff\xfe") else "utf-8"
content = raw.decode(encoding)

for old, new in REPLACEMENTS:
    content = content.replace(old, new)

table_map = {
    "chatconversation": "chatConversation",
    "chatmessage": "chatMessage",
    "dailycheckin": "dailyCheckin",
    "pathenrollment1": "pathEnrollment",
    "pathquestion": "pathQuestion",
    "pathsession": "pathSession",
    "subscription_plan": "subscriptionPlan",
    "uds_journalentry": "journalEntry",
    "uds_milestone": "milestone",
    "uds_relapseevent": "relapseEvent",
}
for old, new in table_map.items():
    content = content.replace(f"      {old}: {{", f"      {new}: {{")
    content = content.replace(f'referencedRelation: "{old}"', f'referencedRelation: "{new}"')

content = content.replace("bubble_user_owns_row", "userOwnsRow")
p.write_text(content, encoding="utf-8")
print("types.ts updated")
