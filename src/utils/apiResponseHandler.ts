import DOMPurify from 'dompurify';

/**
 * Safely sanitize HTML content using DOMPurify
 * Removes dangerous scripts and attributes
 */
export function sanitizeHtml(html: string | undefined): string {
    if (!html) return '';
    
    // Use DOMPurify for robust HTML sanitization
    return DOMPurify.sanitize(html);
}

/**
 * Map API error messages to user-friendly translation keys
 */
export function getErrorMessageKey(errorMessage: string): string {
    // Map technical errors to translation keys
    if (errorMessage.includes('404')) {
        return 'error.notFound';
    }
    if (errorMessage.includes('403')) {
        return 'error.unauthorized';
    }
    if (errorMessage.includes('500')) {
        return 'error.serverError';
    }
    if (errorMessage.includes('Network')) {
        return 'error.networkError';
    }
    // Default generic error
    return 'error.failedToFetch';
}
