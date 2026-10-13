import { describe, it, expect } from 'vitest';
import { evaluateKepribadianResults } from '../src/lib/kepribadian';

describe('evaluateKepribadianResults', () => {
  it('correctly aggregates scores across the 5 work dimensions', () => {
    const answers: Record<number, 'A' | 'B'> = {
      1: 'A', // A dimension
      2: 'A', // D dimension
      3: 'A', // R dimension
      4: 'A', // L dimension
      5: 'A', // S dimension
    };
    const result = evaluateKepribadianResults(answers);
    expect(result.dimensions.A.score).toBeGreaterThanOrEqual(1);
    expect(result.dimensions.D.score).toBeGreaterThanOrEqual(1);
    expect(result.dimensions.R.score).toBeGreaterThanOrEqual(1);
    expect(result.dimensions.L.score).toBeGreaterThanOrEqual(1);
    expect(result.dimensions.S.score).toBeGreaterThanOrEqual(1);
    expect(result.dominantTraits.length).toBeGreaterThan(0);
    expect(result.asnFitSummary).toBeDefined();
    expect(result.recommendations.length).toBeGreaterThanOrEqual(2);
  });
});
