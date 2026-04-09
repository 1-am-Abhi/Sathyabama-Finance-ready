const fs = require('fs');
const modelPath = './src/models/FundRequest.js';
let content = fs.readFileSync(modelPath, 'utf8');

if (!content.includes('documents: {')) {
    content = content.replace(
    'amc: { type: DataTypes.FLOAT, defaultValue: 0 },',
    'amc: { type: DataTypes.FLOAT, defaultValue: 0 },\n    documents: { type: DataTypes.JSON, defaultValue: [] },'
    );
     // Also add BILLS_UPLOADED to stages
    content = content.replace(
        "    'FUND_RELEASED',",
        "    'FUND_RELEASED',\n    'BILLS_UPLOADED',"
    );
    fs.writeFileSync(modelPath, content);
    console.log("Patched FundRequest.js");
} else {
    console.log("Already patched");
}
