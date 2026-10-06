# Round 2 references

Option B — "Statement over the room" — is the approved foundation. Option A is
kept only for context; it was not chosen.

| File | What it is |
| --- | --- |
| `option-b-desktop.jpg`, `option-b-mobile.jpg` | Approved Option B renders (1440 / 375) with the real photographs |
| `option-b-*.stitch.html` | Stitch's generated markup for Option B. Reference only — never copy it; production reimplements the composition. Image URLs inside point at Stitch/temp storage and will not resolve. |
| `option-a-*.jpg` | Rejected Option A (photo-boundary typography), for comparison |
| `stitch-brief.md` | The brief given to Stitch for Round 2 |
| `photo-evidence.md` | What is and is not verified about the current photographs and brand evidence |

The Option B renders contain `[CITY] /// [ACTIVATION]` placeholders. Those are
Stitch placeholders and must never ship — see the truth rules in the
constitution and `src/data/public.ts`.
