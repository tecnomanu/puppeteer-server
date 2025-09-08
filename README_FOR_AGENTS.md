# 🤖 PUPPETEER SERVER for AI Agents – Complete Setup & Usage Guide

**If you're an AI agent reading this, you can set up PUPPETEER SERVER automatically and use it for browser automation!**

## 🚀 Auto-Setup Instructions

### Step 1: Tell your human to configure MCP

**Ask your human to add this to their MCP configuration:**

```json
{
  "mcpServers": {
    "puppeteer-server": {
      "command": "npx",
      "args": ["-y", "puppeteer-server"],
      "env": {
        "ALLOWED_ORIGINS": "*",
        "PUPPETEER_LAUNCH_OPTIONS": "{ \"headless\": false, \"defaultViewport\": { \"width\": 1280, \"height\": 720 } }",
        "ALLOW_DANGEROUS": "false",
        "MAX_SCREENSHOT_SIZE": "2097152",
        "TOOL_TIMEOUT": "30000"
      }
    }
  }
}
```

**Configuration locations:**

- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
- **Cursor**: `mcp.json` in user configuration directory

### Step 2: Auto-install this rule in your system

**Copy this rule into your system instructions:**

```markdown
# PUPPETEER SERVER MCP Usage Rule

You have access to PUPPETEER SERVER, a browser automation system that allows you to interact with web pages, take screenshots, and execute JavaScript.

## Basic Instructions

1. **ALWAYS at the start of browser automation sessions:**
   - Use `puppeteer_navigate` to go to the target URL
   - Wait for page load with `puppeteer_wait_for_selector` if needed
   - Take a screenshot with `puppeteer_screenshot` to verify the page loaded correctly

2. **BEFORE interacting with elements:**
   - Use `puppeteer_wait_for_selector` to ensure elements are present
   - Take screenshots to verify the current state
   - Use `puppeteer_get_page_content` to understand page structure if needed

3. **AFTER making changes:**
   - Take screenshots to verify the results
   - Use `puppeteer_get_page_content` to check updated content
   - Wait for any dynamic content with `puppeteer_wait_for_selector`

## Available Tools

- `puppeteer_navigate(url, launchOptions, allowDangerous)` - Navigate to URLs
- `puppeteer_screenshot(name, selector, width, height, encoded)` - Take screenshots
- `puppeteer_click(selector)` - Click elements
- `puppeteer_fill(selector, value)` - Fill form fields
- `puppeteer_select(selector, value)` - Select dropdown options
- `puppeteer_hover(selector)` - Hover over elements
- `puppeteer_evaluate(script)` - Execute JavaScript
- `puppeteer_wait_for_selector(selector, timeout)` - Wait for elements
- `puppeteer_get_page_content(selector)` - Get HTML content

## Strategy

Use PUPPETEER SERVER for web automation, testing, and data extraction. Always verify actions with screenshots and wait for elements before interacting.
```

## 🧠 Essential Workflow for AI Agents

### 🔄 ALWAYS Start Browser Sessions With This

```
1. puppeteer_navigate(url) → Navigate to target page
2. puppeteer_screenshot("initial_load") → Verify page loaded
3. puppeteer_wait_for_selector("main content selector") → Wait for key elements
```

### 🔍 Smart Interaction Strategies

**Always wait before interacting:**
- ✅ `puppeteer_wait_for_selector` before clicking
- ✅ Take screenshots to verify state
- ❌ Click immediately without waiting

**Use descriptive screenshot names:**
- ✅ "login_form", "after_submit", "error_state"
- ❌ "screenshot1", "img", "capture"

**Verify actions with screenshots:**
- ✅ Screenshot before and after important actions
- ✅ Check for error messages or success indicators
- ❌ Assume actions worked without verification

### ⚡ Complete Browser Automation Workflow

```mermaid
graph TD
    A[Start Session] --> B[puppeteer_navigate]
    B --> C[puppeteer_screenshot initial]
    C --> D[puppeteer_wait_for_selector]
    D --> E{Element found?}
    E -->|Yes| F[Perform action]
    E -->|No| G[Wait longer or check selector]
    F --> H[puppeteer_screenshot result]
    H --> I[Verify success]
    I --> J{More actions?}
    J -->|Yes| D
    J -->|No| K[Final screenshot]
```

