# Kempo Testing Framework

The Kempo Testing Framework is a simple testing framework built on these principles:

- **Test in the right environment:** Code should be tested in the environment it is written for. Code intended to be ran in the browser is tested in the browser; code intended to be ran in Node is tested in Node. And code intended to be ran in either should be tested in both.
- **No mocks, no shims:** Test the real thing, not a simulation.
- **Simplicity:** No custom syntax, no magic. Just JavaScript functions and three helpers: `log`, `pass`, and `fail`.
- **Zero learning curve:** If you know JavaScript, you know how to write tests.

It can be run from a web GUI or from the command line.

This was originally built to test Kempo, but there is nothing Kempo specific about it, it could be used for any JavaScript project.

## Requirements

- Node.js version 14.8.0 or higher is required (for ES modules and top-level await support).
- Modern browsers for running browser tests.

If you are using an older version of Node.js, please upgrade to a supported version to use Kempo Testing Framework.

## Setup

Install `kempo-testing-framework` as a dependency in your project:

```bash
npm install kempo-testing-framework --save-dev
```

Copy these scripts into your project's `package.json`.  

```json
{
  "scripts": {
    "test": "node kempo-testing-framework",
    "test:gui": "node kempo-testing-framework --gui"
  }
}
```

## Test File Naming

Kempo supports three types of test files:

- `[name].browser-test.js` — runs only in the browser
- `[name].node-test.js` — runs only in Node
- `[name].test.js` — runs in both environments

If your code can run in both Node and the browser, you can write a single test file named `[name].test.js`.  
This file will be executed in both environments. If all three exist for the same `[name]`, each will be run in its respective environment.

## Running Tests

### CLI
Run all tests using the CLI (Command-Line-Interface)
```bash
npm run test
```

Run only the browser tests using the CLI
```bash
npm run test -- -b
```

Run only the node tests using the CLI
```bash
npm run test -- -n
```

### GUI (webpage)

Run all tests using the GUI 
```bash
npm run test:gui
```

Run only the browser tests using the GUI
```bash
npm run test:gui -- -b
```

Run only the node tests using the GUI
```bash
npm run test:gui -- -n
```

## Running Specific or Filtered Test Files

If you want to run only certain tests, you can provide a partial test name (substring) as the last argument after any flags. All test files whose names include the substring will be run. This works for both full and partial names, and matches anywhere in the filename (not just the start).

For example, if you have test files named `auth.browser-test.js`, `auth.node-test.js`, `user-auth.test.js`, and `payment.test.js`:

Run all tests with `auth` in the name (in both environments):
```bash
npm run test -- auth
```

Run only the browser tests with `auth` in the name:
```bash
npm run test -- -b auth
```

Run only the node tests with `auth` in the name:
```bash
npm run test -- -n auth
```

If you do not provide a test name or substring, all test files will be auto-discovered and run.

## Test Types

Kempo supports two types of tests that can coexist in the same test suite:

### Browser Tests
Tests that run directly in the browser environment. Best for:
- DOM manipulation
- Browser APIs
- UI components
- Client-side functionality

### Node Tests  
Tests that run on the server via API calls. Best for:
- Server-side logic
- File system operations
- Node-specific APIs
- Pure JavaScript functions

Each type of test (browser / node) should have its own test file, but both will run 

## Writing Tests

### Lifecycle Callbacks
Test files can export the following optional lifecycle functions:

- **`beforeAll`** - Runs once before all tests (setup)
- **`afterAll`** - Runs once after all tests (cleanup)  
- **`beforeEach`** - Runs before each individual test
- **`afterEach`** - Runs after each individual test

**Note:** All test functions and lifecycle callbacks can be `async` functions if you need to await asynchronous operations.

## Example Test File

`[name].test.js`, `[name].browser-test.js`, or `[name].node-test.js`... they all should look exactly the same.

```javascript
// Import the thing to test
import yourModule from '../../src/yourModule.js';

/* Export the optional lifecycle callbacks */
export const beforeAll = async (log) => {
  log('Setting up Node test environment...');
}

export const beforeEach = async (log) => {
  log('Setting up Node test for each test')
}

export const beforeEach = async (log) => {
  log('Cleaning up Node test for each test')
}

export const afterAll = async (log) => {
  log('Cleaning up Node test environment...');
}

/* Export the Tests */
export default {
  'should handle basic functionality': async ({pass, fail, log}) => {
    const expected = 'abc123';
    const result = yourModule.someFunction();
    if (result === expected) {
      log('✓ Basic functionality works');
      pass('Test passed successfully')
    } else {
      fail(`Expected ${expected}, got ${result}`);
    }
  },
  'should validate input parameters': async ({pass, fail, log}) => {
    try {
      yourModule.someFunction(null);
      fail('Should have thrown an error for null input');
    } catch (error) {
      log('✓ Properly validates input');
      pass('Input validation test passed');
    }
  }
};
```


## CLI Flags Reference

When running tests via the CLI, you can use various flags to control test execution and output. These flags only affect CLI execution and are ignored when using the GUI (`--gui` flag).

### Environment Flags

**`-b` or `--browser`**
- Runs only browser tests (`.browser-test.js` files and `.test.js` files in browser environment)
- Example: `npm run test -- -b`
- Example with filter: `npm run test -- -b auth`

**`-n` or `--node`**  
- Runs only Node tests (`.node-test.js` files and `.test.js` files in Node environment)
- Example: `npm run test -- -n`
- Example with filter: `npm run test -- -n user`

### Log Level Flags

Control the amount of console output during test execution:

**`--silent` or `-s`**
- No output except final summary
- Example: `npm run test -- --silent`

**`--quiet` or `-q`**
- Only test names and pass/fail status
- Example: `npm run test -- --quiet`

**Default (no flag)**
- Test names, status, and logs from failed tests
- This is the standard output level

**`--verbose` or `-v`**
- All test output including logs from passing tests
- Example: `npm run test -- --verbose`

**`--debug` or `-d`**
- Everything including framework internals
- Example: `npm run test -- --debug`

### Server Configuration Flags

**`-p` or `--port`**
- Specify the port for the browser test server (default: 3000)
- Port must be between 1 and 65535
- Example: `npm run test -- -b --port 8080`
- Example: `npm run test -- -p 3001`

**`--show-browser`**
- Show the browser window during browser tests (default: headless mode)
- Useful for debugging browser tests and seeing what's happening
- Example: `npm run test -- -b --show-browser`
- Example: `npm run test -- --show-browser --verbose`

### Combining Flags

You can combine multiple flags for precise control:

```bash
# Run only browser tests with verbose output for auth-related files
npm run test -- -b --verbose auth

# Run only node tests with quiet output for user-related files  
npm run test -- -n --quiet user

# Run all tests silently with a specific filter
npm run test -- --silent payment

# Run browser tests with visible browser window and custom port
npm run test -- -b --show-browser --port 8080
```

### Help

Get usage instructions and see all available options:
```bash
npm run test -- --help
```

