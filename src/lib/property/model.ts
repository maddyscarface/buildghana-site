/**
 * Off-market property introductions — data model, lifecycle and role permissions.
 * Mirrors db/property-schema.sql (Supabase/Postgres) so the KV implementation can be migrated 1:1.
 *
 * PRIVACY RULES (enforced in service.ts / public.ts and covered by tests):
 *  - Private inventory, seller contact details, exact location/GhanaPost GPS and documents never reach
 *    public pages, public APIs, sitemaps, llms.txt, JSON-LD or third-party tracking.
 *  - Nothing about a seller is shared with a buyer until the seller has authorised it AND an admin
 *    has approved the specific introduction.
 */

export type Role = "admin" | "reviewer" | "legal_reviewer";

/** Lifecycle shared by seller listings (property_leads) and buyer_requirements. */
export const leadStatuses = [
  "submitted", "contact_verified", "documentation_requested", "counsel_review_pending", "reviewed",
  "approved_for_introduction", "matched", "introduction_authorized", "closed", "lost", "withdrawn",
] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const statusLabel: Record<LeadStatus, string> = {
  submitted: "Submitted",
  contact_verified: "Contact verified",
  documentation_requested: "Documentation requested",
  counsel_review_pending: "Counsel review pending",
  reviewed: "Reviewed",
  approved_for_introduction: "Approved for introduction",
  matched: "Matched",
  introduction_authorized: "Introduction authorised",
  closed: "Closed",
  lost: "Lost",
  withdrawn: "Withdrawn",
};

export const terminalStatuses: LeadStatus[] = ["closed", "lost", "withdrawn"];

/** Allowed manual transitions. Terminal states can only be re-opened by an admin to "submitted". */
export const leadTransitions: Record<LeadStatus, LeadStatus[]> = {
  submitted: ["contact_verified", "documentation_requested", "lost", "withdrawn"],
  contact_verified: ["documentation_requested", "counsel_review_pending", "reviewed", "lost", "withdrawn"],
  documentation_requested: ["counsel_review_pending", "reviewed", "lost", "withdrawn"],
  counsel_review_pending: ["reviewed", "documentation_requested", "lost", "withdrawn"],
  reviewed: ["approved_for_introduction", "documentation_requested", "lost", "withdrawn"],
  approved_for_introduction: ["matched", "reviewed", "lost", "withdrawn"],
  matched: ["introduction_authorized", "approved_for_introduction", "lost", "withdrawn"],
  introduction_authorized: ["closed", "lost", "withdrawn"],
  closed: ["submitted"],
  lost: ["submitted"],
  withdrawn: ["submitted"],
};

/** Which role may move a record INTO a state. */
export const transitionRoles: Partial<Record<LeadStatus, Role[]>> = {
  counsel_review_pending: ["admin", "legal_reviewer", "reviewer"],
  reviewed: ["admin", "legal_reviewer", "reviewer"],
  approved_for_introduction: ["admin"],
  matched: ["admin"],
  introduction_authorized: ["admin"],
  submitted: ["admin"],
};

export const can = {
  viewContact: (r: Role) => r === "admin" || r === "reviewer",
  viewExactLocation: (r: Role) => r === "admin" || r === "legal_reviewer",
  downloadDocuments: (r: Role) => r === "admin" || r === "legal_reviewer",
  downloadMedia: (_r: Role) => true,
  approveIntroduction: (r: Role) => r === "admin",
  recordAuthorization: (r: Role) => r === "admin",
  legalReview: (r: Role) => r === "admin" || r === "legal_reviewer",
  deleteData: (r: Role) => r === "admin",
  runMatching: (r: Role) => r === "admin" || r === "reviewer",
  editCompliance: (r: Role) => r === "admin" || r === "legal_reviewer",
};

export type Attribution = Partial<Record<string, string>>;

export type Contact = {
  firstName: string; lastName: string; email: string; phone: string; whatsapp?: string;
  preferredContact: string; residenceCountry: string; language: string;
};

/** Legal/documentation review state — tracked separately from the lifecycle. Never "verified" without counsel. */
export const legalStates = ["not_started", "documents_requested", "with_counsel", "counsel_cleared_with_qualifications", "counsel_flagged", "not_required_yet"] as const;
export type LegalState = (typeof legalStates)[number];
export const legalStateLabel: Record<LegalState, string> = {
  not_started: "Not started",
  documents_requested: "Documents requested",
  with_counsel: "With counsel",
  counsel_cleared_with_qualifications: "Counsel cleared (with qualifications)",
  counsel_flagged: "Counsel flagged issues",
  not_required_yet: "Not required yet",
};

