# Code Contribution Guidelines

## Project Structure

 - All code should be in the `src/` directory, with the exception of index.js.
 - All utility function module files should be in the `src/utils/` directory.

### GUI

All files served by the gui should be in the `gui/` directory, with the execption of scripts share with the cli, custom endpoints, and node_modules like essential.css (which should have custom endpoints).

## Coding Style Guidelines

### Code Organization
Use multi-line comments to separate code into logical sections. Group related functionality together.
  - Example: In Lit components, group lifecycle callbacks, event handlers, public methods, utility functions, and rendering logic separately.

### Avoid single-use variables/functions
Avoid defining a variable or function to only use it once, inline the logic where needed. Some exceptions include:
  - recusion
  - scope encapsulation (IIFE)
  - context changes

### Minimal Comments
Use minimal comments. Assume readers understand the language. Some exceptions include:
  - complex logic
  - Anti-patterns
  - code organization

### Prefer Arrow Functions
Prefer the use of arrow functions when possible, especially for class methods to avoid binding. Use normal functions if needed for preserving the proper context.
 - For very basic logic use implicit returns
- If there is a single parameter, omit the parentheses.
```javascript
const addOne = n => n+1
```

### Module Exports
  - If a module has only one export, use the "defaut" export, not a named export.
		- Do not declair the default export as a const or give it a name, just export the value.
		
```javascript
export default (n) => n + 1;
```
  - If a module has multiple exports, use named exports and do not use a "default" export.

### Code Reuse
Create utility functions for shared logic.
  - If the shared logic is used in a single file, define a utility function in that file.
  - If the shared logic is used in multiple files, create a utility function module file in `src/utils/`