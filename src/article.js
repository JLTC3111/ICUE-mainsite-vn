// Function to render markdown to HTML
function renderMarkdown(markdownText) {
  if (!markdownText) return '';
  return parseMarkdown(markdownText);
}

// Comprehensive Markdown-to-HTML converter
function parseMarkdown(markdownText) {
  let html = markdownText
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    
    // Convert ***bold and italic*** to <strong><em>
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    
    // Convert **bold** to <strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    
    // Convert *italic* to <em>
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    
    // Convert ~~strikethrough~~ to <del>
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    
    // Convert `inline code` to <code>
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    
    // Convert [link text](url) to <a>
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    
    // Convert [link text](url "title") to <a> with title
    .replace(/\[([^\]]+)\]\(([^)]+)\s+"([^"]+)"\)/g, '<a href="$2" title="$3" target="_blank">$1</a>')
    
    // Convert ![alt text](image.jpg) to <img>
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    
    // Convert ![alt text](image.jpg "title") to <img> with title
    .replace(/!\[([^\]]*)\]\(([^)]+)\s+"([^"]+)"\)/g, '<img src="$2" alt="$1" title="$3" />')
    
    // Convert headers (must be done in order from largest to smallest)
    .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
    .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
    .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    
    // Convert horizontal rules
    .replace(/^---$/gm, '<hr>')
    .replace(/^\*\*\*$/gm, '<hr>')
    .replace(/^___$/gm, '<hr>')
    
    // Convert > blockquotes to <blockquote>
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    
    // Handle code blocks (must be before lists)
    .replace(/```(\w+)?\n([\s\S]*?)```/g, function(match, lang, code) {
      const className = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${className}>${code.trim()}</code></pre>`;
    })
    
    // Handle indented code blocks (4 spaces)
    .replace(/^    (.*)$/gm, '<pre><code>$1</code></pre>');

  // Handle lists (complex processing)
  html = processLists(html);
  
  // Handle tables
  html = processTables(html);
  
  // Convert line breaks to paragraphs (must be last)
  html = processParagraphs(html);
  
  return html.trim();
}

// Process unordered and ordered lists
function processLists(html) {
  const lines = html.split('\n');
  const result = [];
  let inList = false;
  let listType = '';
  let listLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check for unordered list items
    const unorderedMatch = line.match(/^(\s*)([-*+])\s(.+)$/);
    // Check for ordered list items
    const orderedMatch = line.match(/^(\s*)(\d+\.)\s(.+)$/);
    // Check for task list items
    const taskMatch = line.match(/^(\s*)([-*+])\s(\[[ x]\])\s(.+)$/);
    
    if (taskMatch) {
      const indent = taskMatch[1].length;
      const checked = taskMatch[3] === '[x]' ? ' checked' : '';
      const content = taskMatch[4];
      
      if (!inList || listType !== 'task' || indent !== listLevel) {
        if (inList) result.push(`</${listType}>`);
        result.push('<ul class="task-list">');
        inList = true;
        listType = 'ul';
        listLevel = indent;
      }
      
      result.push(`<li><input type="checkbox"${checked} disabled> ${content}</li>`);
      
    } else if (unorderedMatch) {
      const indent = unorderedMatch[1].length;
      const content = unorderedMatch[3];
      
      if (!inList || listType !== 'ul' || indent !== listLevel) {
        if (inList) result.push(`</${listType}>`);
        result.push('<ul>');
        inList = true;
        listType = 'ul';
        listLevel = indent;
      }
      
      result.push(`<li>${content}</li>`);
      
    } else if (orderedMatch) {
      const indent = orderedMatch[1].length;
      const content = orderedMatch[3];
      
      if (!inList || listType !== 'ol' || indent !== listLevel) {
        if (inList) result.push(`</${listType}>`);
        result.push('<ol>');
        inList = true;
        listType = 'ol';
        listLevel = indent;
      }
      
      result.push(`<li>${content}</li>`);
      
    } else {
      // Not a list item
      if (inList && trimmedLine === '') {
        // Empty line in list - continue list
        result.push(line);
      } else if (inList && trimmedLine !== '') {
        // Non-empty, non-list line - end list
        result.push(`</${listType}>`);
        inList = false;
        listType = '';
        listLevel = 0;
        result.push(line);
      } else {
        // Normal line
        result.push(line);
      }
    }
  }
  
  // Close any remaining list
  if (inList) {
    result.push(`</${listType}>`);
  }
  
  return result.join('\n');
}

// Process tables
function processTables(html) {
  const lines = html.split('\n');
  const result = [];
  let inTable = false;
  let tableLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line looks like a table row
    if (line.includes('|') && line.split('|').length >= 3) {
      if (!inTable) {
        inTable = true;
        tableLines = [];
      }
      tableLines.push(line);
    } else {
      // Not a table line
      if (inTable) {
        // Process accumulated table lines
        if (tableLines.length >= 2) {
          result.push(processTable(tableLines));
        } else {
          // Not enough lines for a table, add as regular lines
          result.push(...tableLines);
        }
        inTable = false;
        tableLines = [];
      }
      result.push(lines[i]);
    }
  }
  
  // Handle table at end of content
  if (inTable && tableLines.length >= 2) {
    result.push(processTable(tableLines));
  } else if (inTable) {
    result.push(...tableLines);
  }
  
  return result.join('\n');
}

// Process a single table
function processTable(tableLines) {
  if (tableLines.length < 2) return tableLines.join('\n');
  
  const headerLine = tableLines[0];
  const separatorLine = tableLines[1];
  const dataLines = tableLines.slice(2);
  
  // Check if second line is a separator
  if (!separatorLine.match(/^[\|\s\-:]+$/)) {
    return tableLines.join('\n');
  }
  
  let table = '<table>\n';
  
  // Process header
  const headerCells = headerLine.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
  table += '<thead>\n<tr>\n';
  headerCells.forEach(cell => {
    table += `<th>${cell}</th>\n`;
  });
  table += '</tr>\n</thead>\n';
  
  // Process data rows
  if (dataLines.length > 0) {
    table += '<tbody>\n';
    dataLines.forEach(line => {
      const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
      table += '<tr>\n';
      cells.forEach(cell => {
        table += `<td>${cell}</td>\n`;
      });
      table += '</tr>\n';
    });
    table += '</tbody>\n';
  }
  
  table += '</table>';
  return table;
}

// Process paragraphs (must be done last)
function processParagraphs(html) {
  return html
    // Split by double newlines for paragraphs
    .split('\n\n')
    .map(paragraph => {
      paragraph = paragraph.trim();
      if (paragraph === '') return '';
      
      // Don't wrap certain elements in <p> tags
      if (paragraph.match(/^<(h[1-6]|ul|ol|table|blockquote|pre|hr|div)/)) {
        return paragraph;
      }
      
      // Handle single line breaks within paragraphs (two spaces + newline)
      paragraph = paragraph.replace(/  \n/g, '<br>\n');
      
      return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n\n');
}

// Additional utility functions for special features

// Process definition lists (if needed)
function processDefinitionLists(html) {
  return html.replace(/^([^\n:]+)\n:\s+(.+)$/gm, '<dl><dt>$1</dt><dd>$2</dd></dl>');
}

// Process footnotes (basic implementation)
function processFootnotes(html) {
  const footnotes = {};
  let footnoteCounter = 1;
  
  // Extract footnote definitions
  html = html.replace(/^\[\^([^\]]+)\]:\s*(.+)$/gm, (match, id, content) => {
    footnotes[id] = { number: footnoteCounter++, content };
    return '';
  });
  
  // Replace footnote references
  html = html.replace(/\[\^([^\]]+)\]/g, (match, id) => {
    if (footnotes[id]) {
      return `<sup><a href="#fn${footnotes[id].number}" id="fnref${footnotes[id].number}">${footnotes[id].number}</a></sup>`;
    }
    return match;
  });
  
  // Add footnotes section if any footnotes exist
  if (Object.keys(footnotes).length > 0) {
    html += '\n\n<div class="footnotes">\n<ol>\n';
    Object.entries(footnotes).forEach(([id, footnote]) => {
      html += `<li id="fn${footnote.number}">${footnote.content} <a href="#fnref${footnote.number}">↩</a></li>\n`;
    });
    html += '</ol>\n</div>';
  }
  
  return html;
}

// Escape HTML in code blocks and inline code
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Enhanced parser with all features
function parseMarkdownAdvanced(markdownText, options = {}) {
  const {
    footnotes = false,
    definitionLists = false,
    taskLists = true,
    tables = true
  } = options;
  
  let html = parseMarkdown(markdownText);
  
  if (footnotes) {
    html = processFootnotes(html);
  }
  
  if (definitionLists) {
    html = processDefinitionLists(html);
  }
  
  return html;
}

// Example usage:
/*
const markdownText = `
# Header 1

This is a **bold** and *italic* text with \`inline code\`.

## Header 2

- List item 1
- List item 2
- List item 3

### Header 3

> This is a blockquote

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |

[Link text](https://abc.com)

![Alt text](image.jpg)
`;

const html = parseMarkdown(markdownText);
console.log(html);
*/

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    parseMarkdown, 
    parseMarkdownAdvanced,
    processLists,
    processTables,
    processFootnotes,
    processDefinitionLists
  };
}

function setResponsiveIndent() {
  const indent = window.innerWidth >= 770 ? '3.5rem' : '0.25rem';
  document.documentElement.style.setProperty('--article-indent', indent);
}

window.addEventListener('resize', setResponsiveIndent);
setResponsiveIndent(); 

function setResponsiveFontSize() {
  const fontSize = window.innerWidth >= 770 ? '1.75rem' : '1.25rem';
  document.documentElement.style.setProperty('--article-font-size', fontSize);
}

window.addEventListener('resize', setResponsiveFontSize);
setResponsiveFontSize(); 

