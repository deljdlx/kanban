/**
 * triggerDefs — Définitions des triggers disponibles pour les règles workflow.
 *
 * Chaque trigger correspond à un hook du core. Il fournit :
 *   - hook      : nom du hook à écouter
 *   - label     : nom lisible pour le dropdown
 *   - ctxHelp   : aide contextuelle affichée sous l'éditeur
 *   - sanitize  : transforme le payload brut (instances model) en objet plain
 *
 * Les 4 hooks les plus courants (card:*) ont des sanitizers spécifiques
 * et une aide contextuelle détaillée (KNOWN_TRIGGERS).
 * Tous les autres hooks découverts dynamiquement via HookRegistry
 * utilisent genericSanitize et une aide générique.
 */

/**
 * Extrait les champs utiles d'une carte (plain object, pas d'instance model).
 *
 * @param {Object} card - Instance ou objet carte
 * @returns {{ id: string, title: string, description: string, tags: Object, type: string }}
 */
function pickCard(card) {
    return {
        id: card.id,
        title: card.title,
        description: card.description || '',
        tags: card.tags ? { ...card.tags } : {},
        type: card.type || 'standard',
    };
}

/**
 * Extrait les champs utiles d'une colonne (plain object).
 *
 * @param {Object} column - Instance ou objet colonne
 * @returns {{ id: string, title: string }}
 */
function pickColumn(column) {
    return {
        id: column.id,
        title: column.title,
    };
}

/**
 * Sanitizer générique pour les hooks sans définition enrichie.
 *
 * Sérialise le payload via JSON round-trip : les models qui ont toJSON()
 * (Card, Column, Board) se sérialisent correctement. Les objets non
 * sérialisables (DOM elements) deviennent {} — acceptable car inutiles
 * dans le code utilisateur.
 *
 * @param {*} payload - Payload brut du hook
 * @returns {Object} Copie plain-object du payload
 */
function genericSanitize(payload) {
    try {
        return JSON.parse(JSON.stringify(payload));
    } catch {
        return { _raw: String(payload) };
    }
}

/**
 * Génère le texte d'aide contextuelle depuis les métadonnées payload.
 *
 * @param {Object|undefined} payload — clés du payload avec descriptions
 * @returns {string}
 */
function buildCtxHelp(payload) {
    if (!payload) return 'ctx contient le payload brut du hook (sérialisé en JSON)';
    return Object.entries(payload)
        .map(([key, desc]) => `ctx.${key} — ${desc}`)
        .join('\n');
}

/**
 * @typedef {Object} TriggerDef
 * @property {string} hook     - Nom du hook core à écouter
 * @property {string} label    - Libellé lisible pour le dropdown
 * @property {string} ctxHelp  - Aide contextuelle (champs disponibles dans ctx)
 * @property {Function} sanitize - Transforme le payload en plain object ctx
 */

/**
 * Triggers connus avec sanitizers spécifiques et aide contextuelle détaillée.
 * Expérience enrichie pour les hooks les plus courants.
 *
 * @type {TriggerDef[]}
 */
const KNOWN_TRIGGERS = [
    {
        hook: 'card:moved',
        label: 'Carte déplacée',
        ctxHelp: [
            'ctx.card { id, title, description, tags, type }',
            'ctx.fromColumn { id, title }',
            'ctx.toColumn { id, title }',
        ].join('\n'),
        sanitize(payload) {
            return {
                card: pickCard(payload.card),
                fromColumn: pickColumn(payload.fromColumn),
                toColumn: pickColumn(payload.toColumn),
            };
        },
    },
    {
        hook: 'card:created',
        label: 'Carte créée',
        ctxHelp: ['ctx.card { id, title, description, tags, type }', 'ctx.column { id, title }'].join('\n'),
        sanitize(payload) {
            return {
                card: pickCard(payload.card),
                column: pickColumn(payload.column),
            };
        },
    },
    {
        hook: 'card:deleted',
        label: 'Carte supprimée',
        ctxHelp: ['ctx.card { id, title, description, tags, type }', 'ctx.column { id, title }'].join('\n'),
        sanitize(payload) {
            return {
                card: pickCard(payload.card),
                column: pickColumn(payload.column),
            };
        },
    },
    {
        hook: 'card:updated',
        label: 'Carte modifiée',
        ctxHelp: 'ctx.card { id, title, description, tags, type }',
        sanitize(payload) {
            return {
                card: pickCard(payload.card),
            };
        },
    },
];

/** @type {Map<string, TriggerDef>} Lookup rapide par hookName */
const _knownByHook = new Map(KNOWN_TRIGGERS.map((t) => [t.hook, t]));

/**
 * Construit la liste complète des triggers à partir de tous les hooks
 * enregistrés dans le HookRegistry.
 *
 * - Les hooks connus (KNOWN_TRIGGERS) gardent leur définition enrichie
 * - Les autres hooks reçoivent un sanitizer générique et une aide basique
 * - Tri : hooks connus en premier, puis le reste par ordre alphabétique
 *
 * @param {import('../../HookRegistry.js').default} hooksRegistry
 * @returns {TriggerDef[]}
 */
export function buildTriggerList(hooksRegistry) {
    const registeredHooks = hooksRegistry.getRegisteredHooks();
    const known = [];
    const discovered = [];

    for (const [hookName, meta] of registeredHooks) {
        const knownDef = _knownByHook.get(hookName);

        if (knownDef) {
            known.push(knownDef);
        } else {
            discovered.push({
                hook: hookName,
                label: meta.label || hookName,
                ctxHelp: buildCtxHelp(meta.payload),
                sanitize: genericSanitize,
            });
        }
    }

    // Tri stable : connus dans leur ordre d'origine, découverts par label
    discovered.sort((a, b) => a.label.localeCompare(b.label));

    return [...known, ...discovered];
}

/**
 * Retrouve la définition de trigger pour un hook donné.
 *
 * Cherche d'abord dans les triggers connus (enrichis), sinon retourne
 * un fallback générique. Ne retourne plus jamais undefined.
 *
 * @param {string} hookName - Nom du hook (ex: 'card:moved')
 * @returns {TriggerDef}
 */
export function getTriggerDef(hookName) {
    return (
        _knownByHook.get(hookName) || {
            hook: hookName,
            label: hookName,
            ctxHelp: 'ctx contient le payload brut du hook (sérialisé en JSON)',
            sanitize: genericSanitize,
        }
    );
}
