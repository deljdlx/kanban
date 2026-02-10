/**
 * Board — Modèle du plateau Kanban.
 *
 * Contient une liste ordonnée de Column. Gère les transferts de cartes
 * entre colonnes et le réordonnancement des colonnes.
 * Émet 'change' quand l'état est modifié.
 */
import EventEmitter from '../lib/EventEmitter.js';
import Hooks from '../plugins/HookRegistry.js';

export default class Board extends EventEmitter {
    /**
     * Nom du board.
     * @type {string}
     */
    _name;

    /**
     * Description du board.
     * @type {string}
     */
    _description;

    /**
     * Image de couverture (affichée sur la card HomeView).
     * @type {{ id: string }|null}
     */
    _coverImage;

    /**
     * Image de fond.
     * Format IndexedDB : { id: string } (référence vers IndexedDB)
     * Format legacy : string (dataURL base64)
     * @type {{ id: string }|string|null}
     */
    _backgroundImage;

    /**
     * Données des plugins.
     *
     * Chaque plugin peut stocker ses données ici via une clé unique.
     * Ex: pluginData['board-notes'] pour les notes.
     *
     * @type {Object<string, any>}
     */
    _pluginData;

    /**
     * @type {import('./Column.js').default[]}
     */
    _columns;

    /**
     * @param {import('./Column.js').default[]} columns
     * @param {Object} [options]
     * @param {string} [options.name]
     * @param {string} [options.description]
     * @param {{ id: string }|null} [options.coverImage]
     * @param {string|null} [options.backgroundImage]
     * @param {Object} [options.pluginData] - Données des plugins
     */
    /**
     * Handler lié pour le bubbling des events Column 'change'.
     * @type {Function}
     */
    _onColumnChangeBound;

    constructor(
        columns,
        { name = 'Kanban', description = '', coverImage = null, backgroundImage = null, pluginData = {} } = {},
    ) {
        super();
        this._name = name;
        this._description = description;
        this._coverImage = coverImage;
        this._backgroundImage = backgroundImage;
        this._pluginData = { ...pluginData };

        // Bubble : toute mutation d'une colonne (addCard, removeCard, moveCard...)
        // remonte comme 'change' sur le Board, évitant au consommateur de tracker
        // chaque colonne individuellement.
        this._onColumnChangeBound = () => this.emit('change');
        this._columns = [];
        for (const column of columns) {
            this._columns.push(column);
            column.on('change', this._onColumnChangeBound);
        }
    }

    // ---------------------------------------------------------------
    // Propriétés du board
    // ---------------------------------------------------------------

    /** @returns {string} Nom du board */
    get name() {
        return this._name;
    }

    /**
     * Modifie le nom du board.
     * @param {string} value
     */
    set name(value) {
        if (this._name !== value) {
            this._name = value;
            this.emit('change', { meta: true });
        }
    }

    /** @returns {string} Description du board */
    get description() {
        return this._description;
    }

    /**
     * Modifie la description du board.
     * @param {string} value
     */
    set description(value) {
        if (this._description !== value) {
            this._description = value;
            this.emit('change', { meta: true });
        }
    }

    /**
     * Image de couverture (référence IndexedDB).
     * @returns {{ id: string }|null}
     */
    get coverImage() {
        return this._coverImage;
    }

    /**
     * Modifie l'image de couverture.
     * @param {{ id: string }|null} value
     */
    set coverImage(value) {
        const isDifferent = JSON.stringify(this._coverImage) !== JSON.stringify(value);
        if (isDifferent) {
            this._coverImage = value;
            this.emit('change', { meta: true });
        }
    }

    /**
     * Retourne l'ID de l'image de couverture (ou null).
     * @returns {string|null}
     */
    get coverImageId() {
        if (this._coverImage && typeof this._coverImage === 'object') {
            return this._coverImage.id || null;
        }
        return null;
    }

    /**
     * Image de fond (référence IndexedDB ou dataURL legacy).
     * @returns {{ id: string }|string|null}
     */
    get backgroundImage() {
        return this._backgroundImage;
    }

    /**
     * Modifie l'image de fond.
     * @param {{ id: string }|string|null} value
     */
    set backgroundImage(value) {
        // Comparaison profonde pour les objets
        const isDifferent = JSON.stringify(this._backgroundImage) !== JSON.stringify(value);
        if (isDifferent) {
            this._backgroundImage = value;
            this.emit('change', { meta: true });
        }
    }

    /**
     * Retourne l'ID de l'image de fond (ou null).
     * Utile pour récupérer l'URL via ImageStorageService.
     * @returns {string|null}
     */
    get backgroundImageId() {
        if (this._backgroundImage && typeof this._backgroundImage === 'object') {
            return this._backgroundImage.id || null;
        }
        return null;
    }

