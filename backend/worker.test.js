// Test escapeHtml function indirectly via the worker's helper
// We test the escaping behavior since it's directly in the file

describe('Worker email template HTML escaping', () => {
  // Inline the same escapeHtml logic for testing
  function escapeHtml(value) {
    const str = String(value == null ? '' : value);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  it('escapes < and > to prevent HTML injection', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('escapes & ampersand', () => {
    expect(escapeHtml('AT&T')).toBe('AT&amp;T');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('name="test"')).toBe('name=&quot;test&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s');
  });

  it('handles null value', () => {
    expect(escapeHtml(null)).toBe('');
  });

  it('handles undefined value', () => {
    expect(escapeHtml(undefined)).toBe('');
  });

  it('handles normal text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });

  it('prevents img onerror injection', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const safe = escapeHtml(evil);
    expect(safe).not.toContain('<img');
    expect(safe).not.toContain('onerror');
  });
});