const articles = [
    {
      id: "1",
      title: "<div style=\"font-size: var(--article-font-size, 1.25rem);\">Lễ Khánh Thành, Bàn Giao Công Viên Âu Cơ</div>",
      lead: "Với Sự Tham Dự Của Chủ Tịch UBND Tỉnh Quảng Nam - Ông Lê Văn Dũng",
      author: "Bởi **ICUE-IKI-Giz** & Thành Phố Hội An",
      date: "<div style=\"text-align: center;\">*16 Tháng 5, 2025*</div>",
      images: [
        {
          src: "/public/news/articles/article_1/all_together.jpg",
          caption: "Các Bên Tham Gia",
          type: "image"
        },
         {
          src: "/public/news/articles/article_1/video_1.mp4",
          caption: "Công Viên Âu Cơ",
          type: "video"
        },
        {
          src: "/public/news/articles/article_1/1.jpg",
          caption: "Các Thành Viên - ICUE",
          type: "image"
        },
        {
          src: "/public/news/articles/article_1/2.jpg",
          caption: "Biểu Diễn Múa Hát",
          type: "image"
        },
        {
          src: "/public/news/articles/article_1/3.jpg",
          caption: "Các Cháu Tham Gia",
          type: "image"
        },
        {
          src: "/public/news/articles/article_1/4.jpg",
          caption: "Đồng Chí Dũng",
          type: "image"
        },
        {
          src: "/public/news/articles/article_1/5.jpg",
          caption: "Kiểm Tra Thiết Bị",
          type: "image"
        },
        {
          src: "/public/news/articles/article_1/6.jpg",
          caption: "Cắt Băng Khánh Thành",
          type: "image"
        },
        {
          src: "/public/news/articles/article_1/7.jpg",
          caption: "Thẻ Đơn Vị Tổ Chức",
          type: "image"
        },
        {
          src: "/public/news/articles/article_1/8.jpg",
          caption: "Người Dân TP Hội An Tập Thể Dục",
          type: "image"
        },
        {
          src: "/public/news/articles/article_1/9.jpg",
          caption: "Kí Bàn Giao",
          type: "image"
        },
        {
          src: "/public/news/articles/article_1/10.jpg",
          caption: "Kí Bàn Giao",
          type: "image"
        },
      ],
      bodyMarkdown: `
Viện Nghiên Cứu Kinh tế Xây dựng và Đô thị (**ICUE**), phối hợp cùng **UBND thành phố Hội An**, tổ chức một sự kiện đặc biệt: **Khánh thành và bàn giao Không gian xanh và công viên ven biển** (đặt tên là **Công viên Âu Cơ**) 

<div style="margin-left: var(--article-indent, 1rem);"> 
# Sự kiện này đánh dấu sự kết thúc thành công của dự án:  

*“Preventing erosion on Cua Dai beach through green corridors and park”*

*Tăng cường năng lực và hành động khí hậu, đa dạng sinh học ở cấp quốc gia và cấp địa phương - CBF*

### Thông tin về sáng kiến  
- Dự án được triển khai theo thỏa thuận tài trợ của **Sáng kiến Khí hậu Quốc tế (IKI)**.  
- **ICUE** là đơn vị nhận tài trợ và trực tiếp triển khai.  
- **Tổ chức Hợp tác Phát triển Đức (GIZ) GmbH** là đơn vị quản lý dự án.  
Dự án này đóng vai trò **then chốt** trong việc:  

- Hỗ trợ các nỗ lực hành động vì khí hậu.  
- Bảo vệ đa dạng sinh học tại Việt Nam.  
- Tăng cường khả năng thích ứng với biến đổi khí hậu cho cộng đồng địa phương.  
### Ý nghĩa của sự kiện  
Sự kiện không chỉ là dịp **tổng kết và đóng dự án**, mà còn là cơ hội để nhìn lại:  
- Những tiến bộ đạt được từ sự cam kết chung của các đối tác.  
- Tính **hợp tác sâu sắc** giữa chính quyền trung ương và địa phương.  
- **Tác động tích cực** của dự án đối với phát triển đô thị bền vững tại khu vực Cửa Đại, Hội An.  
Trong những tháng vừa qua, dự án đã:  
- Củng cố **năng lực kỹ thuật và thể chế**.  
- Thúc đẩy **sự hợp tác bền chặt hơn** giữa các cấp chính quyền trong vấn đề biến đổi khí hậu.  
---
### Lời cảm ơn  
Tất cả những kết quả này có được nhờ:  
- Sự hỗ trợ hào phóng từ **IKI**.  
- Sự đồng hành nhiệt tình của **GIZ** trong triển khai.  
- Sự tạo điều kiện thuận lợi của **UBND tỉnh Quảng Nam**, **UBND thành phố Hội An**, **UBND phường Cửa Đại**, cùng sự cộng tác của **cộng đồng dân cư và các tổ chức xã hội** tại địa phương.  
Niềm tin và tài trợ từ **IKI và GIZ** đã biến dự án thành hiện thực, mang lại **lợi ích thiết thực cho cộng đồng**.  
Chúng tôi xin gửi lời **cảm ơn chân thành** đến GIZ và IKI vì sự hỗ trợ liên tục và niềm tin mà họ dành cho chúng tôi. Sự kiện khánh thành và bàn giao này **không phải là kết thúc**, mà là một **khởi đầu mới** cho các hợp tác trong tương lai, hướng đến những **đô thị xanh hơn, bền vững hơn** tại Việt Nam và xa hơn nữa.
> *"Xin kính chúc quý vị đại biểu có nhiều Sức Khỏe – An Vui – Hạnh Phúc – và Thành Công."* </div>
> — **T.S. Nguyễn Hồng Hạnh**  

      `,
      pdf: "/public/files/speech.pdf",
      pdfButtonText: "Tải Về - Bài Phát Biểu ⇲"
    },
    {
      id: "2",
      title: "<div style=\"font-size: var(--article-font-size, 1.25rem);\">Khai mạc Diễn đàn Bảo tồn Khu vực Châu Á lần thứ 8 tại Thái Lan</div>",
      lead: "<div style=\"line-height: 1.5;\">*Ngày 3/9, **Diễn đàn Bảo tồn Khu vực Châu Á (RCF)** lần thứ 8 của **Liên minh Bảo tồn Thiên nhiên Quốc tế (IUCN)** đã khai mạc tại Bangkok, Thái Lan. Sự kiện quy tụ gần **600** nhà lãnh đạo trong lĩnh vực bảo tồn từ khắp khu vực, bao gồm đại diện chính phủ, tổ chức phi chính phủ, nhà tài trợ và đối tác, học viện và khu vực tư nhân, cùng nhiều bên liên quan.*</div>",
      author: "ICUE-VN",
      date: "<div style=\"text-align: center;\">*Ngày: 03 Tháng 9, 2024*</div>",
      images: [
        {
          src: "/public/news/articles/article_2/conference.jpg",
          caption: "Phái đoàn Việt Nam tham gia hoạt động trong khuôn khổ RCF 2024",
          type: "image"
        },
        {
          src: "/public/news/articles/article_2/1.jpg",
          caption: "Cho một tương lai loài hổ được bảo tồn — các đại biểu thảo luận chiến lược táo bạo tại Diễn đàn RCF châu Á.",
          type: "image"
        },
        {
          src: "/public/news/articles/article_2/2.jpg",
          caption: "Phiên khai mạc của Diễn đàn Bảo tồn Khu vực Châu Á lần thứ 8 — các nhà lãnh đạo cùng hội tụ dưới chủ đề Tái tưởng tượng công tác bảo tồn tại châu Á.",
          type: "image"
        },
        {
          src: "/public/news/articles/article_2/3.jpg",
          caption: "Các nhà lãnh đạo trẻ bước lên sân khấu — khẳng định rằng thế hệ kế tiếp không phải là ‘tương lai’, mà chính là hiện tại trong công tác bảo tồn.",
          type: "image"
        },
        {
          src: "/public/news/articles/article_2/4.jpg",
          caption: "Hợp tác trong hành động — các đại biểu từ khắp châu Á kết nối, chia sẻ và cùng nhau xây dựng giải pháp tích cực cho thiên nhiên.",
          type: "image"
        },
      ],
      bodyMarkdown: `
Về phía Việt Nam, đại diện phái đoàn tham dự Diễn đàn có các thành viên của **IUCN Việt Nam**, trong đó đại diện **Viện Nghiên cứu Kinh tế Xây dựng và Đô thị (ICUE)** - Viện trưởng **TS. Nguyễn Hồng Hạnh** tham dự diễn đàn. ICUE là một trong các thành viên đã tham dự và có các trình bày về **bảo tồn biển, phát triển bền vững nông thôn**. ICUE đã có báo cáo tóm tắt một phần trong dự án *"Hỗ trợ phòng chống xói lở bờ biển Cửa Đại thông qua hành lang xanh và công viên sinh thái ven biển"*.  

Diễn đàn **Bảo tồn Khu vực Châu Á (RCF)** diễn ra trong ba ngày với chủ đề *“Tái hiện Bảo tồn tại Châu Á: Tương lai tích cực cho Thiên nhiên”*, hướng tới:  

<div style="margin-left: var(--article-indent, 1rem);">
- Đánh giá tiến độ bảo tồn  
- Xem xét lại các mục tiêu ưu tiên  
- Đề xuất định hướng chiến lược để giải quyết thách thức môi trường và đa dạng sinh học trong 20 năm tới.  
Trong khuôn khổ **RCF 2024**, Diễn đàn **Lãnh đạo Thanh niên** đầu tiên, do thanh niên từ **23 quốc gia** tổ chức, nhấn mạnh vai trò của chuyên gia trẻ cũng như đóng góp ngày càng tăng của họ cho công tác bảo tồn thiên nhiên.  

Bên cạnh các cuộc thảo luận cấp cao về những thách thức trong khu vực của nhiều bên liên quan, **IUCN Châu Á RCF lần thứ 8** sẽ có:  

- **8 phiên họp chuyên đề** về các ưu tiên chương trình mới và hiện có  
- **17 sự kiện bên lề** do các Thành viên, Ủy ban và đối tác của IUCN tổ chức  
- Các gian hàng triển lãm để giới thiệu công tác bảo tồn  

**TS. Nguyễn Hồng Hạnh** cùng chuyên gia **Pornphrom Vikitsreth** (nhà phân tích chính sách tại đảng Dân chủ Thái Lan, ủng hộ mạnh mẽ chương trình nghị sự về biến đổi khí hậu, có bằng Thạc sĩ về các vấn đề toàn cầu của Đại học New York) cũng tham dự và đóng góp ý kiến. Ông đã nâng cao nhận thức về biến đổi khí hậu trong các mạng lưới thanh niên và cộng đồng địa phương trên khắp Thái Lan.  

Ngoài ra, sự kiện còn kết nối với:  

- **Viện Môi trường Thái Lan (Thailand Environment Institute)** – trở thành tổ chức hàng đầu về môi trường theo tiêu chuẩn quốc tế, góp phần thúc đẩy phát triển bền vững  
- **CBCGDF** – Quỹ công cộng quốc gia tại Trung Quốc, đổi tên thành *“Quỹ bảo tồn đa dạng sinh học và phát triển xanh Trung Quốc”*, đóng vai trò quan trọng trong lĩnh vực đa dạng sinh học và phát triển xanh  

Trong sự kiện kéo dài ba ngày, sẽ có một **sự kiện học tập chuyên dụng** bao gồm:  

- Các buổi chia sẻ kiến thức  
- Đào tạo ngắn hạn do **Học viện IUCN** tổ chức  
- Triển lãm và nhiều nỗ lực hợp tác khác nhau để bảo tồn thiên nhiên và đa dạng sinh học </div>

      `,
      pdf: ""
    },
    {
      id: "3",
      title: "<div style=\"font-size: var(--article-font-size, 1.25rem);\">Chung tay đóng góp, ủng hộ, giúp đỡ đồng bào ảnh hưởng do bão Yagi</div>",
      lead: "<div style=\"line-height: 1.5;\">*Làm theo lời kêu gọi của Uỷ ban Trung ương Mặt trận Tổ quốc Việt Nam, **Viện NCKTXD&ĐT** đã có thông báo kêu gọi cán bộ và các đối tác cùng các nhà hảo tâm chung tay đóng góp, giúp đỡ đồng bào bị ảnh hưởng bởi **bão Yagi**.*</div>",
      author: "ICUE-VN",
      date: "<div style=\"text-align: center; margin-bottom: 5px;\">*Ngày: 26 Tháng 9, 2024*</div>",
      images: [
        {
          src: "/public/news/articles/article_3/area_affected.png",
          caption: "Khu vực bị ảnh hưởng bởi bão Yagi",
        },
        {
          src: "/public/news/articles/article_3/video_1.mp4",
          caption: "Nguồn: ABC NEWS",
        },
        {
          src: "/public/news/articles/article_3/1.jpg",
          caption: "Khu vực bị ảnh hưởng bởi bão Yagi"
        },
        {
          src: "/public/news/articles/article_3/video_2.mp4",
          caption: "Nguồn: VTV1- BBC NEWS",
        },
        {
          src: "/public/news/articles/article_3/2.jpg",
          caption: "Khu vực bị ảnh hưởng bởi bão Yagi"
        },
        {
          src: "/public/news/articles/article_3/video_3.mp4",
          caption: "Nguồn: ABC NEWS",
        },
        {
          src: "/public/news/articles/article_3/3.jpg",
          caption: "Khu vực bị ảnh hưởng bởi bão Yagi"
        },
        {
          src: "/public/news/articles/article_3/4.jpg",
          caption: "Nhóm Tình Nguyện (ICUE)"
        },
        {
          src: "/public/news/articles/article_3/5.jpg",
          caption: "Nhóm Tình Nguyện (ICUE)"
        },
        {
          src: "/public/news/articles/article_3/6.jpg",
          caption: "Nhóm Tình Nguyện (ICUE)"
        },
        {
          src: "/public/news/articles/article_3/7.jpg",
          caption: "Nhóm Tình Nguyện (ICUE)"
        },
        {
          src: "/public/news/articles/article_3/8.jpg",
          caption: "Nhóm Tình Nguyện (ICUE)"
        },
        {
          src: "/public/news/articles/article_3/9.jpg",
          caption: "Nhóm Tình Nguyện (ICUE)"
        },
        {
          src: "/public/news/articles/article_3/10.jpg",
          caption: "Nhóm Tình Nguyện (ICUE)"
        },
        {
          src: "/public/news/articles/article_3/11.jpg",
          caption: "Nhóm Tình Nguyện (ICUE)"
        },
         {
          src: "/public/news/articles/article_3/a_thank_you_letter.png",
          caption: "Thư Cám Ơn"
        }
      ],
      bodyMarkdown: `
Trong những ngày qua, do ảnh hưởng của cơn bão số 3 (bão Yagi), trên địa bản huyện Bảo Yên liên tục hứng chịu mưa lớn, lũ chồng lũ khiến nhiều xã trong huyện bị thiệt hại nặng nề.  
**Đặc biệt trong 03 ngày (08–10/9/2024):**  
Mưa lớn kéo dài cùng nước nước lũ dâng cao, gây ngập úng, sạt lở đất đá nhiều nơi. Mưa lũ, sạt lở đất đá đến thời điểm hiện tại đã có:  

  <ul style="margin-left: var(--article-indent, 1rem);">
  <li>71 người chết</li>
  <li>29 người bị thương</li>
  <li>11 người chưa xác định được</li>
  <li>Hệ thống giao thông hư hỏng nghiêm trọng</li>
  <li>Nhà cửa, tài sản, hoa màu bị thiệt hại nặng nề, nhiều nhà bị mất trắng (đã có **4.825 nhà** bị ảnh hưởng, thiệt hại khoảng **820 tỷ đồng**)</li>
  </ul>

Đây là đợt lũ lụt lớn chưa từng thấy trên địa bàn huyện Bảo Yên.  
**Ngày 25/9/2024:**  

Đoàn cứu trợ Viện ICUE cùng các nhà hảo tâm đã thực hiện chuyến đi nghĩa tình hướng về bà con huyện Bảo Yên. Theo sự điều phối, hướng dẫn của ban tiếp nhận UBND, UBMTTQ VN huyện Bảo Yên do đồng chí Đoàn Xuân Hưng chỉ đạo đã hướng dẫn Đoàn tới bản Chom – xã Yên Sơn để trao **100 phần quà** tới tay bà con. 

<div style="margin-left: var(--article-indent, 1rem); margin-top: 1rem;">
**Mỗi phần quà bao gồm:**  
<ul>
  <li>10kg gạo đài thơm</li>
  <li>Dầu ăn</li>
  <li>Lạc rang sẵn</li>
  <li>Thịt chưng mắm tép</li>
  <li>Bột canh Hải Châu</li>
  <li>Quần áo, chăn màn</li>
</ul></div>

Tại bản Chom thiệt hại nhiều về tài sản, hoa màu, gia súc, gia cầm,… trong đó có 03 hộ gia đình bị sập đổ hoàn toàn nhưng may mắn không có thiệt hại về người, gồm: 

<div style="margin-left: var(--article-indent, 1rem)">
<ul>
  <li>Bà Hoàng Thị Bốn</li>
  <li>Ông Hoàng Văn Bản</li>
  <li>Ông Nguyễn Bá Quán</li>
</ul>
Các hộ này được trao số quà **gấp 4 lần** các hộ khác. </div>

> "Mong bà con sớm ổn định cuộc sống, vượt qua khó khăn, chung tay xây dựng và phát triển vững mạnh"
      `,
      pdf: "/public/files/photos.zip",
      pdfButtonText: "Tải Về - Ảnh Tư Liệu ⇲"
    },
    {
      id: "4",
      title: "<div style=\"font-size: var(--article-font-size, 1.25rem);\">Hội nghị tổng kết đề án phát triển đô thị thông minh và bền vững VN giai đoạn 2018-2025 và định hướng 2030</div>",
      lead: "<div style=\"line-height: 1.5;\"><em>Sáng Kiến <strong>Đô Thị Thông Minh</strong> của Việt Nam: Thành Tựu và Lộ Trình <strong>2025-2030</strong></em></div>",
      author: "ICUE-VN",
      date: "<div style=\"text-align: center;\">*Ngày: 13 Tháng 8, 2025*</div>",
      images: [
        {
          src: "/public/news/articles/article_4/conference.jpg",
          caption: "TS. Nguyễn Hồng Hạnh Tại Buổi Họp."
        },
        {
          src: "/public/news/articles/article_4/1.jpg",
          caption: "Bộ Trưởng Trần Hồng Minh Phát Biểu Tại Hội Nghị."
        },
        {
          src: "/public/news/articles/article_4/2.jpg",
          caption: "Ông Trần Quốc Thái, Cục trưởng Cục Phát triển đô thị trình bày báo cáo tổng kết thực hiện Đề án 950"
        },
        {
          src: "/public/news/articles/article_4/3.jpg",
          caption: "Thứ trưởng Bộ Xây dựng Nguyễn Tường Văn khẳng định, việc phát triển đô thị thông minh không phải là chạy đua theo công nghệ mà phải lấy con người làm trung tâm."
        },
        {
          src: "/public/news/articles/article_4/4.jpg",
          caption: "TS. Nguyễn Hồng Hạnh Tại Buổi Họp."
        },
      ],
      bodyMarkdown: `
Chặng đường phát triển đô thị thông minh của Việt Nam đã đạt được những bước tiến đáng kể kể từ khi triển khai Đề án **“Phát triển đô thị thông minh bền vững Việt Nam giai đoạn 2018 - 2025”** vào năm 2018.  
Mục tiêu của đề án là tận dụng công nghệ để cải thiện công tác quản lý, nâng cao chất lượng sống của người dân và thúc đẩy sự phát triển bền vững. Chính phủ cam kết chuyển đổi cảnh quan đô thị bằng các công nghệ dựa trên dữ liệu và tiếp cận lấy người dân làm trung tâm, hướng tới việc hoàn thành vào năm 2030.  
Sau 7 năm triển khai, đất nước đã đạt được những bước tiến lớn trong hướng đi này, với nhiều thành phố đã bắt đầu triển khai các công nghệ đô thị thông minh một cách thành công.  
---

<div style="margin-left: var(--article-indent, 1rem)">
### Những Thành Tựu Chính:

### 1. **Giải Pháp Lấy Người Dân Làm Trung Tâm: Huế**  
   Một ví dụ điển hình cho triết lý "người dân là trung tâm" là thành phố Huế, nơi đã triển khai nền tảng Hue-S, cho phép công dân báo cáo trực tiếp các vấn đề như sửa chữa đường xá, vệ sinh, và cơ sở hạ tầng. Ứng dụng này đã tạo ra một kênh giao tiếp hai chiều giữa người dân và chính quyền, đảm bảo tính minh bạch và trách nhiệm trong công tác quản lý đô thị. Hue-S đã trở thành một phần quan trọng trong hệ thống đô thị thông minh của Huế, giúp cải thiện các dịch vụ như y tế, giáo dục và quản lý giao thông. Thành phố cũng đang triển khai các dịch vụ thông minh tiên tiến hơn như kiểm soát giao thông bằng AI và chiếu sáng thông minh.  

### 2. **Quản Lý Đô Thị Dựa Trên Dữ Liệu: Đà Nẵng**  
   Đà Nẵng là một ví dụ điển hình khác, nơi thành phố đã tích hợp hạ tầng thông minh và dịch vụ số. Trung tâm Điều hành Thông minh (IOC) là trung tâm tập hợp và quản lý dữ liệu từ các lĩnh vực như giao thông, quản lý rác thải, dịch vụ công cộng và y tế. Đà Nẵng đã hợp tác với các công ty công nghệ địa phương để triển khai GIS và BIM (Mô hình Thông tin Xây dựng) nhằm tối ưu hóa công tác quy hoạch đô thị. Thông qua các nền tảng này, thành phố có thể dự đoán và quản lý nhu cầu đô thị hiệu quả, đặc biệt là trong các mùa du lịch cao điểm.  

### 3. **Hệ Thống Giao Thông Thông Minh: TP.HCM**  
   Tại TP.HCM, quản lý giao thông đã được cải thiện đáng kể thông qua hệ thống AI giám sát giao thông, camera giám sát, và thu phí tự động. Thành phố cũng đã triển khai các giải pháp đỗ xe thông minh và nghiên cứu xe tự lái, giúp thành phố trở thành một trong những nơi tiên phong trong vận hành đô thị thông minh. Các sáng kiến của TP.HCM phù hợp với mục tiêu lớn hơn của thành phố trong việc nâng cao phát triển bền vững bằng cách giảm tắc nghẽn giao thông và giảm thiểu phát thải carbon.  

### 4. **Dịch Vụ Công Tích Hợp: Hà Nội**  
   Hà Nội đang tích hợp các trung tâm dữ liệu đám mây để mang đến một trải nghiệm mượt mà cho cư dân khi tiếp cận các dịch vụ chính quyền. Thành phố đã xây dựng nền tảng thống nhất cho các ứng dụng dịch vụ công, cho phép công dân nộp đơn khiếu nại, thanh toán thuế và tiếp cận thông tin chính quyền qua một cổng duy nhất. Bằng cách kết nối các sở, ngành thông qua hệ thống cơ sở dữ liệu chia sẻ, Hà Nội đang tối ưu hóa việc cung cấp dịch vụ và tăng cường hiệu quả trong cơ cấu hành chính.  

### 5. **Đô Thị Xanh và Thông Minh: Bình Định**  
   Tại Bình Định, thành phố tập trung vào quá trình đô thị hóa xanh kết hợp với công nghệ thông minh. Tỉnh đã triển khai nhiều sáng kiến bền vững môi trường, như hệ thống quản lý rác thải thông minh và giải pháp năng lượng tái tạo cho các tòa nhà đô thị. Thành phố cũng đã áp dụng chiếu sáng thông minh bằng năng lượng mặt trời để giảm tiêu thụ năng lượng và giảm sự phụ thuộc vào nhiên liệu hóa thạch, đồng thời phù hợp với mục tiêu của chính phủ về phát triển bền vững trong các đô thị.  
---
### Những Thách Thức và Rào Cản:

- **Thiếu khung pháp lý và cơ chế chính sách đồng bộ:** Mặc dù đã có một số hướng dẫn được ban hành, các quy định vẫn chưa được thống nhất giữa các địa phương.  
- **Vấn đề bảo mật dữ liệu và quyền riêng tư:** Các thành phố như Hà Nội và TP.HCM đang thu thập lượng lớn dữ liệu để cải thiện dịch vụ, nhưng bảo mật và quyền riêng tư vẫn là mối quan tâm lớn.  
- **Thiếu nguồn lực tài chính:** Nhiều thành phố nhỏ gặp khó khăn trong việc huy động vốn đầu tư cho các dự án hạ tầng số lớn. Do đó, một số thành phố đã chọn triển khai các dự án thử nghiệm hoặc dự án một phần với các dịch vụ cơ bản.  
---
### Định Hướng Giai Đoạn 2025-2030:

1. Cải thiện hệ thống pháp lý và mô hình kiến trúc dữ liệu và hạ tầng công nghệ.  
2. Xây dựng cơ sở dữ liệu đô thị dùng chung, liên thông giữa các bộ, ngành.  
3. Lấy người dân làm trung tâm, cung cấp dịch vụ thiết yếu và khuyến khích tham gia giám sát.  
4. Phát triển nguồn nhân lực chất lượng cao, phổ cập kỹ năng số.  
5. Đổi mới mô hình quản trị, ứng dụng công nghệ vào điều hành và xây dựng chính quyền số.  
6. Tăng cường hợp tác quốc tế, thúc đẩy ứng dụng công nghệ mới.  
7. Huy động nguồn lực xã hội hóa thông qua hợp tác công-tư.  
---
### Nhìn Về Tương Lai:

Năm năm tới sẽ rất quan trọng đối với nỗ lực xây dựng đô thị thông minh tại Việt Nam. Đến năm 2030, Chính phủ dự kiến sẽ tạo ra một mạng lưới đô thị thông minh toàn quốc, hoạt động liên kết và đồng bộ giữa các thành phố. Các thành phố như Huế, Đà Nẵng, và TP.HCM sẽ là những hình mẫu để các thành phố khác học hỏi, chứng minh rằng với các đầu tư hợp lý và kế hoạch chi tiết, đô thị thông minh có thể trở thành động lực quan trọng cho tăng trưởng kinh tế, sự bền vững và quản lý đô thị hiệu quả. 
Mục tiêu phát triển đô thị thông minh bền vững sẽ không chỉ là mục tiêu phát triển, mà là yêu cầu tất yếu để Việt Nam thích ứng với thời đại số, nâng cao chất lượng sống và tăng năng lực cạnh tranh quốc gia trong những thập niên tới. </div>
      `,
      pdf: "",
      pdfButtonText: ""
    },
    {
      id: "5",
      title: "<div style=\"font-size: var(--article-font-size, 1rem);\">Xây Dựng Và Phát Triển Huế - Đô Thị Di Sản Văn Hoá Đặc Sắc Khu Vực Đông Nam Á</div>",
      lead: "<div style=\"line-height: 1.5;\">Một hội thảo khoa học tại *Hà Nội* đã quy tụ các <em>chuyên gia và nhà hoạch định chính sách</em> để thảo luận về một con đường phát triển độc đáo cho <strong>Thừa Thiên Huế</strong>. Điểm chung là: tương lai của thành phố nên ưu tiên di sản văn hóa phong phú và bản sắc sinh thái thay vì mô hình công nghiệp truyền thống, đảm bảo Huế vẫn là một trung tâm văn hóa đặc sắc ở Đông Nam Á.</div>",
      author: "ICUE-VN",
      date: "<div style=\"text-align: center;\">*Ngày: 22 Tháng 5, 2014*</div>",
      images: [
        {
          src: "/public/news/articles/article_5/1.jpg",
          caption: "Các lãnh đạo, chuyên gia tại Hội thảo"
        },
        {
          src: "/public/news/articles/article_5/2.jpg",
          caption: "Chủ tịch UBND tỉnh Thừa Thiên Huế - ông Nguyễn Văn Cao phát biểu khai mạc Hội thảo"
        },
        {
          src: "/public/news/articles/article_5/3.jpg",
          caption: "Toàn cảnh Hội thảo"
        },
      ],
      bodyMarkdown: `
<div style="margin-left: var(--article-indent, 0.5rem);">
<div style ="font-size: 1.25rem; text-align: center; font-weight: 600; margin-bottom:5px">Hội Thảo Khoa Học Về Tương Lai Của Thừa Thiên Huế</div>
Một hội thảo khoa học gần đây đã được tổ chức tại **Hà Nội** với một nhiệm vụ quan trọng: xác định tương lai của **Thừa Thiên Huế** khi chuẩn bị trở thành **thành phố trực thuộc Trung ương**.  
Sự kiện này do **UBND tỉnh Thừa Thiên Huế** phối hợp với **Bộ Nội vụ** và **Tổng hội Xây dựng Việt Nam** tổ chức, tập trung vào chủ đề cốt lõi:  

> **“Xây dựng và phát triển Huế trở thành một Đô thị Di sản Văn hóa Đặc sắc ở Đông Nam Á.”**

---

# Định hướng phát triển 

Những người tham gia, bao gồm: 

<ul style="margin-left: var(--article-indent, 0.5rem);">
<li> Các **nhà khoa học hàng đầu** </li>
<li> Các **nhà quy hoạch đô thị** </li>
<li> **Quan chức chính phủ** đều đồng ý rằng sự phát triển của Huế phải đi theo một **con đường khác biệt** so với các thành phố lớn khác như **Hà Nội** hay **TP. Hồ Chí Minh**. </li> 
</ul>

Thay vì chạy theo tốc độ đô thị hóa và công nghiệp hóa nhanh chóng, Huế cần phát triển dựa trên các giá trị cốt lõi:  

<ul style="margin-left: var(--article-indent, 0.5rem);">
  <li>**Đô thị di sản**</li>
  <li>**Văn hóa**</li>
  <li>**Sinh thái**</li>
  <li>**Thân thiện với môi trường**</li>
</ul>
---
### Bảo tồn bản sắc

Một điểm nhấn quan trọng từ hội thảo là **nhu cầu bảo tồn bản sắc độc đáo của Huế**.  

<ul style="margin-left: var(--article-indent, 0.5rem);">
<li>Các chuyên gia cảnh báo về **nguy cơ thương mại hóa** và **cao ốc hóa** có thể làm mất đi vẻ đẹp thanh bình, thơ mộng của thành phố.</li>
<li>Họ nhấn mạnh sự phát triển phải **hài hòa**, với sự **can thiệp tối thiểu** vào kiến trúc và cảnh quan tự nhiên hiện có.</li>
</ul>
---
### Động lực kinh tế

Hội thảo kết luận rằng **động lực kinh tế của Huế** nên được thúc đẩy bởi những tài sản quý giá nhất của nó:  

<ul style="margin-left: var(--article-indent, 0.5rem);">
<li> **Du lịch**</li>
<li> **Dịch vụ**</li>
<li> **Văn hóa**</li>
<li> **Giáo dục**</li>
<li> **Chăm sóc sức khỏe**</li>
</ul>

Bằng cách tập trung vào các lĩnh vực này, Huế có thể đạt được **sự tăng trưởng bền vững**, đồng thời **bảo vệ di sản văn hóa và lịch sử vô giá** cho các thế hệ tương lai.  

---

### Kết luận

Hội thảo đã đánh dấu một bước tiến quan trọng trong việc: 

<ul style="margin-left: var(--article-margin-left, 0.5rem);">
  <li> **Định hình tương lai của Huế**</li>
  <li> **Tôn trọng quá khứ**</li>
  <li> Xây dựng **một mô hình phát triển đô thị độc đáo**, có thể trở thành **hình mẫu cho các thành phố di sản khác trong khu vực**.</li>
</ul> 
</div>
`,
      pdf: "",
      pdfButtonText: ""
    },
{
      id: "6",
      title: "<div style=\"font-size: var(--article-font-size, 1rem);\">Kinh Tế Đô Thị Trong Quy Hoạch, Phát Triển Bền Vững Đô Thị Việt Nam - Cơ Hội & Thách Thức</div>",
      lead: "<div style=\"line-height: 1.5;\">Viện Nghiên Cứu Kinh tế Xây Dựng và Đô Thị với sự bảo trợ của Ban Kinh Tế Trung ương và Bộ Xây Dựng đã tổ chức hội thảo “Kinh tế đô thị trong quy hoạch, xây dựng và phát triển bền vững đô thị Việt Nam - cơ hội và thách thức”. Đây là một sự kiện trong chuỗi các sự kiện của ngày Đô thị VN 08/11/2022 tổ chức tại Bộ Xây Dựng. </div>",
      author: "ICUE-VN",
      date: "<div style=\"text-align: center;\">*Ngày: 08 Tháng 11, 2022*</div>",
      images: [
        {
          src: "/public/news/articles/article_6/1.jpg",
          caption: "Thứ trưởng Bùi Hồng Minh phát biểu tại hội thảo"
        },
        {
          src: "/public/news/articles/article_6/4.jpg",
          caption: "Viện trưởng Viện Nghiên cứu Kinh tế Xây dựng và Đô thị Nguyễn Hồng Hạnh chia sẻ tại Hội thảo."
        },
        {
          src: "/public/news/articles/article_6/5.jpg",
          caption: "Chuyên gia kinh tế Phạm Chi Lan phát biểu tại Hội thảo."
        },
         {
          src: "/public/news/articles/article_6/3.jpg",
          caption: "Toàn Cảnh Hội Thảo"
        },
      ],
      bodyMarkdown: `
<div style="margin-left: var(--article-indent, 0.5rem);">
**Viện Nghiên Cứu Kinh Tế Xây Dựng và Đô Thị**, dưới sự bảo trợ của **Ban Kinh Tế Trung Ương** và **Bộ Xây Dựng**, đã tổ chức hội thảo:  

- Kinh tế đô thị trong quy hoạch, xây dựng và phát triển bền vững đô thị Việt Nam - cơ hội và thách thức
- Sự kiện là một trong chuỗi hoạt động kỷ niệm **Ngày Đô thị Việt Nam 08/11/2022** tổ chức tại Bộ Xây dựng.  
---

### Mục tiêu hội thảo

- Trao đổi, thảo luận các **giải pháp phát triển kinh tế đô thị**.  
- Hướng đến **phát triển bền vững đô thị Việt Nam**.  
- Góp phần thực hiện hiệu quả **Nghị quyết số 06-NQ/TW ngày 24/01/2022** của Bộ Chính trị về quy hoạch, xây dựng, quản lý và phát triển đô thị bền vững đến năm 2030, tầm nhìn 2045.  
---
### Phát biểu chính

### Ông Bùi Hồng Minh – Thứ trưởng Bộ Xây dựng

<ul>
<li> Khẳng định vai trò quan trọng của **kinh tế đô thị**. </li>
<li> Nhấn mạnh các nhiệm vụ trọng tâm của **Nghị quyết 06-NQ/TW** </li>  
<li> Triển khai **chương trình tái thiết đô thị** để nâng cao hiệu quả sử dụng đất </li>  
<li> Phát triển **kinh tế dịch vụ**, **công nghiệp chế tạo tiên tiến**, **kinh tế số**, **kinh tế tuần hoàn**, **kinh tế du lịch** </li> 
<li> Hoàn thiện **chính sách thuế, phí bất động sản** để khuyến khích sử dụng hiệu quả nhà, đất </li>  
<li> Tạo cơ chế **huy động vốn đầu tư** cho vùng Thủ đô Hà Nội và vùng TP. Hồ Chí Minh </li>  
<li> Xây dựng cơ chế **tạo nguồn thu mới** cho đô thị </li> 
</ul>

### TS. Nguyễn Hồng Hạnh – Viện trưởng Viện Nghiên cứu Kinh tế Xây dựng và Đô thị:

<ul>
<li> Khẳng định **đô thị là trung tâm hạt nhân** cho phát triển kinh tế, văn hóa, xã hội. </li>  
<li> Đô thị hóa là **tất yếu khách quan** và động lực cho phát triển nhanh và bền vững. </li> 
<li> Tham luận về **tái phát triển đô thị** nhằm nâng cao hiệu quả sử dụng đất, lấy ví dụ từ **kinh nghiệm Nhật Bản** </li>  
<li> **Luật Tái phát triển Đô thị** ban hành từ 1969. </li>  
<li> Cơ chế: tăng hệ số sử dụng đất, nới lỏng hạn chế chiều cao công trình, chia sẻ lợi ích phát triển cho chủ đất. </li>  
<li> Sau gần 40 năm, Nhật Bản đã có **~1.000 quận hoàn thành tái phát triển đô thị**. </li>  
</ul>

### TS. Nguyễn Ngọc Hiếu – Đại học Việt Đức:

<ul>
<li> Nêu thách thức trong **tái cấu trúc ngành kinh tế đô thị**. </li> 
<li> Cho rằng thành công của việc **dịch vụ hóa công nghiệp** và tái cơ cấu ngành sẽ là chìa khóa cho phát triển bền vững. </li> 
</ul>

### TS. Huỳnh Thế Du – Trường Chính sách công và Quản lý Fulbright:

<ul>
<li> Phân tích cạnh tranh toàn cầu trong bối cảnh hội nhập </li>
<li> Thu hút **doanh nghiệp**, **người giỏi** và **người giàu** là then chốt </li>
<li> Điều này chủ yếu xảy ra ở **các đô thị trung tâm** </li>  
<li> Nhấn mạnh cần giúp các đô thị **tăng khả năng cạnh tranh quốc tế** </li>
<li> Đô thị nhỏ thường phụ thuộc vào một vài cơ sở sản xuất/kinh doanh, dễ bị tổn thương </li>  
</ul>

### TS. Đặng Huy Đông – Nguyên Thứ trưởng Bộ Kế hoạch và Đầu tư:

<ul>
<li> Phân tích sự **phân hóa kinh tế đô thị - nông thôn** trong quá trình phát triển. </li>  
<li> Giới thiệu mô hình **TOD (Transit-Oriented Development)** </li>  
<li> Gắn kết **giao thông công cộng** với **sử dụng đất đô thị** </li>  
<li> Vai trò TOD trong quản lý, quy hoạch và phát triển kinh tế đô thị </li>  
</ul>
---
## Nội dung tham luận

- Hội thảo nhận được **16 bài tham luận** từ các chuyên gia trong và ngoài nước.  
- **12 bài tham luận** được trình bày trực tiếp, tập trung vào các chủ đề:  
- **Chuyển đổi cơ cấu kinh tế ngành** – động lực cho tăng trưởng đô thị.  
- **Kinh tế tuần hoàn** trong xu thế phát triển bền vững.  
- **Phát triển kinh tế dịch vụ**.  
- **Thực trạng kinh tế đô thị tại Việt Nam**, đặc biệt ở các thành phố trực thuộc Trung ương.  
- **Kinh tế đô thị và chính sách công** trong phát triển bền vững.  
---
## Kết luận
<div style="text-align: justify; margin-top:-1rem;"> Hội thảo đã mang lại góc nhìn toàn diện về: </div>
<ul>
<li> **Vị trí và vai trò của đô thị** trong phát triển kinh tế xã hội </li>
<li> Các **giải pháp phát triển kinh tế đô thị bền vững**, từ chính sách, tái cấu trúc ngành đến mô hình TOD </li> 
<li> Tầm quan trọng của việc **kết hợp quy hoạch, quản lý, tái phát triển đô thị** với bảo đảm chất lượng sống cho cư dân </li>
</ul>
`,
      pdf: "",
      pdfButtonText: ""
    },
{
      id: "7",
      title: "<div style=\"font-size: var(--article-font-size, 1rem);\"> Toạ Đàm Tổng Quan Và Thực Trạng Đô Thị Biển Việt Nam – Một Số Quan Điểm Về Kiểm Soát Phát Triển</div>",
      lead: "<div style=\"line-height: 1.5;\">Viện Nghiên Cứu Kinh Tế Xây Dựng và Đô Thị – Tổng Hội Xây Dựng Việt Nam đã tổ chức hội thảo khoa học</div>",
      author: "ICUE-VN",
      date: "<div style=\"text-align: center;\">*Ngày: 30 Tháng 9, 2020*</div>",
      images: [
        {
          src: "/public/news/articles/article_7/1.jpg",
          caption: "Toàn cảnh buổi Tọa đàm"
        },
        {
          src: "/public/news/articles/article_7/2.jpg",
          caption: "TS. Nguyễn Hồng Hạnh – Viện trưởng Viện nghiên cứu KTXD & Đô thị (ICUE)"
        },
        {
          src: "/public/news/articles/article_7/3.jpg",
          caption: "Ảnh chụp lưu niệm buổi Tọa đàm"
        },
      ],
      bodyMarkdown: `
<div style="margin-left: var(--article-indent, 0.5rem);">
<div style ="font-size: 1.25rem; text-align: center; font-weight: 600; margin-bottom:15px; line-height:1.25;">Hội thảo khoa học: Tổng quan hiện trạng đô thị biển Việt Nam và kiểm soát phát triển</div>

Ngày **30/9/2020**

> **“Tổng quan hiện trạng đô thị biển Việt Nam và một số quan điểm về kiểm soát phát triển”**

Hội thảo diễn ra trong bối cảnh **Nghị quyết 36/NQ-TW (22/10/2018)** của Ban Chấp hành Trung ương Đảng (khóa XII) về *Chiến lược phát triển bền vững kinh tế biển Việt Nam đến năm 2030, tầm nhìn 2045*, nhấn mạnh vai trò của **khu kinh tế ven biển** như trung tâm kinh tế mạnh, đảm bảo phát triển vùng và liên vùng.
---
### Thành phần tham dự

- Ông **Trần Ngọc Hùng** – Chủ tịch Tổng hội Xây dựng Việt Nam  
- TS. **Nguyễn Hồng Hạnh** – Viện trưởng Viện Nghiên cứu Kinh tế Xây dựng và Đô thị  
- KTS. **Phạm Thị Nhâm** – Phó Viện trưởng Viện Quy hoạch Đô thị và Nông thôn Quốc gia (Bộ Xây dựng)  
- PGS-TS. **Phạm Trung Lương** – Nguyên Phó Viện trưởng Viện Nghiên cứu Phát triển Du lịch  
- ThS. KTS. **Trịnh Minh Hiếu** – Vụ Quản lý Quy hoạch (Bộ Kế hoạch và Đầu tư)  
- Ông **Trần Trung Chính** – Phó Viện trưởng Viện Nghiên cứu Đô thị và Phát triển Hạ tầng  
- Cùng nhiều chuyên gia từ các viện, trung tâm nghiên cứu, tổ chức xã hội nghề nghiệp khác.  

---

### Phát biểu của TS. Nguyễn Hồng Hạnh

- Nhấn mạnh **biển đảo Việt Nam** là phần lãnh thổ thiêng liêng, được cha ông khai phá và bảo vệ qua hàng ngàn năm.  
- Bảo vệ **chủ quyền biển đảo** là **trách nhiệm thiêng liêng của mỗi công dân**.  
- Trích dẫn Nghị quyết Đại hội XII của Đảng:  

> “Kiên quyết, kiên trì đấu tranh bảo vệ vững chắc độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ của Tổ quốc; giữ vững môi trường hoà bình để phát triển đất nước…”

- Đô thị ven biển không chỉ có vai trò phát triển kinh tế mà còn gắn liền với **quốc phòng – an ninh**.  

---

### Bài học kinh nghiệm quốc tế: Trường hợp Pháp

- Quan niệm: **Bờ biển là không gian chính trị nổi bật, không thể trở thành sở hữu tư nhân.**  
- Luật Tài sản công (Điều 2122-1) quy định:  
  - Không gian bảo vệ: **100m từ phạm vi hàng hải công cộng**.  
  - Người dân có **quyền tiếp cận tự do**: 80% với bờ biển tự nhiên, 50% với bờ biển nhân tạo.  
  - Các công trình ven biển chỉ có **quyền sử dụng tạm thời**, luôn có thể bị thu hồi.  
  - Công trình ven biển phải có **kết cấu nhẹ**, hoàn trả không gian tự nhiên sau khi hết hạn nhượng quyền (≤ 6 tháng).  
- Quy hoạch theo **chiều sâu**: công trình dịch vụ, công cộng được đặt xa bờ, không chen chúc ngay sát bờ biển.  
- Sau 40 năm áp dụng, Pháp đã:  
  - Bảo vệ **170.000 ha hệ sinh thái đới bờ**  
  - Xây dựng **4.600 km đường ven biển**  
---
### Quan điểm và Kiến nghị của ICUE

Để phát huy lợi thế và kiểm soát phát triển **đô thị ven biển và đô thị hải đảo**, ICUE – Tổng hội Xây dựng Việt Nam kiến nghị Bộ Xây dựng:

<div = style="margin-left: var(--article-indent, 1rem); margin-right: 1rem;">
#### 1. **Phối hợp liên ngành**: 
Phối hợp chặt chẽ với Bộ Tài nguyên & Môi trường trong xây dựng văn bản chi tiết của **Luật Tài nguyên – Môi trường biển và hải đảo (Luật số 82/2015-QH3)**.  

#### 2. **Bổ sung định hướng phát triển đô thị biển đảo**: 
Đưa phát triển hệ thống đô thị biển đảo thành **nội dung lớn** trong *Điều chỉnh Định hướng phát triển tổng thể hệ thống đô thị Việt Nam đến 2025, tầm nhìn 2050* và **Chương trình phát triển đô thị quốc gia 2021–2045**.  

#### 3. **Xây dựng chương trình phát triển đô thị biển**: 
Sau khi Điều chỉnh tổng thể được phê duyệt, xây dựng **Chương trình phát triển đô thị biển** gắn với *Chiến lược phát triển bền vững kinh tế biển Việt Nam 2030–2045*.  

#### 4. **Định hình động lực phát triển:**  

<ul style="margin-left: -2rem;">
   - Trong quy hoạch đô thị biển, xác định các **trung tâm kinh tế, tài chính, giáo dục, y tế** làm động lực phát triển.  
   - Phát triển **ngành du lịch, dịch vụ kết hợp với **hạ tầng kỹ thuật, xã hội và khu dân cư.**
</ul>

### 5. **Hoàn thiện pháp lý**: 
Bổ sung các quy định pháp luật làm cơ sở cho lập quy hoạch và xây dựng đô thị ven biển, đô thị hải đảo. </div>

---

### Kết luận

<div style="text-align:center; margin-top: -15px;">Hội thảo đã: </div>

- Khẳng định **vai trò chiến lược của đô thị ven biển** trong phát triển kinh tế, xã hội và bảo vệ an ninh quốc gia.  
- Đề xuất nhiều **giải pháp kiểm soát phát triển đô thị biển**, học hỏi từ kinh nghiệm quốc tế.  
- Gửi kiến nghị cụ thể tới Bộ Xây dựng nhằm **hoàn thiện chính sách và quy hoạch phát triển đô thị biển Việt Nam** trong giai đoạn mới. 
</div>
`,
      pdf: "",
      pdfButtonText: ""
    },
{
      id: "8",
      title: "<div style=\"font-size: var(--article-font-size, 1rem);\">Áo Ấm Đến Trường: Hành Trình Yêu Thương Đến Cao Nguyên Quản Bạ – Hà Giang</div>",
      lead: "<div style=\"line-height: 1.5;\">Giữa tiết trời se lạnh của núi rừng Hà Giang, những chiếc áo ấm cùng nụ cười hồn nhiên đã viết nên câu chuyện chan chứa tình thương và gắn kết cộng đồng.</div>",
      author: "ICUE-VN",
      date: "<div style=\"text-align: center;\">*Ngày: 15/01/2024*</div>",
      images: [
        {
          src: "/public/news/articles/article_8/1.jpg",
          caption: "TS. Nguyễn Hồng Hạnh – Viện trưởng Viện Nghiên cứu Kinh tế Xây dựng và Đô thị"
        },
        {
          src: "/public/news/articles/article_8/2.jpg",
          caption: "Các em nhỏ thị trấn Tam Sơn, Hà Giang"
        },
        {
          src: "/public/news/articles/article_8/3.jpg",
          caption: "Các em nhỏ địa phương nhận quà"
        },
        {
          src: "/public/news/articles/article_8/4.jpg",
          caption: "Các em nhỏ địa phương nhận quà"
        },
        {
          src: "/public/news/articles/article_8/5.jpg",
          caption: "Viện trao tặng trang thiết bị cho nhà trường"
        },
        {
          src: "/public/news/articles/article_8/6.jpg",
          caption: "Các em nhỏ thị trấn Tam Sơn, Hà Giang"
        },
        {
          src: "/public/news/articles/article_8/7.jpg",
          caption: "Thư Cám Ơn"
        },
      ],
      bodyMarkdown: `
<div style="margin-left: var(--article-indent, 0.5rem);">
<div style ="font-size: 1rem; text-align: center; font-weight: 600; margin-bottom:15px; line-height:1.25;">HOẠT ĐỘNG THIỆN NGUYỆN CỦA VIỆN NGHIÊN CỨU KINH TẾ XÂY DỰNG VÀ ĐÔ THỊ</div> 
---

<div style ="text-align: center;">
### 🌱 Lan Tỏa Yêu Thương – *"Áo Ấm Cho Con Đến Trường"*
</div>

<div style="margin-left: var(--article-indent, 1rem)">Vào ngày **15/01/2024**, đại diện:  

- Viện Nghiên cứu Kinh tế Xây dựng và Đô thị  
- Sở Xây dựng tỉnh Hà Giang  
- UBND thị trấn Tam Sơn  

đã cùng nhau trao những món quà đầy ý nghĩa đến các em nhỏ tại **điểm trường thôn Thượng Sơn, thị trấn Tam Sơn – Quản Bạ – Hà Giang**.  
Dù những phần quà giản dị, nhưng chứa đựng nhiều tình thương và sự sẻ chia. Đồng thời, chương trình cũng hỗ trợ một phần khó khăn cho các hộ nghèo nhất tại địa phương. </div>

---

<div style ="text-align: center;">
### 📸 Khoảnh Khắc Ấm Áp
</div>

**TS. Nguyễn Hồng Hạnh**, Viện trưởng Viện Nghiên cứu Kinh tế Xây dựng và Đô thị, cùng đại diện Sở Xây dựng và cán bộ địa phương, trực tiếp trao quà cho các em nhỏ tại điểm trường Mầm non thôn Thượng Sơn.  

---

<div style ="text-align: center; margin-bottom: -1.5rem">
### 🗣️ Lời Chia Sẻ Từ Viện Trưởng
</div>

> “Nhìn thấy các em nhỏ thôn Thượng Sơn với nụ cười lấp lánh trong chiếc áo lông ấm áp, cùng nhiều món quà khác như chiếc Tivi, dàn loa phục vụ việc học tập, ca hát mỗi ngày — đó chính là niềm hạnh phúc lớn nhất của tôi lúc này.  
>   
> Tôi xin chúc các cô giáo vùng cao Quản Bạ luôn mạnh khỏe, trẻ trung và tràn đầy nhiệt huyết để dìu dắt các em nhỏ trên con đường đến tương lai hạnh phúc, ấm no.  
>   
> Xin cảm ơn lãnh đạo Sở Xây dựng Hà Giang và tập thể lãnh đạo thị trấn Tam Sơn đã đồng hành cùng Viện Nghiên cứu Kinh tế Xây dựng và Đô thị trong hành trình kết nối yêu thương với các em nhỏ vùng núi cao Quản Bạ.”  

---

<div style ="text-align: center;">
### Tiếp Nối Hành Trình Yêu Thương
</div>

Hoạt động thiện nguyện lần này không chỉ mang đến sự hỗ trợ thiết thực mà còn thể hiện **tinh thần sẻ chia và gắn kết cộng đồng**.  

Viện khẳng định sẽ tiếp tục duy trì và mở rộng các chương trình thiện nguyện, lan tỏa yêu thương đến nhiều điểm trường thuộc những vùng còn nhiều khó khăn.  

---

*Một chiếc áo ấm, một nụ cười hồn nhiên — đôi khi chính là niềm hạnh phúc trọn vẹn nhất.*
</div>
`
},
{
  id: "9",
  title: "<div style=\"font-size: var(--article-font-size, 1rem);\">Hội An Xanh: Quy Hoạch Hành Lang Ven Biển Cửa Đại</div>",
  lead: "<div style=\"line-height: 1.5;\">Trước nguy cơ xói lở nghiêm trọng ở bãi biển Cửa Đại, các chuyên gia và nhà quản lý đã cùng nhau thảo luận để kiến tạo một hành lang xanh – vừa bảo vệ bờ biển, vừa nuôi dưỡng hệ sinh thái và cộng đồng địa phương.</div>",
  author: "ICUE-VN",
  date: "<div style=\"text-align: center;\">*Ngày: 05/12/2024*</div>",
  images: [
    {
      src: "/public/news/articles/article_9/1.jpg",
      caption: "KTS. Nguyễn Thanh Tâm, Viện Nghiên cứu kinh tế xây dựng và Đô thị, trình bày dự án nghiên cứu."
    },
    {
      src: "/public/news/articles/article_9/2.jpg",
      caption: "Phân khu chức năng Hành lang xanh ven biển Cửa Đại. Bảo vệ chim hoang dã."
    },
    {
      src: "/public/news/articles/article_9/3.jpg",
      caption: "Phân bố các khu vực trồng cây."
    },
    {
      src: "/public/news/articles/article_9/4.jpg",
      caption: "TS. Nguyễn Hồng Hạnh, Viện Nghiên cứu kinh tế xây dựng và Đô thị, phát biểu tại hội thảo."
    },
    {
      src: "/public/news/articles/article_9/5.jpg",
      caption: "Ý tưởng sơ bộ thiết kế công viên cộng đồng."
    },
    {
      src: "/public/news/articles/article_9/6.jpg",
      caption: "Thiết kế sơ bộ tổng mặt bằng công viên sinh thái cộng đồng."
    },
    {
      src: "/public/news/articles/article_9/7.jpg",
      caption: "Các đại biểu, khách mời chụp ảnh lưu niệm tại hội thảo ngày 5.12."
    },
    {
      src: "/public/news/articles/article_9/8.jpg",
      caption: "Các đại biểu, khách mời chụp ảnh lưu niệm tại hội thảo ngày 6.12."
    },
    {
      src: "/public/news/articles/article_9/9.jpg",
      caption: "Đại diện ICUE, GIZ và các bên liên quan tại hội thảo"
    },
    {
      src: "/public/news/articles/article_9/10.jpg",
      caption: "Đại diện ICUE, GIZ và các bên liên quan tại hội thảo"
    },
    {
      src: "/public/news/articles/article_9/11.jpg",
      caption: "Đại diện ICUE, GIZ và các bên liên quan tại hội thảo"
    },
    {
      src: "/public/news/articles/article_9/12.jpg",
      caption: "Đại diện ICUE, GIZ và các bên liên quan tại hội thảo"
    },
  ],
  bodyMarkdown: `
<div style="margin-left: var(--article-indent, 0.5rem);">

<div style ="font-size: 1rem; text-align: center; font-weight: 600; margin-bottom:15px; line-height:1.25;">HỘI THẢO QUY HOẠCH HÀNH LANG XANH VEN BIỂN CỬA ĐẠI – HỘI AN</div> 
---

<div style ="text-align: center;">
### 🌊 Xanh Hóa Bờ Biển – *"Giải Pháp Cho Cửa Đại"*
</div>

Trong hai ngày **05–06/12/2024**, Viện Nghiên cứu Kinh tế Xây dựng và Đô thị (ICUE) phối hợp cùng tổ chức GIZ (Đức) đã tổ chức hội thảo tại Hà Nội, tập trung vào việc **giải quyết xói lở bãi biển Cửa Đại** thông qua giải pháp **quy hoạch hành lang xanh**.  

Hành lang dài **3,2 km**, rộng từ **8m đến 100m**, với **10.000m² công viên cộng đồng**, được xem như “lá chắn sinh thái” trước sóng biển và là không gian sinh hoạt chung cho cộng đồng.

---

<div style ="text-align: center;">
### Cấu Trúc Hành Lang Xanh
</div>

Theo KTS. **Nguyễn Thanh Tâm**, hành lang gồm 5 phân khu chính:  

<div style="margin-left: var(--article-indent, 0.5rem);">
- Khu bãi biển cộng đồng  
- Vườn thảo mộc  
- Công viên trung tâm  
- Vùng đệm sinh thái  
- Đầm lầy và sân chim </div>

Lớp cây trồng nhiều tầng (dừa, bụi, thông non) kết hợp phủ lá mục, cành khô giúp giữ đất, phục hồi hệ sinh thái và gia tăng đa dạng sinh học.

---

<div style ="text-align: center;">
### 🗣️ Ý Kiến Chuyên Gia
</div>

- **PGS-TS. Vũ Thị Vinh**: Đánh giá cao tính thực tiễn, lựa chọn cây bản địa phù hợp.  
- **PGS-TS.KTS. Đỗ Tú Lan**: Gợi ý lồng ghép yếu tố du lịch – thu hút đầu tư tư nhân để bảo đảm bền vững.  
- **TS. Nguyễn Hồng Hạnh**: Chỉ ra sự thiếu vắng tiếng nói từ doanh nghiệp – cần sự đồng hành của cộng đồng kinh doanh.  
- **TS. Trần Thị Lâm Hà**: Đề nghị làm rõ các chỉ số hiệu quả – hành lang xanh chống xói lở bao nhiêu phần trăm?  
- **KTS. Chu Kim Đức**: Nhấn mạnh giá trị giáo dục môi trường – 74 loài thực vật, 99 loài chim, nhiều loài quý hiếm cần được giới thiệu cho cộng đồng.  
- **KTS. Trần Xuân Hiếu**: Đề xuất phát triển thành mô hình mẫu có thể nhân rộng, kết hợp biển báo song ngữ, bản sắc văn hóa địa phương. 

---

<div style ="text-align: center;">
### Góc Nhìn Từ Hội Thảo
</div>

Hội thảo quy tụ đại diện từ Hiệp hội Quy hoạch và Phát triển Đô thị Việt Nam, ICUE, GIZ cùng các chuyên gia thiết kế, quản lý đô thị.  

Các ý kiến thống nhất rằng hành lang xanh không chỉ là giải pháp ứng phó biến đổi khí hậu mà còn là **mô hình hạ tầng xanh**, mở đường cho phát triển bền vững, gắn kết cộng đồng và du lịch sinh thái.

---

<div style ="text-align: center;">
### Kết Luận

<div style ="margin: -0.5rem auto;">
Hành lang xanh Cửa Đại được kỳ vọng trở thành </div></div>

- **Lá chắn tự nhiên** chống xói lở và biến đổi khí hậu  
- **Không gian sống xanh** cho cộng đồng và du khách  
- **Mô hình mẫu** có thể nhân rộng ra nhiều vùng ven biển khác của Việt Nam  

---

*Một bờ biển xanh – một tương lai bền vững. Đó là thông điệp Cửa Đại gửi gắm hôm nay.*
</div>
`
},
];

