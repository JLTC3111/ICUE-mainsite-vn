# Community Activities — what still needs a human

Everything on this page was read off the banners and objects in the
photographs, because the legacy page it replaces carried no copy at all — one
heading, a thirteen-photo collage and a button that did nothing. The list below
is what could **not** be read, and is therefore absent from the page rather
than guessed at.

## Open questions

| Programme | Missing | Notes |
|---|---|---|
| Áo ấm cho con đến trường | How many children, how many coats | The photographs show roughly thirty children but nothing states a figure, so none is given. |
| Hỗ trợ bà con Bảo Yên | **The date** | The Hà Giang banner carries `15.01.2024`; the Bảo Yên banner carries none. Typhoon Yagi made landfall in September 2024, but that is inference, so `meta.date` is simply absent and the page shows a place without a date. Add it to `src/data/programmes.js` and it renders automatically. |
| Hỗ trợ bà con Bảo Yên | Partner organisations | Five logos appear on the banner. Two are legible — Ủy ban nhân dân huyện Bảo Yên and ICUE itself — and the body text credits them generically as "các đơn vị đồng hành". The other three are not readable at this resolution and are not named. |
| Hỗ trợ bà con Bảo Yên | Quantities | Rice sacks and prepared parcels are visible and are described as such; no count or weight is claimed. |
| Trên đường công tác | Everything | Two archive photographs with no banner and no legible date. The section states only what is in the frame and makes no claim about when or why. If they belong to a named programme, move them; if not, they can be dropped without touching anything else. |

## Where the photographs came from

The originals were `public/community/1.jpg` … `13.jpg` — 9.9 MB of full-size
JPEG with no alt text. They now live in `public/media/` under names that say
what they show, re-exported to WebP at 400/800/1600px. The originals remain in
git history.

| Was | Now |
|---|---|
| `2.jpg` | `warm-clothes-welcome` |
| `5.jpg` | `warm-clothes-group` |
| `3.jpg` | `warm-clothes-banner` |
| `4.jpg` | `warm-clothes-table` |
| `6.jpg` | `warm-clothes-handover` |
| `7.jpg` | `warm-clothes-coats` |
| `9.jpg` | `yagi-departure` |
| `10.jpg` | `yagi-banner` |
| `11.jpg` | `yagi-rice` |
| `13.jpg` | `yagi-handover` |
| `12.jpg` | `yagi-group` |
| `1.jpg` | `fieldwork-town` |
| `8.jpg` | `fieldwork-survey` |

## Adding a programme

Add an entry to `src/data/programmes.js` with all six locales and a `photos`
list, drop the renditions into `public/media/` at 400/800/1600px, and add the
id to `PROGRAMME_IDS`. `npm run verify:content` will refuse the build if a
caption, a translation or a rendition is missing, or if a `TODO(review)`
marker is left behind.
