const { execSync } = require('child_process');

try {
    require.resolve('baileys-subbot');
    console.log('[SUBBOT] Dependencia aislada disponible.');
} catch {
    console.log('[SUBBOT] Instalando Baileys aislado para el subbot...');
    execSync('npm install --no-save --legacy-peer-deps --no-audit --no-fund "baileys-subbot@npm:@whiskeysockets/baileys@6.7.23"', {
        stdio: 'inherit'
    });
}
