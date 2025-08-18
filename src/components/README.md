# ICUE Footer Component

A reusable footer component for ICUE websites with responsive design and mobile toggle functionality.

## Features

- 🎨 Fully styled with modern design
- 📱 Mobile-responsive with collapsible sections
- 🔧 Easy to integrate into any page
- 🎯 Vietnamese content (easily customizable)
- 🛡️ Security badges (Norton, SSL, Payment)
- ⚡ Lightweight and fast

## Usage

### Method 1: Automatic Injection (Recommended)

Simply include the script in your HTML page:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Your Page</title>
</head>
<body>
    <script src="src/components/footer.js"></script>
</body>
</html>
```

### Method 2: Manual Injection

```html
<script src="src/components/footer.js"></script>
<script>
    // Inject footer into body (default)
    window.ICUEFooter.inject();
    
    // Or inject into specific element
    window.ICUEFooter.inject('#main-container');
    
    // Or inject into an element object
    const container = document.getElementById('footer-container');
    window.ICUEFooter.injectInto(container);
</script>
```

### Method 3: Custom Links

```javascript
// Update footer links after injection
window.ICUEFooter.updateLinks({
    company: [
        { text: "About Us", url: "/about" },
        { text: "Awards", url: "/awards" },
        { text: "News", url: "/news" }
    ],
    pages: [
        { text: "FAQ", url: "/faq" },
        { text: "Jobs", url: "/jobs" },
        { text: "Contact", url: "/contact" }
    ]
});
```

## API Reference

### `window.ICUEFooter.inject(targetSelector)`

Injects the complete footer (CSS + HTML + JS) into the specified element.

- **targetSelector** (string, optional): CSS selector for target element. Default: `'body'`
- **Returns**: `boolean` - Success status

### `window.ICUEFooter.injectInto(element)`

Injects footer into a specific DOM element.

- **element** (Element|string): DOM element or CSS selector
- **Returns**: `boolean` - Success status

### `window.ICUEFooter.updateLinks(newLinks)`

Updates footer links after injection.

- **newLinks** (object): Object with `company` and `pages` arrays

## Files Structure

```
src/components/
├── footer.js          # Main footer component
└── README.md         # This documentation
```

## Integration Examples

### For existing pages (FAQs.html, recruitment.html):

Add this line before closing `</body>` tag:

```html
<script src="src/components/footer.js"></script>
```

### For new pages:

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Page - ICUE</title>
</head>
<body>
    <!-- Your page content here -->
    
    <!-- Footer automatically loads -->
    <script src="src/components/footer.js"></script>
</body>
</html>
```

## Customization

The footer component includes:
- Company links section
- Other pages section  
- Security badges
- Privacy/Terms links
- Collaboration call-to-action

To customize the appearance, you can override the CSS variables or modify the `footerCSS` string in `footer.js`.

## Mobile Features

- Collapsible sections on mobile devices
- Touch-friendly toggle buttons
- Responsive grid layout
- Optimized for screens < 768px

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11+ (with minor styling differences)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Notes

- The component automatically detects if a footer already exists
- Only one footer will be injected per page
- Mobile toggles work automatically
- No external dependencies required
