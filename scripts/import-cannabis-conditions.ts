import fs from 'node:fs';
import path from 'node:path';
import csvParser from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (or fallback VITE_SUPABASE_ANON_KEY).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

type CannabisConditionInsert = {
  condition: string;
  alternate_name: string | null;
  evidence_score: number;
  popular_interest: number | null;
  scholar_citations: number | null;
  cbd_effect: string | null;
  simple_notes: string | null;
  scientific_notes: string | null;
  study_link: string | null;
  source_name: string | null;
};

function toNullableText(value: unknown): string | null {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function toNullableInt(value: unknown): number | null {
  const digits = String(value ?? '').replace(/[^\d-]/g, '');
  if (!digits) return null;

  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCsv(): Promise<CannabisConditionInsert[]> {
  const rows: CannabisConditionInsert[] = [];
  const csvPath = path.resolve(__dirname, '../public/CanabisBenefits.csv');

  return new Promise((resolveRows, rejectRows) => {
    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on('data', (row) => {
        const condition = String(row['health condition'] ?? '').trim();
        if (!condition) return;

        const evidenceScore = toNullableInt(row['evidence score 0 = harmful \n1 = no / insufficient evidence\n6 = strong ']);
        if (evidenceScore === null) return;

        rows.push({
          condition,
          alternate_name: toNullableText(row['alternate name']),
          evidence_score: evidenceScore,
          popular_interest: toNullableInt(row['popular interest']),
          scholar_citations: toNullableInt(row['Number of citations on Google Scholar (2000-2017) search format: condition+cannabis']),
          cbd_effect: toNullableText(row['CBD']),
          simple_notes: toNullableText(row['simple English notes']),
          scientific_notes: toNullableText(row['notes']),
          study_link: toNullableText(row['link']),
          source_name: toNullableText(row['main study source name']),
        });
      })
      .on('end', () => resolveRows(rows))
      .on('error', (error) => rejectRows(error));
  });
}

async function importCannabisConditions() {
  const rows = await parseCsv();
  if (rows.length === 0) {
    console.log('⚠️ No rows parsed from CanabisBenefits.csv.');
    return;
  }

  const { data, error } = await supabase
    .from('cannabis_conditions')
    .upsert(rows, { onConflict: 'condition,alternate_name' })
    .select('id');

  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }

  console.log(`✅ Imported ${data?.length ?? rows.length} cannabis condition rows.`);
}

importCannabisConditions()
  .catch((error) => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });
