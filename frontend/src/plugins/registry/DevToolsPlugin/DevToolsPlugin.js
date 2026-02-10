/**
 * DevToolsPlugin — Expose `window.kanban` pour piloter le Kanban depuis la console.
 *
 * API namespacée : board, columns, cards, hooks, plugins, storage, filters, users, app.
 * Chaque namespace regroupe des méthodes liées à un domaine fonctionnel.
 *
 * Conçu pour être console-friendly : les mutations affichent un feedback
 * via console.log, et `kanban.help()` affiche l'aide formatée.
 */
import Application from '../../../Application.js';
import BoardService from '../../../services/BoardService.js';
import StorageService from '../../../services/StorageService.js';
import UserService from '../../../services/UserService.js';
import FilterStore from '../../../services/FilterStore.js';
import Hooks from '../../HookRegistry.js';
import PluginManager from '../../PluginManager.js';
import { generateId } from '../../../utils/id.js';

export default class DevToolsPlugin {
    /**
     * Installe le plugin : expose `window.kanban`.
     *
     * @param {import('../../HookRegistry.js').HookRegistry} _hooks
     */
    install(_hooks) {
        window.kanban = this._buildAPI();
    }

    /**
     * Désinstalle le plugin : retire `window.kanban`.
     *
     * @param {import('../../HookRegistry.js').HookRegistry} _hooks
     */
    uninstall(_hooks) {
        delete window.kanban;
    }

    // ---------------------------------------------------------------
    // Construction de l'API
    // ---------------------------------------------------------------

    /**
     * Construit l'objet API complet avec tous les namespaces.
     *
     * @returns {Object}
     * @private
     */
    _buildAPI() {
        return {
            board: this._buildBoardNamespace(),
            columns: this._buildColumnsNamespace(),
            cards: this._buildCardsNamespace(),
            hooks: this._buildHooksNamespace(),
            plugins: this._buildPluginsNamespace(),
            storage: this._buildStorageNamespace(),
            filters: this._buildFiltersNamespace(),
            users: this._buildUsersNamespace(),
            app: this._buildAppNamespace(),
            mappings: this._buildMappingsNamespace(),
            help: () => this._printHelp(),
        };
    }

    // ---------------------------------------------------------------
    // board.*
    // ---------------------------------------------------------------

    /**
     * @returns {Object}
     * @private
     */
    _buildBoardNamespace() {
        return {
            get: () => BoardService.getBoard(),

            id: () => BoardService.getCurrentBoardId(),

            meta: () => {
                const board = BoardService.getBoard();
                if (!board) return null;
                return {
                    name: board.name,
                    description: board.description,
                    coverImage: board.coverImage,
                    backgroundImage: board.backgroundImage,
                };
            },

            setName: (name) => {
                const board = BoardService.getBoard();
                if (!board) return;
                board.name = name;
                console.log(`\u2705 Board renommé : "${name}"`);
            },

            setDescription: (description) => {
                const board = BoardService.getBoard();
                if (!board) return;
                board.description = description;
                console.log('\u2705 Description mise à jour');
            },

            pluginData: () => {
                const board = BoardService.getBoard();
                return board ? board.pluginData : {};
            },

            setPluginData: (key, value) => {
                const board = BoardService.getBoard();
                if (!board) return;
                board.setPluginData(key, value);
                console.log(`\u2705 pluginData["${key}"] mis à jour`);
            },

            save: () => BoardService.save(),
        };
    }

    // ---------------------------------------------------------------
    // columns.*
    // ---------------------------------------------------------------

    /**
     * @returns {Object}
     * @private
     */
    _buildColumnsNamespace() {
        return {
            list: () => {
                const board = BoardService.getBoard();
                if (!board) return [];
                return board.columns.map((col) => ({
                    id: col.id,
                    title: col.title,
                    cardCount: col.count,
                }));
            },

            get: (id) => {
                const board = BoardService.getBoard();
                if (!board) return null;
                return board.getColumnById(id) || null;
            },

            add: (title) => {
                const col = BoardService.addColumn(title);
                console.log(`\u2705 Colonne ajoutée : "${title}" (${col.id})`);
                return col;
            },

            remove: (id, targetId = null) => {
                const result = BoardService.removeColumn(id, targetId);
                if (result) {
                    console.log(`\u2705 Colonne supprimée : ${id}`);
                } else {
                    console.log(`\u274c Suppression refusée ou colonne introuvable : ${id}`);
                }
                return result;
            },

            rename: (id, newTitle) => {
                BoardService.updateColumnTitle(id, newTitle);
                console.log(`\u2705 Colonne renommée : "${newTitle}"`);
            },
        };
    }

