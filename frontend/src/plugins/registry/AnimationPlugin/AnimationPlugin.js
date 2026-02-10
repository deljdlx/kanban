/**
 * AnimationPlugin — Anime les modales, le drop de cartes et l'entrée de board.
 *
 * Utilise un MutationObserver sur document.body pour détecter l'ajout
 * d'un .modal-overlay. L'animation est lancée après un court setTimeout
 * pour laisser le browser faire un premier paint (nécessaire pour que
 * l'engine anime.js tourne correctement).
 *
 * À la fermeture, patche overlay.remove() pour jouer l'animation
 * inverse avant de retirer l'élément du DOM.
 *
 * L'effet d'animation est configurable via le panneau de settings.
 * Les registres d'effets sont dans effects.js — ajouter un effet =
 * ajouter une entrée dans le registre concerné (EFFECTS, CARD_DROP_EFFECTS,
 * COLUMN_ENTER_EFFECTS, CARD_ENTER_EFFECTS).
 *
 * Pourquoi MutationObserver ?
 *   → Attrape TOUTES les modales (add, edit, detail, settings, delete)
 *     avec un seul point d'entrée, sans dépendre de hooks spécifiques.
 *
 * Pourquoi setTimeout ?
 *   → L'engine anime.js ne tick pas quand l'animation est créée dans
 *     un callback MutationObserver (synchrone, avant le premier paint).
 *     Le setTimeout(10) pousse l'exécution après le paint.
 */
import { animate, stagger } from 'animejs';
import StorageService from '../../../services/StorageService.js';
import {
    EFFECTS,
    DEFAULT_EFFECT,
    ENTER_DURATION,
    EXIT_DURATION,
    CARD_DROP_EFFECTS,
    DEFAULT_CARD_DROP_EFFECT,
    COLUMN_ENTER_EFFECTS,
    DEFAULT_COLUMN_ENTER_EFFECT,
    CARD_ENTER_EFFECTS,
    DEFAULT_CARD_ENTER_EFFECT,
} from './effects.js';

/** Clé IndexedDB pour persister les settings d'animation. */
const STORAGE_KEY = 'kanban:animation-settings';

/** Ancienne clé (v1) — lue pour migration, puis supprimée. */
const LEGACY_STORAGE_KEY = 'kanban:modal-animation';

export default class AnimationPlugin {
    /**
     * @type {MutationObserver|null}
     */
    _observer = null;

    /**
     * Nom de l'effet modal actif (clé dans EFFECTS).
     * @type {string}
     */
    _currentEffectName = DEFAULT_EFFECT;

    /**
     * Nom de l'effet de drop de carte actif (clé dans CARD_DROP_EFFECTS).
     * @type {string}
     */
    _currentCardDropEffect = DEFAULT_CARD_DROP_EFFECT;

    /**
     * Nom de l'effet d'entrée des colonnes (clé dans COLUMN_ENTER_EFFECTS).
     * @type {string}
     */
    _currentColumnEnterEffect = DEFAULT_COLUMN_ENTER_EFFECT;

    /**
     * Nom de l'effet d'entrée des cartes (clé dans CARD_ENTER_EFFECTS).
     * @type {string}
     */
    _currentCardEnterEffect = DEFAULT_CARD_ENTER_EFFECT;

    /**
     * Référence bound du handler card:moved (pour cleanup).
     * @type {Function|null}
     * @private
     */
    _onCardMovedRef = null;

    /**
     * Référence bound du handler board:displayed (pour cleanup).
     * @type {Function|null}
     * @private
     */
    _onBoardDisplayedRef = null;

    // ---------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------

