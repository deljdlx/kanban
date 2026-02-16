/**
 * hookDefinitions — Déclaration des hooks du core.
 *
 * Ce fichier déclare les hooks fournis par l'application elle-même.
 * Les plugins peuvent aussi déclarer leurs propres hooks via leur manifest.json :
 *
 *   {
 *       "hooks": {
 *           "provides": [
 *               "monPlugin:eventA",
 *               { "name": "monPlugin:eventB", "label": "...", "notification": { ... } }
 *           ],
 *           "listens": ["board:rendered"]
 *       }
 *   }
 *
 * Le PluginManager enregistre automatiquement les hooks "provides"
 * lors du register() du plugin, avec leurs métadonnées.
 *
 * Formats supportés :
 *   - string          : nom du hook, pas de métadonnées
 *   - { name, ... }   : nom + métadonnées (label, category, notification, etc.)
 *
 * Convention de nommage :
 *   - Core hooks : "domaine:action" (ex: "board:rendered")
 *   - Plugin hooks : "pluginName:action" (ex: "boardNotes:created")
 */
import Hooks from './HookRegistry.js';

const KNOWN_HOOKS = [
    // ---------------------------------------------------------------
    // Board lifecycle
    // ---------------------------------------------------------------
    {
        name: 'board:willChange',
        label: 'Changement de board imminent',
        category: 'Board',
        payload: {
            currentBoardId: 'string|null — ID du board actuel (null si premier chargement)',
            nextBoardId: 'string — ID du board qui va être chargé',
        },
    },
    {
        name: 'board:didChange',
        label: 'Board changé',
        category: 'Board',
        payload: {
            previousBoardId: 'string|null — ID du board précédent (null si premier chargement)',
            board: 'Board — le nouveau board chargé',
        },
    },
    'board:afterLoad',
    {
        name: 'board:rendered',
        label: 'Board rendu (chaque render)',
        category: 'Board',
        payload: {
            board: 'Board — le board affiché',
            element: "HTMLElement — l'élément .board dans le DOM",
        },
    },
    {
        name: 'board:displayed',
        label: 'Board affiché (premier render uniquement)',
        category: 'Board',
        payload: {
            board: 'Board — le board affiché',
            element: "HTMLElement — l'élément .board dans le DOM",
        },
    },
    'board:beforeSave',
    {
        name: 'board:saved',
        label: 'Sauvegarde réussie',
        category: 'Board',
        payload: {
            board: 'Board — le board sauvegardé',
        },
        notification: {
            type: 'success',
            duration: 2000,
            template: 'Board sauvegardé',
            variables: {},
        },
    },
    {
        name: 'board:saveFailed',
        label: 'Erreur de sauvegarde',
        category: 'Board',
        payload: {
            error: 'Error — erreur de persistence { message }',
        },
        notification: {
            type: 'error',
            duration: 5000,
            template: 'Erreur de sauvegarde : {error}',
            variables: { error: 'error.message' },
        },
    },

    // ---------------------------------------------------------------
    // Header
    // ---------------------------------------------------------------
    {
        name: 'header:renderActions',
        label: 'Injection dans les actions du header',
        category: 'Header',
        payload: {
            container: 'HTMLElement — le div.app-header-actions',
            board: 'Board — le board courant',
        },
    },

    // ---------------------------------------------------------------
    // Card data
    // ---------------------------------------------------------------
    'card:beforeCreate',
    {
        name: 'card:beforeDelete',
        label: 'Avant suppression de carte',
        category: 'Cartes',
        payload: {
            value: 'boolean — retourner false pour bloquer la suppression',
            card: 'Card { id, title }',
            column: 'Column { id, title }',
        },
    },
    {
        name: 'card:beforeMove',
        label: 'Avant déplacement de carte',
        category: 'Cartes',
        payload: {
            value: 'boolean — retourner false pour bloquer le déplacement',
            card: 'Card { id, title }',
            fromColumn: 'Column { id, title }',
            toColumn: 'Column { id, title }',
            newIndex: 'number',
        },
    },
    {
        name: 'card:created',
        label: 'Carte créée',
        category: 'Cartes',
        payload: {
            card: 'Card { id, title, description, tags, type }',
            column: 'Column { id, title } — colonne cible',
        },
        notification: {
            type: 'success',
            template: 'Carte "{title}" créée',
            variables: { title: 'card.title' },
        },
    },
    'card:beforeUpdate',
    {
        name: 'card:updated',
        label: 'Carte modifiée',
        category: 'Cartes',
        payload: {
            card: 'Card { id, title, description, tags, type }',
        },
    },
    {
        name: 'card:deleted',
        label: 'Carte supprimée',
        category: 'Cartes',
        payload: {
            card: 'Card { id, title, description, tags, type }',
            column: 'Column { id, title }',
        },
        notification: {
            type: 'info',
            template: 'Carte "{title}" supprimée',
            variables: { title: 'card.title' },
        },
    },
    {
        name: 'card:moved',
        label: 'Carte déplacée',
        category: 'Cartes',
        payload: {
            card: 'Card { id, title, description, tags, type }',
            fromColumn: 'Column { id, title } — colonne source',
            toColumn: 'Column { id, title } — colonne destination',
        },
        notification: {
            type: 'info',
            duration: 2000,
            template: 'Carte déplacée vers "{column}"',
            variables: { title: 'card.title', column: 'toColumn.title' },
        },
    },

    // ---------------------------------------------------------------
    // Card rendering
    // ---------------------------------------------------------------
    'card:beforeRender',
    'card:renderBody', // Permet aux plugins de prendre le contrôle du rendu (widgets)
    'card:rendered',
    'card:beforeDestroy', // Appelé avant suppression d'un élément DOM de carte (cleanup listeners)
    'card:typeActivated', // Appelé pour chaque carte quand son type est (ré)activé (plugin enabled)

    // ---------------------------------------------------------------
    // Colonnes
    // ---------------------------------------------------------------
    {
        name: 'column:added',
        label: 'Colonne ajoutée',
        category: 'Colonnes',
        payload: {
            column: 'Column { id, title }',
            board: 'Board',
        },
        notification: {
            type: 'success',
            template: 'Colonne "{title}" ajoutée',
            variables: { title: 'column.title' },
        },
    },
    {
        name: 'column:renamed',
        label: 'Colonne renommée',
        category: 'Colonnes',
        payload: {
            column: 'Column { id, title }',
            oldTitle: 'string',
            newTitle: 'string',
        },
    },
    {
        name: 'column:beforeRemove',
        label: 'Avant suppression de colonne',
        category: 'Colonnes',
        payload: {
            value: 'boolean — retourner false pour bloquer la suppression',
            column: 'Column { id, title }',
            board: 'Board',
            targetColumnId: 'string|null — colonne cible pour la migration des cartes',
        },
    },
    {
        name: 'column:removed',
        label: 'Colonne supprimée',
        category: 'Colonnes',
        payload: {
            column: 'Column { id, title }',
            board: 'Board',
        },
        notification: {
            type: 'info',
            template: 'Colonne "{title}" supprimée',
            variables: { title: 'column.title' },
        },
    },
    'column:renderHeader', // Injection plugins dans le header de colonne
    'column:renderBody', // Injection plugins après les cartes

    // ---------------------------------------------------------------
    // Content rendering (permet aux plugins de transformer le rendu)
    // ---------------------------------------------------------------
    'render:description',
    'render:comment',

    // ---------------------------------------------------------------
    // Modales
    // ---------------------------------------------------------------
    // modal:addCard:opened context:
    //   - registerCardType(typeId, label, buildPanel) : enregistre un type de carte widget
    //   - pluginsSlot : HTMLElement pour injecter du contenu
    //   - onClose(fn) : enregistre un callback de nettoyage
    //   - addTab(label, { order }) : ajoute un onglet trié par order (défaut 10)
    'modal:addCard:opened',
    'modal:editCard:opened',
    // modal:cardDetail:renderContent context:
    //   - card : le modèle Card
    //   - panel : HTMLElement du panneau "Informations" à remplir
    //   - handled : mettre à true pour bloquer le rendu standard
    'modal:cardDetail:renderContent',

    // modal:appSettings:opened context:
    //   - registerTab(id, label, buildPanel) : enregistre un onglet dans la modale
    //   - onClose(fn) : enregistre un callback de nettoyage
    'modal:appSettings:opened',

    // modal:boardSettings:opened context:
    //   - registerTab(id, label, buildPanel) : enregistre un onglet dans la modale
    //   - board : instance du Board
    //   - onClose(fn) : enregistre un callback de nettoyage
    'modal:boardSettings:opened',

    // modal:boardSettings:general context:
    //   - panel : HTMLElement zone d'injection dans l'onglet Général
    //   - board : instance du Board
    //   Permet aux plugins d'ajouter des champs dans l'onglet Général.
    'modal:boardSettings:general',

    // ---------------------------------------------------------------
    // Backend sync (SyncService)
    // ---------------------------------------------------------------
    {
        name: 'sync:queued',
        label: 'Opérations ajoutées à la queue de sync',
        category: 'Sync',
        payload: {
            boardId: 'string — ID du board',
            opsCount: "number — nombre d'opérations enqueued",
        },
    },
    {
        name: 'sync:pushed',
        label: 'Opérations envoyées au backend',
        category: 'Sync',
        payload: {
            boardId: 'string — ID du board',
            opsCount: "number — nombre d'opérations envoyées",
            serverRevision: 'number — révision serveur après push',
        },
    },
    {
        name: 'sync:pushFailed',
        label: "Erreur d'envoi au backend",
        category: 'Sync',
        payload: {
            boardId: 'string — ID du board',
            error: "string — message d'erreur",
            retryCount: 'number — nombre de tentatives',
        },
    },
    {
        name: 'sync:pulled',
        label: 'Changements distants appliqués',
        category: 'Sync',
        payload: {
            boardId: 'string — ID du board',
            opsCount: "number — nombre d'opérations appliquées",
            serverRevision: 'number — révision serveur',
        },
    },
    {
        name: 'sync:pullFailed',
        label: 'Erreur de récupération des changements distants',
        category: 'Sync',
        payload: {
            boardId: 'string — ID du board',
            error: "string — message d'erreur",
        },
    },
    {
        name: 'sync:online',
        label: 'Navigateur reconnecté',
        category: 'Sync',
        payload: {
            boardId: 'string|null — ID du board courant',
        },
    },

    // ---------------------------------------------------------------
    // Authentification
    // ---------------------------------------------------------------
    {
        name: 'auth:login',
        label: 'Connexion réussie',
        category: 'Auth',
        payload: {
            userId: "string — ID de l'utilisateur connecté",
        },
    },
    {
        name: 'auth:beforeLogout',
        label: 'Avant déconnexion (token encore disponible)',
        category: 'Auth',
        payload: {},
    },
    {
        name: 'auth:logout',
        label: 'Déconnexion',
        category: 'Auth',
        payload: {},
    },
    {
        name: 'auth:tokenExpired',
        label: 'Token expiré (401 intercepté)',
        category: 'Auth',
        payload: {},
    },

    // NB : les hooks sync:applied, workflow:ruleTriggered et workflow:ruleError
    // sont déclarés dans les manifest.json de leurs plugins respectifs
    // (LiveSyncPlugin, WorkflowPlugin). Le PluginManager les enregistre
    // automatiquement au register() avec leurs métadonnées (label, payload, etc.).
];

// Enregistre chaque hook dans le HookRegistry (avec métadonnées si fournies)
KNOWN_HOOKS.forEach((entry) => {
    if (typeof entry === 'string') {
        Hooks.registerHook(entry);
    } else {
        Hooks.registerHook(entry.name, entry);
    }
});

export default KNOWN_HOOKS;
