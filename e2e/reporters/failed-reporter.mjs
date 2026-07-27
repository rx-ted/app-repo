import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const e2eDir = path.resolve(dirname, '..');
const artifactsDir = path.resolve(e2eDir, '.artifacts');
const failedFile = path.join(artifactsDir, 'failed-tests.json');

export default class FailedReporter {
  onBegin() {
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
  }

  onTestEnd(test, result) {
    if (result.status !== 'passed') {
      const existing = this.#readExisting();
      const pathParts = typeof test.titlePath === 'function' ? test.titlePath() : test.titlePath;
      const testId = Array.isArray(pathParts) ? pathParts.join(' > ') : String(test.title);
      existing.push({
        id: testId,
        file: test.location.file,
        title: test.title,
        project: test.parent.project?.name ?? 'chromium',
        timestamp: Date.now(),
      });
      fs.writeFileSync(failedFile, JSON.stringify(existing, null, 2));
    }
  }

  #readExisting() {
    try {
      return JSON.parse(fs.readFileSync(failedFile, 'utf-8'));
    } catch {
      return [];
    }
  }
}