    // ---------------------------------------------------------------
    // cards.*
    // ---------------------------------------------------------------

    /**
     * @returns {Object}
     * @private
     */
    _buildCardsNamespace() {
        return {
            list: () => {
                const board = BoardService.getBoard();
                if (!board) return [];
                const result = [];
                for (const { card, column } of board.entries()) {
                    result.push({
                        id: card.id,
                        title: card.title,
                        column: column.title,
                        columnId: column.id,
                        assignee: card.assignee,
                        type: card.type,
                        tags: card.tags,
                    });
                }
                return result;
            },

            get: (id) => {
                const board = BoardService.getBoard();
                if (!board) return null;
                return board.getCardById(id);
            },

            find: (fn) => {
                const board = BoardService.getBoard();
                if (!board) return [];
                return board.findCards(fn);
            },

            search: (query) => {
                const board = BoardService.getBoard();
                if (!board) return [];
                const lower = query.toLowerCase();
                return board.findCards((card) => card.title.toLowerCase().includes(lower));
            },

            add: (colId, data, index) => {
                const cardData = { ...data };
                if (!cardData.id) {
                    cardData.id = generateId('card');
                }
                const card = BoardService.addCard(colId, cardData, index);
                if (card) {
                    console.log(`\u2705 Carte ajoutée : "${card.title}" (${card.id})`);
                } else {
                    console.log(`\u274c Échec : colonne "${colId}" introuvable`);
                }
                return card;
            },

            remove: (colId, cardId) => {
                const card = BoardService.removeCard(colId, cardId);
                if (card) {
                    console.log(`\u2705 Carte supprimée : "${card.title}"`);
                } else {
                    console.log(`\u274c Carte ou colonne introuvable`);
                }
                return card;
            },

            move: (cardId, from, to, index) => {
                const result = BoardService.moveCard(cardId, from, to, index);
                if (result) {
                    console.log(`\u2705 Carte déplacée : ${cardId}`);
                } else {
                    console.log(`\u274c Déplacement refusé ou carte introuvable`);
                }
                return result;
            },

            byAssignee: (userId) => {
                const board = BoardService.getBoard();
                if (!board) return [];
                return board.findCards((card) => card.assignee === userId);
            },

            byTag: (taxonomy, term) => {
                const board = BoardService.getBoard();
                if (!board) return [];
                return board.findCards((card) => {
                    const terms = card.tags[taxonomy];
                    return terms && terms.includes(term);
                });
            },
        };
    }

    // ---------------------------------------------------------------
    // hooks.*
    // ---------------------------------------------------------------

    /**
     * @returns {Object}
     * @private
     */
    _buildHooksNamespace() {
        return {
            list: () => {
                const registered = Hooks.getRegisteredHooks();
                const result = [];
                for (const [name, meta] of registered) {
                    result.push({
                        name,
                        label: meta.label || name,
                        category: meta.category || '',
                    });
                }
                return result;
            },

            meta: (hookName) => Hooks.getHookMeta(hookName),

            trigger: (name, ...args) => {
                Hooks.doAction(name, ...args);
                console.log(`\u2705 Hook déclenché : "${name}"`);
            },

            on: (name, cb, priority) => {
                Hooks.addAction(name, cb, priority);
                console.log(`\u2705 Listener ajouté sur "${name}"`);
            },

            off: (name, cb) => {
                Hooks.removeAction(name, cb);
                console.log(`\u2705 Listener retiré de "${name}"`);
            },
        };
    }

    // ---------------------------------------------------------------
    // plugins.*
    // ---------------------------------------------------------------

