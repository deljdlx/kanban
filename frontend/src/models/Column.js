/**
 * Column — Modèle d'une colonne du Kanban.
 *
 * Contient une liste ordonnée de Card et émet 'change' à chaque
 * mutation (ajout, suppression, réordonnancement de cartes).
 */
import EventEmitter from '../lib/EventEmitter.js';

export default class Column extends EventEmitter {
    /**
     * @type {string}
     */
    _id;

    /**
     * @type {string}
     */
    _title;

    /**
     * @type {import('./Card.js').default[]}
     */
    _cards;

    /**
     * Données des plugins, par colonne.
     *
     * Chaque plugin peut stocker ses données ici via une clé unique.
     * Ex: pluginData['wip-limit'] pour les limites WIP.
     *
     * @type {Object<string, any>}
     */
    _pluginData;

    /**
     * @param {Object} data
     * @param {string} data.id
     * @param {string} data.title
     * @param {import('./Card.js').default[]} data.cards
     * @param {Object<string, any>} [data.pluginData]
     */
    constructor({ id, title, cards, pluginData = {} }) {
        super();
        this._id = id;
        this._title = title;
        this._cards = [...cards];
        this._pluginData = { ...pluginData };
    }

    /** @returns {string} */
    get id() {
        return this._id;
    }

    /** @returns {string} */
    get title() {
        return this._title;
    }

    /** @returns {import('./Card.js').default[]} Copie du tableau de cartes */
    get cards() {
        return [...this._cards];
    }

    /** @returns {number} Nombre de cartes dans la colonne */
    get count() {
        return this._cards.length;
    }

    /**
     * Données des plugins (copie shallow).
     * Pour une mutation safe, utiliser setPluginData(key, value).
     * @returns {Object<string, any>}
     */
    get pluginData() {
        return { ...this._pluginData };
    }

    /**
     * Accès direct interne aux données des plugins (par référence).
     * Réservé au code qui a besoin de muter en place (ex: ColorPlugin).
     * @returns {Object<string, any>}
     */
    get pluginDataRef() {
        return this._pluginData;
    }

    /**
     * Définit une valeur dans les données des plugins et émet 'change'.
     *
     * @param {string} key - Clé du plugin
     * @param {*} value - Valeur à stocker
     */
    setPluginData(key, value) {
        this._pluginData[key] = value;
        this.emit('change');
    }

    /**
     * Retrouve une carte par son id (sans la retirer).
     *
     * @param {string} cardId
     * @returns {import('./Card.js').default|undefined}
     */
    getCardById(cardId) {
        return this._cards.find((card) => card.id === cardId);
    }

    /**
     * Ajoute une carte à la position donnée.
     *
     * @param {import('./Card.js').default} card  - Carte à ajouter
     * @param {number} [index]                    - Position d'insertion (fin par défaut)
     */
    addCard(card, index) {
        if (index === undefined) {
            this._cards.push(card);
        } else {
            this._cards.splice(index, 0, card);
        }
        this.emit('change');
    }

    /**
     * Retire une carte par son id et la retourne.
     *
     * @param {string} cardId - Id de la carte à retirer
     * @returns {import('./Card.js').default|undefined} La carte retirée
     */
    removeCard(cardId) {
        const index = this._cards.findIndex((card) => card.id === cardId);
        if (index === -1) {
            return undefined;
        }
        const [removed] = this._cards.splice(index, 1);
        this.emit('change');
        return removed;
    }

    /**
     * Met à jour le titre de la colonne.
     *
     * @param {string} newTitle - Le nouveau titre
     */
    updateTitle(newTitle) {
        this._title = newTitle;
        this.emit('change');
    }

    /**
     * Déplace une carte d'une position à une autre dans la même colonne.
     *
     * @param {number} fromIndex - Position actuelle
     * @param {number} toIndex   - Position cible
     * @param {string|null} [userId] - ID de l'utilisateur qui réordonne
     */
    moveCard(fromIndex, toIndex, userId = null) {
        const [card] = this._cards.splice(fromIndex, 1);
        this._cards.splice(toIndex, 0, card);

        if (fromIndex !== toIndex) {
            card.recordReorder(this._title, fromIndex, toIndex, userId);
        }

        this.emit('change');
    }

    /**
     * Remplace toutes les cartes de la colonne d'un coup.
     * Utilisé par LiveSyncPlugin pour appliquer les changements
     * reçus d'un autre onglet.
     *
     * @param {import('./Card.js').default[]} newCards - Nouvelles cartes
     */
    replaceCards(newCards) {
        this._cards = newCards;
        this.emit('change');
    }

    /**
     * Retourne une représentation brute de la colonne,
     * compatible avec le format attendu par le constructeur.
     *
     * @returns {{ id: string, title: string, cards: Object[], pluginData: Object }}
     */
    toJSON() {
        return {
            id: this._id,
            title: this._title,
            cards: this._cards.map((card) => card.toJSON()),
            pluginData: { ...this._pluginData },
        };
    }
}
