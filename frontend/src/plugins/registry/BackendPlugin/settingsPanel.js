/**
 * BackendSettingsPanel — Panneau de configuration du backend.
 *
 * Permet de configurer :
 *   - URL du backend (avec test automatique via GET /api/version)
 *   - Tester la connexion authentifiée (GET /api/me)
 *   - Activer/désactiver la synchronisation
 *   - Intervalle de pull
 */

/**
 * Teste la connexion au backend en appelant GET {url}/api/version.
 * Endpoint public, pas besoin de token.
 *
 * @param {string} url - URL de base du backend (ex: 'http://localhost:8080')
 * @returns {Promise<{ success: boolean, version?: string, app?: string, error?: string }>}
 */
async function fetchApiVersion(url) {
    const cleanUrl = url.replace(/\/+$/, '');

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${cleanUrl}/api/version`, {
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}` };
        }

        const data = await response.json();
        return { success: true, version: data.api, app: data.app };
    } catch (error) {
        if (error.name === 'AbortError') {
            return { success: false, error: 'Timeout (5s)' };
        }
        return { success: false, error: error.message };
    }
}

/**
 * Construit le panneau de settings pour le BackendPlugin.
 *
 * Signature imposée par PluginAssembler : (plugin, container, defaults).
 *
 * @param {Object} plugin - Instance du BackendPlugin (wrappedPlugin)
 * @param {HTMLElement} container - Élément DOM fourni par ModalPluginSettings
 */
export function buildSettingsPanel(plugin, container) {
    container.className = 'backend-settings';

    // Titre
    const title = document.createElement('h3');
    title.textContent = 'Configuration Backend';
    title.className = 'settings-section-title';
    container.appendChild(title);

    // Description
    const desc = document.createElement('p');
    desc.className = 'settings-description';
    desc.textContent =
        'Connectez le Kanban à un backend Laravel pour synchroniser vos boards, utilisateurs et taxonomies.';
    container.appendChild(desc);

    // --- Champ URL backend ---
    const urlGroup = document.createElement('div');
    urlGroup.className = 'form-group';

    const urlLabel = document.createElement('label');
    urlLabel.textContent = 'URL du backend';
    urlLabel.className = 'label';

    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.className = 'input';
    urlInput.placeholder = 'http://localhost:8080';
    urlInput.value = plugin.getConfig().backendUrl || '';

    // Résultat du test de version (sous le champ URL)
    const versionResult = document.createElement('p');
    versionResult.className = 'backend-test-result';

    /**
     * Teste la connexion au backend via GET /api/version.
     * Appelé au blur du champ URL et à l'ouverture si une URL est déjà configurée.
     */
    async function testUrl() {
        const url = urlInput.value.trim();
        if (!url) {
            versionResult.textContent = '';
            versionResult.className = 'backend-test-result';
            return;
        }

        versionResult.className = 'backend-test-result';
        versionResult.textContent = 'Connexion en cours...';

        const result = await fetchApiVersion(url);

        if (result.success) {
            versionResult.className = 'backend-test-result backend-test-result--success';
            versionResult.textContent = `API connectée — v${result.version}`;
        } else {
            versionResult.className = 'backend-test-result backend-test-result--error';
            versionResult.textContent = `Connexion échouée : ${result.error}`;
        }
    }

    // Sauvegarde l'URL au blur et teste la connexion
    urlInput.addEventListener('change', async () => {
        await plugin.updateConfig({ backendUrl: urlInput.value.trim() });
        await testUrl();
    });

    urlGroup.appendChild(urlLabel);
    urlGroup.appendChild(urlInput);
    urlGroup.appendChild(versionResult);
    container.appendChild(urlGroup);

    // --- Toggle activer/désactiver ---
    const enabledGroup = document.createElement('div');
    enabledGroup.className = 'form-group';

    const enabledLabel = document.createElement('label');
    enabledLabel.className = 'checkbox-row';
    const enabledCheckbox = document.createElement('input');
    enabledCheckbox.type = 'checkbox';
    enabledCheckbox.checked = plugin.getConfig().enabled;
    enabledCheckbox.addEventListener('change', async () => {
        await plugin.updateConfig({ enabled: enabledCheckbox.checked });
        const enabled = enabledCheckbox.checked;
        testBtn.disabled = !enabled;
        intervalInput.disabled = !enabled;
    });

    enabledLabel.appendChild(enabledCheckbox);
    enabledLabel.appendChild(document.createTextNode(' Activer la synchronisation backend'));
    enabledGroup.appendChild(enabledLabel);
    container.appendChild(enabledGroup);

    // --- Bouton test connexion authentifiée ---
    const testGroup = document.createElement('div');
    testGroup.className = 'form-group';

    const testBtn = document.createElement('button');
    testBtn.className = 'btn btn--secondary';
    testBtn.textContent = 'Tester la connexion (auth)';
    testBtn.disabled = !plugin.getConfig().enabled;
    testBtn.addEventListener('click', async () => {
        testBtn.disabled = true;
        testBtn.textContent = 'Test en cours...';
        testResult.textContent = '';
        testResult.className = 'backend-test-result';

        const result = await plugin.testConnection();

        testBtn.disabled = false;
        testBtn.textContent = 'Tester la connexion (auth)';

        if (result.success) {
            testResult.className = 'backend-test-result backend-test-result--success';
            testResult.textContent = `Authentifié : ${result.user?.name || result.user?.email || 'utilisateur connecté'}`;
        } else {
            testResult.className = 'backend-test-result backend-test-result--error';
            testResult.textContent = `Échec : ${result.error}`;
        }
    });

    const testResult = document.createElement('p');
    testResult.className = 'backend-test-result';

    const testHint = document.createElement('p');
    testHint.className = 'form-hint';
    testHint.textContent = 'Vérifie que le token Sanctum est valide (GET /api/me).';

    testGroup.appendChild(testBtn);
    testGroup.appendChild(testResult);
    testGroup.appendChild(testHint);
    container.appendChild(testGroup);

    // --- Champ intervalle de pull ---
    const intervalGroup = document.createElement('div');
    intervalGroup.className = 'form-group';

    const intervalLabel = document.createElement('label');
    intervalLabel.textContent = 'Intervalle de synchronisation (secondes)';
    intervalLabel.className = 'label';

    const intervalInput = document.createElement('input');
    intervalInput.type = 'number';
    intervalInput.className = 'input';
    intervalInput.min = '10';
    intervalInput.max = '300';
    intervalInput.value = (plugin.getConfig().pullInterval || 30000) / 1000;
    intervalInput.disabled = !plugin.getConfig().enabled;
    intervalInput.addEventListener('change', async () => {
        const seconds = parseInt(intervalInput.value, 10);
        if (seconds >= 10 && seconds <= 300) {
            await plugin.updateConfig({ pullInterval: seconds * 1000 });
        }
    });

    intervalGroup.appendChild(intervalLabel);
    intervalGroup.appendChild(intervalInput);
    container.appendChild(intervalGroup);

    // --- Test initial si une URL est déjà configurée ---
    if (urlInput.value.trim()) {
        testUrl();
    }
}