    /**
     * @returns {Object}
     * @private
     */
    _buildPluginsNamespace() {
        return {
            list: () => {
                return PluginManager.getAll().map((entry) => ({
                    name: entry.instance.name,
                    label: entry.instance.label || entry.instance.name,
                    installed: entry.installed,
                    error: entry.error ? entry.error.message : null,
                }));
            },

            get: (name) => PluginManager.getPlugin(name),

            isEnabled: (name) => PluginManager.isEnabled(name),

            enable: async (name) => {
                await PluginManager.enable(name);
                console.log(`\u2705 Plugin activé : "${name}"`);
            },

            disable: async (name) => {
                await PluginManager.disable(name);
                console.log(`\u2705 Plugin désactivé : "${name}"`);
            },
        };
    }

    // ---------------------------------------------------------------
    // storage.*
    // ---------------------------------------------------------------

    /**
     * @returns {Object}
     * @private
     */
    _buildStorageNamespace() {
        return {
            boards: async () => {
                const registry = await StorageService.getBoardRegistry();
                return (registry.boards || []).map((b) => ({
                    id: b.id,
                    name: b.name,
                    cardCount: b.cardCount ?? 0,
                    columnCount: b.columnCount ?? 0,
                }));
            },

            createBoard: async (name) => {
                const id = await StorageService.createBoard(name);
                console.log(`\u2705 Board créé : "${name}" (${id})`);
                return id;
            },

            deleteBoard: async (id) => {
                const result = await StorageService.deleteBoard(id);
                if (result) {
                    console.log(`\u2705 Board supprimé : ${id}`);
                } else {
                    console.log(`\u274c Board introuvable : ${id}`);
                }
                return result;
            },

            renameBoard: async (id, newName) => {
                const result = await StorageService.renameBoard(id, newName);
                if (result) {
                    console.log(`\u2705 Board renommé : "${newName}"`);
                } else {
                    console.log(`\u274c Board introuvable : ${id}`);
                }
                return result;
            },

            duplicateBoard: async (id) => {
                const newId = await StorageService.duplicateBoard(id);
                if (newId) {
                    console.log(`\u2705 Board dupliqué : ${newId}`);
                } else {
                    console.log(`\u274c Duplication échouée pour : ${id}`);
                }
                return newId;
            },

            get: (key, defaultValue) => StorageService.get(key, defaultValue),

            set: async (key, value) => {
                await StorageService.set(key, value);
                console.log(`\u2705 Setting sauvegardé : "${key}"`);
            },

            remove: async (key) => {
                await StorageService.remove(key);
                console.log(`\u2705 Setting supprimé : "${key}"`);
            },
        };
    }

    // ---------------------------------------------------------------
    // filters.*
    // ---------------------------------------------------------------

    /**
     * @returns {Object}
     * @private
     */
    _buildFiltersNamespace() {
        return {
            get: () => FilterStore.getFilters(),

            setAssignee: (userId) => {
                FilterStore.setFilter('assignee', userId);
                console.log(`\u2705 Filtre assignee : ${userId || 'aucun'}`);
            },

            setAuthor: (userId) => {
                FilterStore.setFilter('author', userId);
                console.log(`\u2705 Filtre author : ${userId || 'aucun'}`);
            },

            setTags: (tags) => {
                FilterStore.setFilter('tags', tags);
                console.log('\u2705 Filtre tags mis à jour');
            },

            reset: () => {
                FilterStore.reset();
                console.log('\u2705 Filtres réinitialisés');
            },

            hasActive: () => FilterStore.hasActiveFilters(),
        };
    }

    // ---------------------------------------------------------------
    // users.*
    // ---------------------------------------------------------------

    /**
     * @returns {Object}
     * @private
     */
    _buildUsersNamespace() {
        return {
            list: () => UserService.getUsers(),

            get: (id) => UserService.getUserById(id),

            current: () => UserService.getCurrentUser(),
        };
    }

    // ---------------------------------------------------------------
    // app.*
    // ---------------------------------------------------------------

    /**
     * @returns {Object}
     * @private
     */
    _buildAppNamespace() {
        return {
            openBoard: async (id) => {
                const app = Application.instance;
                if (!app) return;
                await app.openBoard(id);
                console.log(`\u2705 Board ouvert : ${id}`);
            },

            home: async () => {
                const app = Application.instance;
                if (!app) return;
                await app.showHome();
                console.log('\u2705 Page d\u2019accueil affichée');
            },

            explorer: async () => {
                const app = Application.instance;
                if (!app) return;
                await app.showExplorer();
                console.log('\u2705 Explorateur affiché');
            },
        };
    }

