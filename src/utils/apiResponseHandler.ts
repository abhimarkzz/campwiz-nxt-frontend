/**
 * Safely sanitize HTML content
 * Removes dangerous scripts and attributes
 */
export function sanitizeHtml(html: string | undefined): string {
    if (!html) return '';

    // Basic sanitization - remove script tags and dangerous attributes
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/on\w+\s*=\s*[^\s>]*/gi, '');
}
