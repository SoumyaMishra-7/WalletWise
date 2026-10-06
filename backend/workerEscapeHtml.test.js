// Additional escapeHtml function tests verifying email security
function escapeHtml(value) {
  const str = String(value == null ? '' : value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

describe('escapeHtml — comprehensive XSS prevention', () => {
  describe('Tag injection prevention', () => {
    it('script tags are escaped', () => {
      expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('style tags are escaped', () => {
      expect(escapeHtml('<style>body{}</style>')).toBe('&lt;style&gt;body{}&lt;/style&gt;');
    });

    it('img onerror is escaped', () => {
      const evil = '<img src=x onerror=alert(1)>';
      const safe = escapeHtml(evil);
      expect(safe).not.toContain('<img');
      expect(safe).toContain('&lt;img');
    });
  });

  describe('Attribute injection prevention', () => {
    it('double-quote injection is escaped', () => {
      expect(escapeHtml('"><script>alert(1)</script>')).not.toContain('"');
    });

    it('single-quote injection is escaped', () => {
      expect(escapeHtml("'onload=alert(1)")).not.toContain("'");
    });
  });

  describe('Safe content passes through', () => {
    it('normal subscription name is unchanged', () => {
      expect(escapeHtml('Netflix Premium')).toBe('Netflix Premium');
    });

    it('email address with @ is unchanged', () => {
      expect(escapeHtml('user@example.com')).toBe('user@example.com');
    });

    it('currency symbols are unchanged', () => {
      expect(escapeHtml('₹299.99')).toBe('₹299.99');
    });
  });
});
