/**
 * RegisterView — Écran d'inscription pour le mode multi.
 *
 * Affiche un formulaire nom + email + mot de passe + confirmation centré sur la page.
 * Après inscription réussie, redirige vers /login avec un message de succès.
 *
 * Même pattern que LoginView : constructeur, render(container), destroy().
 */
import httpClient from '../services/BackendHttpClient.js';
import Router from '../services/Router.js';

export default class RegisterView {
    /**
     * Élément racine de la vue.
     * @type {HTMLElement|null}
     */
    _element;

    /**
     * Champ nom.
     * @type {HTMLInputElement|null}
     */
    _nameInput;

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
     * Champ confirmation mot de passe.
     * @type {HTMLInputElement|null}
     */
    _passwordConfirmInput;

    /**
     * Paragraphe d'erreur.
     * @type {HTMLElement|null}
     */
    _errorElement;

    /**
     * Paragraphe de succès.
     * @type {HTMLElement|null}
     */
    _successElement;

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
        this._nameInput = null;
        this._emailInput = null;
        this._passwordInput = null;
        this._passwordConfirmInput = null;
        this._errorElement = null;
        this._successElement = null;
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

        // Card centrée (réutilise les classes login-*)
        const card = document.createElement('div');
        card.className = 'login-card';

        // Titre
        const title = document.createElement('h1');
        title.className = 'login-title';
        title.textContent = 'Inscription';

        // Formulaire
        const form = document.createElement('div');
        form.className = 'login-form';

        // Champ nom
        const nameGroup = document.createElement('div');
        nameGroup.className = 'form-group';

        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Nom';

        this._nameInput = document.createElement('input');
        this._nameInput.className = 'input';
        this._nameInput.type = 'text';
        this._nameInput.placeholder = 'Votre nom';
        this._nameInput.autocomplete = 'name';

        nameGroup.appendChild(nameLabel);
        nameGroup.appendChild(this._nameInput);

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
        this._passwordInput.autocomplete = 'new-password';

        pwdGroup.appendChild(pwdLabel);
        pwdGroup.appendChild(this._passwordInput);

        // Champ confirmation mot de passe
        const pwdConfirmGroup = document.createElement('div');
        pwdConfirmGroup.className = 'form-group';

        const pwdConfirmLabel = document.createElement('label');
        pwdConfirmLabel.textContent = 'Confirmer le mot de passe';

        this._passwordConfirmInput = document.createElement('input');
        this._passwordConfirmInput.className = 'input';
        this._passwordConfirmInput.type = 'password';
        this._passwordConfirmInput.placeholder = '••••••••';
        this._passwordConfirmInput.autocomplete = 'new-password';

        pwdConfirmGroup.appendChild(pwdConfirmLabel);
        pwdConfirmGroup.appendChild(this._passwordConfirmInput);

        // Message d'erreur (caché par défaut)
        this._errorElement = document.createElement('p');
        this._errorElement.className = 'login-error hidden';

        // Message de succès (caché par défaut)
        this._successElement = document.createElement('p');
        this._successElement.className = 'login-success hidden';

        // Bouton submit
        this._submitBtn = document.createElement('button');
        this._submitBtn.className = 'btn btn--primary btn--lg login-submit';
        this._submitBtn.textContent = "S'inscrire";
        this._submitBtn.addEventListener('click', () => this._handleSubmit());

        // Enter key handler
        this._onKeydownBound = (e) => {
            if (e.key === 'Enter') {
                this._handleSubmit();
            }
        };
        this._nameInput.addEventListener('keydown', this._onKeydownBound);
        this._emailInput.addEventListener('keydown', this._onKeydownBound);
        this._passwordInput.addEventListener('keydown', this._onKeydownBound);
        this._passwordConfirmInput.addEventListener('keydown', this._onKeydownBound);

