const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'IRC Faculty Details-26 April.xlsx');
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet);

console.log(JSON.stringify(data.slice(0, 2), null, 2));
