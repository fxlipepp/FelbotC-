const fs = require('fs');

let bannedCache = null;
let bannedCacheAt = 0;
const CACHE_TTL = 3000;

function isBanned(userId) {
    try {
        const now = Date.now();

        if (!bannedCache || now - bannedCacheAt > CACHE_TTL) {
            bannedCache = JSON.parse(fs.readFileSync('./data/banned.json', 'utf8'));
            bannedCacheAt = now;
        }

        return Array.isArray(bannedCache) && bannedCache.includes(userId);
    } catch (error) {
        console.error('Error checking banned status:', error);
        return false;
    }
}

module.exports = { isBanned };
