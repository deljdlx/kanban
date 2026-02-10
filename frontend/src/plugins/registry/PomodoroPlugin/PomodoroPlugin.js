/**
 * PomodoroPlugin — Widget timer Pomodoro dans une carte.
 *
 * Crée des cartes de type 'widget:pomodoro' contenant un timer
 * avec des durées prédéfinies (5min test, 15min, 25min classique, 45min).
 *
 * Le timer est un état runtime (non persisté) : seules la durée initiale
 * et le label sont stockés dans card.data. L'état du countdown (remaining,
 * intervalId) vit dans _timers et disparaît au reload.
 *
 * Hooks émis :
 *   - pomodoro:started   → quand le timer démarre
 *   - pomodoro:completed → quand le countdown atteint 0
 *   - pomodoro:paused    → quand l'utilisateur met en pause
 */
import CardTypeRegistry from '../../../services/CardTypeRegistry.js';
import Container from '../../../Container.js';
import { formatDuration } from '../../../utils/date.js';
import { generateId } from '../../../utils/id.js';

export default class PomodoroPlugin {
    /**
     * Type de carte enregistré dans le CardTypeRegistry.
     * @type {string}
     */
    static CARD_TYPE = 'widget:pomodoro';

    /**
     * Référence au HookRegistry reçu à l'install.
     * Utilisé pour doAction sur les hooks pomodoro:*.
     * @type {import('../../HookRegistry.js').default|null}
     */
    _hooks = null;

    /**
     * État runtime des timers, indexé par card.id.
     * Non persisté : reset au reload de la page.
     *
     * Chaque entrée : { remaining: number, state: 'idle'|'running'|'paused'|'completed', intervalId: number|null }
     * @type {Map<string, Object>}
     */
    _timers = new Map();

    /**
     * Durées proposées à la création (en secondes).
     * @type {Array<{ label: string, seconds: number }>}
     */
    static DURATIONS = [
        { label: '5 min (test)', seconds: 300 },
        { label: '15 min', seconds: 900 },
        { label: '25 min (classique)', seconds: 1500 },
        { label: '45 min', seconds: 2700 },
    ];

    /**
     * Installe le plugin : enregistre le type de carte et les hooks.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        this._hooks = hooks;

        CardTypeRegistry.register(PomodoroPlugin.CARD_TYPE);

        // Stocke les références pour pouvoir les retirer dans uninstall()
        this._handlers = {
            onModalOpened: (ctx) => this._onModalOpened(ctx),
            onRenderBody: (ctx) => this._onRenderBody(ctx),
            onDetailRender: (ctx) => this._onDetailRender(ctx),
        };

        hooks.addAction('modal:addCard:opened', this._handlers.onModalOpened);
        hooks.addAction('card:renderBody', this._handlers.onRenderBody);
        hooks.addAction('modal:cardDetail:renderContent', this._handlers.onDetailRender);
    }

    /**
     * Désinstalle le plugin : nettoie les timers et désenregistre le type.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        hooks.removeAction('modal:addCard:opened', this._handlers.onModalOpened);
        hooks.removeAction('card:renderBody', this._handlers.onRenderBody);
        hooks.removeAction('modal:cardDetail:renderContent', this._handlers.onDetailRender);
        this._handlers = null;

        // Arrête tous les timers actifs
        for (const [, state] of this._timers) {
            if (state.intervalId) {
                clearInterval(state.intervalId);
            }
        }
        this._timers.clear();

        CardTypeRegistry.unregister(PomodoroPlugin.CARD_TYPE);
        this._hooks = null;
    }

    // -------------------------------------------------------------------
    // Modal : Enregistrement du type de ticket
    // -------------------------------------------------------------------

    /**
     * Appelé quand la modal de création s'ouvre.
     * Enregistre le type "Pomodoro" dans le sélecteur.
     *
     * @param {Object} ctx
     * @param {Function} ctx.registerCardType
     * @private
     */
    _onModalOpened({ registerCardType }) {
        registerCardType(PomodoroPlugin.CARD_TYPE, 'Pomodoro', (panel) => this._buildFormPanel(panel));
    }

