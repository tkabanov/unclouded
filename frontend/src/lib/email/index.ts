export {
  TRANSACTIONAL_EMAIL_BRAND,
  TRANSACTIONAL_EMAIL_DISCLAIMER,
  TRANSACTIONAL_EMAIL_FROM,
  TRANSACTIONAL_EMAIL_PRODUCT_NAME,
} from "@/lib/email/branding";
export {
  getTransactionalEmailDefinition,
  listLiveAuthTransactionalEmails,
  listPlaceholderPlatformEmails,
  TRANSACTIONAL_EMAIL_CATALOG,
  type TransactionalEmailDefinition,
  type TransactionalEmailId,
} from "@/lib/email/transactionalEmailCatalog";
export {
  requestTransactionalEmail,
  scheduleWelcomeEmailAfterOnboarding,
  sendPasswordResetTransactionalEmail,
  type TransactionalEmailHookPayload,
  type TransactionalEmailHookResult,
  type TransactionalEmailHookStatus,
} from "@/lib/email/transactionalEmailHooks";