        // Lien vers login
        const loginLink = document.createElement('a');
        loginLink.className = 'login-link';
        loginLink.href = '#';
        loginLink.textContent = 'Déjà un compte ? Se connecter';
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            Router.navigate('/login');
        });

        // Assemblage
        form.appendChild(nameGroup);
        form.appendChild(emailGroup);
        form.appendChild(pwdGroup);
        form.appendChild(pwdConfirmGroup);
        form.appendChild(this._errorElement);
        form.appendChild(this._successElement);
        form.appendChild(this._submitBtn);
        form.appendChild(loginLink);

        card.appendChild(title);
        card.appendChild(form);
        this._element.appendChild(card);

        container.appendChild(this._element);

        // Autofocus sur le champ nom
        this._nameInput.focus();
    }

    /**
     * Détruit la vue et nettoie les listeners.
     */
    destroy() {
        if (this._onKeydownBound) {
            this._nameInput?.removeEventListener('keydown', this._onKeydownBound);
            this._emailInput?.removeEventListener('keydown', this._onKeydownBound);
            this._passwordInput?.removeEventListener('keydown', this._onKeydownBound);
            this._passwordConfirmInput?.removeEventListener('keydown', this._onKeydownBound);
            this._onKeydownBound = null;
        }
        if (this._element) {
            this._element.remove();
            this._element = null;
        }
        this._nameInput = null;
        this._emailInput = null;
        this._passwordInput = null;
        this._passwordConfirmInput = null;
        this._errorElement = null;
        this._successElement = null;
        this._submitBtn = null;
    }

    /**
     * Gère la soumission du formulaire d'inscription.
     *
     * @private
     */
    async _handleSubmit() {
        const name = this._nameInput.value.trim();
        const email = this._emailInput.value.trim();
        const password = this._passwordInput.value;
        const passwordConfirmation = this._passwordConfirmInput.value;

        // Validation côté client
        if (!name || !email || !password || !passwordConfirmation) {
            this._showError('Veuillez remplir tous les champs.');
            return;
        }

        if (!this._isValidEmail(email)) {
            this._showError('Veuillez entrer un email valide.');
            return;
        }

        if (password.length < 8) {
            this._showError('Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }

        if (password !== passwordConfirmation) {
            this._showError('Les mots de passe ne correspondent pas.');
            return;
        }

        // Désactive le bouton pendant la requête
        this._submitBtn.disabled = true;
        this._submitBtn.textContent = 'Inscription...';
        this._hideError();
        this._hideSuccess();

        try {
            if (!httpClient.isConfigured()) {
                this._showError('Backend non configuré. Vérifiez les paramètres.');
                this._submitBtn.disabled = false;
                this._submitBtn.textContent = "S'inscrire";
                return;
            }

            // skipTokenExpired : un 401 ici = erreur serveur, pas un token expire
            await httpClient.requestRaw('POST', '/api/register', {
                name,
                email,
                password,
                password_confirmation: passwordConfirmation,
            }, { skipTokenExpired: true });

            // Succès — affiche le message et redirige après un court délai
            this._showSuccess('Compte créé avec succès ! Redirection vers la connexion...');
            this._submitBtn.disabled = true;

            setTimeout(() => {
                Router.navigate('/login');
            }, 1500);
        } catch (error) {
            // Tente d'extraire les messages de validation du backend
            const message = this._extractErrorMessage(error) || "Erreur lors de l'inscription. Réessayez.";
            this._showError(message);
            this._submitBtn.disabled = false;
            this._submitBtn.textContent = "S'inscrire";
        }
    }

    /**
     * Valide basiquement le format email.
     *
     * @param {string} email
     * @returns {boolean}
     * @private
     */
    _isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    /**
     * Tente d'extraire un message d'erreur lisible depuis une erreur HTTP.
     *
     * @param {Error} error
     * @returns {string|null}
     * @private
     */
    _extractErrorMessage(error) {
        // Les erreurs 422 (validation Laravel) contiennent le status dans le message
        if (error.message.includes('422')) {
            return 'Email déjà utilisé ou données invalides.';
        }
        if (error.message.includes('409')) {
            return 'Un compte avec cet email existe déjà.';
        }
        return null;
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

    /**
     * Affiche un message de succès.
     *
     * @param {string} message
     * @private
     */
    _showSuccess(message) {
        this._successElement.textContent = message;
        this._successElement.classList.remove('hidden');
    }

    /**
     * Cache le message de succès.
     *
     * @private
     */
    _hideSuccess() {
        this._successElement.classList.add('hidden');
    }
}
