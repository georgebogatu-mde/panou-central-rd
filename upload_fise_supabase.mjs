/**
 * Upload fise tehnice (PDF + DOCX) in Supabase Storage (bucket "fise", public)
 * + upload selector "Selector_MDE.html" in bucket "portal".
 *
 * RULARE (in folderul proiectului):
 *   1. npm init -y
 *   2. npm install @supabase/supabase-js
 *   3. Pune cheile (vezi GHID_INTEGRARE_SELECTOR.md):
 *        Windows PowerShell:
 *          $env:SUPABASE_URL="https://kdogtxfrnbclvgqkrnbk.supabase.co"
 *          $env:SUPABASE_SERVICE_KEY="<service_role_key>"
 *   4. node upload_fise_supabase.mjs
 *
 * Se poate rula de mai multe ori (foloseste upsert - suprascrie ce exista).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Lipsesc variabilele SUPABASE_URL si SUPABASE_SERVICE_KEY. Vezi instructiunile din ghid.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const FISE_BUCKET   = 'fise';
const PORTAL_BUCKET = 'portal';
const SELECTOR_DIR  = join(__dirname, 'material_selector_mde');
const FISE_ROOT     = join(SELECTOR_DIR, 'fise_tehnice');

const CONTENT_TYPE = {
  '.pdf':  'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function ext(name){ const i = name.lastIndexOf('.'); return i < 0 ? '' : name.slice(i).toLowerCase(); }

// Supabase respinge unele caractere in cheia obiectului (ex. µ / μ "micro").
// Inlocuim cu echivalent ASCII. ACEEASI transformare e aplicata in selector (linkHref).
function sanitizeKey(key){ return key.replace(/[µμ]/g, 'u'); }

// Sare peste gunoaie: .tmp, fisiere de blocare LibreOffice/Word (.~lock..#, ~$..),
// dotfiles si nume cu caractere invalide pentru Supabase (#)
function skip(name){
  const n = name.toLowerCase();
  if (n.endsWith('.tmp')) return true;
  if (name.startsWith('.~lock') || name.startsWith('~$')) return true;
  if (name.startsWith('.')) return true;       // dotfiles (.DS_Store etc.)
  if (name.includes('#')) return true;         // cheie invalida in Storage
  return false;
}

// Strange recursiv toate fisierele valide
function listFiles(dir, base){
  let out = [];
  for (const name of readdirSync(dir)){
    const full = join(dir, name);
    const rel  = base ? base + '/' + name : name;
    if (statSync(full).isDirectory()) out = out.concat(listFiles(full, rel));
    else if (!skip(name)) out.push({ full, rel });
  }
  return out;
}

async function ensureBucket(name, isPublic){
  const { data } = await sb.storage.listBuckets();
  const exists = (data || []).some(b => b.name === name);
  if (!exists){
    const { error } = await sb.storage.createBucket(name, { public: isPublic });
    if (error) { console.error(`Eroare creare bucket "${name}":`, error.message); process.exit(1); }
    console.log(`Bucket "${name}" creat (${isPublic ? 'public' : 'privat'}).`);
  } else {
    await sb.storage.updateBucket(name, { public: isPublic });
    console.log(`Bucket "${name}" exista deja (${isPublic ? 'public' : 'privat'}).`);
  }
}

async function uploadOne(bucket, key, fullPath, contentType){
  const body = readFileSync(fullPath);
  const { error } = await sb.storage.from(bucket).upload(key, body, {
    upsert: true,
    contentType: contentType || 'application/octet-stream',
  });
  return error;
}

async function run(){
  await ensureBucket(FISE_BUCKET, true);    // public  - fise tehnice
  await ensureBucket(PORTAL_BUCKET, false); // privat  - programele hub-ului

  // 1) Fise tehnice -> bucket "fise", cheia pastreaza structura "fise_tehnice/..."
  const files = listFiles(FISE_ROOT, 'fise_tehnice');
  console.log(`Se incarca ${files.length} fise tehnice valide...`);

  let ok = 0, fail = 0;
  const CONC = 8;
  for (let i = 0; i < files.length; i += CONC){
    const batch = files.slice(i, i + CONC);
    const results = await Promise.all(batch.map(f =>
      uploadOne(FISE_BUCKET, sanitizeKey(f.rel), f.full, CONTENT_TYPE[ext(f.rel)])
    ));
    results.forEach((err, j) => {
      if (err){ fail++; console.error('  EROARE:', batch[j].rel, '-', err.message); }
      else ok++;
    });
    process.stdout.write(`\r  Progres: ${ok + fail}/${files.length} (ok ${ok}, erori ${fail})   `);
  }
  console.log('\nFise tehnice incarcate.');

  // 2) Selectorul -> bucket "portal" ca "Selector_MDE.html"
  const selectorPath = join(SELECTOR_DIR, 'index.html');
  const errSel = await uploadOne(PORTAL_BUCKET, 'Selector_MDE.html', selectorPath, 'text/html; charset=utf-8');
  if (errSel) console.error('EROARE upload Selector_MDE.html:', errSel.message);
  else console.log('Selector_MDE.html incarcat in bucket "portal".');

  // 3) Hub-ul actualizat -> bucket "portal" ca "index.html"
  const hubPath = join(__dirname, 'index.html');
  const errHub = await uploadOne(PORTAL_BUCKET, 'index.html', hubPath, 'text/html; charset=utf-8');
  if (errHub) console.error('EROARE upload index.html (hub):', errHub.message);
  else console.log('index.html (hub actualizat) incarcat in bucket "portal".');

  console.log(`\nGATA. Fise: ${ok} ok, ${fail} erori.`);
}

run().catch(e => { console.error(e); process.exit(1); });
