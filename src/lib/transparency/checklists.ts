/**
 * Field evidence templates by phase and the safe-photography checklist (spec 01 §C, 03 Task B.2–B.3).
 * Client-safe (no server imports). Checklists are guidance; qualified inspection requirements are separate.
 */
import type { Trade } from "./types";

export const SAFETY_CHECKLIST = [
  "I am standing on safe, stable ground — not on a ladder, scaffold, tower, roof edge or unprotected slab edge.",
  "I am not operating, or standing in the path of, any machinery or vehicle.",
  "Photography is authorised on this site today, and I will avoid capturing faces, children and neighbours' property where possible.",
  "If I can't get a shot safely, I'll skip it and say so in the notes. Reports can be finished later from safe ground.",
] as const;

export const SAFETY_RULE = "Never photograph while climbing, on towers, ladders or scaffolds, operating machinery, or anywhere you could fall. Capture only when safely positioned and where site photography is authorised.";

export const shotList: Record<Trade, { phase: string; shots: string[]; holdPoint?: string }> = {
  site_prep: { phase: "Site preparation", shots: ["Wide overview of the cleared plot", "Setting-out lines / profile boards", "Boundary pillars visible (if present)"] },
  foundations: { phase: "Foundations", shots: ["Excavation overview", "Reinforcement before pour (with spacers visible)", "Formwork corners", "After pour / curing"], holdPoint: "Pre-pour inspection by a qualified person before concrete is placed." },
  blockwork: { phase: "Blockwork", shots: ["Elevation overview", "Corners (bonding pattern)", "Openings (lintels / dimensions)", "Close-up of joints"] },
  frame: { phase: "Structural frame / slab", shots: ["Formwork & props overview", "Reinforcement before pour", "Column-slab junctions", "After pour"], holdPoint: "Pre-pour slab inspection." },
  roof: { phase: "Roofing", shots: ["Roof framing overview (from the ground or a safe platform only)", "Fasteners / straps", "Underlay", "Finished roof from the ground"] },
  mep: { phase: "MEP before concealment", shots: ["Conduit / pipe runs before plastering", "Distribution board / manifold", "Pressure-test gauge (if applicable)"], holdPoint: "Services must be recorded before they are covered." },
  finishes: { phase: "Finishes", shots: ["Room overview", "Detail of finish quality", "Any defects / snags"] },
  handover: { phase: "Handover", shots: ["Each room overview", "Snag list items", "Signed checklists"] },
};

export const STAGES = [
  { value: "overview", label: "Overview" },
  { value: "before", label: "Before" },
  { value: "during", label: "During" },
  { value: "after", label: "After" },
  { value: "detail", label: "Close-up" },
] as const;
