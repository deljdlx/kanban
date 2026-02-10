/**
 * BackendSettingsPanel — Panneau de configuration du backend.
 *
 * Permet de configurer :
 *   - URL du backend
 *   - Tester la connexion
 *   - Activer/désactiver le plugin
 */

/**
 * Construit le panneau de settings pour le BackendPlugin.
 *
 * @param {Object} plugin - Instance du BackendPlugin
 * @returns {HTMLElement}
 */
export function buildSettingsPanel(plugin) {
    const container = document.createElement('div');
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

    // Toggle activer/désactiver
    const enabledGroup = document.createElement('div');
    enabledGroup.className = 'backend-form-group';

    const enabledLabel = document.createElement('label');
    enabledLabel.className = 'backend-form-label';
    const enabledCheckbox = document.createElement('input');
    enabledCheckbox.type = 'checkbox';
    enabledCheckbox.checked = plugin.getConfig().enabled;
    enabledCheckbox.addEventListener('change', async () => {
        await plugin.updateConfig({ enabled: enabledCheckbox.checked });
        if (enabledCheckbox.checked) {
            urlInput.disabled = false;
            testBtn.disabled = false;
            intervalInput.disabled = false;
        } else {
            urlInput.disabled = true;
            testBtn.disabled = true;
            intervalInput.disabled = true;
        }
    });

    enabledLabel.appendChild(enabledCheckbox);
    enabledLabel.appendChild(document.createTextNode(' Activer la synchronisation backend'));
    enabledGroup.appendChild(enabledLabel);
    container.appendChild(enabledGroup);

    // Champ URL backend
    const urlGroup = document.createElement('div');
    urlGroup.className = 'backend-form-group';

    const urlLabel = document.createElement('label');
    urlLabel.textContent = 'URL du backend';
    urlLabel.className = 'backend-form-label';

    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.className = 'input';
    urlInput.placeholder = 'http://localhost:8080';
    urlInput.value = plugin.getConfig().backendUrl || '';
    urlInput.disabled = !plugin.getConfig().enabled;
    urlInput.addEventListener('change', async () => {
        await plugin.updateConfig({ backendUrl: urlInput.value.trim() });
    });

    urlGroup.appendChild(urlLabel);
    urlGroup.appendChild(urlInput);
    container.appendChild(urlGroup);

    // Bouton test connexion
    const testBtn = document.createElement('button');
    testBtn.className = 'btn btn--secondary';
    testBtn.textContent = 'Tester la connexion';
    testBtn.disabled = !plugin.getConfig().enabled;
    testBtn.addEventListener('click', async () => {
        testBtn.disabled = true;
        testBtn.textContent = 'Test en cours...';
        testResult.textContent = '';
        testResult.className = 'backend-test-result';

        const result = await plugin.testConnection();

        testBtn.disabled = false;
        testBtn.textContent = 'Tester la connexion';

        if (result.success) {
            testResult.className = 'backend-test-result backend-test-result--success';
            testResult.textContent = `✓ Connexion réussie (${result.user?.name || result.user?.email || 'utilisateur connecté'})`;
        } else {
            testResult.className = 'backend-test-result backend-test-result--error';
            testResult.textContent = `✗ Échec : ${result.error}`;
        }
    });
    container.appendChild(testBtn);

    // Résultat du test
    const testResult = document.createElement('p');
    testResult.className = 'backend-test-result';
    container.appendChild(testResult);

    // Champ intervalle de pull
    const intervalGroup = document.createElement('div');
    intervalGroup.className = 'backend-form-group';

    const intervalLabel = document.createElement('label');
    intervalLabel.textContent = 'Intervalle de synchronisation (secondes)';
    intervalLabel.className = 'backend-form-label';

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

    return container;
}