// Modal and Image Swipe Functionality
let currentModalImages = [];
let currentModalIndex = 0;
let startX = 0;
let endX = 0;

// Article Swipe Functionality
let currentArticle = null;
let currentArticleIndex = 0;
let articleStartX = 0;
let articleEndX = 0;

function setupArticleSwipe(article) {
  currentArticle = article;
  currentArticleIndex = 0;
  
  const imageContainer = document.getElementById("article-image").parentElement;
  
  // Add navigation arrows
  if (!imageContainer.querySelector('.article-nav-btn')) {
    // Left arrow
    if (window.innerWidth >= 769) {
    const leftArrow = document.createElement('button');
    leftArrow.className = 'article-nav-btn article-prev-btn';
    leftArrow.innerHTML = '<svg fill="#fff" width="25px" height="25px" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><path d="M30 14.5c-.004.276-.224.504-.5.5h-26c-.66 0-.664-1 0-1h26c.282-.004.504.218.5.5zm-15 14c0 .45-.554.663-.854.354l-14-14c-.195-.196-.195-.512 0-.708l14-14c.426-.442 1.167.248.708.708L1.207 14.5l13.647 13.646c.097.095.146.22.146.354z"/></svg>';
    leftArrow.style.cssText = `
      position: absolute;
      left: 5px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0,0,0,0.6);
      border: none;
      padding: 10px 15px;
      border-radius: 50%;
      cursor: pointer;
      z-index: 100;
      transition: all 0.3s ease;
      opacity: 0.7;
    `;
    leftArrow.onmouseenter = () => leftArrow.style.opacity = '1';
    leftArrow.onmouseleave = () => leftArrow.style.opacity = '0.7';
    leftArrow.onclick = () => navigateArticleMedia(-1);
    
    // Right arrow
    const rightArrow = document.createElement('button');
    rightArrow.className = 'article-nav-btn article-next-btn';
    rightArrow.innerHTML = '<svg fill="#fff" width="25px" height="25px" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><path d="M0 15.5c.004.276.224.504.5.5h26c.66 0 .664-1 0-1H.5c-.282-.004-.504.218-.5.5zm15 14c0 .45.554.663.854.354l14-14c.195-.195.195-.51 0-.707l-14-14c-.426-.443-1.167.248-.707.707L28.793 15.5 15.147 29.148c-.098.095-.147.218-.147.353z"/></svg>';
    rightArrow.style.cssText = `
      position: absolute;
      right: 5px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0,0,0,0.6);
      border: none;
      padding: 10px 15px;
      border-radius: 50%;
      cursor: pointer;
      z-index: 100;
      transition: all 0.3s ease;
      opacity: 0.7;
    `;
    rightArrow.onmouseenter = () => rightArrow.style.opacity = '1';
    rightArrow.onmouseleave = () => rightArrow.style.opacity = '0.7';
    rightArrow.onclick = () => navigateArticleMedia(1);
    
    imageContainer.appendChild(leftArrow);
    imageContainer.appendChild(rightArrow);
    
    // Ensure container is positioned
    imageContainer.style.position = 'relative';
  }}
  
  // Add touch events for swipe
  imageContainer.addEventListener('touchstart', handleArticleTouchStart, { passive: false });
  imageContainer.addEventListener('touchmove', handleArticleTouchMove, { passive: false });
  imageContainer.addEventListener('touchend', handleArticleTouchEnd, { passive: false });
  
  // Add keyboard navigation
  document.addEventListener('keydown', handleArticleKeyboard);
  
  // Add media indicator dots
  addMediaIndicatorDots(article);
}

