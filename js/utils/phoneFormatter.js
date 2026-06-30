/**
 * Hungarian phone number formatter utility.
 * Formats any input phone number to +36 format (e.g. +36307034941).
 */
export function formatHungarianPhoneNumber(phone) {
    if (!phone) return '';
    
    let trimmed = phone.trim();
    
    // Handle leading 00
    if (trimmed.startsWith('00')) {
        trimmed = '+' + trimmed.substring(2);
    }
    
    // Remove all non-digits except a leading +
    const hasPlus = trimmed.startsWith('+');
    let cleaned = trimmed.replace(/\D/g, '');
    
    if (!cleaned) return phone;
    
    // If it starts with 06 and is followed by 9 digits (total 11 digits, e.g. 06307034941)
    if (cleaned.startsWith('06') && cleaned.length === 11) {
        return '+36' + cleaned.substring(2);
    }
    
    // If it starts with 36 and is 11 digits (e.g. 36305710789)
    if (cleaned.startsWith('36') && cleaned.length === 11) {
        return '+' + cleaned;
    }
    
    // If it starts with 06 and is 10 digits (e.g. 061234567 -> landline)
    if (cleaned.startsWith('06') && cleaned.length === 10) {
        return '+36' + cleaned.substring(2);
    }
    
    // If it is 9 digits (e.g. 307034941 or 1234567)
    if (cleaned.length === 9) {
        return '+36' + cleaned;
    }
    
    // If it starts with 36 (e.g. 36... but maybe not 11 digits)
    if (cleaned.startsWith('36') && cleaned.length >= 9) {
        return '+' + cleaned;
    }
    
    // If it's a mobile prefix without country/area code (e.g. 20..., 30..., 70...) and is 9 digits
    if (/^(20|30|70)\d{7}$/.test(cleaned)) {
        return '+36' + cleaned;
    }
    
    // Default fallback: if it doesn't start with +, but has digits
    if (!hasPlus) {
        // If it starts with 0 (but not 06), replace 0 with +36
        if (cleaned.startsWith('0') && cleaned.length >= 9) {
            return '+36' + cleaned.substring(1);
        }
        return '+36' + cleaned;
    }
    
    return '+' + cleaned;
}
