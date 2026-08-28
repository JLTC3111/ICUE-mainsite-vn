/**
 * English — ICUE's published English wording, lifted from the en.icue.vn
 * repository (~/Desktop/ICUE-mainsite-en, legacy/script.js) when that site's
 * /faqs was retired in favour of this one. It is the English readers and search
 * engines have already seen, so it is preserved verbatim rather than
 * re-translated from ./vi.js.
 *
 * One known discrepancy with the Vietnamese, left as published: legal[1] says
 * clients provide "land ownership papers", where the Vietnamese asks for
 * `giấy chứng nhận quyền sử dụng đất` — a land-USE rights certificate, which is
 * a different instrument. Worth settling with whoever owns the copy; changing
 * it here alone would put this page out of step with the Vietnamese source.
 */
export default {
  labels: {
    services: 'Services',
    process: 'Process',
    costs: 'Fees & Finance',
    legal: 'Legal & Documents',
    timeline: 'Project Schedule',
    technology: 'Technology',
    clients: 'Customer Support',
    general: 'Other Questions',
  },

  entries: {
    services: [
      {
        q: 'What types of consulting services do you provide?',
        a: 'We provide consulting in planning, design, project management, supervision, and legal procedure support.',
      },
      {
        q: 'Do you take on small residential projects?',
        a: 'Yes, we handle everything from residential housing to commercial and industrial buildings.',
      },
    ],
    process: [
      {
        q: 'What is the collaboration process like?',
        a: 'The process includes: initial consultation → site survey → preliminary design → finalized drawings → construction support.',
      },
      {
        q: 'Can I make changes to the design during the process?',
        a: 'Yes, clients have the right to request revisions at different stages before finalizing the drawings.',
      },
    ],
    costs: [
      {
        q: 'How are service fees calculated?',
        a: 'Fees can be charged as a package, as a percentage of total investment, or hourly depending on the project type.',
      },
      {
        q: 'Do you allow payment in installments?',
        a: 'Yes, we accept flexible payments according to project phases.',
      },
    ],
    legal: [
      {
        q: 'Do you assist with building permits?',
        a: 'Yes, we provide full support from preparing documents to submitting them to the authorities.',
      },
      {
        q: 'What documents do clients need to provide?',
        a: 'Typically: land ownership papers, current site drawings, and relevant legal documents.',
      },
    ],
    timeline: [
      {
        q: 'How long does it take to complete a project?',
        a: 'Depending on scale, usually 2-6 months for design and 6-18 months for construction.',
      },
      {
        q: 'What if the project is delayed?',
        a: 'We immediately report delays, propose solutions, and commit to catching up when possible.',
      },
    ],
    technology: [
      {
        q: 'Do you use BIM technology?',
        a: 'Yes, we use BIM and 3D modeling to help clients clearly visualize the design.',
      },
      {
        q: 'Do you offer green design solutions?',
        a: 'Yes, we prioritize sustainable materials and energy-saving solutions.',
      },
    ],
    clients: [
      {
        q: 'Who are your main clients?',
        a: 'We serve individuals, businesses, and government agencies.',
      },
      {
        q: 'Do you provide maintenance support after handover?',
        a: 'Yes, we offer after-sales service and maintenance upon request.',
      },
    ],
    general: [
      {
        q: 'Can I see your past projects?',
        a: 'Yes, please contact us to receive our portfolio and project list.',
      },
      {
        q: 'What’s the fastest way to contact you?',
        a: 'You can call our hotline directly or send an email, we respond within 24 hours.',
      },
    ],
  },
}