function navigateArticleMedia(direction) {
  if (!currentArticle || !currentArticle.images) return;
  
  currentArticleIndex += direction;
  
  if (currentArticleIndex < 0) {
    currentArticleIndex = currentArticle.images.length - 1;
  } else if (currentArticleIndex >= currentArticle.images.length) {
    currentArticleIndex = 0;
  }
  
  updateArticleMedia();
  updateMediaIndicatorDots();
}

function updateArticleMedia() {
  if (!currentArticle || !currentArticle.images) return;
  
  const media = currentArticle.images[currentArticleIndex];
  const isVideo = media.type === 'video' || media.src.toLowerCase().includes('.mp4') ||
                  media.src.toLowerCase().includes('.mov') || media.src.toLowerCase().includes('.webm') ||
                  media.src.toLowerCase().includes('.avi') || media.src.toLowerCase().includes('.mkv');
  
  const articleImageElement = document.getElementById("article-image");
  const articleCaptionElement = document.getElementById("article-caption");
  const imageContainer = articleImageElement.parentElement;
  
  // Remove any existing video containers
  const existingVideoContainer = imageContainer.querySelector('.article-video-container');
  if (existingVideoContainer) {
    existingVideoContainer.remove();
  }
  
  if (isVideo) {
    // Hide image and create video container
    articleImageElement.style.display = 'none';
    
    const videoContainer = document.createElement('div');
    videoContainer.className = 'article-video-container';
    videoContainer.style.cssText = `
      position: relative;
      width: 100%;
      height: auto;
      background: #000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      overflow: hidden;
    `;
    
    const video = document.createElement('video');
    video.src = media.src;
    video.controls = false; 
    video.preload = 'metadata';
    video.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 8px 8px 0 0;
    `;
    
    // Custom control bar container
    const controlBar = document.createElement('div');
    controlBar.className = 'video-control-bar';
    controlBar.style.cssText = `
      width: 100%;
      height: 40px;
      background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
      padding: 15px 30px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 5px;
      border-radius: 0 0 8px 8px;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
    `;
    
    // Play/Pause button
    const playPauseBtn = document.createElement('button');
    playPauseBtn.innerHTML = '<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 12L3 18.9671C3 21.2763 5.53435 22.736 7.59662 21.6145L10.7996 19.8727M3 8L3 5.0329C3 2.72368 5.53435 1.26402 7.59661 2.38548L20.4086 9.35258C22.5305 10.5065 22.5305 13.4935 20.4086 14.6474L14.0026 18.131" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"></path> </g></svg>';
    playPauseBtn.title = 'Play/Pause';
    playPauseBtn.style.cssText = `
      background: transparent;
      color: white;
      border: none;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 18px;
      cursor: pointer;
      transition: all 0.3s ease;
      min-width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
      flex: 1;
      height: 8px;
      background: rgba(255,255,255);
      border-radius: 4px;
      overflow: hidden;
      cursor: pointer;
      position: relative;
    `;
    
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      width: 0%;
      height: 100%;
      background: linear-gradient(to right, #0ff, #e8e5ff);
      border-radius: 4px;
      transition: width 0.1s ease;
    `;
    
    // Time display
    const timeDisplay = document.createElement('span');
    timeDisplay.textContent = '0:00 / 0:00';
    timeDisplay.style.cssText = `
      color: white;
      font-size: 14px;
      font-family: Arial, sans-serif;
      min-width: 30px;
      text-align: center;
      transform: translateX(2.5px);
    `;
    
    // Volume button
    const volumeBtn = document.createElement('button');
    volumeBtn.innerHTML = '<svg style="transform:translateX(2.5px);" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M19 6C20.5 7.5 21 10 21 12C21 14 20.5 16.5 19 18M16 8.99998C16.5 9.49998 17 10.5 17 12C17 13.5 16.5 14.5 16 15M3 10.5V13.5C3 14.6046 3.5 15.5 5.5 16C7.5 16.5 9 21 12 21C14 21 14 3 12 3C9 3 7.5 7.5 5.5 8C3.5 8.5 3 9.39543 3 10.5Z" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>';
    volumeBtn.title = 'Volume';
    volumeBtn.style.cssText = `
      background: transparent;
      color: white;
      border: none;
      padding: 0;
      border-radius: 6px;
      font-size: 18px;
      cursor: pointer;
      transition: all 0.3s ease;
      min-width: 45px;
      height: 45px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Fullscreen button
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.innerHTML = '<svg style="transform:translateX(-5px);" width="24px" height="24px" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" stroke-width="3" stroke="#ffffff" fill="none"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><polyline points="7.49 26 7.49 7.5 25.99 7.5"></polyline><polyline points="56.51 26 56.51 7.5 38.01 7.5"></polyline><polyline points="7.53 38 7.53 56.5 26.02 56.5"></polyline><polyline points="56.51 38 56.51 56.5 38.01 56.5"></polyline></g></svg>';
    fullscreenBtn.title = 'Open in modal';
    fullscreenBtn.style.cssText = `
      background: transparent;
      color: white;
      border: none;
      padding: 0;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      min-width: 45px;
      height: 45px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const videoIndicator = document.createElement('div');
    videoIndicator.innerHTML = 'VIDEO';
    videoIndicator.style.cssText = `
      position: absolute;
      top: 15px;
      left: 15px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 5px 10px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10;
      pointer-events: none;
    `;
    
    // Add hover effects
    playPauseBtn.onmouseenter = () => playPauseBtn.style.transform = "rotateZ(-360deg) scale(1.25)";
    playPauseBtn.onmouseleave = () => playPauseBtn.style.transform = "rotateZ(360deg) scale(1)";

    volumeBtn.onmouseenter = () => volumeBtn.style.transform = "scale(1.25)";
    volumeBtn.onmouseleave = () => volumeBtn.style.transform = "scale(1)";
    fullscreenBtn.onmouseenter = () => fullscreenBtn.style.transform = "rotateZ(-360deg) scale(1.25)";
    fullscreenBtn.onmouseleave = () => fullscreenBtn.style.transform = "rotateZ(360deg) scale(1)";

    // Event handlers
    playPauseBtn.onclick = () => {
      if (video.paused) {
        video.play();
        playPauseBtn.innerHTML = `<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M5.948 1.25H6.052C6.95048 1.24997 7.6997 1.24995 8.29448 1.32991C8.92228 1.41432 9.48908 1.59999 9.94455 2.05546C10.4 2.51093 10.5857 3.07773 10.6701 3.70552C10.7501 4.30031 10.75 5.04953 10.75 5.94801V18.052C10.75 18.9505 10.7501 19.6997 10.6701 20.2945C10.5857 20.9223 10.4 21.4891 9.94455 21.9445C9.48908 22.4 8.92228 22.5857 8.29448 22.6701C7.6997 22.7501 6.95048 22.75 6.052 22.75H5.94801C5.04953 22.75 4.30031 22.7501 3.70552 22.6701C3.07773 22.5857 2.51093 22.4 2.05546 21.9445C1.59999 21.4891 1.41432 20.9223 1.32991 20.2945C1.24995 19.6997 1.24997 18.9505 1.25 18.052V5.948C1.24997 5.04952 1.24995 4.3003 1.32991 3.70552C1.41432 3.07773 1.59999 2.51093 2.05546 2.05546C2.51093 1.59999 3.07773 1.41432 3.70552 1.32991C4.3003 1.24995 5.04952 1.24997 5.948 1.25ZM3.90539 2.81654C3.44393 2.87858 3.24644 2.9858 3.11612 3.11612C2.9858 3.24644 2.87858 3.44393 2.81654 3.90539C2.7516 4.38843 2.75 5.03599 2.75 6V18C2.75 18.964 2.7516 19.6116 2.81654 20.0946C2.87858 20.5561 2.9858 20.7536 3.11612 20.8839C3.24644 21.0142 3.44393 21.1214 3.90539 21.1835C4.38843 21.2484 5.03599 21.25 6 21.25C6.96401 21.25 7.61157 21.2484 8.09461 21.1835C8.55607 21.1214 8.75357 21.0142 8.88389 20.8839C9.0142 20.7536 9.12143 20.5561 9.18347 20.0946C9.24841 19.6116 9.25 18.964 9.25 18V6C9.25 5.03599 9.24841 4.38843 9.18347 3.90539C9.12143 3.44393 9.0142 3.24644 8.88389 3.11612C8.75357 2.9858 8.55607 2.87858 8.09461 2.81654C7.61157 2.7516 6.96401 2.75 6 2.75C5.03599 2.75 4.38843 2.7516 3.90539 2.81654ZM17.948 1.25H18.052C18.9505 1.24997 19.6997 1.24995 20.2945 1.32991C20.9223 1.41432 21.4891 1.59999 21.9445 2.05546C22.4 2.51093 22.5857 3.07773 22.6701 3.70552C22.7501 4.30031 22.75 5.04953 22.75 5.94801V18.052C22.75 18.9505 22.7501 19.6997 22.6701 20.2945C22.5857 20.9223 22.4 21.4891 21.9445 21.9445C21.4891 22.4 20.9223 22.5857 20.2945 22.6701C19.6997 22.7501 18.9505 22.75 18.052 22.75H17.948C17.0495 22.75 16.3003 22.7501 15.7055 22.6701C15.0777 22.5857 14.5109 22.4 14.0555 21.9445C13.6 21.4891 13.4143 20.9223 13.3299 20.2945C13.2499 19.6997 13.25 18.9505 13.25 18.052V5.94801C13.25 5.04953 13.2499 4.30031 13.3299 3.70552C13.4143 3.07773 13.6 2.51093 14.0555 2.05546C14.5109 1.59999 15.0777 1.41432 15.7055 1.32991C16.3003 1.24995 17.0495 1.24997 17.948 1.25ZM15.9054 2.81654C15.4439 2.87858 15.2464 2.9858 15.1161 3.11612C14.9858 3.24644 14.8786 3.44393 14.8165 3.90539C14.7516 4.38843 14.75 5.03599 14.75 6V18C14.75 18.964 14.7516 19.6116 14.8165 20.0946C14.8786 20.5561 14.9858 20.7536 15.1161 20.8839C15.2464 21.0142 15.4439 21.1214 15.9054 21.1835C16.3884 21.2484 17.036 21.25 18 21.25C18.964 21.25 19.6116 21.2484 20.0946 21.1835C20.5561 21.1214 20.7536 21.0142 20.8839 20.8839C21.0142 20.7536 21.1214 20.5561 21.1835 20.0946C21.2484 19.6116 21.25 18.964 21.25 18V6C21.25 5.03599 21.2484 4.38843 21.1835 3.90539C21.1214 3.44393 21.0142 3.24644 20.8839 3.11612C20.7536 2.9858 20.5561 2.87858 20.0946 2.81654C19.6116 2.7516 18.964 2.75 18 2.75C17.036 2.75 16.3884 2.7516 15.9054 2.81654Z" fill="#ffffff"></path> </g></svg>`;
      } else {
        video.pause();
        playPauseBtn.innerHTML = '<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 12L3 18.9671C3 21.2763 5.53435 22.736 7.59662 21.6145L10.7996 19.8727M3 8L3 5.0329C3 2.72368 5.53435 1.26402 7.59661 2.38548L20.4086 9.35258C22.5305 10.5065 22.5305 13.4935 20.4086 14.6474L14.0026 18.131" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"></path> </g></svg>';
      }
    };
    
    // Progress bar click
    progressContainer.onclick = (e) => {
      const rect = progressContainer.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const percentage = clickX / width;
      video.currentTime = percentage * video.duration;
    };
    
    // Update progress and time
    video.ontimeupdate = () => {
      if (video.duration) {
        const percentage = (video.currentTime / video.duration) * 100;
        progressBar.style.width = percentage + '%';
        
        const current = formatTime(video.currentTime);
        const total = formatTime(video.duration);
        timeDisplay.textContent = `${current} / ${total}`;
      }
    };
    
    // Volume control
    volumeBtn.onclick = () => {
      if (video.muted) {
        video.muted = false;
        volumeBtn.innerHTML = '<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M19 6C20.5 7.5 21 10 21 12C21 14 20.5 16.5 19 18M16 8.99998C16.5 9.49998 17 10.5 17 12C17 13.5 16.5 14.5 16 15M3 10.5V13.5C3 14.6046 3.5 15.5 5.5 16C7.5 16.5 9 21 12 21C14 21 14 3 12 3C9 3 7.5 7.5 5.5 8C3.5 8.5 3 9.39543 3 10.5Z" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>';
      } else {
        video.muted = true;
        volumeBtn.innerHTML = '<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M22 9L16 15M16 9L22 15M3 10.5V13.5C3 14.6046 3.5 15.5 5.5 16C7.5 16.5 9 21 12 21C14 21 14 3 12 3C9 3 7.5 7.5 5.5 8C3.5 8.5 3 9.39543 3 10.5Z" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>';
      }
    };
    
    fullscreenBtn.onclick = (e) => {
      e.stopPropagation();
      openImageModal(currentArticle.images, currentArticleIndex);
    };
    
    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    progressContainer.appendChild(progressBar);
    controlBar.appendChild(playPauseBtn);
    controlBar.appendChild(progressContainer);
    controlBar.appendChild(timeDisplay);
    controlBar.appendChild(volumeBtn);
    controlBar.appendChild(fullscreenBtn);
    
    videoContainer.appendChild(video);
    videoContainer.appendChild(videoIndicator);
    videoContainer.appendChild(controlBar);
    
    imageContainer.insertBefore(videoContainer, articleImageElement);
  } else {
    // Show image
    articleImageElement.style.display = 'block';
    articleImageElement.style.width = '100%';
    articleImageElement.style.height = '550px';
    articleImageElement.style.objectFit = 'cover';
    articleImageElement.style.borderRadius = '8px';
    articleImageElement.src = media.src;
    articleImageElement.onclick = () => openImageModal(currentArticle.images, currentArticleIndex);
  }
  
  articleCaptionElement.textContent = media.caption;
  articleCaptionElement.style.marginTop = '10px';
  
  // Update counter indicator
  const indicator = imageContainer.querySelector('.image-count-indicator');
  if (indicator) {
    indicator.textContent = `${currentArticleIndex + 1}/${currentArticle.images.length}`;
    indicator.style.color = '#ffffff';
  }
}

function addMediaIndicatorDots(article) {
  const imageContainer = document.getElementById("article-image").parentElement;
  
  // Remove existing dots
  const existingDots = imageContainer.querySelector('.media-dots-container');
  if (existingDots) {
    existingDots.remove();
  }
  if (article.images.length <= 1) return;

const dotsContainer = document.createElement('div');
dotsContainer.className = 'media-dots-container';

if (window.innerWidth >= 769) {
  // Desktop
  dotsContainer.style.cssText = `
    position: absolute;
    bottom: 92.5%;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    z-index: 100;
  `;
} else {
  // Mobile
  dotsContainer.style.cssText = `
    position: absolute;
    top: -1rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 4px;
    z-index: 100;
  `;
}

document.body.appendChild(dotsContainer); 
  
  article.images.forEach((_, index) => {
    const dot = document.createElement('button');
    const size = window.innerWidth >= 769 ? 15 : 10;
    const borderRadius = window.innerWidth >= 769 ? '50%' : '24px';
    dot.className = `media-dot ${index === 0 ? 'active' : ''}`;
    dot.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      border-radius: ${borderRadius};
      border: 1px solid black;
      background: ${index === 0 ? '#3ad9d9' : 'rgba(255,255,255,0.75)'};
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    dot.onmouseenter = () => {
      if (index !== currentArticleIndex) {
        dot.style.background = 'rgba(0,0,0,0.45)';
        dot.style.transform = 'scale(1.15)';
      }
    };
    dot.onmouseleave = () => {
      if (index !== currentArticleIndex) {
        dot.style.background = 'rgba(255,255,255,0.75)';
        dot.style.transform = 'scale(1)';
      }
    };
    dot.onclick = () => {
      currentArticleIndex = index;
      updateArticleMedia();
      updateMediaIndicatorDots();
    };
    dotsContainer.appendChild(dot);
  });
  
  imageContainer.appendChild(dotsContainer);
}

