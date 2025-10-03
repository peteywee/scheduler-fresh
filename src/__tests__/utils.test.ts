import { describe, it, expect } from 'vitest';
import { sanitizeOrgId } from '@/lib/types';

describe('Utils', () => {
  it('should sanitize org ID correctly', () => {
    expect(sanitizeOrgId('Acme Corp!')).toBe('acme-corp');
    expect(sanitizeOrgId('Test-Org_123')).toBe('test-org-123');
  });
});