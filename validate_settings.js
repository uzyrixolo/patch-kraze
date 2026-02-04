const schema = require('./config/settings_schema.json');
const data = require('./config/settings_data.json');

const colorSection = schema.find(s => s.name === "t:names.colors" || s.name === "Colors");
if (!colorSection) {
    console.log("No Colors section found in schema");
    process.exit(1);
}

const colorSchemeGroup = colorSection.settings.find(s => s.type === "color_scheme_group");
if (!colorSchemeGroup) {
    console.log("No color_scheme_group found in Colors section");
    process.exit(1);
}

const definedKeys = colorSchemeGroup.definition.map(d => d.id).filter(id => id); // filtered headers

const schemes = data.current.color_schemes;
// Also check presets if useful, but current is critical
Object.entries(schemes).forEach(([schemeId, schemeData]) => {
    const dataKeys = Object.keys(schemeData.settings);

    // Check for missing keys
    const missing = definedKeys.filter(k => !dataKeys.includes(k));
    if (missing.length > 0) {
        console.log(`Scheme ${schemeId} is missing keys:`, missing);
    }

    // Check for extra keys
    const extra = dataKeys.filter(k => !definedKeys.includes(k));
    if (extra.length > 0) {
        console.log(`Scheme ${schemeId} has extra keys:`, extra);
    }
});

console.log("Consistency check complete.");

const presetName = schema[0].theme_name;
const presetSchemes = data.presets[presetName]?.color_schemes;

if (presetSchemes) {
    Object.entries(presetSchemes).forEach(([schemeId, schemeData]) => {
        const dataKeys = Object.keys(schemeData.settings);
        const missing = definedKeys.filter(k => !dataKeys.includes(k));
        if (missing.length > 0) console.log('Preset Scheme ' + schemeId + ' is missing keys:', missing);
        const extra = dataKeys.filter(k => !definedKeys.includes(k));
        if (extra.length > 0) console.log('Preset Scheme ' + schemeId + ' has extra keys:', extra);
    });
    console.log('Preset consistency check complete.');
} else {
    console.log('No presets found for ' + presetName);
}
