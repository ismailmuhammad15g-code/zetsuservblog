/**
 * Email Validation Module
 * 
 * Provides comprehensive email validation including:
 * - Strict email format validation
 * - Strict Allow-List (Whitelist) of major email providers
 * - User-friendly error messages
 */

// Strict list of allowed email domains
// Only emails from these major providers will be accepted
const ALLOWED_DOMAINS: Set<string> = new Set([
    // Google
    'gmail.com',
    'googlemail.com',
    // Microsoft
    'outlook.com',
    'hotmail.com',
    'live.com',
    'msn.com',
    'windowslive.com',
    // Yahoo
    'yahoo.com',
    'ymail.com',
    'yahoo.co.uk',
    'yahoo.fr',
    'yahoo.es',
    'yahoo.it',
    'yahoo.de',
    // Apple
    'icloud.com',
    'me.com',
    'mac.com',
    // Other Major Providers
    'aol.com',
    'protonmail.com',
    'proton.me',
    'zoho.com',
    'gmx.com',
    'gmx.net',
    'gmx.de',
    'mail.com',
    'yandex.com',
    'yandex.ru'
]);

/**
 * Strict email format validation regex
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

/**
 * Additional strict checks for email format
 */
const ADDITIONAL_EMAIL_CHECKS = {
    maxLength: 254,
    maxLocalPartLength: 64,
    minTldLength: 2,
};

export interface EmailValidationResult {
    isValid: boolean;
    error: string | null;
    errorType: 'format' | 'disposable' | null;
}

/**
 * Check if email format is valid
 */
export function isValidEmailFormat(email: string): boolean {
    if (!email || typeof email !== 'string') {
        return false;
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check overall length
    if (trimmedEmail.length > ADDITIONAL_EMAIL_CHECKS.maxLength) {
        return false;
    }

    // Split email into parts
    const atIndex = trimmedEmail.lastIndexOf('@');
    if (atIndex === -1) {
        return false;
    }

    const localPart = trimmedEmail.substring(0, atIndex);
    const domainPart = trimmedEmail.substring(atIndex + 1);

    // Check local part length
    if (localPart.length > ADDITIONAL_EMAIL_CHECKS.maxLocalPartLength) {
        return false;
    }

    if (localPart.length === 0 || domainPart.length === 0) {
        return false;
    }

    // Cannot start or end with a dot
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
        return false;
    }

    if (localPart.includes('..') || domainPart.includes('..')) {
        return false;
    }

    return EMAIL_REGEX.test(trimmedEmail);
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string | null {
    if (!email || typeof email !== 'string') {
        return null;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const atIndex = trimmedEmail.lastIndexOf('@');

    if (atIndex === -1) {
        return null;
    }

    return trimmedEmail.substring(atIndex + 1);
}

/**
 * Check if email domain is NOT in the allowed list
 */
export function isDisposableEmail(email: string): boolean {
    // In this strict mode, we call it "isDisposable" for compatibility,
    // but it really checks "IsNotAllowed".
    // Returns TRUE if the email should be blocked.

    const domain = extractDomain(email);

    if (!domain) {
        return true; // Block invalid domains
    }

    // If domain is IN the allowed list, it is NOT disposable/blocked.
    // If domain is NOT in the list, it IS blocked (treated as disposable/unsupported).
    return !ALLOWED_DOMAINS.has(domain);
}

/**
 * Comprehensive email validation
 */
export function validateEmail(email: string): EmailValidationResult {
    // Check email format first
    if (!isValidEmailFormat(email)) {
        return {
            isValid: false,
            error: 'Please enter a valid email address',
            errorType: 'format',
        };
    }

    // Check against strict whitelist
    if (isDisposableEmail(email)) {
        return {
            isValid: false,
            error: 'Disposable email addresses are not supported. You must add your original email "This is for you so you do not lose your data so please enter the correct email"',
            errorType: 'disposable',
        };
    }

    return {
        isValid: true,
        error: null,
        errorType: null,
    };
}
