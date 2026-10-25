const { chromium } = require('playwright');
const fs = require('fs');

const quizUrl = process.argv[2];
const outputPath = process.argv[3] || 'diagnostc-test.csv';

if (!quizUrl) {
  console.error('Usage: node open.js <review-url> <output-csv>');
  process.exit(1);
}

function csvCell(value) {
  return `"${String(value || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}

(async () => {
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    args: ['--no-first-run', '--no-default-browser-check']
  });

  const page = await browser.newPage();
  await page.goto(quizUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  console.log('URL:', page.url());
  console.log('TITLE:', await page.title());
  console.log((await page.locator('body').innerText()).slice(0, 4000));
  if (page.url().includes('/login/')) {
    console.log('Login pada jendela Brave, lalu buka URL quiz yang diberikan.');
    await page.waitForURL('**/mod/quiz/review.php**', { timeout: 300000 });
  }

  await page.waitForLoadState('domcontentloaded');
  const rows = await page.locator('.que').evaluateAll((questions) => questions.map((question, index) => {
    const text = (question.innerText || '').replace(/\s+/g, ' ').trim();
    const number = question.querySelector('.qno')?.innerText?.trim() || String(index + 1);
    const state = [...question.classList].filter((name) => ['correct', 'incorrect', 'partiallycorrect', 'notanswered', 'answersaved'].includes(name)).join(', ');
    return { number, state, text };
  }));

  if (rows.length === 0) {
    throw new Error('Tidak menemukan blok soal Moodle (.que) pada halaman review.');
  }

  const csv = [
    ['Nomor', 'Status', 'Isi soal dan jawaban'].map(csvCell).join(','),
    ...rows.map((row) => [row.number, row.state, row.text].map(csvCell).join(','))
  ].join('\r\n');
  fs.writeFileSync(outputPath, `\ufeff${csv}`, 'utf8');
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
