# ICUE terminal bird

```jsx
import { ChatMascot } from '@icue/chatbot'

<ChatMascot expression="thinking" effect="book" />
<ChatMascot expression="excited" effect="sparkles" reactionKey={openingId} />
```

`expression` (or the compatible `state` prop): `idle`, `greeting`, `excited`,
`curious`, `thinking`, `speaking`, `happy`, `reading`, `idea`, `handoff`,
`confused`, `error`, `coffee`, `listening`, `sleeping`. `effect`: `auto` (default), `none`, `sparkles`,
`book`, `coffee`, `music`, `bulb`, `hearts`, or `zzz`. An explicit effect overrides the default
for that expression. Increment a stable `reactionKey` for a new event with the
same expression; typing and unrelated renders do not replay a reaction.
`speaking` is available for future streaming use. This retrieval chatbot uses
`thinking` during its actual response work. Existing artwork and size variants
are preserved; this implementation changes only the Main-site repository.
The closed launcher walks while listening to music after 30 seconds without
a pointer/key interaction, sits for coffee at 60 seconds, then lies down
facing right at 120 seconds. Music adds fitted headphones, a gentle head nod,
alternating steps, swaying wings and two drifting notes; it does not play audio.
The short walking loop stays around the launcher. Coffee puts away the
headphones and uses `^^`, a small plain muted blue-grey mug with subtle ceramic
shading and steam. Sleep puts away the mug and keeps `> _` (one eye open) with three drifting `z`
symbols. Hover, a pointer press or a key press wakes the whole bird and restarts
all three deadlines. Opening chat gives a greeting.

`variant`: `launcher` (104px / 64px on mobile), `header` (42px), `avatar` (28px).
The desktop launcher uses a 12px bottom inset; mobile keeps its 15px inset.
Both respect the device safe area. The panel reserves the launcher's height plus an 8px gap.
`animated={false}` renders a static transcript avatar without timers or lifecycle
subscriptions. `active={false}` pauses a hidden instance. `interactive` enables
the three-stage inactivity timer. All instances are decorative;
the host must provide the accessible button label and localized textual status.
The visible launcher remains animated while chat is open; all inactivity
deadlines are disabled during the conversation and while the page is hidden.

Assistant messages and the pending-reply row use the exported `AssistantAvatar`
component: a static 28px pale SVG badge with contrasting navy pixel expressions
(`> _`, `^ ^`, `> <`, `- -`) selected from the reply state. The header contains
the chat title and controls; the full bird lives only in the floating launcher.
Transcript badges are decorative and preserve the avatar spacing and top alignment.
On hover or keyboard focus, the closed, awake idle launcher smiles `^^`.
The eyes squeeze and crossfade from their current expression; activity states
take priority. Opening the chat plays `><`, one small hop, two brief wing
flutters and two sparkles. At 650ms it settles to `^^`, then after another
1.8 seconds to `>_`. Hover never loops the hop or replays opening effects.
The panel keeps an 8px gap above the bird. Its button stays transparent.

Real knowledge lookups call `getResponse(message, { onRetrieval })`, showing
`>...` with a small open SVG book while the lookup is pending. FAQ and document
answers retain the book briefly. A bulb accompanies authored planning, process,
sustainability, proposal and application guidance; other successful authored
replies show `^^` with two rising hearts. Fallbacks never celebrate. Errors
show `!x` with one small wobble. Sleep shows a steady `> _` without blinking.
The `handoff` expression provides `>→` and a brief pointing wing for an actual
cross-app handoff. The current chatbot has no HR/Contract handoff action, so it
does not trigger that state on ordinary contact/FAQ links.

Sparkles, hearts and bulbs play once and are removed, including under reduced
motion. Only ongoing states (idle, thinking, reading, coffee, listening and sleep) use loops.
Effects are decorative SVG paths: no additional bitmap assets or timers per frame.

## Body poses

Pose is derived from expression and effect, independently of the eye glyphs.
The original core image is split with SVG masks into a head and torso; pose
wrappers move these together with the existing wings, feet and tail. No new
state images are used. The eye overlay stays attached to the head, while sleep
symbols and other floating effects remain upright.

- Awake idle stands and breathes gently.
- Listening walks with alternating feet, swaying wings and a gentle head nod.
  The headphone band sits behind the crest and the earcups at the sides of the
  head, inside its motion wrapper; floating notes stay upright.
- Coffee sits with feet forward and both wings wrapped around a small mug.
  The mug is scaled to 78% of its original SVG geometry and uses subdued shading.
  Once seated, its tail gives a gentle paired wiggle with a short pause between cycles.
- Sleep lowers and turns the head to the right onto a folded wing, curls a rounded body
  behind it and leaves only tucked toe tips visible. The other wing rests
  alongside the body. Only the belly breathes. Hover,
  keyboard or pointer interaction wakes the whole bird and resets inactivity.
- Reading sits with feet forward and wings in front of the book to hold it.
- Thinking/curiosity brings a wing to the chin and tilts the head.
- Ideas raise a wing toward the bulb; happy opening raises both wings.
- Friendly completion sits with wings clasped, alongside the existing hearts.
- Handoff extends a pointing wing; errors crouch slightly during the wobble.

Pose transforms ease between states over 650ms. `MascotMotion` snapshots the
visible moving layers before a state change and eases their current offsets
into the next CSS loop over the same duration. Walking, nodding and stepping
therefore settle from the frame on screen, including during rapid interruptions.
The handoffs run in the browser's animation engine, with no JavaScript frame
loop, and are canceled when hidden, inactive, unmounted or reduced motion is
enabled. The coffee mug and headphones enter with gentle fades.
Reduced motion stops animation
and transitions but preserves each pose, including lying down. Static launcher
and header instances keep their poses; static tiny avatars retain the original
single-image rendering. A composed `thinking` or `happy` expression with a
`book` effect always uses the reading pose.

