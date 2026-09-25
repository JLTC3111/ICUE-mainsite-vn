# ICUE terminal bird

```jsx
import { ChatMascot } from '@icue/chatbot'

<ChatMascot state="thinking" />
```

`state`: `idle`, `greeting`, `curious`, `thinking`, `speaking`, `happy`,
`confused`, `error`, `sleeping`. `speaking` is available for future streaming
use. This retrieval chatbot uses `thinking` during its actual response work.
The closed launcher sleeps after 60 seconds without a pointer/key interaction;
hover/focus wakes its face and opening chat gives a greeting.

`variant`: `launcher` (80px / 64px on mobile), `header` (42px), `avatar` (28px).
`animated={false}` renders a static transcript avatar without timers or lifecycle
subscriptions. `active={false}` pauses a hidden instance. `interactive` enables
the curious hover/focus expression when idle or sleeping. All instances are decorative;
the host must provide the accessible button label and localized textual status.
The visible launcher remains animated while chat is open; its inactivity-sleep
timer and curious hover face are disabled during the conversation.

Assistant messages and the pending-reply row use the exported `AssistantAvatar`
component: a static 28px pale SVG badge with contrasting navy pixel expressions
(`> _`, `^ ^`, `> <`, `- -`) selected from the reply state. The header contains
the chat title and controls; the full bird lives only in the floating launcher.
Transcript badges are decorative and preserve the avatar spacing and top alignment.
On hover or keyboard focus, the launcher jumps and spreads both wings widely;
the open panel limits jump height to its available gap. Its button stays transparent.

The independent SVG face uses pixel paths rather than typography. Coordinates
use a 100 × 100 canvas aligned to the square artwork; symbols occupy x=43–73,
y=39–50, within the blank visor. Replacing the artwork requires checking that
alignment at launcher, header and avatar sizes. No translated text is in the art.

Greeting, success and fallback reactions settle to idle after 1.8 seconds.
One timeout, cleared on state change/unmount, controls each brief reaction.
Breathing, occasional blink, thinking tilt, paired idle wing wiggles, tail sways,
foot taps/steps and staggered dots use CSS transform and opacity. The tail flaps
throughout `thinking`, `speaking` and the brief `happy` response reaction;
the head feathers gently rise and fall while sleeping. Animated instances
compose a clean body with SVG-masked appendages from the original
asset. A curved cutout separates the crest from the core image, with an overlap
at the roots so it stays attached as it moves. Static avatars use the original
single image. A separate cleaned-up one-shot timeout controls sleeping; no
animation interval runs in JavaScript. Visibility, pagehide/pageshow and
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
