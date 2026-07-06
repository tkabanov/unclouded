# Threat Model Baseline

> **Review required:** deterministic scaffold generated from IR metadata; validate threat model and DPIA with a human security/privacy review.

## Actors

| actor_id | privacy_role_refs |
|---|---|
| actor:privacy_role:chatconversation:chat_owner_ | privacy_role:chatconversation:chat_owner_ |
| actor:privacy_role:chatconversation:everyone | privacy_role:chatconversation:everyone |
| actor:privacy_role:chatmessage:everyone | privacy_role:chatmessage:everyone |
| actor:privacy_role:chatmessage:message_owner_ | privacy_role:chatmessage:message_owner_ |
| actor:privacy_role:dailycheckin:everyone | privacy_role:dailycheckin:everyone |
| actor:privacy_role:dailycheckin:owner_ | privacy_role:dailycheckin:owner_ |
| actor:privacy_role:journalentry:everyone | privacy_role:journalentry:everyone |
| actor:privacy_role:journalentry:owner_ | privacy_role:journalentry:owner_ |
| actor:privacy_role:path:everyone | privacy_role:path:everyone |
| actor:privacy_role:path:qwe_ | privacy_role:path:qwe_ |
| actor:privacy_role:pathquestion:everyone | privacy_role:pathquestion:everyone |
| actor:privacy_role:pathquestion:qwe_ | privacy_role:pathquestion:qwe_ |
| actor:privacy_role:pathsession:everyone | privacy_role:pathsession:everyone |
| actor:privacy_role:pathsession:qwe_ | privacy_role:pathsession:qwe_ |
| actor:privacy_role:user:everyone | privacy_role:user:everyone |
| actor:privacy_role:user:users_own_data | privacy_role:user:users_own_data |

## Data Flows

| flow_id | source_id |
|---|---|
| flow:external_call:0_default_collection:bTIlB | external_call:0_default_collection:bTIlB |
| flow:external_call:0_default_collection:bTIRI | external_call:0_default_collection:bTIRI |