    /**
     * Construit le formulaire de création d'un Pomodoro.
     * Propose un champ label + des radios pour la durée.
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildFormPanel(panel) {
        const durationsHtml = PomodoroPlugin.DURATIONS.map(
            (d, i) => `
            <label class="pomo-form__radio">
                <input type="radio" name="pomo-duration" value="${d.seconds}"
                       ${i === 2 ? 'checked' : ''} />
                <span>${d.label}</span>
            </label>
        `,
        ).join('');

        panel.innerHTML = `
            <div class="pomo-form">
                <p class="pomo-form__intro">
                    Créez un timer Pomodoro pour rester concentré.
                </p>
                <div class="form-group">
                    <label>Libellé</label>
                    <input type="text" class="input pomo-form__label"
                           placeholder="Ex: Rédiger le rapport, Revue de code..." />
                </div>
                <div class="form-group">
                    <label>Durée</label>
                    <div class="pomo-form__durations">
                        ${durationsHtml}
                    </div>
                </div>
                <button type="button" class="btn btn--primary pomo-form__submit">
                    Créer le Pomodoro
                </button>
            </div>
        `;

        const labelInput = panel.querySelector('.pomo-form__label');
        const createBtn = panel.querySelector('.pomo-form__submit');

        createBtn.addEventListener('click', () => {
            const label = labelInput.value.trim() || 'Pomodoro';
            const checkedRadio = panel.querySelector('input[name="pomo-duration"]:checked');
            const duration = checkedRadio ? parseInt(checkedRadio.value, 10) : 1500;

            const cardData = {
                id: generateId('card'),
                title: label,
                description: '',
                tags: {},
                type: PomodoroPlugin.CARD_TYPE,
                data: {
                    duration: duration,
                    label: label,
                },
            };

            const event = new CustomEvent('widget:create', {
                bubbles: true,
                detail: { cardData },
            });
            panel.dispatchEvent(event);
        });
    }

    // -------------------------------------------------------------------
    // Rendu carte (board)
    // -------------------------------------------------------------------

    /**
     * Appelé pour chaque carte à rendre.
     * Si c'est un widget:pomodoro, prend le contrôle du rendu.
     *
     * @param {Object} ctx
     * @param {import('../../../models/Card.js').default} ctx.card
     * @param {HTMLElement} ctx.cardElement
     * @private
     */
    _onRenderBody(ctx) {
        const { card, cardElement } = ctx;

        if (card.type !== PomodoroPlugin.CARD_TYPE) {
            return;
        }

        ctx.handled = true;
        cardElement.classList.add('card--widget', 'card--pomodoro');

        this._renderWidget(card, cardElement, false);
    }

    /**
     * Prend le contrôle du rendu dans la modal de détail.
     *
     * @param {Object} ctx
     * @param {import('../../../models/Card.js').default} ctx.card
     * @param {HTMLElement} ctx.panel
     * @private
     */
    _onDetailRender(ctx) {
        const { card, panel } = ctx;

        if (card.type !== PomodoroPlugin.CARD_TYPE) {
            return;
        }

        ctx.handled = true;
        panel.classList.add('card-detail-panel--widget');

        this._renderWidget(card, panel, true);
    }

    // -------------------------------------------------------------------
    // Widget : Affichage et contrôle du timer
    // -------------------------------------------------------------------

