# 17 — Assets & Visual Direction

## Built in code
| Asset | File | Notes |
|---|---|---|
| Logo (mark + wordmark, light/dark) | `src/components/ui/Icons.tsx → Logo` | Original. Export to SVG/PNG for social profiles |
| Hero illustration | `src/components/visual/HeroArt.tsx` | Original contemporary tropical residence: deep overhangs, breeze-block screen, survey-line motif |
| 7 service icons + UI icons | `Icons.tsx` | Line icons, 1.6 stroke |
| Process diagram | `ProcessSection` (5 steps), per-service 5-step process | |
| Owner reporting dashboard mockup | `src/components/visual/DashboardMockup.tsx` | Permanently labelled "Sample report · illustrative data" |
| OG image | `src/app/opengraph-image.tsx` | Auto-generated 1200×630 |
| Mobile landing layout | `/lp/*`: hero → CTA → pains → form card → offer → steps → FAQ → CTA | Sticky CTA bar on mobile |
| Placeholders | `Placeholder` component | Striped, clearly labelled. Never mistaken for real photos |

## Hero photography direction (when commissioning)
Golden-hour exterior of a completed contemporary residence in Greater Accra or Kumasi. Clean lines, deep shade, laterite and greenery. One frame wide (house + sky for headline space on the left), one detail (site supervisor with tablet reviewing drawings on site, faces optional, releases required). Avoid staged "family in front of house" stock tropes. Shoot 3:2 and 4:5. Capture metadata dates for authenticity.

## Three campaign visual systems
| | A: New Home "The Plan" | B: Stalled "The Facts" | C: Investor "The Numbers" |
|---|---|---|---|
| Palette | Forest + ivory, gold accents | Forest + muted laterite, gold highlights on "evidence" | Deep forest + gold data lines |
| Core motif | Survey line + pins, step sequence | Documentation frame: photo with date stamp + checklist ticks | Dashboard crops, draw schedule bars |
| Type treatment | Serif headline, italic gold key phrase | Sans-serif "report" labels + serif headline | Big serif figures (always labelled sample) |
| Tone | Aspirational, calm | Steady, reassuring, no fear imagery | Precise, institutional |

## Social templates (build in Canva/Figma from these specs)
- **Feed 1:1 / 4:5:** forest bg, 64px margins, eyebrow (gold caps) + 2-line serif headline + small logo bottom-left; optional illustration/photo right half.
- **Story/Reel 9:16:** safe zones top 250px / bottom 340px, captions burned in, end card with "Request a Project Assessment" + URL.
- **Carousel:** cover (hook), 3–5 content cards (one idea each, numbered), CTA card. Consistent page indicator in gold.
- **Article share:** ivory bg, serif title, "Guide" tag, logo.

## Lead magnet concept
**"The Overseas Owner's Ghana Build Checklist"** (PDF, 8–10 pages): Land (documents, searches, red flags) · Design (complete drawing set) · Permit (what the Assembly typically asks for, pending professional review) · Budget (line-item template) · Payments (milestone schedule template) · Reporting (what every update should include) · Stalled-project triage.
- Delivery: gated on a short form (name, email, project stage, marketing consent) → GHL tag `lm-checklist` → WF-04 nurture.
- Implementation path: add a `/resources/checklist` page with a 3-field variant of the form (funnel `general`, service `not_sure`) once the PDF is produced and reviewed.

## Image rights rules
Only: our own photography with releases, owner-permitted project photos, properly licensed stock (kept in a licence log) used **only** as generic scenery and never captioned as our project, or the original illustrations. Store licences in `/public/images/LICENSES.md` when added.
