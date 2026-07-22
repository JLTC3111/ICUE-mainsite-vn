#!/usr/bin/env node
import { sanitizeArticleHtml } from '../../shared/text/sanitizeArticleHtml.js'

const samples = [
  {
    name: 'Word Vietnamese paste',
    input: '<p class="MsoNormal" style="font-size:11.0pt;font-family:\'Times New Roman\',serif;mso-fareast-font-family:Calibri"><span lang="VI" style="font-size:14.0pt;font-family:\'Arial\',sans-serif">Trong nhiều thập kỷ</span></p>',
  },
  {
    name: 'Korean mixed font',
    input: '<p style="font-family: \'Malgun Gothic\'; font-size: 18px;">한국어 <strong style="font-family: Batang;">본문</strong></p>',
  },
  {
    name: 'Allowed editor color',
    input: '<p><span style="color: #2563eb;">Blue text</span> and <mark style="background-color: #fef08a;">highlight</mark></p>',
  },
  {
    name: 'Foreign color stripped',
    input: '<p><span style="color: #ff00ff; font-family: Comic Sans MS;">Bad color</span></p>',
  },
]

let failed = 0

for (const sample of samples) {
  const output = sanitizeArticleHtml(sample.input)
  const hasFontFamily = /font-family/i.test(output)
  const hasMso = /mso-/i.test(output)
  const hasClass = /class=/i.test(output)

  console.log(`\n=== ${sample.name} ===`)
  console.log('OUT:', output)

  if (hasFontFamily || hasMso || hasClass) {
    console.error('FAIL: foreign presentation leaked')
    failed += 1
  } else {
    console.log('OK')
  }

  if (sample.name === 'Allowed editor color' && !output.includes('#2563eb')) {
    console.error('FAIL: allowed color removed')
    failed += 1
  }

  if (sample.name === 'Foreign color stripped' && /#ff00ff|ff00ff/i.test(output)) {
    console.error('FAIL: foreign color kept')
    failed += 1
  }
}

if (failed) {
  console.error(`\n${failed} sample(s) failed`)
  process.exit(1)
}

console.log('\nAll sanitizeArticleHtml samples passed.')