    /**
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        // Charge les settings sauvegardés (fire-and-forget)
        this._loadSettings().catch((err) => console.error('AnimationPlugin: erreur chargement settings', err));

        this._observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1 && this._isOverlay(node)) {
                        this._onOverlayAdded(node);
                    }
                }
            }
        });

        this._observer.observe(document.body, { childList: true });

        // Animation au drop de carte (inter-colonne)
        this._onCardMovedRef = this._onCardMoved.bind(this);
        hooks.addAction('card:moved', this._onCardMovedRef);

        // Animation d'entrée de board (premier affichage uniquement)
        this._onBoardDisplayedRef = this._onBoardDisplayed.bind(this);
        hooks.addAction('board:displayed', this._onBoardDisplayedRef);
    }

    /**
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }

        if (this._onCardMovedRef) {
            hooks.removeAction('card:moved', this._onCardMovedRef);
            this._onCardMovedRef = null;
        }

        if (this._onBoardDisplayedRef) {
            hooks.removeAction('board:displayed', this._onBoardDisplayedRef);
            this._onBoardDisplayedRef = null;
        }
    }

    // ---------------------------------------------------------------
    // Persistence IndexedDB
    // ---------------------------------------------------------------

    /**
     * Charge les settings depuis IndexedDB.
     *
     * Gère 3 migrations historiques :
     * 1. Ancienne clé `kanban:modal-animation` → nouvelle clé `kanban:animation-settings`
     * 2. Ancien format string (`'pop'`) → objet `{ modalEffect, ... }`
     * 3. Ancien champ `boardEnterEffect` → deux champs `columnEnterEffect` + `cardEnterEffect`
     *
     * @returns {Promise<void>}
     * @private
     */
    async _loadSettings() {
        let stored = await StorageService.get(STORAGE_KEY, null);

        // Migration : ancienne clé → nouvelle clé
        let needsSave = false;
        if (stored === null) {
            stored = await StorageService.get(LEGACY_STORAGE_KEY, null);
            if (stored !== null) {
                await StorageService.remove(LEGACY_STORAGE_KEY);
                needsSave = true;
            }
        }

        if (stored === null) return;

        // Migration : ancien format string → nouvel objet
        if (typeof stored === 'string') {
            if (EFFECTS[stored]) {
                this._currentEffectName = stored;
            }
            this._saveSettings();
            return;
        }

        // Format objet courant
        if (stored.modalEffect && EFFECTS[stored.modalEffect]) {
            this._currentEffectName = stored.modalEffect;
        }
        if (stored.cardDropEffect && CARD_DROP_EFFECTS[stored.cardDropEffect]) {
            this._currentCardDropEffect = stored.cardDropEffect;
        }
        if (stored.columnEnterEffect && COLUMN_ENTER_EFFECTS[stored.columnEnterEffect]) {
            this._currentColumnEnterEffect = stored.columnEnterEffect;
        }
        if (stored.cardEnterEffect && CARD_ENTER_EFFECTS[stored.cardEnterEffect]) {
            this._currentCardEnterEffect = stored.cardEnterEffect;
        }

        // Migration : ancien format boardEnterEffect → deux effets séparés
        if (stored.boardEnterEffect && !stored.columnEnterEffect && !stored.cardEnterEffect) {
            if (COLUMN_ENTER_EFFECTS[stored.boardEnterEffect]) {
                this._currentColumnEnterEffect = stored.boardEnterEffect;
            }
            if (CARD_ENTER_EFFECTS[stored.boardEnterEffect]) {
                this._currentCardEnterEffect = stored.boardEnterEffect;
            }
            needsSave = true;
        }

        // Persiste vers la nouvelle clé après toute migration
        if (needsSave) {
            this._saveSettings();
        }
    }

    /** @type {number|null} Timer du debounce de _saveSettings */
    _saveSettingsTimer = null;

    /**
     * Sauvegarde les settings dans IndexedDB (debounced 300ms).
     * @private
     */
    _saveSettings() {
        clearTimeout(this._saveSettingsTimer);
        this._saveSettingsTimer = setTimeout(async () => {
            await StorageService.set(STORAGE_KEY, {
                modalEffect: this._currentEffectName,
                cardDropEffect: this._currentCardDropEffect,
                columnEnterEffect: this._currentColumnEnterEffect,
                cardEnterEffect: this._currentCardEnterEffect,
            });
        }, 300);
    }

    // ---------------------------------------------------------------
    // API publique (pour le settings panel)
    // ---------------------------------------------------------------

    /**
     * Change l'effet d'animation des modales. Le changement
     * s'applique à la prochaine modale ouverte.
     *
     * @param {string} name - Clé de l'effet dans EFFECTS
     */
    setEffect(name) {
        if (!EFFECTS[name]) return;
        this._currentEffectName = name;
        this._saveSettings();
    }

    /**
     * Change l'effet d'animation au drop de carte.
     * Le changement s'applique au prochain déplacement.
     *
     * @param {string} name - Clé de l'effet dans CARD_DROP_EFFECTS
     */
    setCardDropEffect(name) {
        if (!CARD_DROP_EFFECTS[name]) return;
        this._currentCardDropEffect = name;
        this._saveSettings();
    }

