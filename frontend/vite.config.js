/**
 * Configuration Vite.
 *
 * - publicDir → `vendor/` : librairies tierces servies à la racine
 *   Exemple : `vendor/pickr/pickr.min.js` → `/pickr/pickr.min.js`
 *
 * - Plugin serveMocks : sert les fichiers JSON de `mocks/` en dev uniquement.
 *   Quand le vrai backend sera prêt, supprimer le plugin et le dossier mocks/.
 *
 * @see https://vite.dev/config/
 */
import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Plugin Vite — sert les fichiers statiques de mocks/ pendant le dev.
 *
 * Les requêtes `/api/*` sont résolues vers `mocks/api/*`.
 * En production (build), ce plugin est inactif — le vrai backend prend le relais.
 */
function serveMocks() {
    const mocksDir = path.resolve(import.meta.dirname, 'mocks');

    return {
        name: 'serve-mocks',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const filePath = path.join(mocksDir, req.url);
                if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                    return next();
                }

                const content = fs.readFileSync(filePath, 'utf-8');
                res.setHeader('Content-Type', 'application/json');
                res.end(content);
            });
        },
    };
}

export default defineConfig({
    publicDir: 'vendor',
    plugins: [serveMocks()],
});