The independent SVG face uses pixel paths rather than typography. Coordinates
use a 100 × 100 canvas aligned to the square artwork; symbols occupy x=43–73,
y=39–50, within the blank visor. Replacing the artwork requires checking that
alignment at launcher, header and avatar sizes. No translated text is in the art.

Success, idea, handoff and fallback reactions settle after 1.8 seconds.
Opening uses two short timeouts for its excited/happy/idle sequence; burst
effects have a cleanup timeout. All are cleared on state change/unmount.
Breathing, occasional blink, thinking tilt, paired idle wing wiggles, tail sways,
foot taps and staggered dots use CSS transform and opacity. The speaking tail
flaps gently; reading and sleeping stop the standing wing/tail routines.
Layered instances compose the original core with SVG-masked appendages. A
curved cutout separates the crest, with overlap at the roots. A small neck
overlap keeps the head attached during tilts. Static avatars use the original
single image. Three cleaned-up one-shot timeouts control coffee, listening and sleep; no
animation interval runs in JavaScript. Returning to a visible page starts a
fresh inactivity cycle. Visibility, pagehide/pageshow and
freeze/resume pause motion;
`prefers-reduced-motion` removes all movement and fades. The component is memoized
so typing in the chat input does not rerender unchanged mascot instances.

## Artwork

- `icue-bird.webp`: production asset, 256 × 256, actual alpha, 12,020 bytes.
  Imported through Vite so every host app gets a hashed, base-aware asset URL.
- `icue-bird-core.webp`: clean body without wings, feet or tail, 256 × 256,
  actual alpha, 9,154 bytes. Both production images total 21,174 bytes.
- `source/icue-bird-core.png`: full-resolution generated core, kept out of bundles.
- `source/icue-bird.png`: full-resolution generated source, 1254 × 1254 with
  alpha. Not imported or shipped in app bundles.
- Generated with the built-in imagegen tool on 2026-09-24 using the user-supplied
  “Codex Image Sep 24, 2026, 01_07_57 PM.jpg” as the design reference.
- The reference sheet itself is not cropped or shipped. The new isolated bird
  keeps its blank navy visor and reflection; cyan expressions are live SVG.

Production conversion (preserves the generated alpha):

```sh
cwebp -q 88 -m 6 -resize 256 256 -alpha_q 100 \
  shared/chatbot/mascot/source/icue-bird.png \
  -o shared/chatbot/mascot/icue-bird.webp
```

No additional asset is required. A purpose-drawn layered/vector original could
improve joint contours during larger wing movements or large renderings; the
current generated layers are suitable for these compact UI sizes.
The unbranded coffee mug, steam, headphones and music notes are reusable SVG
geometry. The mug's muted blue-grey shading fits the site's background. Folded wings reuse the
original left-wing mask, mirrored for the right side.

Every app has the `@icue/chatbot` alias, so other components can import
`ChatMascot`. `SiteChatbot` is mounted once in each app entry; do not mount extra
chat dialogs in individual routes.

Root `npm run dev` serves built copies of all ten apps on port 5173. Restart that
command after shared mascot edits to rebuild them, then refresh the page. For
live mascot updates on the home app, use `npm run dev:home` on port 5175.

## Generation prompt

Use case: stylized-concept / background-extraction. Asset type: production transparent website chatbot mascot, single isolated character with blank terminal screen for a live SVG face overlay. Reference image 1 is the user's bird character design sheet. Create ONE clean isolated blue nerdy terminal bird faithfully based on the large character and the Normal/front poses in this reference. Soft polished 3D rounded blue bird, oversized rounded head, swept feather tuft, compact little wings, pale blue belly, distinctive layered blue/cyan tail peeking out to the left, small warm orange-yellow beak and feet. Full body, centered, front-facing with just a very slight three-quarter turn; visor should face camera almost square-on for overlay alignment. Big dark navy rounded rectangular terminal visor, glossy subtle top-left screen reflection. Crucial: the visor is completely BLANK: no eyes, no symbols, no cursor, no letters. Keep the beak immediately below/outside the blank screen. Actual transparent alpha background; no colored background, no checkerboard painted into the artwork, no floor, no baked drop shadow. Square 1024x1024 canvas, bird fills about 88% of height with all feathers and feet inside, small even margins. Friendly sophisticated developer companion, suitable for a professional technology company. Match the supplied distinct bird, no robot ears, no logos, no laptop, no accessories, no labels, no reference sheet layout.


## Core layer edit prompt

Use case: precise-object-edit. This is a production animation layer, NOT a redesign. Edit the supplied transparent blue terminal bird image into a CLEAN CORE BODY LAYER. Preserve the exact square canvas, composition, head, swept tuft, face visor, beak, lighting, texture, scale, position and identity. The visor MUST remain blank with no glyphs. Remove ONLY the three tail feathers sticking out on the left, both small wings attached to the lower body, and both orange feet. Seamlessly reconstruct the blue rounded belly/core body behind where the wings were, with the same shading and soft polished material. The rounded body should end in a clean rounded bottom around the same position just above the old feet. Preserve all the upper head feathers including the side feathers of the head. Do not zoom, recenter, rotate or change the head or visor shape. Keep the core at its original coordinates so the original wings, tail and feet can be composited back over it at the same positions. Actual transparent alpha background throughout removed outer parts; no checkerboard or ground, no text, no symbols, no extra parts, no shadow outside the body.

The core was edited with the built-in imagegen tool from `source/icue-bird.png`
and converted with the same `cwebp -q 88 -m 6 -resize 256 256 -alpha_q 100`
settings as the original. Both original generation and core edit were requested
on 2026-09-24.
