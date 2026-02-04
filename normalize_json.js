const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'config/settings_data.json');
const schemaPath = path.join(__dirname, 'config/settings_schema.json');

try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log('Normalized settings_data.json');

    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    console.log('Normalized settings_schema.json');
} catch (e) {
    console.error('Error normalizing JSON:', e);
}