    // ---------------------------------------------------------------
    // mappings.*
    // ---------------------------------------------------------------

    /**
     * @returns {Object}
     * @private
     */
    _buildMappingsNamespace() {
        return {
            list: () => {
                const plugin = PluginManager.getPlugin('column-mapping');
                if (!plugin) return [];
                return plugin.listMappings();
            },

            add: async (localColId, sourceBoardId, sourceColId) => {
                const plugin = PluginManager.getPlugin('column-mapping');
                if (!plugin) {
                    console.log('\u274c Plugin column-mapping non trouvé');
                    return;
                }
                await plugin.addMapping(localColId, sourceBoardId, sourceColId);
                console.log('\u2705 Mapping ajouté');
            },

            remove: (index) => {
                const plugin = PluginManager.getPlugin('column-mapping');
                if (!plugin) {
                    console.log('\u274c Plugin column-mapping non trouvé');
                    return;
                }
                plugin.removeMapping(index);
                console.log(`\u2705 Mapping #${index} supprimé`);
            },

            clear: () => {
                const plugin = PluginManager.getPlugin('column-mapping');
                if (!plugin) {
                    console.log('\u274c Plugin column-mapping non trouvé');
                    return;
                }
                plugin.clearMappings();
                console.log('\u2705 Tous les mappings supprimés');
            },

            refresh: async () => {
                const plugin = PluginManager.getPlugin('column-mapping');
                if (!plugin) {
                    console.log('\u274c Plugin column-mapping non trouvé');
                    return;
                }
                await plugin.refresh();
                console.log('\u2705 Boards sources rechargés');
            },
        };
    }

    // ---------------------------------------------------------------
    // help()
    // ---------------------------------------------------------------

