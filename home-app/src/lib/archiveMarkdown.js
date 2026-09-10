/**
 * Small markdown renderer for frozen archive bodies. These articles mix
 * markdown with a few HTML wrappers; keep that behaviour rather than
 * introducing a third-party parser that would reshape them.
 */

function processLists(html) {
  const lines = html.split('\n')
  const result = []
  let inList = false
  let listType = ''
  let listLevel = 0

  for (const line of lines) {
    const trimmedLine = line.trim()
    const unorderedMatch = line.match(/^(\s*)([-*+])\s(.+)$/)
    const orderedMatch = line.match(/^(\s*)(\d+\.)\s(.+)$/)

    if (unorderedMatch) {
      const indent = unorderedMatch[1].length
      const content = unorderedMatch[3]
      if (!inList || listType !== 'ul' || indent !== listLevel) {
        if (inList) result.push(`</${listType}>`)
        result.push('<ul>')
        inList = true
        listType = 'ul'
        listLevel = indent
      }
      result.push(`<li>${content}</li>`)
    } else if (orderedMatch) {
      const indent = orderedMatch[1].length
      const content = orderedMatch[3]
      if (!inList || listType !== 'ol' || indent !== listLevel) {
        if (inList) result.push(`</${listType}>`)
        result.push('<ol>')
        inList = true
        listType = 'ol'
        listLevel = indent
      }
      result.push(`<li>${content}</li>`)
    } else if (inList && trimmedLine === '') {
      result.push(line)
    } else if (inList && trimmedLine !== '') {
      result.push(`</${listType}>`)
      inList = false
      listType = ''
      listLevel = 0
      result.push(line)
    } else {
      result.push(line)
    }
  }

  if (inList) result.push(`</${listType}>`)
  return result.join('\n')
}

function processTable(tableLines) {
  if (tableLines.length < 2) return tableLines.join('\n')

  const headerLine = tableLines[0]
  const separatorLine = tableLines[1]
  const dataLines = tableLines.slice(2)

  if (!separatorLine.match(/^[\|\s\-:]+$/)) {
    return tableLines.join('\n')
  }

  let table = '<table>\n<thead>\n<tr>\n'
  headerLine.split('|').map((cell) => cell.trim()).filter(Boolean).forEach((cell) => {
    table += `<th>${cell}</th>\n`
  })
  table += '</tr>\n</thead>\n'

  if (dataLines.length > 0) {
    table += '<tbody>\n'
    dataLines.forEach((line) => {
      table += '<tr>\n'
      line.split('|').map((cell) => cell.trim()).filter(Boolean).forEach((cell) => {
        table += `<td>${cell}</td>\n`
      })
      table += '</tr>\n'
    })
    table += '</tbody>\n'
  }

  table += '</table>'
  return table
}

function processTables(html) {
  const lines = html.split('\n')
  const result = []
  let inTable = false
  let tableLines = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.includes('|') && line.split('|').length >= 3) {
      if (!inTable) {
        inTable = true
        tableLines = []
      }
      tableLines.push(line)
    } else {
      if (inTable) {
        result.push(tableLines.length >= 2 ? processTable(tableLines) : tableLines.join('\n'))
        inTable = false
        tableLines = []
      }
      result.push(rawLine)
    }
  }

  if (inTable && tableLines.length >= 2) result.push(processTable(tableLines))
  else if (inTable) result.push(...tableLines)

  return result.join('\n')
}

function processParagraphs(html) {
  return html
    .split('\n\n')
    .map((paragraph) => {
      paragraph = paragraph.trim()
      if (paragraph === '') return ''
      if (paragraph.match(/^<(h[1-6]|ul|ol|table|blockquote|pre|hr|div)/)) {
        return paragraph
      }
      paragraph = paragraph.replace(/  \n/g, '<br>\n')
      return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`
    })
    .join('\n\n')
}

export function renderArchiveMarkdown(markdownText) {
  if (!markdownText) return ''

  let html = markdownText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\s+"([^"]+)"\)/g, '<img src="$2" alt="$1" title="$3" />')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\s+"([^"]+)"\)/g, '<a href="$2" title="$3" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^###### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^##### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h2>$1</h2>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^\*\*\*$/gm, '<hr>')
    .replace(/^___$/gm, '<hr>')
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, _lang, code) => `<pre><code>${code.trim()}</code></pre>`)

  html = processLists(html)
  html = processTables(html)
  html = processParagraphs(html)
  return html.trim()
}
