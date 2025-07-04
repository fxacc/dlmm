# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Puppeteer MCP (Model Context Protocol) server that provides browser automation capabilities. The server allows MCP clients to control browser instances through tools like navigation, screenshot capture, element interaction, and JavaScript execution.

## Development Commands

- `npm install` - Install dependencies
- `npm start` - Start the MCP server
- `npm run dev` - Start in development mode with auto-reload
- `npm test` - Run tests

## Architecture

### Core Components

- **src/index.js** - Main MCP server implementation with PuppeteerMCPServer class
- **package.json** - Node.js package configuration with MCP SDK and Puppeteer dependencies

### MCP Tool Structure

The server implements 9 core tools:
1. Browser lifecycle (launch, close)
2. Navigation (navigate, wait_for_selector)
3. Interaction (click, type)
4. Content extraction (get_content, screenshot)
5. JavaScript execution (evaluate)

### Key Patterns

- Each tool handler validates browser state before execution
- Error handling returns structured MCP responses
- Browser instance is shared across tool calls within a session
- Cleanup handlers ensure proper browser closure

## Implementation Notes

- Uses ES modules (`"type": "module"`)
- Implements stdio transport for MCP communication
- Puppeteer runs in headless mode by default
- Screenshots can be saved to file or returned as base64
- JavaScript evaluation returns serialized results

## Security Considerations

- Server allows arbitrary JavaScript execution in browser context
- Intended for trusted environments only
- Consider sandboxing for production deployments