    /**
     * Affiche l'aide formatée dans la console.
     *
     * @private
     */
    _printHelp() {
        const titleStyle = 'font-weight:bold; font-size:14px; color:#6c63ff;';
        const sectionStyle = 'font-weight:bold; font-size:12px; color:#e67e22; margin-top:4px;';
        const codeStyle = 'color:#27ae60;';

        console.log('%cwindow.kanban — API DevTools', titleStyle);
        console.log('');

        console.log('%cboard.*', sectionStyle);
        console.log('%c  .get()                      %c Board model', codeStyle, '');
        console.log('%c  .id()                       %c Board ID', codeStyle, '');
        console.log(
            '%c  .meta()                     %c { name, description, coverImage, backgroundImage }',
            codeStyle,
            '',
        );
        console.log('%c  .setName(name)              %c Renomme le board', codeStyle, '');
        console.log('%c  .setDescription(d)          %c Change la description', codeStyle, '');
        console.log('%c  .pluginData()               %c Données des plugins', codeStyle, '');
        console.log('%c  .setPluginData(key, value)  %c Modifie une entrée plugin', codeStyle, '');
        console.log('%c  .save()                     %c Force la sauvegarde', codeStyle, '');
        console.log('');

        console.log('%ccolumns.*', sectionStyle);
        console.log('%c  .list()                     %c [{ id, title, cardCount }]', codeStyle, '');
        console.log('%c  .get(id)                    %c Column model', codeStyle, '');
        console.log('%c  .add(title)                 %c Crée une colonne', codeStyle, '');
        console.log('%c  .remove(id, targetId?)      %c Supprime (migre les cartes si targetId)', codeStyle, '');
        console.log('%c  .rename(id, newTitle)        %c Renomme une colonne', codeStyle, '');
        console.log('');

        console.log('%ccards.*', sectionStyle);
        console.log('%c  .list()                     %c [{ id, title, column, assignee, type, tags }]', codeStyle, '');
        console.log('%c  .get(id)                    %c { card, column } | null', codeStyle, '');
        console.log('%c  .find(fn)                   %c Filtre avec prédicat', codeStyle, '');
        console.log('%c  .search(query)              %c Recherche par titre (insensible à la casse)', codeStyle, '');
        console.log('%c  .add(colId, data, idx?)     %c Crée une carte (auto-ID)', codeStyle, '');
        console.log('%c  .remove(colId, cardId)      %c Supprime une carte', codeStyle, '');
        console.log('%c  .move(cardId, from, to, idx)%c Déplace entre colonnes', codeStyle, '');
        console.log('%c  .byAssignee(userId)         %c Cartes par assignee', codeStyle, '');
        console.log('%c  .byTag(taxonomy, term)      %c Cartes par tag', codeStyle, '');
        console.log('');

        console.log('%chooks.*', sectionStyle);
        console.log('%c  .list()                     %c [{ name, label, category }]', codeStyle, '');
        console.log("%c  .meta(hookName)             %c Métadonnées d'un hook", codeStyle, '');
        console.log('%c  .trigger(name, ...args)     %c Déclenche une action', codeStyle, '');
        console.log('%c  .on(name, cb, prio?)        %c Écoute un hook', codeStyle, '');
        console.log('%c  .off(name, cb)              %c Retire un listener', codeStyle, '');
        console.log('');

        console.log('%cplugins.*', sectionStyle);
        console.log('%c  .list()                     %c [{ name, label, installed, error }]', codeStyle, '');
        console.log('%c  .get(name)                  %c Instance du plugin', codeStyle, '');
        console.log('%c  .isEnabled(name)            %c Boolean', codeStyle, '');
        console.log('%c  .enable(name)               %c Active un plugin', codeStyle, '');
        console.log('%c  .disable(name)              %c Désactive un plugin', codeStyle, '');
        console.log('');

        console.log('%cstorage.*', sectionStyle);
        console.log('%c  .boards()                   %c Liste des boards', codeStyle, '');
        console.log('%c  .createBoard(name)          %c Crée un board', codeStyle, '');
        console.log('%c  .deleteBoard(id)            %c Supprime un board', codeStyle, '');
        console.log('%c  .renameBoard(id, name)      %c Renomme un board', codeStyle, '');
        console.log('%c  .duplicateBoard(id)         %c Duplique un board', codeStyle, '');
        console.log('%c  .get(key, default?)         %c Lit un setting', codeStyle, '');
        console.log('%c  .set(key, value)            %c Écrit un setting', codeStyle, '');
        console.log('%c  .remove(key)                %c Supprime un setting', codeStyle, '');
        console.log('');

        console.log('%cfilters.*', sectionStyle);
        console.log('%c  .get()                      %c { assignee, author, tags }', codeStyle, '');
        console.log('%c  .setAssignee(userId)        %c Filtre par assignee', codeStyle, '');
        console.log('%c  .setAuthor(userId)          %c Filtre par author', codeStyle, '');
        console.log('%c  .setTags(tags)              %c Filtre par tags', codeStyle, '');
        console.log('%c  .reset()                    %c Réinitialise les filtres', codeStyle, '');
        console.log('%c  .hasActive()                %c Boolean', codeStyle, '');
        console.log('');

        console.log('%cusers.*', sectionStyle);
        console.log('%c  .list()                     %c [{ id, name, initials, role }]', codeStyle, '');
        console.log('%c  .get(id)                    %c User | null', codeStyle, '');
        console.log('%c  .current()                  %c User courant', codeStyle, '');
        console.log('');

        console.log('%capp.*', sectionStyle);
        console.log('%c  .openBoard(id)              %c Ouvre un board', codeStyle, '');
        console.log("%c  .home()                     %c Retour à l'accueil", codeStyle, '');
        console.log("%c  .explorer()                 %c Ouvre l'explorateur IndexedDB", codeStyle, '');
        console.log('');

        console.log('%cmappings.*', sectionStyle);
        console.log(
            '%c  .list()                     %c [{ localColumnId, sourceBoardId, sourceColumnId }]',
            codeStyle,
            '',
        );
        console.log('%c  .add(colId, boardId, srcColId) %c Ajoute un mapping', codeStyle, '');
        console.log('%c  .remove(index)              %c Supprime un mapping par index', codeStyle, '');
        console.log('%c  .clear()                    %c Supprime tous les mappings', codeStyle, '');
        console.log('%c  .refresh()                  %c Recharge les boards sources (async)', codeStyle, '');
    }
}
