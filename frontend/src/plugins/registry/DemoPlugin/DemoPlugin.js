/**
 * DemoPlugin — Affiche "Modifié il y a X min" sur chaque carte du board.
 *
 * Ce plugin sert de template richement commenté pour créer un nouveau plugin.
 * Il illustre les principaux patterns du système de plugins :
 *
 *   - Filtres (applyFilters) : board:afterLoad, card:beforeRender
 *   - Actions (doAction)     : card:updated, card:created, modal:addCard:opened
 *   - MutationObserver       : détecte les cartes ajoutées au DOM
 *   - Persistance settings   : localStorage pour le toggle on/off
 *   - Onglet modale          : addTab() + onClose() + hook temporaire
 *
 * Flux des hooks :
 *
 *   board:afterLoad (filter)
 *     │  Scanne data.columns[].cards[].history
 *     │  → remplit _lastModifiedDates (cardId → ISO date)
 *     ▼
 *   card:created / card:updated (action)
 *     │  Met à jour _lastModifiedDates[cardId] = now
 *     │  → rafraîchit le DOM via _processCard()
 *     ▼
 *   card:beforeRender (filter)
 *     │  Enrichit renderData.lastModified (pattern démo)
 *     ▼
 *   MutationObserver sur .board
 *     │  Détecte les cartes ajoutées au DOM
 *     │  → appelle _processCard() pour injecter le <span>
 *     ▼
 *   modal:addCard:opened (action)
 *        Ajoute un onglet "Demo" dans la modale de création
 *        avec un hook temporaire nettoyé via onClose()
 */

import StorageService from '../../../services/StorageService.js';
import { formatTimeAgo } from '../../../utils/date.js';

/** @type {string} Clé de stockage pour le toggle on/off */
const STORAGE_KEY = 'kanban:demoTimestamp:enabled';