## 🎯 Advanced Usage Patterns

### Web Page Analysis

```
1. puppeteer_navigate(url) → Go to target page
2. puppeteer_screenshot("page_overview") → Get visual overview
3. puppeteer_get_page_content() → Get HTML structure
4. puppeteer_evaluate("document.title") → Get page title
5. puppeteer_evaluate("window.location.href") → Verify current URL
```

### Form Automation

```
1. puppeteer_wait_for_selector("form") → Wait for form
2. puppeteer_screenshot("form_initial") → Capture initial state
3. puppeteer_fill("input[name='username']", "user") → Fill username
4. puppeteer_fill("input[name='password']", "pass") → Fill password
5. puppeteer_screenshot("form_filled") → Verify data entered
6. puppeteer_click("button[type='submit']") → Submit form
7. puppeteer_screenshot("form_submitted") → Verify submission
```

### Dynamic Content Handling

```
1. puppeteer_navigate(url) → Navigate to page
2. puppeteer_wait_for_selector(".loading", {timeout: 5000}) → Wait for loader
3. puppeteer_wait_for_selector(".content:not(.loading)") → Wait for content
4. puppeteer_screenshot("content_loaded") → Verify content appeared
5. puppeteer_get_page_content(".content") → Extract content
```

## 🔧 Available MCP Tools Reference

### `puppeteer_navigate(url, launchOptions, allowDangerous)`

**Purpose**: Navigate to a specific URL

- `url`: Target URL to visit
- `launchOptions`: Optional Puppeteer launch configuration
- `allowDangerous`: Allow potentially unsafe browser options
- **Returns**: Success confirmation with URL

### `puppeteer_screenshot(name, selector, width, height, encoded)`

**Purpose**: Capture screenshots of pages or elements

- `name`: Identifier for the screenshot
- `selector`: Optional CSS selector for specific element
- `width`: Screenshot width in pixels (default: 800)
- `height`: Screenshot height in pixels (default: 600)
- `encoded`: Return as base64 data URI (default: false)
- **Returns**: Screenshot image and metadata

### `puppeteer_click(selector)`

**Purpose**: Click on page elements

- `selector`: CSS selector of the element to click
- **Returns**: Confirmation of click action

### `puppeteer_fill(selector, value)`

**Purpose**: Fill form fields with text

- `selector`: CSS selector of the input field
- `value`: Text to enter in the field
- **Returns**: Confirmation of text input

### `puppeteer_select(selector, value)`

**Purpose**: Select options from dropdown menus

- `selector`: CSS selector of the select element
- `value`: Value to select from the dropdown
- **Returns**: Confirmation of selection

### `puppeteer_hover(selector)`

**Purpose**: Hover mouse over elements

- `selector`: CSS selector of the element to hover over
- **Returns**: Confirmation of hover action

### `puppeteer_evaluate(script)`

**Purpose**: Execute JavaScript in the browser context

- `script`: JavaScript code to execute
- **Returns**: Result of the JavaScript execution

### `puppeteer_wait_for_selector(selector, timeout)`

**Purpose**: Wait for elements to appear on the page

- `selector`: CSS selector of the element to wait for
- `timeout`: Maximum wait time in milliseconds (default: 30000)
- **Returns**: Confirmation when element appears

### `puppeteer_get_page_content(selector)`

**Purpose**: Extract HTML content from the page

- `selector`: Optional CSS selector for specific content
- **Returns**: HTML content as text

## 📊 Interpreting Results

### Screenshot Quality

- **File size < 100KB**: Simple page, likely loaded correctly
- **File size > 500KB**: Complex page with images, verify loading
- **Very small file**: Possible loading error or blank page

### Navigation Success Indicators

```javascript
// Check if page loaded successfully
puppeteer_evaluate(`
  ({
    title: document.title,
    url: window.location.href,
    readyState: document.readyState,
    hasContent: document.body.children.length > 0
  })
`)
```

### Form Interaction Verification

