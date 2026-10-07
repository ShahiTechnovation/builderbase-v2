# 21st.dev Visual Reference Board & Direction

## 1. 21st.dev References

### 1. Sunset Skyline Hero (gughigug)
- **What is good:** Scroll-locked cinematic transition that pushes a camera through a literal portal/window.
- **What is bad:** A bit too "anime/Web3" in its default styling. Highly dependent on complex React/three.js setups.
- **Dependency Cost:** High (WebGL, Three.js).
- **Fits Astro:** Poorly (requires heavy hydration).
- **Action:** **ADAPT** the technique (concept of scrolling into a mask).
- **Where:** Hero → Culture transition.

### 2. Hero Shutter Text (daiwiikharihar)
- **What is good:** High-impact, mechanical "shutter" slicing effects on typography. Very structural and architectural.
- **What is bad:** Can become illegible if overused.
- **Dependency Cost:** Medium (Framer Motion).
- **Fits Astro:** Moderate (requires client-side React for the hero title).
- **Action:** **ADAPT** via Vanilla CSS/JS clipping paths.
- **Where:** "DISTRIBUTION" typography in the Hero.

### 3. Reveal Image Mask (daiwiikharihar)
- **What is good:** Elegant mask that blooms images into full frame on scroll. Very editorial.
- **What is bad:** Tends to feel a bit generic "agency site" if the timing isn't sharp.
- **Dependency Cost:** Medium (Framer Motion).
- **Fits Astro:** High (can be done with CSS `@scroll-timeline` or minimal IntersectionObserver).
- **Action:** **ADAPT** technique.
- **Where:** Image reveals in "You had to be there".

### 4. Morph Gallery (kedhareswer)
- **What is good:** WebGL image transition dissolving through noise. "Zero dependencies" raw WebGL. Very premium, raw material feel.
- **What is bad:** Canvas-based, meaning accessibility requires extra work.
- **Dependency Cost:** Very Low (Vanilla WebGL, zero external libraries).
- **Fits Astro:** Perfect (vanilla script, no hydration needed).
- **Action:** **INSTALL** and customize.
- **Where:** Culture Section background or hero image replacement.

### 5. Timeline (kuratlielia)
- **What is good:** Vertical activity feed with an animated drawing connector line. Perfect for structural, fact-based lists.
- **What is bad:** Indentations can break on mobile if not careful.
- **Dependency Cost:** Low (Tailwind/Lucide/Framer).
- **Fits Astro:** Moderate.
- **Action:** **ADAPT** into a purely CSS-driven timeline (no Framer Motion needed).
- **Where:** "PROOF, NOT PROMISES" section.

### 6. Worth Keeping CTA (ziegfiroyt)
- **What is good:** Giant monochrome scrolling marquee behind a centered heading. Extremely bold, feels like a print poster.
- **What is bad:** Marquees can cause CPU burn if not hardware accelerated properly.
- **Dependency Cost:** Low.
- **Fits Astro:** Perfect (pure CSS animation).
- **Action:** **ADAPT**.
- **Where:** Builder Ending ("BUILD SOMETHING WORTH DISTRIBUTING").

### 7. Hover Expand (educalvolpz)
- **What is good:** Accordion-style image gallery where panels expand on hover. Very physical, structured interactions.
- **What is bad:** Horrible on touch devices unless modified.
- **Dependency Cost:** Low (CSS flex transitions).
- **Fits Astro:** Perfect.
- **Action:** **ADAPT**.
- **Where:** "YOU HAD TO BE THERE" horizontal image gallery.

### 8. Image Trail (componentry)
- **What is good:** Cursor-following trail of images that fade. Highly engaging, captures the "overflowing culture" vibe.
- **What is bad:** Absolute layout can cause z-index nightmares.
- **Dependency Cost:** Low (Vanilla JS).
- **Fits Astro:** Perfect.
- **Action:** **INSTALL** / ADAPT.
- **Where:** Interactive moments in Next Rooms or Culture section.

### 9. Editorial Hero (felipemenezes098)
- **What is good:** Classic, rigid print-like layout. Left tagline, right-aligned heavy headline.
- **What is bad:** A bit static.
- **Dependency Cost:** Zero.
- **Fits Astro:** Perfect.
- **Action:** **ADAPT** for structural layout.
- **Where:** Section headers and Footer layout.

### 10. Interactive Blur Reveal (hyperiux)
- **What is good:** WebGL2 shader keeping an image frosted until hovered.
- **What is bad:** Overused in 2023 portfolio sites.
- **Dependency Cost:** Medium.
- **Fits Astro:** Good.
- **Action:** **REJECT**. (Too trendy/SaaS, detracts from raw Builder Base photography).

---

## 2. Visual Studies

### A — EDITORIAL MACHINE (Chosen Direction)
- **Core vibe:** Huge typography, mechanical movement, hard masks, precise rules, print/editorial composition.
- **Motion:** CUT, LOCK, GLIDE.
- **Concept:** Builder Base is an established, high-end infrastructure layer. It shouldn't feel like a flashy startup; it should feel like an institution of distribution. 
- **Typography:** massive, structural, unyielding. 

### B — PHYSICAL INTERNET
- **Core vibe:** Depth, planes, perspective, media as physical objects.
- **Motion:** REVEAL, OPEN.
- **Concept:** Emphasizing the "Room" aspect of Builder Base, turning the UI into 3D spatial layers. 
- **Flaw:** Might feel too much like a Web3 gallery or portfolio template.

### C — CULTURE SIGNAL
- **Core vibe:** Photography, aggressive crops, image trails, kinetic typography, dense builder energy.
- **Motion:** SIGNATURE, GLIDE.
- **Concept:** Pure momentum. Chaotic, overflowing energy.
- **Flaw:** Might lack the gravitas required for a B2B "distribution" pitch.

## 3. Direction Decision

**Winner: A — EDITORIAL MACHINE** (with accents of Culture Signal).

*Why?*
- *"Would I recognize Builder Base from a screenshot?"* Yes. Huge black-and-white Schibsted Grotesk, raw photography, and harsh mechanical masks are iconic.
- *"What makes a company think Builder Base has real distribution?"* An editorial, institutional aesthetic. SaaS gradients feel like promises; print-editorial feels like established fact.
- *"What would make a builder want to be in the room?"* High-contrast, gritty, real event photography bleeding through structured, precise architectural layouts.

**Action Plan:**
1. **Hero:** Heavy mechanical "DISTRIBUTION" typography. We'll adapt *Hero Shutter Text* techniques using pure CSS clip-paths to make the text feel structural.
2. **Transition:** We will implement an aggressive hard-mask expansion (*Sunset Skyline Hero* concept) where the word "DISTRIBUTION" or a structural block literally acts as a window zooming into the "YOU HAD TO BE THERE" event photography.
3. **Culture Gallery:** Adapt *Hover Expand* (accordion gallery) mixed with *Image Trail* logic for mouse movement to show raw event density.
4. **Proof Section:** Adapt the *Timeline* structure into a purely typographic, data-driven list using Fragment Mono. Dates/numbers are the only graphics.
5. **Endings:** Adapt *Worth Keeping CTA* (Marquee + massive typography) for the Builder challenge.
6. **Footer:** Adapt *Editorial Hero* structures for a brutalist, clean print footer.