const DemoPlugin = {
    // ---------------------------------------------------------------
    // Propriétés
    // ---------------------------------------------------------------

    /**
     * Reference au HookRegistry (pour les hooks dynamiques).
     * @type {Object|null}
     */
    _hooksRegistry: null,

    /**
     * Indique si l'affichage des timestamps est activé.
     * Persisté dans localStorage via _loadSettings/_saveSettings.
     * @type {boolean}
     */
    _enabled: true,

    /**
     * Observe le `.board` pour détecter les cartes ajoutées dynamiquement.
     * Pourquoi un MutationObserver ? Parce que les cartes peuvent être
     * ajoutées au DOM par le drag-and-drop ou par un rebuild du board,
     * sans passer par un hook explicite.
     * @type {MutationObserver|null}
     */
    _boardObserver: null,

    /**
     * Map cardId → date ISO de dernière modification.
     * Remplie au chargement du board (filtre board:afterLoad) puis mise
     * à jour par les actions card:created et card:updated.
     * Pourquoi une map séparée ? Pour éviter de modifier les données du model
     * et garder le plugin totalement isolé.
     * @type {Object<string, string>}
     */
    _lastModifiedDates: {},

    /**
     * Référence à l'élément <style> injecté, pour pouvoir le retirer à l'uninstall.
     * Câblé automatiquement par PluginAssembler si un module styles est fourni.
     * @type {HTMLStyleElement|null}
     */
    _styleEl: null,

    /**
     * Références aux callbacks de hooks, stockées pour pouvoir les retirer
     * proprement à l'uninstall (removeAction / removeFilter).
     * @type {Object}
     */
    _handlers: {
        onBoardWillChange: null,
        onBoardAfterLoad: null,
        onCardUpdated: null,
        onCardCreated: null,
        onCardBeforeRender: null,
        onAddCardOpened: null,
    },

    // ---------------------------------------------------------------
    // Lifecycle : install / uninstall
    // ---------------------------------------------------------------

    /**
     * Point d'entrée du plugin. Appelé par PluginManager.register().
     *
     * Enregistre tous les hooks et initialise l'observation du DOM.
     *
     * @param {import('../../HookRegistry.js').default} hooks - Le HookRegistry singleton
     * @returns {Promise<void>}
     */
    async install(hooks) {
        this._hooksRegistry = hooks;
        await this._loadSettings();
        this._injectStyles();

        // --- Hook board:willChange ---
        // Cleanup avant switch de board
        this._handlers.onBoardWillChange = () => this._resetBoardState();
        hooks.addAction('board:willChange', this._handlers.onBoardWillChange);

        // --- Filtre board:afterLoad ---
        // Scanne l'historique de chaque carte pour pré-remplir _lastModifiedDates.
        // Ce filtre est appelé dans BoardService.fetchBoard() après le chargement des données.
        this._handlers.onBoardAfterLoad = (data) => {
            this._lastModifiedDates = {};
            const columns = data.columns || [];
            for (const col of columns) {
                for (const card of col.cards || []) {
                    const history = card.history || [];
                    if (history.length > 0) {
                        // La dernière entrée d'historique = dernière modification
                        const lastEntry = history[history.length - 1];
                        this._lastModifiedDates[card.id] = lastEntry.date;
                    }
                }
            }
            // Un filtre doit toujours retourner la valeur (même non modifiée)
            return data;
        };
        hooks.addFilter('board:afterLoad', this._handlers.onBoardAfterLoad);

        // --- Action card:updated ---
        // Quand une carte est modifiée, on met à jour la date et on rafraîchit le DOM.
        this._handlers.onCardUpdated = ({ card }) => {
            this._lastModifiedDates[card.id] = new Date().toISOString();
            this._processCardById(card.id);
        };
        hooks.addAction('card:updated', this._handlers.onCardUpdated);

        // --- Action card:created ---
        // Quand une carte est créée, on enregistre la date de création.
        this._handlers.onCardCreated = ({ card }) => {
            this._lastModifiedDates[card.id] = new Date().toISOString();
            this._processCardById(card.id);
        };
        hooks.addAction('card:created', this._handlers.onCardCreated);

        // --- Filtre card:beforeRender ---
        // Enrichit les données de rendu avec lastModified.
        // Ce filtre n'est pas utilisé directement pour le DOM ici,
        // mais montre le pattern de transformation de données via filter.
        this._handlers.onCardBeforeRender = (renderData) => {
            if (renderData && renderData.id) {
                renderData.lastModified = this._lastModifiedDates[renderData.id] || null;
            }
            return renderData;
        };
        hooks.addFilter('card:beforeRender', this._handlers.onCardBeforeRender);

        // --- Action modal:addCard:opened ---
        // Ajoute un onglet "Demo" dans la modale de création.
        // Montre le pattern complet : addTab + onClose + hook temporaire.
        this._handlers.onAddCardOpened = ({ addTab, onClose }) => {
            const panel = addTab('Demo');
            this._injectModalTab(panel, onClose);
        };
        hooks.addAction('modal:addCard:opened', this._handlers.onAddCardOpened);

        // --- Observation du DOM ---
        this._setupBoardObserver();
        this._processAllCards();
    },

    /**
     * Retire tous les hooks et nettoie le DOM.
     * Appelé par PluginManager.unregister() ou .disable().
     *
     * @param {import('../../HookRegistry.js').default} hooks - Le HookRegistry singleton
     */
    uninstall(hooks) {
        this._resetBoardState();

        // Retire le <style> injecté
        if (this._styleEl) {
            this._styleEl.remove();
            this._styleEl = null;
        }

        // Retire tous les hooks enregistrés
        if (this._handlers.onBoardWillChange) {
            hooks.removeAction('board:willChange', this._handlers.onBoardWillChange);
        }
        if (this._handlers.onBoardAfterLoad) {
            hooks.removeFilter('board:afterLoad', this._handlers.onBoardAfterLoad);
        }
        if (this._handlers.onCardUpdated) {
            hooks.removeAction('card:updated', this._handlers.onCardUpdated);
        }
        if (this._handlers.onCardCreated) {
            hooks.removeAction('card:created', this._handlers.onCardCreated);
        }
        if (this._handlers.onCardBeforeRender) {
            hooks.removeFilter('card:beforeRender', this._handlers.onCardBeforeRender);
        }
        if (this._handlers.onAddCardOpened) {
            hooks.removeAction('modal:addCard:opened', this._handlers.onAddCardOpened);
        }
    },

    /**
     * Remet à zéro l'état lié au board courant.
     * Appelé lors du switch de board et dans uninstall().
     *
     * @private
     */
    _resetBoardState() {
        // Déconnecte le MutationObserver
        if (this._boardObserver) {
            this._boardObserver.disconnect();
            this._boardObserver = null;
        }

        // Vide la map des dates
        this._lastModifiedDates = {};

        // Retire tous les timestamps du DOM
        document.querySelectorAll('.demo-timestamp').forEach((el) => el.remove());
    },

    // ---------------------------------------------------------------
    // Persistance des settings
    // ---------------------------------------------------------------

    /**
     * Charge le réglage on/off depuis IndexedDB.
     * Par défaut activé (true) si rien n'est stocké.
     *
     * @returns {Promise<void>}
     * @private
     */
    async _loadSettings() {
        this._enabled = await StorageService.get(STORAGE_KEY, true);
    },

    /**
     * Persiste le réglage on/off via StorageService.
     *
     * @returns {Promise<void>}
     * @private
     */
    async _saveSettings() {
        await StorageService.set(STORAGE_KEY, this._enabled);
    },

    // ---------------------------------------------------------------
    // Observation du DOM (MutationObserver)
    // ---------------------------------------------------------------

    /**
     * Met en place un MutationObserver sur l'élément `.board`.
     *
     * Pourquoi observer le DOM plutôt que se fier uniquement aux hooks ?
     * Parce que certaines opérations (drag-and-drop, rebuild complet)
     * ajoutent des éléments au DOM sans déclencher card:created.
     * L'observer garantit que chaque carte visible reçoit son timestamp.
     *
     * @private
     */
    _setupBoardObserver() {
        const board = document.querySelector('.board');
        if (!board) return;

        this._boardObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;

                    // Carte ajoutée directement
                    if (node.classList.contains('card') && node.dataset.id) {
                        this._processCard(node);
                    }

                    // Cartes imbriquées (ex: colonne entière ajoutée)
                    const nested = node.querySelectorAll('.card[data-id]');
                    nested.forEach((card) => this._processCard(card));
                }
            }
        });

        this._boardObserver.observe(board, { childList: true, subtree: true });
    },

    // ---------------------------------------------------------------
    // Traitement des cartes
    // ---------------------------------------------------------------

    /**
     * Traite toutes les cartes actuellement dans le DOM.
     * Appelé à l'install et après un changement de settings.
     *
     * @private
     */
    _processAllCards() {
        document.querySelectorAll('.card[data-id]').forEach((card) => {
            this._processCard(card);
        });
    },

    /**
     * Traite une carte par son ID (cherche l'élément DOM correspondant).
     * Utile quand on connaît l'ID mais pas l'élément (hooks card:created/updated).
     *
     * @param {string} cardId
     * @private
     */
    _processCardById(cardId) {
        const cardEl = document.querySelector(`.board .card[data-id="${cardId}"]`);
        if (cardEl) {
            this._processCard(cardEl);
        }
    },

    /**
     * Traite une carte individuelle : injecte ou met à jour le timestamp,
     * ou le retire si le plugin est désactivé.
     *
     * @param {HTMLElement} cardEl - L'élément DOM de la carte (.card[data-id])
     * @private
     */
    _processCard(cardEl) {
        const cardId = cardEl.dataset.id;
        const isoDate = this._lastModifiedDates[cardId];
        let span = cardEl.querySelector('.demo-timestamp');

        // Si désactivé ou pas de date : on retire le span s'il existe
        if (!this._enabled || !isoDate) {
            if (span) span.remove();
            return;
        }

        // Crée le span s'il n'existe pas encore
        if (!span) {
            span = document.createElement('span');
            span.className = 'demo-timestamp';
            cardEl.appendChild(span);
        }

        span.textContent = formatTimeAgo(isoDate);
    },

    // ---------------------------------------------------------------
    // Onglet modale de création
    // ---------------------------------------------------------------

    /**
     * Injecte le contenu de l'onglet "Demo" dans la modale de création.
     *
     * Montre le pattern complet d'un onglet modale :
     *   1. Construire l'UI dans le panel fourni par addTab()
     *   2. Enregistrer un hook temporaire (card:created) pour agir à la soumission
     *   3. Utiliser onClose() pour nettoyer le hook temporaire à la fermeture
     *
     * @param {HTMLElement} panel  - Conteneur de l'onglet (fourni par addTab)
     * @param {Function}    onClose - Enregistre un callback de nettoyage
     * @private
     */
    _injectModalTab(panel, onClose) {
        // Checkbox : activer le timestamp pour la carte en cours de création
        const wrapper = document.createElement('label');
        wrapper.className = 'checkbox-row';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = this._enabled;

        const text = document.createElement('span');
        text.textContent = 'Activer le timestamp pour cette carte';

        wrapper.appendChild(checkbox);
        wrapper.appendChild(text);
        panel.appendChild(wrapper);

        // Hook temporaire : à la création de la carte, enregistre la date
        // si la checkbox est cochée
        const onCreated = ({ card }) => {
            if (checkbox.checked) {
                this._lastModifiedDates[card.id] = new Date().toISOString();
                this._processCardById(card.id);
            }
        };

        // Utilise la référence au HookRegistry stockée à l'install
        // (évite d'importer Hooks directement, respecte le contrat du plugin)
        if (this._hooksRegistry) {
            this._hooksRegistry.addAction('card:created', onCreated);

            // Nettoyage : retire le hook temporaire quand la modale se ferme.
            // Sans ce cleanup, le callback resterait enregistré indéfiniment
            // et serait appelé pour chaque future création de carte.
            if (onClose) {
                onClose(() => this._hooksRegistry.removeAction('card:created', onCreated));
            }
        }
    },
};

export default DemoPlugin;
