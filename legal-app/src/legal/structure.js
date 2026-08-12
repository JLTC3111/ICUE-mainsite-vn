/**
 * The shape of each legal document — everything that is NOT language.
 *
 * Block `type`, section `id`, the accent colours, the icon and any `href`,
 * `tone` or `numbered` flag live here once. The words live in
 * ./content/<lang>.js, keyed by section id and matched to these blocks by
 * position, so a translator never has to restate the structure and the six
 * languages cannot drift apart. scripts/verify-legal-content.mjs enforces that.
 */
export const LEGAL_STRUCTURE = [
  {
    "slug": "privacy",
    "icon": "shield",
    "accent": "#2563eb",
    "accentSoft": "#dbeafe",
    "sections": [
      {
        "id": "overview",
        "blocks": [
          {
            "type": "paragraph"
          },
          {
            "type": "callout"
          }
        ]
      },
      {
        "id": "collection",
        "blocks": [
          {
            "type": "list"
          },
          {
            "type": "table"
          }
        ]
      },
      {
        "id": "use",
        "blocks": [
          {
            "type": "list"
          }
        ]
      },
      {
        "id": "security",
        "blocks": [
          {
            "type": "list"
          }
        ]
      },
      {
        "id": "sharing",
        "blocks": [
          {
            "type": "list"
          },
          {
            "type": "callout",
            "tone": "warning"
          }
        ]
      },
      {
        "id": "rights",
        "blocks": [
          {
            "type": "list"
          },
          {
            "type": "link",
            "href": "/legal/gdpr"
          }
        ]
      },
      {
        "id": "tracking",
        "blocks": [
          {
            "type": "list"
          },
          {
            "type": "link",
            "href": "/legal/cookies"
          }
        ]
      }
    ]
  },
  {
    "slug": "terms",
    "icon": "file",
    "accent": "#7c3aed",
    "accentSoft": "#ede9fe",
    "version": "2.1",
    "sections": [
      {
        "id": "acceptance",
        "blocks": [
          {
            "type": "paragraph"
          },
          {
            "type": "callout"
          }
        ]
      },
      {
        "id": "services",
        "blocks": [
          {
            "type": "list"
          },
          {
            "type": "table"
          }
        ]
      },
      {
        "id": "responsibilities",
        "blocks": [
          {
            "type": "cards"
          }
        ]
      },
      {
        "id": "prohibited",
        "blocks": [
          {
            "type": "list"
          },
          {
            "type": "callout",
            "tone": "warning"
          }
        ]
      },
      {
        "id": "payment",
        "blocks": [
          {
            "type": "cards"
          }
        ]
      },
      {
        "id": "intellectual-property",
        "blocks": [
          {
            "type": "paragraph"
          },
          {
            "type": "list"
          }
        ]
      },
      {
        "id": "liability",
        "featured": true,
        "blocks": [
          {
            "type": "list"
          },
          {
            "type": "callout",
            "tone": "warning"
          }
        ]
      },
      {
        "id": "termination",
        "blocks": [
          {
            "type": "paragraph"
          },
          {
            "type": "paragraph"
          }
        ]
      },
      {
        "id": "disputes",
        "blocks": [
          {
            "type": "steps"
          }
        ]
      },
      {
        "id": "other",
        "blocks": [
          {
            "type": "list"
          }
        ]
      }
    ]
  },
  {
    "slug": "gdpr",
    "icon": "scale",
    "accent": "#059669",
    "accentSoft": "#d1fae5",
    "sections": [
      {
        "id": "about-gdpr",
        "blocks": [
          {
            "type": "paragraph"
          },
          {
            "type": "callout"
          },
          {
            "type": "paragraph"
          }
        ]
      },
      {
        "id": "your-rights",
        "blocks": [
          {
            "type": "cards",
            "numbered": true
          }
        ]
      },
      {
        "id": "request-process",
        "blocks": [
          {
            "type": "steps"
          }
        ]
      },
      {
        "id": "send-request",
        "blocks": [
          {
            "type": "request"
          }
        ]
      },
      {
        "id": "timing",
        "blocks": [
          {
            "type": "cards"
          }
        ]
      },
      {
        "id": "complaints",
        "blocks": [
          {
            "type": "list"
          },
          {
            "type": "external-link",
            "href": "https://edpb.europa.eu/about-edpb/board/members_en"
          }
        ]
      }
    ]
  },
  {
    "slug": "cookies",
    "icon": "cookie",
    "accent": "#d97706",
    "accentSoft": "#fef3c7",
    "sections": [
      {
        "id": "what-are-cookies",
        "blocks": [
          {
            "type": "paragraph"
          },
          {
            "type": "callout"
          }
        ]
      },
      {
        "id": "cookie-types",
        "blocks": [
          {
            "type": "cards",
            "numbered": true
          },
          {
            "type": "table"
          }
        ]
      },
      {
        "id": "preferences",
        "blocks": [
          {
            "type": "preferences"
          }
        ]
      },
      {
        "id": "browser-controls",
        "blocks": [
          {
            "type": "cards"
          }
        ]
      },
      {
        "id": "third-parties",
        "blocks": [
          {
            "type": "table"
          },
          {
            "type": "callout",
            "tone": "warning"
          }
        ]
      },
      {
        "id": "impact",
        "blocks": [
          {
            "type": "table"
          }
        ]
      },
      {
        "id": "cookie-security",
        "blocks": [
          {
            "type": "list"
          }
        ]
      }
    ]
  }
]
