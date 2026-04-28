const xlsx = require('xlsx');

const workbook = xlsx.readFile('/Users/abhijeetkumar/Downloads/Sathyabama-Finance(Frontend)/IRC Faculty Details-26 April.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);

console.log(data.slice(0, 5));
