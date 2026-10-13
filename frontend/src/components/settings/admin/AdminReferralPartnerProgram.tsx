import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PartnerTermsScope } from "@/lib/referrals/partnerPortalApi";
import { describePartnerTerms, formatMoney } from "@/lib/referrals/referralCopy";
import {
  archiveAdminPartnerTerms,
  confirmAdminPartnerTerms,
  fetchAdminReferralPartnerProgram,
  linkAdminPartnerAccount,
  validatePartnerTermsInput,
  type AdminPartnerProgram,
} from "@/lib/settings/admin/referralProgramAdminApi";
import { formatSubscriptionDate } from "@/lib/subscription/subscriptionFormat";

const SCOPE_OPTIONS: { value: PartnerTermsScope; label: string }[] = [
  { value: "lifetime", label: "Every payment (lifetime)" },
  { value: "months", label: "Payments in the client's first N months" },
  { value: "first_payment", label: "Client's first payment only" },
];

/** Today in the admin's local calendar (the date input works in local dates). */
function todayIsoDate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Terms start at 00:00 UTC of the chosen day, so show that day in UTC too. */
function formatUtcDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

/** NCLDD-56 — partner portal account, commission terms and per-client commissions (admin). */
export default function AdminReferralPartnerProgram({ partnerId }: { partnerId: string }) {
  const [program, setProgram] = useState<AdminPartnerProgram | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [percent, setPercent] = useState("");
  const [scope, setScope] = useState<PartnerTermsScope>("lifetime");
  const [months, setMonths] = useState("12");
  const [effectiveFrom, setEffectiveFrom] = useState(todayIsoDate);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const inFlight = useRef(false);

  const reload = useCallback(async () => {
    try {
      setProgram(await fetchAdminReferralPartnerProgram(partnerId));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [partnerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const run = useCallback(
    async (action: () => Promise<void>, success: string) => {
      // Ref guard: a double click must not send two writes before `busy` re-renders.
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      try {
        await action();
        toast.success(success);
        await reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [reload],
  );

  const termsError = percent.trim()
    ? validatePartnerTermsInput({ commissionPercent: percent, scope, scopeMonths: months })
    : "Enter the commission percent.";
  const termsInput = {
    commissionPercent: Number(percent.trim()),
    scope,
    scopeMonths: scope === "months" ? Number(months.trim()) : null,
  };
  const current = program?.terms.find((terms) => terms.status === "confirmed") ?? null;

  if (failed) {
    return (
      <Section title="Partner program">
        <p className="text-sm text-muted-foreground">
          Partner program data isn't available right now.
        </p>
      </Section>
    );
  }

  return (
    <div className="space-y-6">
      <Section title="Partner portal account">
        {program?.linkedAccount ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p>
              Linked to <span className="font-medium">{program.linkedAccount.email}</span>
              {program.linkedAccount.linkedAt
                ? ` since ${formatSubscriptionDate(program.linkedAccount.linkedAt)}`
                : ""}
              . This account sees the Partner portal.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void run(() => linkAdminPartnerAccount(partnerId, null), "Portal account unlinked.")}
            >
              Unlink
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No account is linked. The partner signs up with their email, confirms it, then you link it
            here to give them the Partner portal.
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="partner-account-email">Account email</Label>
            <Input
              id="partner-account-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="partner@example.com"
            />
          </div>
          <Button
            disabled={busy || !email.trim()}
            onClick={() =>
              void run(async () => {
                await linkAdminPartnerAccount(partnerId, email.trim());
                setEmail("");
              }, "Portal account linked.")
            }
          >
            {program?.linkedAccount ? "Link a different account" : "Link account"}
          </Button>
        </div>
      </Section>

      <Section title="Commission terms">
        {current ? (
          <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
            <div>
              <p className="font-medium text-foreground">{describePartnerTerms(current)}</p>
              <p className="text-xs text-muted-foreground">
                Effective from {formatUtcDate(current.effectiveFrom) ?? "—"} (00:00 UTC) · confirmed{" "}
                {formatSubscriptionDate(current.confirmedAt) ?? "—"}
                {current.confirmedByEmail ? ` by ${current.confirmedByEmail}` : ""}
              </p>
              {current.note ? <p className="mt-1 text-xs text-muted-foreground">{current.note}</p> : null}
            </div>
            {confirmingArchive ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span>New payments will wait for terms. Archive?</span>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await archiveAdminPartnerTerms(partnerId);
                      setConfirmingArchive(false);
                    }, "Terms archived. New payments won't be priced.")
                  }
                >
                  Archive
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmingArchive(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmingArchive(true)}>
                Archive terms
              </Button>
            )}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-amber-500/60 p-3 text-sm text-muted-foreground">
            No confirmed terms. The partner sees "not confirmed" and no earnings are calculated; payments
            are recorded and wait for terms.
          </p>
        )}

        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">
            {current ? "Replace with new confirmed terms" : "Confirm the agreed terms"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="terms-percent">Commission, % of amount paid</Label>
              <Input
                id="terms-percent"
                inputMode="decimal"
                value={percent}
                onChange={(event) => {
                  setPercent(event.target.value);
                  setConfirming(false);
                }}
                placeholder="20"
              />
            </div>
            <div className="space-y-1">
              <Label>Applies to</Label>
              <Select
                value={scope}
                onValueChange={(value) => {
                  setScope(value as PartnerTermsScope);
                  setConfirming(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {scope === "months" ? (
              <div className="space-y-1">
                <Label htmlFor="terms-months">Months</Label>
                <Input
                  id="terms-months"
                  inputMode="numeric"
                  value={months}
                  onChange={(event) => {
                    setMonths(event.target.value);
                    setConfirming(false);
                  }}
                />
              </div>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="terms-effective">Effective from (00:00 UTC)</Label>
              <Input
                id="terms-effective"
                type="date"
                value={effectiveFrom}
                onChange={(event) => {
                  setEffectiveFrom(event.target.value);
                  setConfirming(false);
                }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="terms-note">Note (where the terms were agreed)</Label>
            <Textarea id="terms-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Payments made on or after the effective date that are waiting for terms are priced right away.
            Commissions already calculated under earlier terms don't change.
          </p>
          {termsError && percent.trim() ? <p className="text-xs text-destructive">{termsError}</p> : null}
          {confirming && !termsError ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/60 p-3 text-sm">
              <span>
                Confirm {describePartnerTerms({ ...termsInput, effectiveFrom: null, confirmedAt: null })} from{" "}
                {formatUtcDate(`${effectiveFrom}T00:00:00Z`)} (00:00 UTC)?
              </span>
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await confirmAdminPartnerTerms({
                      partnerId,
                      ...termsInput,
                      effectiveFrom: effectiveFrom ? `${effectiveFrom}T00:00:00Z` : null,
                      note: note.trim() || null,
                    });
                    setConfirming(false);
                    setPercent("");
                    setNote("");
                  }, "Terms confirmed.")
                }
              >
                Confirm
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button disabled={busy || Boolean(termsError) || !effectiveFrom} onClick={() => setConfirming(true)}>
              Review terms
            </Button>
          )}
        </div>

        {program && program.terms.length > 0 ? (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground">History</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {program.terms.map((terms) => (
                <li key={terms.id} className="flex flex-wrap items-center gap-2">
                  <Badge variant={terms.status === "confirmed" ? "secondary" : "outline"}>{terms.status}</Badge>
                  <span className="text-foreground">{describePartnerTerms(terms)}</span>
                  <span>
                    from {formatUtcDate(terms.effectiveFrom) ?? "—"}
                    {terms.archivedAt ? ` · archived ${formatSubscriptionDate(terms.archivedAt)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section title="Commissions by client">
        {!program ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : program.clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No paid invoices from this partner's clients yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium">Payments</th>
                  <th className="px-3 py-2 font-medium">Awaiting terms</th>
                  <th className="px-3 py-2 font-medium">Out of scope</th>
                  <th className="px-3 py-2 font-medium">Commission (net)</th>
                  <th className="px-3 py-2 font-medium">Last payment</th>
                </tr>
              </thead>
              <tbody>
                {program.clients.map((client, index) => (
                  <tr key={client.userId ?? `deleted-${index}`} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      {client.userId ? (
                        <Link
                          to={`/admin/users/${client.userId}`}
                          className="font-medium text-foreground underline-offset-2 hover:underline"
                        >
                          {client.name ?? client.email ?? "User"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Deleted user</span>
                      )}
                      {client.email && client.name ? (
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{client.payments}</td>
                    <td className="px-3 py-2 tabular-nums">{client.pendingTermsPayments}</td>
                    <td className="px-3 py-2 tabular-nums">{client.outOfScopePayments}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {client.earned.length
                        ? client.earned.map((amount) => formatMoney(amount.cents, amount.currency)).join(" + ")
                        : "—"}
                    </td>
                    <td className="px-3 py-2">{formatSubscriptionDate(client.lastPaidAt) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
