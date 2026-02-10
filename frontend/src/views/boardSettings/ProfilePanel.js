/**
 * ProfilePanel — Onglet "Profil" de la modale Board Settings (solo mode uniquement).
 *
 * Permet de configurer le profil de l'utilisateur local :
 *   - Nom (input text)
 *   - Initiales (auto-dérivées du nom, éditables, max 3 chars)
 *   - Couleur (swatches cliquables)
 *   - Preview live de l'avatar
 *
 * Sauvegarde via UserService.updateProfile() et met à jour le header en direct.
 */
import UserService from '../../services/UserService.js';

/**
 * Palette fixe de couleurs pour l'avatar.
 * @type {string[]}
 */
const COLOR_PALETTE = [
    '#6c63ff',
    '#e53935',
    '#43a047',
    '#fb8c00',
    '#8e24aa',
    '#00acc1',
    '#3949ab',
    '#d81b60',
    '#5c6bc0',
    '#00897b',
    '#f4511e',
    '#7cb342',
];

export default class ProfilePanel {
    /**
     * Champ nom.
     * @type {HTMLInputElement|null}
     */
    _nameInput;

    /**
     * Champ initiales.
     * @type {HTMLInputElement|null}
     */
    _initialsInput;

    /**
     * Couleur sélectionnée.
     * @type {string}
     */
    _selectedColor;

    /**
     * Élément de preview avatar.
     * @type {HTMLElement|null}
     */
    _avatarPreview;

    /**
     * Indique si les initiales ont été modifiées manuellement.
     * @type {boolean}
     */
    _initialsManuallyEdited;

    constructor() {
        this._nameInput = null;
        this._initialsInput = null;
        this._selectedColor = '#6c63ff';
        this._avatarPreview = null;
        this._initialsManuallyEdited = false;
    }

    /**
     * Construit le contenu du panel dans le conteneur fourni.
     *
     * @param {HTMLElement} panel
     */
    build(panel) {
        const currentUser = UserService.getCurrentUser();
        if (currentUser) {
            this._selectedColor = currentUser.color;
        }

        this._buildAvatarPreview(panel, currentUser);
        this._buildNameField(panel, currentUser);
        this._buildInitialsField(panel, currentUser);
        this._buildColorField(panel);
        this._buildSaveButton(panel);
    }

    // ---------------------------------------------------------------
    // Construction des champs
    // ---------------------------------------------------------------

    /**
     * Preview live de l'avatar.
     *
     * @param {HTMLElement} panel
     * @param {Object|null} currentUser
     * @private
     */
    _buildAvatarPreview(panel, currentUser) {
        const group = document.createElement('div');
        group.className = 'board-settings-field profile-avatar-preview-group';

        const avatar = document.createElement('div');
        avatar.className = 'profile-avatar-preview';
        avatar.style.backgroundColor = this._selectedColor;
        avatar.textContent = currentUser ? currentUser.initials : DEFAULT_INITIALS();

        this._avatarPreview = avatar;

        group.appendChild(avatar);
        panel.appendChild(group);
    }

    /**
     * Champ nom.
     *
     * @param {HTMLElement} panel
     * @param {Object|null} currentUser
     * @private
     */
    _buildNameField(panel, currentUser) {
        const group = document.createElement('div');
        group.className = 'board-settings-field';

        const label = document.createElement('label');
        label.className = 'board-settings-field-label';
        label.textContent = 'Nom';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'board-settings-input';
        input.value = currentUser ? currentUser.name : 'Utilisateur';
        input.placeholder = 'Votre nom';

        input.addEventListener('input', () => {
            if (!this._initialsManuallyEdited) {
                const derived = deriveInitials(input.value);
                this._initialsInput.value = derived;
                this._updatePreview();
            }
        });

        this._nameInput = input;

        group.appendChild(label);
        group.appendChild(input);
        panel.appendChild(group);
    }