    /**
     * Vérifie si l'image de fond est au format legacy (dataURL inline).
     * @returns {boolean}
     */
    get hasLegacyBackgroundImage() {
        return typeof this._backgroundImage === 'string' && this._backgroundImage.startsWith('data:');
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
     * @param {string} key - Clé du plugin (ex: 'card-colors')
     * @param {*} value - Valeur à stocker
     */
    setPluginData(key, value) {
        this._pluginData[key] = value;
        this.emit('change');
    }

    /**
     * Supprime une clé des données des plugins et émet 'change'.
     *
     * @param {string} key - Clé du plugin à supprimer
     */
    removePluginData(key) {
        delete this._pluginData[key];
        this.emit('change');
    }

    // ---------------------------------------------------------------
    // Colonnes
    // ---------------------------------------------------------------

    /** @returns {import('./Column.js').default[]} Copie du tableau de colonnes */
    get columns() {
        return [...this._columns];
    }

    /**
     * Retrouve une colonne par son id.
     *
     * @param {string} id - Id de la colonne
     * @returns {import('./Column.js').default|undefined}
     */
    getColumnById(id) {
        return this._columns.find((col) => col.id === id);
    }

    /**
     * Retrouve une colonne par son titre.
     *
     * @param {string} title
     * @returns {import('./Column.js').default|undefined}
     */
    getColumnByTitle(title) {
        return this._columns.find((col) => col.title === title);
    }

    /**
     * Cherche une carte dans toutes les colonnes du board.
     *
     * Retourne la carte ET sa colonne parente : sans back-reference,
     * la plupart des appelants ont besoin des deux (ex: déplacement).
     * Si seule la carte est nécessaire : `board.getCardById(id)?.card`
     *
     * @param {string} cardId
     * @returns {{ card: import('./Card.js').default, column: import('./Column.js').default } | null}
     */
    getCardById(cardId) {
        for (const column of this._columns) {
            const card = column.getCardById(cardId);
            if (card) return { card, column };
        }
        return null;
    }

    /**
     * Ajoute une colonne à la fin du board.
     *
     * @param {import('./Column.js').default} column - La colonne à ajouter
     */
    addColumn(column) {
        this._columns.push(column);
        column.on('change', this._onColumnChangeBound);
        this.emit('change');
    }

    /**
     * Réordonne les colonnes du board.
     *
     * @param {number} fromIndex - Position actuelle de la colonne
     * @param {number} toIndex   - Position cible
     */
    moveColumn(fromIndex, toIndex) {
        const [column] = this._columns.splice(fromIndex, 1);
        this._columns.splice(toIndex, 0, column);
        this.emit('change');
    }

    /**
     * Supprime une colonne par son id.
     *
     * @param {string} columnId - Id de la colonne à supprimer
     */
    removeColumn(columnId) {
        const index = this._columns.findIndex((c) => c.id === columnId);
        if (index === -1) return;
        const [removed] = this._columns.splice(index, 1);
        removed.off('change', this._onColumnChangeBound);
        this.emit('change');
    }

    /**
     * Réordonne les colonnes selon un tableau d'ids.
     * Si un id est inconnu ou si la longueur ne correspond pas,
     * l'opération est ignorée (sécurité).
     *
     * @param {string[]} orderedIds - Ids des colonnes dans le nouvel ordre
     */
    reorderColumns(orderedIds) {
        const colMap = new Map(this._columns.map((c) => [c.id, c]));
        const reordered = orderedIds.map((id) => colMap.get(id)).filter(Boolean);
        if (reordered.length !== this._columns.length) return;
        this._columns = reordered;
        this.emit('change');
    }

    // ---------------------------------------------------------------
    // Cartes
    // ---------------------------------------------------------------

    /**
     * Itère toutes les cartes du board, toutes colonnes confondues.
     *
     * @yields {import('./Card.js').default}
     */
    *allCards() {
        for (const column of this._columns) {
            yield* column.cards;
        }
    }

    /**
     * Itère toutes les paires { card, column } du board.
     *
     * @yields {{ card: import('./Card.js').default, column: import('./Column.js').default }}
     */
    *entries() {
        for (const column of this._columns) {
            for (const card of column.cards) {
                yield { card, column };
            }
        }
    }

    /**
     * Filtre les cartes du board selon un prédicat.
     *
     * @param {function(import('./Card.js').default): boolean} predicate
     * @returns {import('./Card.js').default[]}
     */
    findCards(predicate) {
        return [...this.allCards()].filter(predicate);
    }

    /**
     * Filtre les colonnes du board selon un prédicat.
     *
     * @param {function(import('./Column.js').default): boolean} predicate
     * @returns {import('./Column.js').default[]}
     */
    findColumns(predicate) {
        return this._columns.filter(predicate);
    }

    /**
     * Transfère une carte d'une colonne à une autre (ou dans la même colonne).
     *
     * Flux : retire la carte de la colonne source, l'insère dans la colonne
     * cible à newIndex. Les deux colonnes émettent 'change' via
     * removeCard / addCard.
     *
     * @param {string} cardId       - Id de la carte à déplacer
     * @param {string} fromColumnId - Id de la colonne source
     * @param {string} toColumnId   - Id de la colonne cible
     * @param {number} newIndex     - Position d'insertion dans la colonne cible
     * @param {string|null} [userId] - Id de l'utilisateur qui fait le déplacement
     */
    moveCard(cardId, fromColumnId, toColumnId, newIndex, userId = null) {
        const fromColumn = this.getColumnById(fromColumnId);
        const toColumn = this.getColumnById(toColumnId);
        if (!fromColumn || !toColumn) return;

        const card = fromColumn.removeCard(cardId);
        if (card) {
            toColumn.addCard(card, newIndex);

            // Enregistre le déplacement dans l'historique de la carte
            if (fromColumnId !== toColumnId) {
                card.recordMove(fromColumn.title, toColumn.title, userId);
            }

            Hooks.doAction('card:moved', { card, fromColumn, toColumn });
        }
    }

    // ---------------------------------------------------------------
    // Sérialisation
    // ---------------------------------------------------------------

    /**
     * Retourne une représentation brute du board,
     * compatible avec le format attendu par BoardService.buildBoard().
     *
     * @returns {{ name: string, description: string, coverImage: { id: string }|null, backgroundImage: string|null, pluginData: Object, columns: Object[] }}
     */
    toJSON() {
        return {
            name: this._name,
            description: this._description,
            coverImage: this._coverImage,
            backgroundImage: this._backgroundImage,
            pluginData: { ...this._pluginData },
            columns: this._columns.map((col) => col.toJSON()),
        };
    }
}