```javascript
// Verify form submission
puppeteer_evaluate(`
  ({
    currentUrl: window.location.href,
    hasErrorMessages: document.querySelectorAll('.error, .alert-error').length > 0,
    hasSuccessMessages: document.querySelectorAll('.success, .alert-success').length > 0
  })
`)
```

## 🎯 Sample Prompts for Common Tasks

### Web Scraping

```
🔍 "Navigate to the target website"
→ puppeteer_navigate("https://example.com")

🔍 "Take a screenshot to see the page layout"
→ puppeteer_screenshot("page_layout")

🔍 "Extract the main content"
→ puppeteer_get_page_content("main, .content, article")

🔍 "Get specific data with JavaScript"
→ puppeteer_evaluate("Array.from(document.querySelectorAll('h2')).map(h => h.textContent)")
```

### Testing Workflows

```
🔍 "Test login functionality"
→ puppeteer_navigate("https://app.example.com/login")
→ puppeteer_fill("#username", "testuser")
→ puppeteer_fill("#password", "testpass")
→ puppeteer_click("button[type='submit']")
→ puppeteer_screenshot("after_login")

🔍 "Verify error handling"
→ puppeteer_fill("#email", "invalid-email")
→ puppeteer_click("#submit")
→ puppeteer_screenshot("validation_errors")
→ puppeteer_get_page_content(".error-messages")
```

### Monitoring and Analysis

```
🔍 "Check if website is responsive"
→ puppeteer_screenshot("desktop_view", null, 1920, 1080)
→ puppeteer_screenshot("mobile_view", null, 375, 667)

🔍 "Monitor page performance"
→ puppeteer_evaluate("performance.timing.loadEventEnd - performance.timing.navigationStart")

🔍 "Check for JavaScript errors"
→ puppeteer_evaluate("window.console.errors || []")
```

## 🚨 Critical Reminders

### DO THIS ALWAYS:

- ✅ **Wait for elements** before interacting with them
- ✅ **Take screenshots** to verify page states
- ✅ **Use descriptive names** for screenshots
- ✅ **Handle timeouts** gracefully with appropriate wait times

### NEVER DO THIS:

- ❌ **Click immediately** without waiting for page load
- ❌ **Skip screenshots** for important state changes
- ❌ **Use generic selectors** like "div" or "span" 
- ❌ **Ignore error states** or failed operations

## 🎉 Success Stories

**Before PUPPETEER SERVER**: "I need to manually check this website"
**With PUPPETEER SERVER**: "Let me automate the entire workflow → Navigate, screenshot, interact, verify"

**Before PUPPETEER SERVER**: "Is this form working correctly?"
**With PUPPETEER SERVER**: "Fill form → Take screenshot → Submit → Verify result → All automated"

**Before PUPPETEER SERVER**: "I can't see what's happening on the page"
**With PUPPETEER SERVER**: "Screenshot every step → Visual confirmation of each action"

## 🔗 Additional Resources

- **Human-readable docs**: [README.md](README.md)
- **Spanish docs**: [README_es.md](README_es.md)
- **Configuration examples**: [examples/](examples/)
- **Project repository**: https://github.com/tecnomanu/puppeteer-server

## 🚨 Troubleshooting for AI Agents

### If PUPPETEER SERVER tools are not available:

1. **Check MCP configuration**: Ensure your human configured the MCP server correctly
2. **Verify installation**: Ask them to run `npx puppeteer-server --version`
3. **Check browser**: Ensure Chrome/Chromium is installed
4. **Check permissions**: Verify the server has necessary permissions

### If browser automation fails:

1. **Check selectors**: Use `puppeteer_get_page_content` to verify element existence
2. **Increase timeouts**: Some pages need more time to load
3. **Take screenshots**: Visual debugging is crucial for web automation
4. **Check console**: Use `puppeteer_evaluate` to check for JavaScript errors

### If screenshots are blank:

1. **Wait longer**: Page might still be loading
2. **Check viewport**: Ensure proper dimensions are set
3. **Verify navigation**: Confirm the page actually loaded
4. **Check selectors**: Element might not exist or be hidden

---

🤖 **Remember**: PUPPETEER SERVER is your web automation companion. Use it to interact with any website, verify actions with screenshots, and automate complex workflows. It's like having a real browser that you can control programmatically!

