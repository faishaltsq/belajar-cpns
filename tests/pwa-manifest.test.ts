import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA Manifest Configuration', () => {
  it('has valid manifest.json with required fields', () => {
    const manifestPath = path.resolve(__dirname, '../public/manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const raw = fs.readFileSync(manifestPath, 'utf8');
    const json = JSON.parse(raw);

    expect(json.name).toContain('Lolos.in');
    expect(json.short_name).toBe('Lolos.in');
    expect(json.start_url).toBe('/simulasi');
    expect(json.display).toBe('standalone');
    expect(json.theme_color).toBe('#c96442');
    expect(json.background_color).toBe('#faf9f5');
    expect(Array.isArray(json.icons)).toBe(true);
    expect(json.icons.length).toBeGreaterThanOrEqual(1);
  });
});
