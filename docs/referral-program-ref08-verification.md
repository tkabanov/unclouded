# Referral Partners — REF-08 verification notes

Date: 2026-08-25  
Source: `docs/referral-program-requirements.md` §20 / plan Wave 4

## Automated

- [x] First-touch `sessionStorage` (`referralAttribution.test.ts`)
- [x] Partner stats aggregation + filters (`referralPartnerStats.test.ts`)
- [x] Admin nav resolves `/admin/referral-partners` (`adminSpecialistAvailabilityApi.test.ts`)

## Manual / staging (after `supabase db push` of `20260825200000_referral_partners.sql`)

- [ ] Admin creates Active partner → unique code + copyable `signup?ref=CODE`
- [ ] New user opens link → completes signup → appears on partner Referred Users (Free)
- [ ] Upgrade Free → Pro → stats move; attribution unchanged; `referralFirstPaidAt` stamped
- [ ] Cancel / deactivate → status reflects; still listed under partner
- [ ] Second `?ref=` after registration does not reassign
- [ ] Admin reassigns partner on user profile → lists/stats update
- [ ] Organic signup (user share code) still sets `referredByUserId` only
- [ ] Deactivated partner: history kept; new signup with that code does not partner-attribute

## Compensation readiness (no payout UI)

- [x] Immutable attribution fields: `referralPartnerId`, `referralPartnerCode`, `referredAt`
- [x] `referralFirstPaidAt` for ever-converted reporting
- [x] Stable partner `id` survives rename/deactivate
