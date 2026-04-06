import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Builds a Stage 2 handoff zip bundle containing:
 * - PRD_v1.0.md
 * - rian_theme_reference.html
 * - stage2_prompt.txt
 */
export async function buildStage2Zip({ prdText, featureName, stage2Prompt }) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    const chunks = [];

    // Collect zip data in memory
    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', (err) => reject(err));

    // Add PRD as markdown file
    archive.append(prdText, { name: 'PRD_v1.0.md' });

    // Add stage2 prompt as text file
    archive.append(stage2Prompt, { name: 'stage2_prompt.txt' });

    // Add rian_theme_reference.html from assets folder
    const themeReferencePath = path.join(__dirname, '..', 'assets', 'rian_theme_reference.html');

    if (fs.existsSync(themeReferencePath)) {
      archive.file(themeReferencePath, { name: 'rian_theme_reference.html' });
    } else {
      // If file doesn't exist, add a placeholder
      archive.append(
        '<!-- ERROR: rian_theme_reference.html not found. Please add this file to /server/assets/ -->',
        { name: 'rian_theme_reference.html' }
      );
    }

    // Finalize the archive
    archive.finalize();
  });
}