function updateMediaIndicatorDots() {
  const dots = document.querySelectorAll('.media-dot');
  dots.forEach((dot, index) => {
    const isActive = index === currentArticleIndex;
    const isMobile = window.innerWidth < 769;
    dot.style.background = isActive ? '#3ad9d9' : 'rgba(255,255,255,0.3)';
    dot.style.border = isActive ? '1px solid #000' : '1px solid rgba(0,0,0,0.8)';
    dot.style.width = isActive ? `${isMobile ? 10 : 15}px` : `${isMobile ? 10 : 15}px`;
    dot.style.height = isActive ? `${isMobile ? 10 : 15}px` : `${isMobile ? 10 : 15}px`;
    dot.style.transform = isActive ? 'scale(1.2)' : 'scale(1)';
    dot.className = `media-dot ${isActive ? 'active' : ''}`;
  });
}

// Touch event handlers for article swipe
function handleArticleTouchStart(e) {
  articleStartX = e.touches[0].clientX;
}

function handleArticleTouchMove(e) {
  if (!articleStartX) return;
  e.preventDefault();
}

function handleArticleTouchEnd(e) {
  if (!articleStartX) return;
  
  articleEndX = e.changedTouches[0].clientX;
  const diffX = articleStartX - articleEndX;
  const threshold = 50;
  
  if (Math.abs(diffX) > threshold) {
    if (diffX > 0) {
      navigateArticleMedia(1); // Swipe left = next
    } else {
      navigateArticleMedia(-1); // Swipe right = previous
    }
  }
  
  articleStartX = 0;
  articleEndX = 0;
}