    /**
     * Rend le widget Pomodoro dans un conteneur.
     * Affiche MM:SS, label, et boutons play/pause/reset.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {HTMLElement} parent
     * @param {boolean} isDetail - true si rendu dans la modal de détail
     * @private
     */
    _renderWidget(card, parent, isDetail) {
        const timerState = this._getTimerState(card);

        // Si un interval tourne encore (re-render pendant un timer actif),
        // le stopper — il sera relancé ci-dessous avec les nouveaux éléments DOM.
        const wasRunning = timerState.state === 'running' && timerState.intervalId;
        if (wasRunning) {
            clearInterval(timerState.intervalId);
            timerState.intervalId = null;
        }

        const data = card.data;
        const label = data.label || 'Pomodoro';

        const container = document.createElement('div');
        container.className = 'pomo-widget';
        if (isDetail) {
            container.classList.add('pomo-widget--detail');
        }
        if (timerState.state === 'running') {
            container.classList.add('pomo-widget--running');
        }
        if (timerState.state === 'completed') {
            container.classList.add('pomo-widget--completed');
        }

        // Label
        const labelEl = document.createElement('div');
        labelEl.className = 'pomo-widget__label';
        labelEl.textContent = label;

        // Affichage du temps
        const timeEl = document.createElement('div');
        timeEl.className = 'pomo-widget__time';
        timeEl.textContent = formatDuration(timerState.remaining);

        // Contrôles
        const controls = document.createElement('div');
        controls.className = 'pomo-widget__controls';

        const playPauseBtn = document.createElement('button');
        playPauseBtn.className = 'pomo-widget__btn';
        playPauseBtn.title = timerState.state === 'running' ? 'Pause' : 'Démarrer';

        const resetBtn = document.createElement('button');
        resetBtn.className = 'pomo-widget__btn';
        resetBtn.textContent = '↺';
        resetBtn.title = 'Réinitialiser';

        // État initial des boutons
        this._updatePlayPauseBtn(playPauseBtn, timerState.state);

        controls.appendChild(playPauseBtn);
        controls.appendChild(resetBtn);

        container.appendChild(labelEl);
        container.appendChild(timeEl);
        container.appendChild(controls);
        parent.appendChild(container);

        // --- Event handlers ---

        playPauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const current = this._getTimerState(card);

            if (current.state === 'running') {
                this._pauseTimer(card, timeEl, container, playPauseBtn);
            } else if (current.state === 'completed') {
                // Après complétion, un clic reset + démarre
                this._resetTimer(card, timeEl, container, playPauseBtn);
                this._startTimer(card, timeEl, container, playPauseBtn);
            } else {
                this._startTimer(card, timeEl, container, playPauseBtn);
            }
        });

        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._resetTimer(card, timeEl, container, playPauseBtn);
        });

        // Relance l'interval avec les nouveaux éléments DOM si le timer était actif
        if (wasRunning) {
            timerState.intervalId = setInterval(() => {
                timerState.remaining -= 1;
                timeEl.textContent = formatDuration(timerState.remaining);

                if (timerState.remaining <= 0) {
                    this._completeTimer(card, timeEl, container, playPauseBtn);
                }
            }, 1000);
        }
    }

    /**
     * Met à jour l'icône et le title du bouton play/pause selon l'état.
     *
     * @param {HTMLElement} btn
     * @param {string} state - 'idle'|'running'|'paused'|'completed'
     * @private
     */
    _updatePlayPauseBtn(btn, state) {
        if (state === 'running') {
            btn.textContent = '⏸';
            btn.title = 'Pause';
        } else if (state === 'completed') {
            btn.textContent = '▶';
            btn.title = 'Redémarrer';
        } else {
            btn.textContent = '▶';
            btn.title = 'Démarrer';
        }
    }

    /**
     * Démarre le countdown. Émet le hook pomodoro:started.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {HTMLElement} timeEl - Élément affichant MM:SS
     * @param {HTMLElement} container - Conteneur du widget
     * @param {HTMLElement} playPauseBtn - Bouton play/pause
     * @private
     */
    _startTimer(card, timeEl, container, playPauseBtn) {
        const timerState = this._getTimerState(card);

        if (timerState.remaining <= 0) return;

        timerState.state = 'running';
        container.classList.add('pomo-widget--running');
        container.classList.remove('pomo-widget--completed');
        this._updatePlayPauseBtn(playPauseBtn, 'running');

        timerState.intervalId = setInterval(() => {
            timerState.remaining -= 1;
            timeEl.textContent = formatDuration(timerState.remaining);

            if (timerState.remaining <= 0) {
                this._completeTimer(card, timeEl, container, playPauseBtn);
            }
        }, 1000);

        // Notifie via hook
        if (this._hooks) {
            this._hooks.doAction('pomodoro:started', {
                card,
                duration: card.data.duration,
                remaining: timerState.remaining,
            });
        }
    }

    /**
     * Met le timer en pause. Émet le hook pomodoro:paused.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {HTMLElement} timeEl
     * @param {HTMLElement} container
     * @param {HTMLElement} playPauseBtn
     * @private
     */
    _pauseTimer(card, timeEl, container, playPauseBtn) {
        const timerState = this._getTimerState(card);

        if (timerState.intervalId) {
            clearInterval(timerState.intervalId);
            timerState.intervalId = null;
        }

        timerState.state = 'paused';
        container.classList.remove('pomo-widget--running');
        this._updatePlayPauseBtn(playPauseBtn, 'paused');

        if (this._hooks) {
            this._hooks.doAction('pomodoro:paused', {
                card,
                duration: card.data.duration,
                remaining: timerState.remaining,
                elapsed: card.data.duration - timerState.remaining,
            });
        }
    }

    /**
     * Appelé quand le countdown atteint 0. Émet le hook pomodoro:completed.
     * Applique un effet visuel de succès.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {HTMLElement} timeEl
     * @param {HTMLElement} container
     * @param {HTMLElement} playPauseBtn
     * @private
     */
    _completeTimer(card, timeEl, container, playPauseBtn) {
        const timerState = this._getTimerState(card);

        if (timerState.intervalId) {
            clearInterval(timerState.intervalId);
            timerState.intervalId = null;
        }

        timerState.state = 'completed';
        timerState.remaining = 0;
        timeEl.textContent = formatDuration(0);

        container.classList.remove('pomo-widget--running');
        container.classList.add('pomo-widget--completed');
        this._updatePlayPauseBtn(playPauseBtn, 'completed');

        if (this._hooks) {
            this._hooks.doAction('pomodoro:completed', {
                card,
                duration: card.data.duration,
            });
        }
    }

    /**
     * Réinitialise le timer à sa durée d'origine.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {HTMLElement} timeEl
     * @param {HTMLElement} container
     * @param {HTMLElement} playPauseBtn
     * @private
     */
    _resetTimer(card, timeEl, container, playPauseBtn) {
        const timerState = this._getTimerState(card);

        if (timerState.intervalId) {
            clearInterval(timerState.intervalId);
            timerState.intervalId = null;
        }

        timerState.remaining = card.data.duration || 1500;
        timerState.state = 'idle';

        timeEl.textContent = formatDuration(timerState.remaining);
        container.classList.remove('pomo-widget--running', 'pomo-widget--completed');
        this._updatePlayPauseBtn(playPauseBtn, 'idle');
    }

    // -------------------------------------------------------------------
    // Utilitaires
    // -------------------------------------------------------------------

    /**
     * Retourne l'état runtime d'un timer pour une carte donnée.
     * Crée l'état avec les valeurs par défaut si inexistant.
     *
     * @param {import('../../../models/Card.js').default} card
     * @returns {{ remaining: number, state: string, intervalId: number|null }}
     * @private
     */
    _getTimerState(card) {
        if (!this._timers.has(card.id)) {
            this._timers.set(card.id, {
                remaining: card.data.duration || 1500,
                state: 'idle',
                intervalId: null,
            });
        }
        return this._timers.get(card.id);
    }
}
