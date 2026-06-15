# Ghid: integrare Selector Materiale MDE în Panou Central R&D + urcare în Supabase

Acest ghid te duce de la zero până la „selectorul funcționează online, partajat între utilizatori".

## Ce am modificat deja (nu trebuie să faci nimic la cod)

1. **`material_selector_mde/index.html`** — selectorul a fost adaptat să lucreze cu Supabase:
   - Datele din tab-urile **Combinații / Spume / Adezivi** se salvează acum în baza de date Supabase (tabelul `shared_data`, cheia `mde_selector_v1`), nu în fișier. Toți utilizatorii văd aceeași bază, iar modificările se **sincronizează în timp real**.
   - Butonul verde a devenit **„Salvează în cloud"**.
   - Linkurile către cele 354 fișe tehnice (PDF/DOCX) pointează acum către Supabase Storage (bucket `fise`).
   - Am adăugat butonul **„Panou Central"** (revenire la hub).
2. **`index.html`** (hub-ul) — am adăugat programul nou în listă, cu id-ul **`Selector_MDE.html`**.
3. **`upload_fise_supabase.mjs`** — script care urcă automat fișele și selectorul în Supabase.

> Programul vechi `Selector.html` a rămas neatins. După ce verifici că noul selector merge, poți ascunde vechiul program din panoul de Admin al hub-ului.

---

## Pasul 1 — Verifică tabelele în Supabase (probabil deja făcut)

Selectorul folosește tabelul `shared_data`, care există deja (îl folosește și „Evidența Ștanțe Rotary"). Dacă din vreun motiv nu l-ai creat, deschide Supabase → **SQL Editor** → New query, lipește conținutul din `supabase_setup.sql` și apasă **RUN**. Nu e nevoie de SQL nou pentru selector.

## Pasul 2 — Ia cheia `service_role`

Aceasta e necesară o singură dată, pentru a urca fișierele.

1. Supabase → **Project Settings** (rotița) → **API**.
2. La secțiunea **Project API keys**, copiază cheia **`service_role`** (cea marcată „secret").

⚠️ **Cheia `service_role` e secretă.** Nu o pune pe GitHub și nu o trimite nimănui. O folosești doar local, în terminal, pentru upload.

## Pasul 3 — Instalează Node.js (dacă nu îl ai)

Descarcă de pe <https://nodejs.org> (versiunea LTS) și instalează. Verifică în terminal:

```
node --version
```

## Pasul 4 — Rulează scriptul de upload

Deschide un terminal (PowerShell) **în folderul proiectului** (`...\Projects\Online`) și rulează pe rând:

```powershell
npm init -y
npm install @supabase/supabase-js

$env:SUPABASE_URL="https://kdogtxfrnbclvgqkrnbk.supabase.co"
$env:SUPABASE_SERVICE_KEY="LIPESTE_AICI_CHEIA_SERVICE_ROLE"

node upload_fise_supabase.mjs
```

Scriptul:
- creează bucket-ul **`fise`** (public) dacă nu există;
- urcă cele ~1.040 fișe (PDF + DOCX), ignorând fișierele `.tmp`;
- urcă selectorul ca **`Selector_MDE.html`** în bucket-ul `portal`;
- urcă hub-ul actualizat (`index.html`) în bucket-ul `portal`.

Durează câteva minute (≈109 MB). Poți rula scriptul de câte ori vrei — suprascrie ce există.

## Pasul 5 — Dă acces utilizatorilor la programul nou

În hub, intră ca **admin** → panoul de **Administrare**:
- la fiecare utilizator, bifează **„Selector Materiale MDE"** ca să-l vadă în panoul lui.
  (Utilizatorii noi pe care îi adaugi primesc automat toate programele.)

## Pasul 6 — Verifică online

1. Deschide hub-ul online (URL-ul `index.html` din bucket `portal`) și autentifică-te.
2. Deschide **„Selector Materiale MDE"**.
3. Testează: deschide o fișă PDF și una DOCX (trebuie să se deschidă din Supabase).
4. Adaugă o combinație nouă, apasă **„Salvează în cloud"**. Deschide pe alt calculator/cont — trebuie să apară modificarea (sincronizare live).

---

## Despre GitHub (obiectivul tău inițial)

Acum responsabilitățile sunt împărțite curat:
- **GitHub** = codul (fișierele `.html` și scripturile). Aici lucrați în echipă pe programe.
- **Supabase** = datele (bazele Combinații/Spume/Adezivi, ștanțe, oferte) + fișele tehnice (PDF/DOCX).

Recomandare pentru repository: **nu urca cele 109 MB de fișe în Git** (sunt deja în Supabase). Adaugă în `.gitignore`:

```
material_selector_mde/fise_tehnice/
```

Astfel Git rămâne ușor, iar fișele sunt servite din Supabase Storage.

---

## Observații / limite

- **Bucket `fise` este public** (oricine are linkul direct poate deschide fișa). Pentru fișe tehnice e de obicei acceptabil. Dacă vrei acces strict doar pentru utilizatorii autentificați, se poate trece pe URL-uri semnate, dar e mai complicat pentru 1.000+ fișiere — spune-mi dacă vrei varianta asta.
- Deschiderea locală a `material_selector_mde/index.html` (dublu-click) va avea nevoie de internet pentru fișe și pentru salvare în cloud (linkurile pointează către Supabase).
- Cele 334 fișiere `.tmp` din `fise_tehnice/pdf` sunt gunoi (deja ignorate de script și de `.gitignore`). Le poți șterge oricând.