// Keyboard navigation for article
function handleArticleKeyboard(e) {
  // Only handle if not in modal
  if (document.getElementById('image-modal').style.display !== 'flex') {
    switch(e.key) {
      case 'ArrowLeft':
        navigateArticleMedia(-1);
        e.preventDefault();
        break;
      case 'ArrowRight':
        navigateArticleMedia(1);
        e.preventDefault();
        break;
    }
  }
}

function createImageModal() {
  const modalHTML = `
    <div id="image-modal" style="
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      z-index: 9999;
      justify-content: center;
      align-items: center;
    ">
      <div class="modal-content" style="
        position: relative;
        width: 85%;
        height: auto;
        overflow: hidden;
        max-width: 92.5%;
        max-height: 92.5%;
        object-fit:cover;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin-left: -0.25rem;
      ">
        <button id="modal-close" class="modal-close" style="
          position: absolute;
          top: 0;
          right: 50px;
          background: none;
          border: none;
          color: white;
          font-size: 50px;
          cursor: pointer;
          z-index: 10000;
        ">&times;</button>
        
        <div class="image-container" style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 70vh;
        ">
          <button id="modal-prev" class="modal-arrow" style="
            position: absolute;
            left: 50px;
            background: transparent;
            border: none;
            color: white;
            font-size: 24px;
            padding: 10px 15px;
            cursor: pointer;
            border-radius: 50%;
            z-index: 10000;
          "><svg width="32px" height="32px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 12H2" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 19L2.84 14C2.57 13.74 2.35 13.43 2.20 13.09C2.05 12.75 1.98 12.37 1.98 12C1.98 11.62 2.05 11.25 2.20 10.91C2.35 10.57 2.57 10.26 2.84 10L8 5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          </button>
          <img id="modal-image" style="
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            user-select: none;
            -webkit-user-drag: none;
            display: none;
          ">
          
          <video id="modal-video" controls style="
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            display: none;
            border-radius: 8px;
          ">
            Your browser does not support the video tag.
          </video>
          
          <button id="modal-next" class="modal-arrow" style="
            position: absolute;
            right: 50px;
            background: transparent;
            border: none;
            color: white;
            font-size: 24px;
            padding: 10px 15px;
            cursor: pointer;
            border-radius: 50%;
            z-index: 10000;
          "><svg width="32px" height="32px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M2 12.0701H22" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M16 5L21.16 10C21.4324 10.2571 21.6494 10.567 21.7977 10.9109C21.946 11.2548 22.0226 11.6255 22.0226 12C22.0226 12.3745 21.946 12.7452 21.7977 13.0891C21.6494 13.433 21.4324 13.7429 21.16 14L16 19" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg></button>
        </div>
        
        <div class="modal-description" style="
          margin-top: 0px;
          text-align: center;
          color: white;
          max-width: 600px;
        ">
          <div id="modal-caption" style="
            font-size: 16px;
            margin: 15px;
          "></div>
          <div id="modal-counter" style="
            font-size: 14px;
            opacity: 0.7;
            color: #fff;
            background: #000;
          "></div>
        </div>
        
        <div id="modal-thumbnails" class="media-thumbnails" style="
          display: flex;
          gap: 10px;
          margin-top: 20px;
          max-width: 100%;
          overflow-x: auto;
          padding: 10px 0;
        "></div>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 768px) {
      .modal-arrow {
        display: none !important;
      }
      .image-container {
        margin-top: -75px !important;
      }
      .modal-close {
        top: 0 !important;
        right: 0 !important;
        font-size: 30px !important;
      }
      .modal-description {
        margin-top: -110px !important;
      }
      .media-thumbnails {
        margin-top: -2.5px !important;
      }
    }
  `;
  document.head.appendChild(style);

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Add event listeners
  document.getElementById('modal-close').onclick = closeImageModal;
  document.getElementById('modal-prev').onclick = () => navigateModal(-1);
  document.getElementById('modal-next').onclick = () => navigateModal(1);
  
  // Click outside to close
  document.getElementById('image-modal').onclick = (e) => {
    if (e.target.id === 'image-modal') closeImageModal();
  };
  
  // Keyboard navigation
  document.addEventListener('keydown', handleModalKeyboard);
  
  // Touch events for mobile swipe - apply to both image and video
  const modalImage = document.getElementById('modal-image');
  const modalVideo = document.getElementById('modal-video');
  const imageContainer = document.querySelector('.image-container');
  
  // Apply touch events to the container so it works for both image and video
  imageContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
  imageContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
  imageContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
}

