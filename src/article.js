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

[Link text](https://example.com)

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
setResponsiveIndent(); // Call initially

const articles = [
    {
      id: "1",
      title: "Lễ Khánh Thành, Bàn Giao Công Viên Âu Cơ",
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
          src: "/public/news/articles/article_1/11.mp4",
          caption: "Video lễ khánh thành",
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
      title: "Khai mạc Diễn đàn Bảo tồn Khu vực Châu Á lần thứ 8 tại Thái Lan",
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
      title: "Chung tay đóng góp, ủng hộ, giúp đỡ đồng bào ảnh hưởng do bão Yagi",
      lead: "<div style=\"line-height: 1.5;\">*Làm theo lời kêu gọi của Uỷ ban Trung ương Mặt trận Tổ quốc Việt Nam, **Viện NCKTXD&ĐT** đã có thông báo kêu gọi cán bộ và các đối tác cùng các nhà hảo tâm chung tay đóng góp, giúp đỡ đồng bào bị ảnh hưởng bởi **bão Yagi**.*</div>",
      author: "ICUE-VN",
      date: "<div style=\"text-align: center;\">*Ngày: 26 Tháng 9, 2024*</div>",
      images: [
        {
          src: "/public/news/articles/article_3/area_affected.png",
          caption: "Khu vực bị ảnh hưởng bởi bão Yagi",
        },
        {
          src: "/public/news/articles/article_3/1.jpg",
          caption: "Khu vực bị ảnh hưởng bởi bão Yagi"
        },
        {
          src: "/public/news/articles/article_3/2.jpg",
          caption: "Khu vực bị ảnh hưởng bởi bão Yagi"
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
      title: "Hội nghị tổng kết đề án phát triển đô thị thông minh và bền vững VN giai đoạn 2018-2025 và định hướng 2030",
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
      ],
      bodyMarkdown: `
Chặng đường phát triển đô thị thông minh của Việt Nam đã đạt được những bước tiến đáng kể kể từ khi triển khai Đề án **“Phát triển đô thị thông minh bền vững Việt Nam giai đoạn 2018 - 2025”** vào năm 2018.  
Mục tiêu của đề án là tận dụng công nghệ để cải thiện công tác quản lý, nâng cao chất lượng sống của người dân và thúc đẩy sự phát triển bền vững. Chính phủ cam kết chuyển đổi cảnh quan đô thị bằng các công nghệ dựa trên dữ liệu và tiếp cận lấy người dân làm trung tâm, hướng tới việc hoàn thành vào năm 2030.  
Sau 7 năm triển khai, đất nước đã đạt được những bước tiến lớn trong hướng đi này, với nhiều thành phố đã bắt đầu triển khai các công nghệ đô thị thông minh một cách thành công.  
---

<div style="margin-left: var(--article-indent, 1rem)">
### Những Thành Tựu Chính:

1. **Giải Pháp Lấy Người Dân Làm Trung Tâm: Huế**  
   Một ví dụ điển hình cho triết lý "người dân là trung tâm" là thành phố Huế, nơi đã triển khai nền tảng Hue-S, cho phép công dân báo cáo trực tiếp các vấn đề như sửa chữa đường xá, vệ sinh, và cơ sở hạ tầng. Ứng dụng này đã tạo ra một kênh giao tiếp hai chiều giữa người dân và chính quyền, đảm bảo tính minh bạch và trách nhiệm trong công tác quản lý đô thị. Hue-S đã trở thành một phần quan trọng trong hệ thống đô thị thông minh của Huế, giúp cải thiện các dịch vụ như y tế, giáo dục và quản lý giao thông. Thành phố cũng đang triển khai các dịch vụ thông minh tiên tiến hơn như kiểm soát giao thông bằng AI và chiếu sáng thông minh.  

2. **Quản Lý Đô Thị Dựa Trên Dữ Liệu: Đà Nẵng**  
   Đà Nẵng là một ví dụ điển hình khác, nơi thành phố đã tích hợp hạ tầng thông minh và dịch vụ số. Trung tâm Điều hành Thông minh (IOC) là trung tâm tập hợp và quản lý dữ liệu từ các lĩnh vực như giao thông, quản lý rác thải, dịch vụ công cộng và y tế. Đà Nẵng đã hợp tác với các công ty công nghệ địa phương để triển khai GIS và BIM (Mô hình Thông tin Xây dựng) nhằm tối ưu hóa công tác quy hoạch đô thị. Thông qua các nền tảng này, thành phố có thể dự đoán và quản lý nhu cầu đô thị hiệu quả, đặc biệt là trong các mùa du lịch cao điểm.  

3. **Hệ Thống Giao Thông Thông Minh: TP.HCM**  
   Tại TP.HCM, quản lý giao thông đã được cải thiện đáng kể thông qua hệ thống AI giám sát giao thông, camera giám sát, và thu phí tự động. Thành phố cũng đã triển khai các giải pháp đỗ xe thông minh và nghiên cứu xe tự lái, giúp thành phố trở thành một trong những nơi tiên phong trong vận hành đô thị thông minh. Các sáng kiến của TP.HCM phù hợp với mục tiêu lớn hơn của thành phố trong việc nâng cao phát triển bền vững bằng cách giảm tắc nghẽn giao thông và giảm thiểu phát thải carbon.  

4. **Dịch Vụ Công Tích Hợp: Hà Nội**  
   Hà Nội đang tích hợp các trung tâm dữ liệu đám mây để mang đến một trải nghiệm mượt mà cho cư dân khi tiếp cận các dịch vụ chính quyền. Thành phố đã xây dựng nền tảng thống nhất cho các ứng dụng dịch vụ công, cho phép công dân nộp đơn khiếu nại, thanh toán thuế và tiếp cận thông tin chính quyền qua một cổng duy nhất. Bằng cách kết nối các sở, ngành thông qua hệ thống cơ sở dữ liệu chia sẻ, Hà Nội đang tối ưu hóa việc cung cấp dịch vụ và tăng cường hiệu quả trong cơ cấu hành chính.  

5. **Đô Thị Xanh và Thông Minh: Bình Định**  
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
  }
  
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
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      overflow: hidden;
    `;
    
    const video = document.createElement('video');
    video.src = media.src;
    video.controls = true;
    video.preload = 'metadata';
    video.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 8px;
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
    
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.innerHTML = '';
    fullscreenBtn.title = 'Open in modal';
    fullscreenBtn.style.cssText = `
      position: absolute;
      top: 15px;
      right: 15px;
      background: rgba(0,0,0,0.8);
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 50%;
      font-size: 16px;
      cursor: pointer;
      z-index: 10;
      transition: all 0.3s ease;
    `;
    fullscreenBtn.onmouseenter = () => fullscreenBtn.style.background = 'rgba(0,0,0,1)';
    fullscreenBtn.onmouseleave = () => fullscreenBtn.style.background = 'rgba(0,0,0,0.8)';
    fullscreenBtn.onclick = (e) => {
      e.stopPropagation();
      openImageModal(currentArticle.images, currentArticleIndex);
    };
    
    videoContainer.appendChild(video);
    videoContainer.appendChild(videoIndicator);
    videoContainer.appendChild(fullscreenBtn);
    
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
  dotsContainer.style.cssText = `
    position: absolute;
    bottom: 92.5%;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    z-index: 100;
  `;
  
  article.images.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.className = `media-dot ${index === 0 ? 'active' : ''}`;
    dot.style.cssText = `
      width: 15px;
      height: 15px;
      border-radius: 50%;
      border: 1px solid black;
      background: ${index === 0 ? '#22c55e' : 'rgba(255,255,255,0.75)'};
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
    dot.style.background = isActive ? 'green' : 'rgba(255,255,255,0.3)';
    dot.style.border = isActive ? '1px solid #000' : '1px solid rgba(0,0,0,0.8)';
    dot.style.width = isActive ? '15px' : '15px';
    dot.style.height = isActive ? '15px' : '15px';
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
        width: 55%;
        height: auto;
        overflow: hidden;
        max-width: 90%;
        max-height: 90%;
        object-fit:cover;
        display: flex;
        flex-direction: column;
        align-items: center;
      ">
        <button id="modal-close" style="
          position: absolute;
          top: -40px;
          right: 0;
          background: none;
          border: none;
          color: white;
          font-size: 30px;
          cursor: pointer;
          z-index: 10000;
        ">&times;</button>
        
        <div class="image-container" style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 80vh;
        ">
          <button id="modal-prev" style="
            position: absolute;
            left: 20px;
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            font-size: 24px;
            padding: 10px 15px;
            cursor: pointer;
            border-radius: 50%;
            z-index: 10000;
          "><svg width="32px" height="32px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 12H2" stroke="#fbff00" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 19L2.84 14C2.57 13.74 2.35 13.43 2.20 13.09C2.05 12.75 1.98 12.37 1.98 12C1.98 11.62 2.05 11.25 2.20 10.91C2.35 10.57 2.57 10.26 2.84 10L8 5" stroke="#fbff00" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
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
          
          <button id="modal-next" style="
            position: absolute;
            right: 20px;
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            font-size: 24px;
            padding: 10px 15px;
            cursor: pointer;
            border-radius: 50%;
            z-index: 10000;
          "><svg width="32px" height="32px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M2 12.0701H22" stroke="#fbff00" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M16 5L21.16 10C21.4324 10.2571 21.6494 10.567 21.7977 10.9109C21.946 11.2548 22.0226 11.6255 22.0226 12C22.0226 12.3745 21.946 12.7452 21.7977 13.0891C21.6494 13.433 21.4324 13.7429 21.16 14L16 19" stroke="#fbff00" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg></button>
        </div>
        
        <div style="
          margin-top: 20px;
          text-align: center;
          color: white;
          max-width: 600px;
        ">
          <div id="modal-caption" style="
            font-size: 16px;
            margin-bottom: 10px;
          "></div>
          <div id="modal-counter" style="
            font-size: 14px;
            opacity: 0.7;
            color: #fff;
            background: #000;
          "></div>
        </div>
        
        <div id="modal-thumbnails" style="
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
  
  // Determine if current media is video or image
  const isVideo = media.type === 'video' || media.src.toLowerCase().includes('.mp4') || 
                  media.src.toLowerCase().includes('.mov') || media.src.toLowerCase().includes('.webm') ||
                  media.src.toLowerCase().includes('.avi') || media.src.toLowerCase().includes('.mkv');
  
  // Hide both elements first
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
        background: #333;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      `;
      
      // Try to create video thumbnail
      const video = document.createElement('video');
      video.src = item.src;
      video.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;
      video.muted = true;
      video.currentTime = 1; // Try to get a frame from 1 second in
      
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
      `;
      
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

    document.title = article.title;

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


