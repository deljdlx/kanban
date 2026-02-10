/**
 * ModalPluginSettings — Modale de configuration dédiée à un plugin.
 *
 * Affiche le contenu retourné par `plugin.settingsPanel(container)`
 * dans une modale avec un unique bouton "Fermer".
 * Pas de bouton "Annuler" : le footer ne contient que "Fermer".
 */
import BaseModal from './BaseModal.js';

export default class ModalPluginSettings extends BaseModal {
    /**
     * Instance du plugin dont on affiche les réglages.
     * @type {Object}
     */
    _plugin;

    /**
     * @param {Object} plugin - Plugin exposant settingsPanel(container)
     */
    constructor(plugin) {
        super({
            title: plugin.label || plugin.name,
            confirmLabel: 'Fermer',
        });
        this._plugin = plugin;
    }

    /**
     * Remplit le body de la modale avec le contenu du plugin.
     *
     * @param {HTMLElement} body
     */
    _buildBody(body) {
        this._plugin.settingsPanel(body);
    }

    /**
     * Le bouton "Fermer" ferme simplement la modale.
     */
    _onConfirm() {
        this.close();
    }

    /**
     * Surcharge open() pour masquer le bouton "Annuler" du footer.
     * On ne garde que le bouton "Fermer" (confirmBtn).
     */
    open() {
        super.open();

        // Masque le bouton "Annuler" dans le footer
        const cancelBtn = this._overlay.querySelector('.btn--cancel');
        if (cancelBtn) {
            cancelBtn.classList.add('hidden');
        }
    }
}