function openImageModal(images, startIndex = 0) {
  currentModalImages = images;
  currentModalIndex = startIndex;
  
  if (!document.getElementById('image-modal')) {
    createImageModal();
  }
  
  updateModalImage();
  document.getElementById('image-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeImageModal() {
  // Pause any playing video before closing
  const modalVideo = document.getElementById('modal-video');
  if (modalVideo && !modalVideo.paused) {
    modalVideo.pause();
  }
  
  document.getElementById('image-modal').style.display = 'none';
  document.body.style.overflow = ''; // Restore scrolling
}

function navigateModal(direction) {
  // Pause current video if playing before switching
  const modalVideo = document.getElementById('modal-video');
  if (modalVideo && !modalVideo.paused) {
    modalVideo.pause();
  }
  
  currentModalIndex += direction;
  
  if (currentModalIndex < 0) {
    currentModalIndex = currentModalImages.length - 1;
  } else if (currentModalIndex >= currentModalImages.length) {
    currentModalIndex = 0;
  }
  
  updateModalImage();
}

function updateModalImage() {
  const media = currentModalImages[currentModalIndex];
  const modalImage = document.getElementById('modal-image');
  const modalVideo = document.getElementById('modal-video');
  const modalCaption = document.getElementById('modal-caption');
  const modalCounter = document.getElementById('modal-counter');
  const thumbnailContainer = document.getElementById('modal-thumbnails');
  
  const isVideo = media.type === 'video' || media.src.toLowerCase().includes('.mp4') || 
                  media.src.toLowerCase().includes('.mov') || media.src.toLowerCase().includes('.webm') ||
                  media.src.toLowerCase().includes('.avi') || media.src.toLowerCase().includes('.mkv');
  
  modalImage.style.display = 'none';
  modalVideo.style.display = 'none';
  
  // Show and update the appropriate element
  if (isVideo) {
    modalVideo.src = media.src;
    modalVideo.style.display = 'block';
    // Pause video when switching (optional)
    modalVideo.currentTime = 0;
  } else {
    modalImage.src = media.src;
    modalImage.style.display = 'block';
  }
  
  modalCaption.textContent = media.caption;
  modalCounter.textContent = `${currentModalIndex + 1} / ${currentModalImages.length}`;
  
  // Update thumbnails
  thumbnailContainer.innerHTML = '';
  currentModalImages.forEach((item, index) => {
    const itemIsVideo = item.type === 'video' || item.src.toLowerCase().includes('.mp4') || 
                        item.src.toLowerCase().includes('.mov') || item.src.toLowerCase().includes('.webm') ||
                        item.src.toLowerCase().includes('.avi') || item.src.toLowerCase().includes('.mkv');
    
    if (itemIsVideo) {
      // Create video thumbnail
      const thumbContainer = document.createElement('div');
      thumbContainer.style.cssText = `
        width: 60px;
        height: 60px;
        position: relative;
        cursor: pointer;
        border: 2px solid ${index === currentModalIndex ? '#fff' : 'transparent'};
        border-radius: 4px;
        opacity: ${index === currentModalIndex ? '1' : '0.7'};
        transition: all 0.3s ease;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      `;
      
      // Create a fallback background with video icon
      const videoIcon = document.createElement('div');
      videoIcon.innerHTML = '📹';
      videoIcon.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 24px;
        opacity: 1;
        z-index: 1;
        color: white;
        background: rgba(0,0,0,0.6);
        padding: 8px;
        border-radius: 4px;
        border: 1px solid rgba(255,255,255,0.3);
      `;
      
      // Try to create video thumbnail
      const video = document.createElement('video');
      video.src = item.src;
      video.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 2;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      video.muted = true;
      video.preload = 'metadata';
      
      // Add play icon overlay
      const playIcon = document.createElement('div');
      playIcon.innerHTML = '▶';
      playIcon.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 16px;
        text-shadow: 0 0 4px rgba(0,0,0,0.8);
        pointer-events: none;
        z-index: 3;
      `;
      
      // iOS-compatible thumbnail generation
      const loadThumbnail = () => {
        if (video.readyState >= 2) { 
          try {
            video.currentTime = Math.min(5, video.duration * 0.1); // 10% into video or 5 seconds, whichever is smaller
            console.log('Video seeking to:', video.currentTime);
          } catch (e) {
            console.log('Video seeking not supported, keeping fallback visible');
          }
        }
      };
      
      // Event listeners for better iOS compatibility
      video.addEventListener('loadedmetadata', loadThumbnail);
      video.addEventListener('loadeddata', loadThumbnail);
      video.addEventListener('canplay', () => {
        console.log('Video can play - showing thumbnail');
        video.style.opacity = '1';
        videoIcon.style.opacity = '0.3';
      });
      
      video.addEventListener('seeked', () => {
        console.log('Video seeked successfully');
        video.style.opacity = '1';
        videoIcon.style.opacity = '0.3';
      });
      
      // Error handling - show fallback if video fails to load
      video.addEventListener('error', () => {
        console.log('Video failed to load');
        video.style.opacity = '0';
        videoIcon.style.opacity = '1';
        videoIcon.innerHTML = '🎬';
        videoIcon.style.background = 'rgba(255,0,0,0.4)';
      });
      
      // Timeout to ensure emoji stays visible if video doesn't load
      setTimeout(() => {
        if (video.style.opacity === '0') {
          console.log('Video thumbnail timeout - keeping emoji visible');
          videoIcon.style.opacity = '1';
        }
      }, 3000);
      
      thumbContainer.appendChild(videoIcon); // Fallback background
      thumbContainer.appendChild(video);
      thumbContainer.appendChild(playIcon);
      
      thumbContainer.onclick = () => {
        currentModalIndex = index;
        updateModalImage();
      };
      
      thumbnailContainer.appendChild(thumbContainer);
    } else {
      // Create image thumbnail
      const thumb = document.createElement('img');
      thumb.src = item.src;
      thumb.style.cssText = `
        width: 60px;
        height: 60px;
        object-fit: cover;
        cursor: pointer;
        border: 2px solid ${index === currentModalIndex ? '#fff' : 'transparent'};
        border-radius: 4px;
        opacity: ${index === currentModalIndex ? '1' : '0.7'};
        transition: all 0.3s ease;
      `;
      thumb.onclick = () => {
        currentModalIndex = index;
        updateModalImage();
      };
      thumbnailContainer.appendChild(thumb);
    }
  });
  
  // Show/hide navigation buttons
  const prevBtn = document.getElementById('modal-prev');
  const nextBtn = document.getElementById('modal-next');
  
  if (currentModalImages.length <= 1) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
  } else {
    prevBtn.style.display = 'block';
    nextBtn.style.display = 'block';
  }
}

// Touch event handlers for mobile swipe
function handleTouchStart(e) {
  startX = e.touches[0].clientX;
}

function handleTouchMove(e) {
  if (!startX) return;
  e.preventDefault(); // Prevent scrolling
}

function handleTouchEnd(e) {
  if (!startX) return;
  
  endX = e.changedTouches[0].clientX;
  const diffX = startX - endX;
  const threshold = 50; // Minimum swipe distance
  
  if (Math.abs(diffX) > threshold) {
    if (diffX > 0) {
      navigateModal(1); // Swipe left = next image
    } else {
      navigateModal(-1); // Swipe right = previous image
    }
  }
  
  startX = 0;
  endX = 0;
}

// Keyboard navigation
function handleModalKeyboard(e) {
  if (document.getElementById('image-modal').style.display === 'flex') {
    switch(e.key) {
      case 'Escape':
        closeImageModal();
        break;
      case 'ArrowLeft':
        navigateModal(-1);
        break;
      case 'ArrowRight':
        navigateModal(1);
        break;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  let currentID = params.get("id");

  function renderCard(id) {
    const imageContainer = document.getElementById("article-image").parentElement;
    
    const existingNavBtns = imageContainer.querySelectorAll('.article-nav-btn');
    existingNavBtns.forEach(btn => btn.remove());
    
    const existingDots = imageContainer.querySelector('.media-dots-container');
    if (existingDots) {
      existingDots.remove();
    }

    const existingVideoContainer = imageContainer.querySelector('.article-video-container');
    if (existingVideoContainer) {
      existingVideoContainer.remove();
    }
    
    const existingIndicator = imageContainer.querySelector('.image-count-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    const article = articles.find(a => a.id === id);

    if (!article) {
      document.getElementById("content").innerHTML =
        `<h2 style="text-align:center;">🚫 Article not found.</h2>`;
      return;
    }

    const articleTitleEl = document.getElementById("article-title");
        if (articleTitleEl) {
              articleTitleEl.innerHTML = renderMarkdown(article.title);
              document.title = articleTitleEl.textContent.trim();}

    // CHANGE TO:
    document.getElementById("article-title").innerHTML = renderMarkdown(article.title);
    document.getElementById("article-lead").innerHTML = renderMarkdown(article.lead);
    document.getElementById("article-author").innerHTML = renderMarkdown(article.author);
    document.getElementById("article-date").innerHTML = renderMarkdown(article.date);
    
    // Handle multiple images/videos
    if (article.images && article.images.length > 0) {
      const firstMedia = article.images[0];
      const isFirstVideo = firstMedia.type === 'video' || firstMedia.src.toLowerCase().includes('.mp4') ||
                          firstMedia.src.toLowerCase().includes('.mov') || firstMedia.src.toLowerCase().includes('.webm') ||
                          firstMedia.src.toLowerCase().includes('.avi') || firstMedia.src.toLowerCase().includes('.mkv');
      
      const articleImageElement = document.getElementById("article-image");
      const articleCaptionElement = document.getElementById("article-caption");
      
      if (isFirstVideo) {
        // If first media is video, create a video thumbnail with play overlay
        const imageContainer = articleImageElement.parentElement;
        
        // Create video element to extract thumbnail
        const video = document.createElement('video');
        video.src = firstMedia.src;
        video.style.cssText = `
          width: 100%;
          height: 100%;
          object-fit: cover;
        `;
        video.muted = true;
        video.currentTime = 1; // Try to get a frame from 1 second in
        
        // Hide original image and show video thumbnail
        articleImageElement.style.display = 'none';
        
        // Create video thumbnail container
        const videoContainer = document.createElement('div');
        videoContainer.style.cssText = `
          position: relative;
          width: 100%;
          height: 550px !important;
          background: #333;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 8px;
          object-fit: cover;
        `;
        
        // Add play icon overlay
        const playIcon = document.createElement('div');
        playIcon.innerHTML = '▶';
        playIcon.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 48px;
          text-shadow: 0 0 10px rgba(0,0,0,0.8);
          pointer-events: none;
          z-index: 10;
        `;
        
        // Add video type indicator
        const videoIndicator = document.createElement('div');
        videoIndicator.innerHTML = '🎥 VIDEO';
        videoIndicator.style.cssText = `
          position: absolute;
          top: 15px;
          left: 15px;
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 5px 10px;
          border-radius: 15px;
          font-size: 12px;
          font-weight: bold;
          z-index: 10;
        `;
        
        videoContainer.appendChild(video);
        videoContainer.appendChild(playIcon);
        videoContainer.appendChild(videoIndicator);
        
        // Insert video container after the original image
        imageContainer.insertBefore(videoContainer, articleImageElement.nextSibling);
        
        // Set up click handler for video
        videoContainer.onclick = () => openImageModal(article.images, 0);
        
        articleCaptionElement.textContent = firstMedia.caption;
      } else {
        // If first media is image, use normal behavior
        articleImageElement.src = firstMedia.src;
        articleImageElement.style.display = 'block';
        articleImageElement.style.width = '100%';
        articleImageElement.style.height = '550px';
        articleImageElement.style.objectFit = 'cover';
        articleImageElement.style.borderRadius = '8px';
        articleCaptionElement.textContent = firstMedia.caption;
        
        // Add click handler for modal
        if (article.images.length > 1) {
          articleImageElement.style.cursor = "pointer";
          articleImageElement.onclick = () => openImageModal(article.images, 0);
        }
      }
      
      // Add indicator for multiple media items
      if (article.images.length > 1) {
        const imageContainer = articleImageElement.parentElement;
        if (!imageContainer.querySelector('.image-count-indicator')) {
          const indicator = document.createElement('div');
          indicator.className = 'image-count-indicator';
          indicator.textContent = `1/${article.images.length}`;
          indicator.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: #ffffff;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.5px;
            pointer-events: none;
            z-index: 10;
            backdrop-filter: blur(10px);
          `;
          imageContainer.style.position = 'relative';
          imageContainer.appendChild(indicator);
        }
      }
    }
    
    // Add swipe functionality for main article media
    if (article.images && article.images.length > 1) {
      setupArticleSwipe(article);
    }
    
    // Use markdown rendering if bodyMarkdown exists, otherwise use bodyHTML
    const articleBodyContent = article.bodyMarkdown 
      ? renderMarkdown(article.bodyMarkdown) 
      : article.bodyHTML;
    document.getElementById("article-body").innerHTML = articleBodyContent;

    if (article.pdf) {
      const dlBtn = document.getElementById("article-download");
      dlBtn.href = article.pdf;
      dlBtn.textContent = article.pdfButtonText || "Download PDF ⇲";
      dlBtn.style.display = "inline-block";
    } else {
      document.getElementById("article-download").style.display = "none";
    }
  }

  // Initial render
  renderCard(currentID);

  // Prev button
  document.getElementById('prev-card').onclick = () => {
    const idx = articles.findIndex(c => c.id === currentID);
    if (idx > 0) {
      currentID = articles[idx - 1].id;
      window.history.replaceState({}, '', `?id=${currentID}`);
      renderCard(currentID);
    }
  };

  // Next button
  document.getElementById('next-card').onclick = () => {
    const idx = articles.findIndex(c => c.id === currentID);
    if (idx < articles.length - 1) {
      currentID = articles[idx + 1].id;
      window.history.replaceState({}, '', `?id=${currentID}`);
      renderCard(currentID);
    }
  };
});