    /**
     * Change l'effet d'entrée des colonnes.
     * Le changement s'applique au prochain affichage de board.
     *
     * @param {string} name - Clé de l'effet dans COLUMN_ENTER_EFFECTS
     */
    setColumnEnterEffect(name) {
        if (!COLUMN_ENTER_EFFECTS[name]) return;
        this._currentColumnEnterEffect = name;
        this._saveSettings();
    }

    /**
     * Change l'effet d'entrée des cartes.
     * Le changement s'applique au prochain affichage de board.
     *
     * @param {string} name - Clé de l'effet dans CARD_ENTER_EFFECTS
     */
    setCardEnterEffect(name) {
        if (!CARD_ENTER_EFFECTS[name]) return;
        this._currentCardEnterEffect = name;
        this._saveSettings();
    }

    // ---------------------------------------------------------------
    // Animation de drop de carte
    // ---------------------------------------------------------------

    /**
     * Appelé quand une carte est déplacée entre colonnes (hook card:moved).
     * Lance l'animation de drop configurée sur le nouvel élément DOM.
     *
     * @param {{ card: import('../../../models/Card.js').default }} payload
     * @private
     */
    _onCardMoved({ card }) {
        if (this._currentCardDropEffect === 'none') return;

        const effect = CARD_DROP_EFFECTS[this._currentCardDropEffect];
        if (!effect || !effect.animation) return;

        const element = document.querySelector(`.card[data-id="${card.id}"]`);
        if (!element) return;

        animate(element, { ...effect.animation });
    }

    // ---------------------------------------------------------------
    // Animation d'entrée de board
    // ---------------------------------------------------------------

    /**
     * Appelé quand un board est affiché pour la première fois (hook board:displayed).
     * Anime d'abord les colonnes en stagger, puis les cartes
     * en cascade colonne par colonne.
     *
     * @param {{ board: import('../../../models/Board.js').default, element: HTMLElement }} payload
     * @private
     */
    _onBoardDisplayed({ element }) {
        const colEffect = COLUMN_ENTER_EFFECTS[this._currentColumnEnterEffect];
        const cardEffect = CARD_ENTER_EFFECTS[this._currentCardEnterEffect];

        const skipColumns = !colEffect || !colEffect.animation;
        const skipCards = !cardEffect || !cardEffect.animation;

        // Rien à animer
        if (skipColumns && skipCards) return;

        const columnElements = element.querySelectorAll('.column');
        if (columnElements.length === 0) return;

        // Collecte les cartes colonne par colonne pour un stagger naturel
        const cards = [];
        element.querySelectorAll('.column-body').forEach((col) => {
            cards.push(...col.querySelectorAll('.card'));
        });

        // Cache les éléments concernés avant l'animation
        if (!skipColumns) {
            columnElements.forEach((col) => {
                col.style.opacity = '0';
            });
        }
        if (!skipCards) {
            cards.forEach((card) => {
                card.style.opacity = '0';
            });
        }

        // Lance l'animation après le premier paint (même pattern que les modales)
        setTimeout(() => {
            this._animateBoardEntrance(colEffect, cardEffect, columnElements, cards);
        }, 10);
    }

    /**
     * Séquence d'animation : colonnes d'abord (stagger), puis cartes (stagger).
     *
     * @param {Object} colEffect - Entrée du registre COLUMN_ENTER_EFFECTS
     * @param {Object} cardEffect - Entrée du registre CARD_ENTER_EFFECTS
     * @param {NodeList} columnElements - Les éléments .column
     * @param {HTMLElement[]} cards - Les éléments .card collectés colonne par colonne
     * @private
     */
    _animateBoardEntrance(colEffect, cardEffect, columnElements, cards) {
        // Phase 1 : colonnes apparaissent en stagger
        if (colEffect && colEffect.animation) {
            animate(columnElements, {
                ...colEffect.animation,
                delay: stagger(colEffect.staggerDelay),
                onComplete: () => {
                    columnElements.forEach((col) => {
                        col.style.opacity = '';
                        col.style.transform = '';
                    });
                    // Phase 2 : cartes apparaissent après les colonnes
                    this._animateBoardCards(cardEffect, cards);
                },
            });
        } else {
            // Pas d'animation de colonnes → lance directement les cartes
            this._animateBoardCards(cardEffect, cards);
        }
    }

