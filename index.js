#!/usr/bin/env node

// Map of short flags to their full names
const shortFlagMap = {
    'b': 'browser',
    'n': 'node',
    's': 'silent',
    'q': 'quiet',
    'v': 'verbose',
    'd': 'debug',
    'p': 'port',
    'g': 'gui'
};

const args = process.argv.slice(2);

const flags = {};
const remainingArgs = [];

for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    let flagName = null;
    
    if (arg.startsWith('--')) {
        flagName = arg.slice(2);
    } else if (arg.startsWith('-')) {
        const shortFlag = arg.slice(1);
        flagName = shortFlagMap[shortFlag] || shortFlag;
    } else {
        remainingArgs.push(arg);
        continue;
    }
    
    // Check if the next argument exists and is not a flag
    if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[flagName] = args[i + 1];
        i++; // Skip the next argument as it's used as a value
    } else {
        flags[flagName] = true;
    }
}

if (flags.gui) {
    const { default: gui } = await import('./src/gui.js');
    await gui(flags, remainingArgs);
} else {
    const { default: cli } = await import('./cli.js');
    await cli(flags, remainingArgs);
}
