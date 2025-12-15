import { googleSheetsService } from '../src/services/googleSheets.js';

async function verify() {
    await googleSheetsService.connect();
    const rows = await googleSheetsService.readSheet('Config_Prompts');
    console.log('--- CONTENT OF Config_Prompts ---');
    console.log(JSON.stringify(rows, null, 2));
    console.log('--- END ---');
}

verify();