    /**
     * Anime les cartes en stagger (phase 2 de l'entrée de board).
     *
     * @param {Object} cardEffect - Entrée du registre CARD_ENTER_EFFECTS
     * @param {HTMLElement[]} cards - Les éléments .card
     * @private
     */
    _animateBoardCards(cardEffect, cards) {
        if (cards.length === 0 || !cardEffect || !cardEffect.animation) {
            cards.forEach((card) => {
                card.style.opacity = '';
            });
            return;
        }

        animate(cards, {
            ...cardEffect.animation,
            delay: stagger(cardEffect.staggerDelay),
            onComplete: () => {
                cards.forEach((card) => {
                    card.style.opacity = '';
                    card.style.transform = '';
                });
            },
        });
    }

    // ---------------------------------------------------------------
    // Résolution de l'effet modal
    // ---------------------------------------------------------------

    /**
     * Retourne la config de l'effet actif, avec fallback sur pop.
     *
     * @returns {{label: string, enter: Object, exit: Object}}
     * @private
     */
    _getEffect() {
        return EFFECTS[this._currentEffectName] || EFFECTS[DEFAULT_EFFECT];
    }

    // ---------------------------------------------------------------
    // Entrée
    // ---------------------------------------------------------------

    /**
     * Vérifie si un nœud est un overlay de modale.
     * Toutes les modales partagent la classe de base `modal-overlay`.
     *
     * @param {HTMLElement} node
     * @returns {boolean}
     * @private
     */
    _isOverlay(node) {
        return node.classList.contains('modal-overlay');
    }

    /**
     * Appelé dès qu'un overlay de modale apparaît dans le DOM.
     *
     * @param {HTMLElement} overlay
     * @private
     */
    _onOverlayAdded(overlay) {
        // Le panneau modal est toujours le premier enfant de l'overlay
        const modal = overlay.firstElementChild;
        if (!modal) return;

        const effect = this._getEffect();

        // Cache la modale immédiatement (avant le premier paint)
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        modal.style.opacity = '0';

        // Perspective nécessaire pour l'effet flip (rotateX)
        if (effect.enter.rotateX !== undefined) {
            overlay.style.perspective = '800px';
        }

        // Lance l'animation après le premier paint
        setTimeout(() => {
            this._animateEntrance(overlay, modal, effect);
        }, 10);

        // Patche la sortie
        this._patchRemove(overlay, modal, effect);
    }

    /**
     * Anime le backdrop + le panneau modal à l'entrée.
     *
     * @param {HTMLElement} overlay
     * @param {HTMLElement} modal
     * @param {{enter: Object, exit: Object}} effect
     * @private
     */
    _animateEntrance(overlay, modal, effect) {
        // Backdrop : transparent → couleur finale
        animate(overlay, {
            backgroundColor: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)'],
            duration: ENTER_DURATION,
            ease: 'outQuart',
            onComplete: () => {
                overlay.style.backgroundColor = '';
            },
        });

        // Modal : effet configurable
        animate(modal, {
            ...effect.enter,
            onComplete: () => {
                modal.style.opacity = '';
                modal.style.transform = '';
            },
        });
    }

    // ---------------------------------------------------------------
    // Sortie
    // ---------------------------------------------------------------

    /**
     * Patche overlay.remove() pour jouer l'animation de sortie
     * avant de retirer l'élément du DOM.
     *
     * @param {HTMLElement} overlay
     * @param {HTMLElement} modal
     * @param {{enter: Object, exit: Object}} effect
     * @private
     */
    _patchRemove(overlay, modal, effect) {
        const originalRemove = overlay.remove.bind(overlay);
        let removing = false;

        overlay.remove = () => {
            if (removing) return;
            removing = true;

            // Backdrop : fade out
            animate(overlay, {
                backgroundColor: ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)'],
                duration: EXIT_DURATION,
                ease: 'inQuart',
            });

            // Modal : effet configurable (sortie)
            animate(modal, {
                ...effect.exit,
                onComplete: () => {
                    originalRemove();
                },
            });

            // Fallback si onComplete ne fire pas
            setTimeout(originalRemove, EXIT_DURATION + 50);
        };
    }
}
