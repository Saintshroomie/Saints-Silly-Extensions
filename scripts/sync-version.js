/**
 * Mirror the version from package.json into manifest.json.
 *
 * SillyTavern reads the extension version from manifest.json, but `npm version`
 * only bumps package.json. This runs as the npm `version` lifecycle script so a
 * single `npm version patch|minor|major` keeps both files in lockstep. Uses a
 * targeted replace (not a full re-serialize) to keep the manifest diff minimal.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const { version } = require(path.join(root, 'package.json'));
const manifestPath = path.join(root, 'manifest.json');

const original = fs.readFileSync(manifestPath, 'utf8');
const updated = original.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${version}"`);

if (updated === original) {
    console.log(`manifest.json already at version ${version}`);
} else {
    fs.writeFileSync(manifestPath, updated);
    console.log(`Synced manifest.json version -> ${version}`);
}
