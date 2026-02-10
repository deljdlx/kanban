/**
 * CardTypeRegistry — Registre des types de cartes actifs.
 *
 * Permet aux plugins widget de déclarer leurs types de cartes.
 * Quand un type n'est pas enregistré (plugin désactivé), les cartes
 * de ce type sont automatiquement masquées via CSS.
 *
 * Quand un type est enregistré, le hook `card:typeActivated` est déclenché
 * pour chaque carte existante de ce type, permettant aux plugins de
 * se ré-attacher aux éléments DOM.
 *
 * Usage dans un plugin :
 *   install(hooks) {
 *       CardTypeRegistry.register('widget:counter');
 *       hooks.addAction('card:typeActivated', (ctx) => this._onTypeActivated(ctx));
 *   }
 *   uninstall() {
 *       CardTypeRegistry.unregister('widget:counter');
 *   }
 *
 * Singleton exporté.
 */
import Hooks from '../plugins/HookRegistry.js';

class CardTypeRegistry {
    /**
     * Set des types de cartes actuellement actifs.
     * @type {Set<string>}
     */
    _activeTypes;

    /**
     * Élément <style> injecté pour masquer les cartes inactives.
     * @type {HTMLStyleElement|null}
     */
    _styleElement;

    constructor() {
        this._activeTypes = new Set();
        this._styleElement = null;

        // Le type 'standard' est toujours actif
        this._activeTypes.add('standard');
    }

    /**
     * Enregistre un type de carte comme actif.
     * Les cartes de ce type seront visibles.
     *
     * Déclenche le hook `card:typeActivated` pour chaque carte existante
     * de ce type, permettant aux plugins de se ré-attacher.
     *
     * @param {string} cardType - Identifiant du type (ex: 'widget:counter')
     */
    register(cardType) {
        const wasActive = this._activeTypes.has(cardType);
        this._activeTypes.add(cardType);
        this._updateStyles();

        // Si le type vient d'être activé, notifie les plugins
        // pour qu'ils se ré-attachent aux cartes existantes
        if (!wasActive) {
            this._notifyExistingCards(cardType);
        }
    }

    /**
     * Déclenche le hook `card:typeActivated` pour chaque carte
     * existante du type donné.
     *
     * @param {string} cardType
     * @private
     */
    _notifyExistingCards(cardType) {
        const existingCards = document.querySelectorAll(`.card[data-card-type="${cardType}"]`);

        for (const element of existingCards) {
            Hooks.doAction('card:typeActivated', {
                cardType,
                cardId: element.dataset.id,
                element,
            });
        }
    }

    /**
     * Désenregistre un type de carte.
     * Les cartes de ce type seront masquées.
     *
     * @param {string} cardType - Identifiant du type
     */
    unregister(cardType) {
        // Ne jamais désenregistrer 'standard'
        if (cardType === 'standard') {
            return;
        }
        this._activeTypes.delete(cardType);
        this._updateStyles();
    }

    /**
     * Vérifie si un type de carte est actif.
     *
     * @param {string} cardType
     * @returns {boolean}
     */
    isActive(cardType) {
        return this._activeTypes.has(cardType);
    }

    /**
     * Retourne tous les types actifs.
     *
     * @returns {string[]}
     */
    getActiveTypes() {
        return [...this._activeTypes];
    }

    /**
     * Met à jour le <style> pour masquer les cartes dont le type
     * n'est pas dans le registre.
     *
     * Utilise l'attribut data-card-type sur les cartes.
     *
     * @private
     */
    _updateStyles() {
        // Crée l'élément style s'il n'existe pas
        if (!this._styleElement) {
            this._styleElement = document.createElement('style');
            this._styleElement.id = 'card-type-registry-styles';
            document.head.appendChild(this._styleElement);
        }

        // Collecte tous les types de cartes widget connus (depuis le DOM)
        const allCardTypes = new Set();
        document.querySelectorAll('.card[data-card-type]').forEach((el) => {
            allCardTypes.add(el.dataset.cardType);
        });

        // Génère le CSS pour masquer les types inactifs
        const rules = [];
        for (const cardType of allCardTypes) {
            if (!this._activeTypes.has(cardType)) {
                // Masque les cartes de ce type
                rules.push(`.card[data-card-type="${cardType}"] { display: none !important; }`);
            }
        }

        this._styleElement.textContent = rules.join('\n');
    }

    /**
     * Force une mise à jour des styles.
     * Utile après un re-render du board.
     */
    refresh() {
        this._updateStyles();
    }
}

import Container from '../Container.js';

const cardTypeRegistry = new CardTypeRegistry();
Container.set('CardTypeRegistry', cardTypeRegistry);

export { CardTypeRegistry };
export default cardTypeRegistry;
