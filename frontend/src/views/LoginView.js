/**
 * LoginView — Écran de connexion pour le mode multi.
 *
 * Affiche un formulaire email + mot de passe centré sur la page.
 * Après login réussi, définit l'utilisateur courant dans UserService
 * et redirige vers l'URL mémorisée (ou /).
 *
 * Même pattern que HomeView : constructeur, render(container), destroy().
 */
import AuthService from '../services/AuthService.js';
import UserService from '../services/UserService.js';
import Router from '../services/Router.js';

export default class LoginView {
    /**
     * Élément racine de la vue.
     * @type {HTMLElement|null}
     */
    _element;

    /**
     * Champ email.
     * @type {HTMLInputElement|null}
     */
    _emailInput;

    /**
     * Champ mot de passe.
     * @type {HTMLInputElement|null}
     */
    _passwordInput;

    /**
     * Paragraphe d'erreur.
     * @type {HTMLElement|null}
     */
    _errorElement;

    /**
     * Bouton de soumission.
     * @type {HTMLButtonElement|null}
     */
    _submitBtn;

    /**
     * Référence au handler keydown (pour cleanup).
     * @type {Function|null}
     */
    _onKeydownBound;

    constructor() {
        this._element = null;
        this._emailInput = null;
        this._passwordInput = null;
        this._errorElement = null;
        this._submitBtn = null;
        this._onKeydownBound = null;
    }

    /**
     * Rend la vue et l'attache au conteneur.
     *
     * @param {HTMLElement} container
     */
    render(container) {
        this._element = document.createElement('div');
        this._element.className = 'login';

        // Card centrée
        const card = document.createElement('div');
        card.className = 'login-card';

        // Titre
        const title = document.createElement('h1');
        title.className = 'login-title';
        title.textContent = 'Connexion';

        // Formulaire
        const form = document.createElement('div');
        form.className = 'login-form';

        // Champ email
        const emailGroup = document.createElement('div');
        emailGroup.className = 'form-group';

        const emailLabel = document.createElement('label');
        emailLabel.textContent = 'Email';

        this._emailInput = document.createElement('input');
        this._emailInput.className = 'input';
        this._emailInput.type = 'email';
        this._emailInput.placeholder = 'votre@email.com';
        this._emailInput.autocomplete = 'email';

        emailGroup.appendChild(emailLabel);
        emailGroup.appendChild(this._emailInput);

        // Champ mot de passe
        const pwdGroup = document.createElement('div');
        pwdGroup.className = 'form-group';

        const pwdLabel = document.createElement('label');
        pwdLabel.textContent = 'Mot de passe';

        this._passwordInput = document.createElement('input');
        this._passwordInput.className = 'input';
        this._passwordInput.type = 'password';
        this._passwordInput.placeholder = '••••••••';
        this._passwordInput.autocomplete = 'current-password';

        pwdGroup.appendChild(pwdLabel);
        pwdGroup.appendChild(this._passwordInput);

        // Message d'erreur (caché par défaut)
        this._errorElement = document.createElement('p');
        this._errorElement.className = 'login-error hidden';

        // Bouton submit
        this._submitBtn = document.createElement('button');
        this._submitBtn.className = 'btn btn--primary btn--lg login-submit';
        this._submitBtn.textContent = 'Se connecter';
        this._submitBtn.addEventListener('click', () => this._handleSubmit());

        // Enter key handler
        this._onKeydownBound = (e) => {
            if (e.key === 'Enter') {
                this._handleSubmit();
            }
        };
        this._emailInput.addEventListener('keydown', this._onKeydownBound);
        this._passwordInput.addEventListener('keydown', this._onKeydownBound);

        // Assemblage
        form.appendChild(emailGroup);
        form.appendChild(pwdGroup);
        form.appendChild(this._errorElement);
        form.appendChild(this._submitBtn);

        card.appendChild(title);
        card.appendChild(form);
        this._element.appendChild(card);

        container.appendChild(this._element);

        // Autofocus sur le champ email
        this._emailInput.focus();
    }

    /**
     * Détruit la vue et nettoie les listeners.
     */
    destroy() {
        if (this._onKeydownBound) {
            this._emailInput?.removeEventListener('keydown', this._onKeydownBound);
            this._passwordInput?.removeEventListener('keydown', this._onKeydownBound);
            this._onKeydownBound = null;
        }
        if (this._element) {
            this._element.remove();
            this._element = null;
        }
        this._emailInput = null;
        this._passwordInput = null;
        this._errorElement = null;
        this._submitBtn = null;
    }

    /**
     * Gère la soumission du formulaire.
     *
     * @private
     */
    async _handleSubmit() {
        const email = this._emailInput.value.trim();
        const password = this._passwordInput.value;

        // Validation basique
        if (!email || !password) {
            this._showError('Veuillez remplir tous les champs.');
            return;
        }

        // Désactive le bouton pendant le login
        this._submitBtn.disabled = true;
        this._submitBtn.textContent = 'Connexion...';
        this._hideError();

        try {
            const result = await AuthService.login(email, password);

            if (result.success) {
                // Met à jour l'utilisateur courant dans UserService
                UserService.setCurrentUser(AuthService.getUserId());

                // Redirige vers l'URL mémorisée ou /
                const redirectUrl = AuthService.consumeRedirectUrl() || '/';
                Router.navigate(redirectUrl);
            } else {
                this._showError(result.error || 'Email ou mot de passe incorrect.');
                this._submitBtn.disabled = false;
                this._submitBtn.textContent = 'Se connecter';
            }
        } catch (_error) {
            this._showError('Erreur de connexion. Réessayez.');
            this._submitBtn.disabled = false;
            this._submitBtn.textContent = 'Se connecter';
        }
    }

    /**
     * Affiche un message d'erreur.
     *
     * @param {string} message
     * @private
     */
    _showError(message) {
        this._errorElement.textContent = message;
        this._errorElement.classList.remove('hidden');
    }

    /**
     * Cache le message d'erreur.
     *
     * @private
     */
    _hideError() {
        this._errorElement.classList.add('hidden');
    }
}