/** property_leads — a seller's land/property. Exact location fields are private. */
export type PropertyLead = {
  id: string; kind: "seller"; createdAt: string; updatedAt: string; status: LeadStatus; legalState: LegalState;
  submissionId: string; sandbox: boolean; reference: string;
  contact: Contact; sellerRole: string;
  parcel: {
    region: string; district: string; town: string;
    /** PRIVATE: never rendered publicly or sent to tracking. */
    ghanaPostGps?: string; locationNotes?: string;
    sizeValue: number | null; sizeUnit: string; propertyKind: string; propertyUse: string; occupancy: string;
  };
  pricing: { askingMinor: number | null; currency: "GHS" | "USD" | null; negotiability: string };
  legal: { titleSelfReport: string; planningStatus: string; encumbrance: string; encumbranceNotes?: string; documentInventory: string[] };
  inspection: string; representation: string; notes?: string;
  consents: { contact: boolean; marketing: boolean; privacyAt: string };
  attribution?: Attribution;
  dedupe: { ownerKey: string; parcelKey: string; duplicateOf?: string };
  crm?: { contactId?: string; opportunityId?: string; lastSync?: string; lastResult?: string };
  assetIds: string[];
  deletedAt?: string;
};

/** buyer_requirements */
export type BuyerRequirement = {
  id: string; kind: "buyer"; createdAt: string; updatedAt: string; status: LeadStatus; legalState: LegalState;
  submissionId: string; sandbox: boolean; reference: string;
  contact: Contact; buyerRole: string; eligibility: string;
  wants: {
    regions: string[]; areas?: string; propertyKinds: string[]; propertyUse: string;
    sizeMin: number | null; sizeMax: number | null; sizeUnit: string;
    budgetMinMinor: number | null; budgetMaxMinor: number | null; currency: "GHS" | "USD";
    timeline: string; financing?: string; intendedUse: string; tenure: string; mustHaves?: string;
    siteVisit: string; counsel: string;
  };
  consents: { contact: boolean; marketing: boolean; privacyAt: string };
  attribution?: Attribution;
  dedupe: { ownerKey: string; duplicateOf?: string };
  crm?: { contactId?: string; opportunityId?: string; lastSync?: string; lastResult?: string };
  deletedAt?: string;
};

export type AnyRecord = PropertyLead | BuyerRequirement;

/** seller_authorizations — what the seller has agreed BuildGhana may do. Recorded by an admin from a signed/confirmed instruction. */
export type SellerAuthorization = {
  id: string; propertyId: string; createdAt: string; recordedBy: Role;
  shareDetailsWithMatchedBuyers: boolean; shareContactAfterApproval: boolean;
  publicListing: boolean; factualReviewDone: boolean; imagePermission: boolean; searchIndexConsent: boolean;
  evidence: string; revokedAt?: string; revokedReason?: string;
};

/** property_assets — media (photos/videos) and private documents. */
export type PropertyAsset = {
  id: string; ownerId: string; ownerKind: "seller" | "buyer"; category: "media" | "document"; docType?: string;
  contentType: string; size: number; storageKey: string; filename: string; uploadedAt: string;
  status: "pending_upload" | "uploaded" | "rejected" | "purged";
  scan: "not_scanned" | "clean" | "infected" | "error";
};

export const matchStatuses = ["suggested", "reviewed", "rejected", "introduction_approved", "introduced", "closed"] as const;
export type MatchStatus = (typeof matchStatuses)[number];

/** matches — admin-assisted, deterministic. */
export type Match = {
  id: string; propertyId: string; buyerId: string; createdAt: string; updatedAt: string; status: MatchStatus;
  score: number; reasons: string[]; blockers: string[];
  fx?: { usdToGhs: number; source: string; date: string; usedAt: string } | null;
  reviewedBy?: Role; reviewNote?: string;
};

/** introductions — created only when an admin approves a match that passes every gate. */
export type Introduction = {
  id: string; matchId: string; propertyId: string; buyerId: string; createdAt: string; approvedBy: Role;
  sellerAuthorizationId: string; status: "approved" | "made" | "cancelled"; note?: string;
};

export type VerificationTask = {
  id: string; recordId: string; recordKind: "seller" | "buyer"; type: "contact" | "documents" | "counsel" | "site_inspection" | "authorization" | "other";
  title: string; status: "open" | "done" | "cancelled"; assignee?: Role; createdAt: string; updatedAt: string; note?: string;
};

export type PrivacyRequest = {
  id: string; type: "deletion" | "withdrawal" | "abuse_report" | "access_revocation"; createdAt: string;
  reference?: string; email: string; message: string; status: "open" | "done" | "rejected"; resolvedAt?: string;
};

export type AuditEntry = { at: string; actor: Role | "client" | "system"; action: string; entity: string; detail?: Record<string, unknown> };

/** Coarse, non-identifying description safe for staff notifications and CRM opportunity names. */
export const coarseLocation = (p: { region: string; district?: string }) => [p.district, p.region].filter(Boolean).join(", ");
