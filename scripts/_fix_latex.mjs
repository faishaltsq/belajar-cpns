import { readFileSync, writeFileSync } from 'node:fs';
// Hand-written replacements for the 8 explanations whose LaTeX copy was
// concatenated onto the plain one. Every figure below is taken from the intact
// LaTeX fragment itself — nothing is invented, and totals the question did not
// ask for are left out.
const FIXES = {
  'tryout-10.json': { 7: 'Misalkan harga 1 buah pulpen adalah x rupiah. Karena pensil Rp2.000 lebih mahal dari pulpen, harga 1 buah pensil adalah x + 2.000 rupiah.' },
  'tryout-11.json': { 21: 'Total harga jeruk = 40 × 10.000 = 400.000 rupiah. Total harga apel = 60 × 8.000 = 480.000 rupiah.' },
  'tryout-12.json': { 2: 'Total harga beras A = 40 × 15.000 = 600.000 rupiah. Total harga beras B = 60 × 12.000 = 720.000 rupiah.' },
  'tryout-14.json': { 19: 'Jumlah siswa yang lulus = 0,6 × 120 + 0,4 × 80 = 72 + 32 = 104 siswa.' },
  'tryout-8.json': { 18: 'Jumlah siswa kelas 7 = 0,3 × 400 = 120 siswa, jumlah siswa kelas 8 = 0,25 × 400 = 100 siswa.', 90: 'Jumlah karyawan perempuan = 30% dari 80 = 0,3 × 80 = 24 orang.' },
  'tryout-9.json': { 13: 'Total harga wortel = 30 × 8.000 = 240.000 rupiah. Total harga kubis = 20 × 5.000 = 100.000 rupiah.', 19: 'Harga beli per lembar kain = 6.000.000 ÷ 400 = 15.000 rupiah.' },
};
let n = 0;
for (const [file, items] of Object.entries(FIXES)) {
  const path = `src/data/packages/${file}`;
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  for (const [k, text] of Object.entries(items)) {
    if (!pkg[k]) throw new Error(`missing ${file}#${k}`);
    pkg[k].explanation = text;
    n += 1;
  }
  writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}
console.log('rewritten', n);
