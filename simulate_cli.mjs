import fs from 'fs';
import path from 'path';
function createLocalStorage() {
    const store = new Map();
    return {
        getItem: (key) => store.has(key) ? store.get(key) : null,
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: (key) => store.delete(key),
        clear: () => store.clear()
    };
}

function parseArgs(argv) {
    const args = {
        runs: 500,
        seed: 12345,
        campDrawMode: 'always',
        logLimit: 50,
        output: 'simulation-result.json'
    };
    for (let i = 0; i < argv.length; i++) {
        const key = argv[i];
        const value = argv[i + 1];
        if (!key.startsWith('--')) continue;
        const name = key.slice(2);
        if (name === 'runs') args.runs = Number(value);
        if (name === 'seed') args.seed = Number(value);
        if (name === 'campDrawMode') args.campDrawMode = value;
        if (name === 'logLimit') args.logLimit = Number(value);
        if (name === 'output') args.output = value;
        i++;
    }
    return args;
}

async function main() {
    if (!globalThis.localStorage) {
        globalThis.localStorage = createLocalStorage();
    }
    const args = parseArgs(process.argv.slice(2));
    const { runSimulation } = await import('./js/simulator.js');
    const stats = await runSimulation({
        runs: args.runs,
        seed: args.seed,
        campDrawMode: args.campDrawMode,
        logLimit: args.logLimit
    });
    const outputPath = path.resolve(process.cwd(), args.output);
    fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2), 'utf-8');
    process.stdout.write(`saved:${outputPath}\n`);
}

main();
