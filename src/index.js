#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import puppeteer from "puppeteer";

class PuppeteerMCPServer {
  constructor() {
    this.server = new Server({
      name: "puppeteer-mcp-server",
      version: "1.0.0",
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.browser = null;
    this.page = null;
    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "puppeteer_launch",
            description: "Launch a new browser instance",
            inputSchema: {
              type: "object",
              properties: {
                headless: {
                  type: "boolean",
                  description: "Whether to run browser in headless mode",
                  default: true,
                },
                viewport: {
                  type: "object",
                  properties: {
                    width: { type: "number", default: 1280 },
                    height: { type: "number", default: 720 },
                  },
                },
              },
            },
          },
          {
            name: "puppeteer_navigate",
            description: "Navigate to a URL",
            inputSchema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "The URL to navigate to",
                },
                waitUntil: {
                  type: "string",
                  description: "When to consider navigation complete",
                  enum: ["load", "domcontentloaded", "networkidle0", "networkidle2"],
                  default: "load",
                },
              },
              required: ["url"],
            },
          },
          {
            name: "puppeteer_screenshot",
            description: "Take a screenshot of the current page",
            inputSchema: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "Path to save the screenshot",
                },
                fullPage: {
                  type: "boolean",
                  description: "Whether to capture the full page",
                  default: false,
                },
                format: {
                  type: "string",
                  description: "Screenshot format",
                  enum: ["png", "jpeg", "webp"],
                  default: "png",
                },
              },
            },
          },
          {
            name: "puppeteer_click",
            description: "Click an element on the page",
            inputSchema: {
              type: "object",
              properties: {
                selector: {
                  type: "string",
                  description: "CSS selector for the element to click",
                },
                waitFor: {
                  type: "boolean",
                  description: "Whether to wait for the element to be visible",
                  default: true,
                },
              },
              required: ["selector"],
            },
          },
          {
            name: "puppeteer_type",
            description: "Type text into an input element",
            inputSchema: {
              type: "object",
              properties: {
                selector: {
                  type: "string",
                  description: "CSS selector for the input element",
                },
                text: {
                  type: "string",
                  description: "Text to type",
                },
                delay: {
                  type: "number",
                  description: "Delay between keystrokes in milliseconds",
                  default: 0,
                },
              },
              required: ["selector", "text"],
            },
          },
          {
            name: "puppeteer_evaluate",
            description: "Execute JavaScript in the browser context",
            inputSchema: {
              type: "object",
              properties: {
                script: {
                  type: "string",
                  description: "JavaScript code to execute",
                },
              },
              required: ["script"],
            },
          },
          {
            name: "puppeteer_wait_for_selector",
            description: "Wait for an element to appear on the page",
            inputSchema: {
              type: "object",
              properties: {
                selector: {
                  type: "string",
                  description: "CSS selector to wait for",
                },
                timeout: {
                  type: "number",
                  description: "Timeout in milliseconds",
                  default: 30000,
                },
                visible: {
                  type: "boolean",
                  description: "Whether to wait for element to be visible",
                  default: true,
                },
              },
              required: ["selector"],
            },
          },
          {
            name: "puppeteer_get_content",
            description: "Get the HTML content of the page",
            inputSchema: {
              type: "object",
              properties: {
                selector: {
                  type: "string",
                  description: "CSS selector to get content from (optional, defaults to full page)",
                },
              },
            },
          },
          {
            name: "puppeteer_close",
            description: "Close the browser instance",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "puppeteer_launch":
            return await this.handleLaunch(args);
          case "puppeteer_navigate":
            return await this.handleNavigate(args);
          case "puppeteer_screenshot":
            return await this.handleScreenshot(args);
          case "puppeteer_click":
            return await this.handleClick(args);
          case "puppeteer_type":
            return await this.handleType(args);
          case "puppeteer_evaluate":
            return await this.handleEvaluate(args);
          case "puppeteer_wait_for_selector":
            return await this.handleWaitForSelector(args);
          case "puppeteer_get_content":
            return await this.handleGetContent(args);
          case "puppeteer_close":
            return await this.handleClose(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async handleLaunch(args) {
    const { headless = true, viewport = { width: 1280, height: 720 } } = args;
    
    if (this.browser) {
      await this.browser.close();
    }

    this.browser = await puppeteer.launch({
      headless,
      defaultViewport: viewport,
    });

    this.page = await this.browser.newPage();

    return {
      content: [
        {
          type: "text",
          text: `Browser launched successfully in ${headless ? 'headless' : 'headed'} mode`,
        },
      ],
    };
  }

  async handleNavigate(args) {
    if (!this.page) {
      throw new Error("Browser not launched. Call puppeteer_launch first.");
    }

    const { url, waitUntil = "load" } = args;
    await this.page.goto(url, { waitUntil });

    return {
      content: [
        {
          type: "text",
          text: `Navigated to ${url}`,
        },
      ],
    };
  }

  async handleScreenshot(args) {
    if (!this.page) {
      throw new Error("Browser not launched. Call puppeteer_launch first.");
    }

    const { path, fullPage = false, format = "png" } = args;
    
    const screenshotOptions = {
      fullPage,
      type: format,
    };

    if (path) {
      screenshotOptions.path = path;
    }

    const screenshot = await this.page.screenshot(screenshotOptions);

    return {
      content: [
        {
          type: "text",
          text: path ? `Screenshot saved to ${path}` : "Screenshot captured",
        },
      ],
    };
  }

  async handleClick(args) {
    if (!this.page) {
      throw new Error("Browser not launched. Call puppeteer_launch first.");
    }

    const { selector, waitFor = true } = args;

    if (waitFor) {
      await this.page.waitForSelector(selector, { visible: true });
    }

    await this.page.click(selector);

    return {
      content: [
        {
          type: "text",
          text: `Clicked element: ${selector}`,
        },
      ],
    };
  }

  async handleType(args) {
    if (!this.page) {
      throw new Error("Browser not launched. Call puppeteer_launch first.");
    }

    const { selector, text, delay = 0 } = args;

    await this.page.waitForSelector(selector);
    await this.page.type(selector, text, { delay });

    return {
      content: [
        {
          type: "text",
          text: `Typed "${text}" into ${selector}`,
        },
      ],
    };
  }

  async handleEvaluate(args) {
    if (!this.page) {
      throw new Error("Browser not launched. Call puppeteer_launch first.");
    }

    const { script } = args;
    const result = await this.page.evaluate(script);

    return {
      content: [
        {
          type: "text",
          text: `Script result: ${JSON.stringify(result)}`,
        },
      ],
    };
  }

  async handleWaitForSelector(args) {
    if (!this.page) {
      throw new Error("Browser not launched. Call puppeteer_launch first.");
    }

    const { selector, timeout = 30000, visible = true } = args;

    await this.page.waitForSelector(selector, { visible, timeout });

    return {
      content: [
        {
          type: "text",
          text: `Element found: ${selector}`,
        },
      ],
    };
  }

  async handleGetContent(args) {
    if (!this.page) {
      throw new Error("Browser not launched. Call puppeteer_launch first.");
    }

    const { selector } = args;

    let content;
    if (selector) {
      content = await this.page.$eval(selector, el => el.outerHTML);
    } else {
      content = await this.page.content();
    }

    return {
      content: [
        {
          type: "text",
          text: content,
        },
      ],
    };
  }

  async handleClose(args) {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }

    return {
      content: [
        {
          type: "text",
          text: "Browser closed successfully",
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    process.on('SIGINT', async () => {
      await this.handleClose();
      process.exit(0);
    });
  }
}

const server = new PuppeteerMCPServer();
server.run().catch(console.error);