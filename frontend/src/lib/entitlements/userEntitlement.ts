import {
  resolveUserEntitlement,
  isFreeTierUser as isFreeTierEntitlement,
  type ResolvedUserEntitlement,
  type UserEntitlementInput,
} from "./userEntitlementHelpers.ts";

export {
  resolveUserEntitlement,
  isFreeTierEntitlement,
  type ResolvedUserEntitlement,
  type UserEntitlementInput,
};

export function isEnterpriseUser(input: UserEntitlementInput): boolean {
  return resolveUserEntitlement(input).accountType === "enterprise";
}