    /**
     * Champ initiales (auto-dérivées, éditables).
     *
     * @param {HTMLElement} panel
     * @param {Object|null} currentUser
     * @private
     */
    _buildInitialsField(panel, currentUser) {
        const group = document.createElement('div');
        group.className = 'board-settings-field';

        const label = document.createElement('label');
        label.className = 'board-settings-field-label';
        label.textContent = 'Initiales';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'board-settings-input';
        input.value = currentUser ? currentUser.initials : 'U';
        input.maxLength = 3;
        input.placeholder = 'AB';

        input.addEventListener('input', () => {
            this._initialsManuallyEdited = input.value.trim().length > 0;
            this._updatePreview();
        });

        this._initialsInput = input;

        group.appendChild(label);
        group.appendChild(input);
        panel.appendChild(group);
    }

    /**
     * Sélecteur de couleur (swatches cliquables).
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildColorField(panel) {
        const group = document.createElement('div');
        group.className = 'board-settings-field';

        const label = document.createElement('label');
        label.className = 'board-settings-field-label';
        label.textContent = 'Couleur';

        const swatchContainer = document.createElement('div');
        swatchContainer.className = 'profile-color-swatches';

        for (const color of COLOR_PALETTE) {
            const swatch = document.createElement('button');
            swatch.type = 'button';
            swatch.className = 'profile-color-swatch';
            if (color === this._selectedColor) {
                swatch.classList.add('profile-color-swatch--selected');
            }
            swatch.style.backgroundColor = color;
            swatch.title = color;

            swatch.addEventListener('click', () => {
                this._selectedColor = color;

                // Met à jour la classe --selected de tous les swatches
                const allSwatches = swatchContainer.querySelectorAll('.profile-color-swatch');
                for (const s of allSwatches) {
                    s.classList.toggle('profile-color-swatch--selected', s === swatch);
                }

                this._updatePreview();
            });

            swatchContainer.appendChild(swatch);
        }

        group.appendChild(label);
        group.appendChild(swatchContainer);
        panel.appendChild(group);
    }

    /**
     * Bouton de sauvegarde.
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildSaveButton(panel) {
        const group = document.createElement('div');
        group.className = 'board-settings-field form-group';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn--primary';
        btn.textContent = 'Enregistrer le profil';

        btn.addEventListener('click', async () => {
            const name = this._nameInput.value.trim() || 'Utilisateur';
            const initials = this._initialsInput.value.trim().toUpperCase() || deriveInitials(name);
            const color = this._selectedColor;

            btn.textContent = 'Enregistrement...';
            btn.disabled = true;

            await UserService.updateProfile({ name, initials, color });

            // Met à jour le header directement
            this._updateHeader(name, initials, color);

            btn.textContent = 'Enregistrer le profil';
            btn.disabled = false;
        });

        group.appendChild(btn);
        panel.appendChild(group);
    }

    // ---------------------------------------------------------------
    // Mise à jour live
    // ---------------------------------------------------------------

    /**
     * Met à jour la preview de l'avatar.
     *
     * @private
     */
    _updatePreview() {
        if (!this._avatarPreview) return;
        const initials = this._initialsInput.value.trim().toUpperCase() || deriveInitials(this._nameInput.value);
        this._avatarPreview.textContent = initials;
        this._avatarPreview.style.backgroundColor = this._selectedColor;
    }

    /**
     * Met à jour les éléments DOM du header avec le nouveau profil.
     *
     * @param {string} name
     * @param {string} initials
     * @param {string} color
     * @private
     */
    _updateHeader(name, initials, color) {
        const avatarEl = document.querySelector('.app-header-user-avatar');
        if (avatarEl) {
            avatarEl.textContent = initials;
            avatarEl.style.backgroundColor = color;
        }

        const nameEl = document.querySelector('.app-header-user-name');
        if (nameEl) {
            nameEl.textContent = name;
        }
    }
}

// ---------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------

/**
 * Dérive les initiales à partir d'un nom (premières lettres de chaque mot, max 2).
 *
 * @param {string} name
 * @returns {string}
 */
function deriveInitials(name) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'U';
    return words
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join('');
}

/**
 * Initiales par défaut.
 *
 * @returns {string}
 */
function DEFAULT_INITIALS() {
    return 'U';
}
