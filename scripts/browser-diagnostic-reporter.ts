// Optional reporter for synthetic local tests. Records timings and available
// memory, without HTTP headers, bodies or environment values. Use synthetic
// fixtures only: action titles and failure messages may contain fixture inputs.
import { appendFileSync, mkdirSync } from 'node:fs';
import { freemem } from 'node:os';
import { dirname } from 'node:path';
import type { Reporter, TestCase, TestResult, TestStep, FullResult } from '@playwright/test/reporter';

export default class BrowserDiagnosticReporter implements Reporter {
  private readonly outputFile: string;
  constructor(options: { outputFile?: string } = {}) {
    this.outputFile = options.outputFile ?? process.env.PRISM_BROWSER_DIAGNOSTICS ?? 'artifacts/browser-diagnostics.ndjson';
    mkdirSync(dirname(this.outputFile), { recursive: true });
  }
  private record(value: object) {
    appendFileSync(this.outputFile, JSON.stringify({
      utc: new Date().toISOString(), freeMB: Math.round(freemem() / 1048576), ...value,
    }) + '\n');
  }
  onTestBegin(test: TestCase) { this.record({ event:'testBegin', title:test.title }); }
  onStepEnd(test: TestCase, _result: TestResult, step: TestStep) {
    if (['pw:api', 'expect'].includes(step.category) || step.error)
      this.record({ event:'step', test:test.title, title:step.title, category:step.category,
        duration:step.duration, error:step.error?.message });
  }
  onTestEnd(test: TestCase, result: TestResult) {
    this.record({ event:'testEnd', title:test.title, status:result.status,
      duration:result.duration, retry:result.retry });
  }
  onEnd(result: FullResult) { this.record({ event:'end', status:result.status }); }
}
