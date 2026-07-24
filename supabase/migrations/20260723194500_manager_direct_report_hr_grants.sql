-- HR/admin direct-report wiring uses client INSERT; RLS allows it but grants were SELECT-only.

GRANT INSERT, UPDATE, DELETE ON public."managerDirectReport" TO authenticated;
