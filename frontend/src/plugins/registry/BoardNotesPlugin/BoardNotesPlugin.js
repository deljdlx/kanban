/**
 * BoardNotesPlugin — Notes et mémos pour le board.
 *
 * Fonctionnalités :
 *   - Onglet "Notes" dans Configuration du board
 *   - Ajouter / Modifier / Supprimer des notes
 *   - Indicateur dans le header avec compteur
 *   - Clic sur l'indicateur → ouvre directement les notes
 *
 * Hooks utilisés :
 *   - modal:boardSettings:opened : ajoute l'onglet Notes
 *   - board:rendered : ajoute l'indicateur dans le header
 */
import UserService from '../../../services/UserService.js';
import ModalBoardSettings from '../../../views/ModalBoardSettings.js';
import NoteManager from './NoteManager.js';
import { formatShortDateTime } from '../../../utils/date.js';

export default class BoardNotesPlugin {
    /**
     * Référence au board.
     * @type {import('../../../models/Board.js').default|null}
     */
    _board = null;

    /**
     * Gestionnaire des notes.
     * @type {NoteManager|null}
     */
    _noteManager = null;

    /**
     * Élément indicateur dans le header.
     * @type {HTMLElement|null}
     */
    _headerIndicator = null;

    /**
     * Handlers pour cleanup.
     * @type {Object}
     */
    _handlers = {
        onBoardWillChange: null,
        onBoardRendered: null,
        onSettingsOpened: null,
        onBoardChange: null,
    };

    /**
     * Installe le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        // Injection des styles
        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        // Hook pour cleanup avant switch de board
        this._handlers.onBoardWillChange = () => this._resetBoardState();
        hooks.addAction('board:willChange', this._handlers.onBoardWillChange);

        // Hook pour l'indicateur dans le header
        this._handlers.onBoardRendered = ({ board }) => {
            this._board = board;
            this._noteManager = new NoteManager(board);
            this._injectHeaderIndicator();

            // Écoute les changements pour mettre à jour le compteur
            this._handlers.onBoardChange = () => this._updateIndicatorCount();
            this._board.on('change', this._handlers.onBoardChange);
        };
        hooks.addAction('board:rendered', this._handlers.onBoardRendered);

        // Hook pour l'onglet dans les settings
        this._handlers.onSettingsOpened = ({ registerTab, board }) => {
            // Assure qu'on a toujours un NoteManager valide
            if (!this._noteManager || this._board !== board) {
                this._board = board;
                this._noteManager = new NoteManager(board);
            }
            registerTab('notes', 'Notes', (panel) => this._buildNotesPanel(panel));
        };
        hooks.addAction('modal:boardSettings:opened', this._handlers.onSettingsOpened);
    }

    /**
     * Désinstalle le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        if (this._handlers.onBoardWillChange) {
            hooks.removeAction('board:willChange', this._handlers.onBoardWillChange);
        }
        if (this._handlers.onBoardRendered) {
            hooks.removeAction('board:rendered', this._handlers.onBoardRendered);
        }
        if (this._handlers.onSettingsOpened) {
            hooks.removeAction('modal:boardSettings:opened', this._handlers.onSettingsOpened);
        }

        this._resetBoardState();
    }

    /**
     * Remet à zéro l'état lié au board courant.
     * Appelé lors du switch de board et dans uninstall().
     *
     * @private
     */
    _resetBoardState() {
        // Retire le listener sur l'ancien board
        if (this._board && this._handlers.onBoardChange) {
            this._board.off('change', this._handlers.onBoardChange);
            this._handlers.onBoardChange = null;
        }

        // Retire l'indicateur du header
        if (this._headerIndicator) {
            this._headerIndicator.remove();
            this._headerIndicator = null;
        }

        this._board = null;
        this._noteManager = null;
    }

    // ---------------------------------------------------------------
    // Indicateur Header
    // ---------------------------------------------------------------

    /**
     * Injecte l'indicateur de notes dans le header.
     *
     * @private
     */
    _injectHeaderIndicator() {
        // Évite les doublons
        if (this._headerIndicator) {
            this._headerIndicator.remove();
        }

        const header = document.querySelector('.app-header-actions');
        if (!header) return;

        const indicator = document.createElement('button');
        indicator.className = 'board-notes-indicator';
        indicator.type = 'button';
        indicator.title = 'Notes du board';

        const icon = document.createElement('span');
        icon.className = 'board-notes-indicator-icon';
        icon.textContent = '📝';

        const count = document.createElement('span');
        count.className = 'board-notes-indicator-count';

        indicator.appendChild(icon);
        indicator.appendChild(count);

        indicator.addEventListener('click', () => this._openNotesModal());

        // Insère au début des actions
        header.insertBefore(indicator, header.firstChild);
        this._headerIndicator = indicator;

        this._updateIndicatorCount();
    }

    /**
     * Met à jour le compteur de l'indicateur.
     *
     * @private
     */
    _updateIndicatorCount() {
        if (!this._headerIndicator || !this._noteManager) return;

        const count = this._noteManager.count;
        const countEl = this._headerIndicator.querySelector('.board-notes-indicator-count');

        if (count > 0) {
            countEl.textContent = count;
            countEl.classList.remove('hidden');
            this._headerIndicator.classList.add('board-notes-indicator--has-notes');
        } else {
            countEl.classList.add('hidden');
            this._headerIndicator.classList.remove('board-notes-indicator--has-notes');
        }
    }

    /**
     * Ouvre la modale de configuration sur l'onglet Notes.
     *
     * @private
     */
    _openNotesModal() {
        const modal = new ModalBoardSettings(this._board);
        modal.open();

        // Active l'onglet Notes après ouverture
        setTimeout(() => {
            const notesTab = document.querySelector('.board-settings-nav-item[data-tab-id="notes"]');
            if (notesTab) {
                notesTab.click();
            }
        }, 50);
    }

    // ---------------------------------------------------------------
    // Panneau Notes (dans la modale)
    // ---------------------------------------------------------------

    /**
     * Construit le panneau Notes.
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildNotesPanel(panel) {
        panel.innerHTML = '';

        // Header avec bouton ajouter
        const header = document.createElement('div');
        header.className = 'board-notes-header';

        const title = document.createElement('p');
        title.className = 'board-settings-intro';
        title.textContent = 'Gardez une trace des objectifs, décisions et ressources importantes.';

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn--primary';
        addBtn.textContent = '+ Nouvelle note';
        addBtn.addEventListener('click', () => this._showNoteEditor(panel, null));

        header.appendChild(title);
        header.appendChild(addBtn);
        panel.appendChild(header);

        // Liste des notes
        const list = document.createElement('div');
        list.className = 'board-notes-list';
        panel.appendChild(list);

        this._renderNotesList(list, panel);
    }

    /**
     * Rend la liste des notes.
     *
     * @param {HTMLElement} list
     * @param {HTMLElement} panel
     * @private
     */
    _renderNotesList(list, panel) {
        list.innerHTML = '';

        const notes = this._noteManager.all;

        if (notes.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'board-notes-empty';
            empty.textContent = 'Aucune note pour le moment. Cliquez sur "+ Nouvelle note" pour commencer.';
            list.appendChild(empty);
            return;
        }

        for (const note of notes) {
            const item = document.createElement('div');
            item.className = 'board-notes-item';

            // Header de la note
            const itemHeader = document.createElement('div');
            itemHeader.className = 'board-notes-item-header';

            const itemTitle = document.createElement('h4');
            itemTitle.className = 'board-notes-item-title';
            itemTitle.textContent = note.displayTitle;

            const itemMeta = document.createElement('div');
            itemMeta.className = 'board-notes-item-meta';

            const itemAuthor = document.createElement('span');
            itemAuthor.className = 'board-notes-item-author';
            itemAuthor.textContent = note.authorName;

            const itemDate = document.createElement('span');
            itemDate.className = 'board-notes-item-date';
            itemDate.textContent = formatShortDateTime(note.updatedAt);

            itemMeta.appendChild(itemAuthor);
            itemMeta.appendChild(itemDate);

            itemHeader.appendChild(itemTitle);
            itemHeader.appendChild(itemMeta);

            // Contenu (preview)
            const itemContent = document.createElement('p');
            itemContent.className = 'board-notes-item-content';
            itemContent.textContent = this._truncate(note.content, 150);

            // Actions
            const itemActions = document.createElement('div');
            itemActions.className = 'board-notes-item-actions';

            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'board-notes-item-edit';
            editBtn.textContent = 'Modifier';
            editBtn.addEventListener('click', () => this._showNoteEditor(panel, note));

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'board-notes-item-delete';
            deleteBtn.textContent = 'Supprimer';
            deleteBtn.addEventListener('click', () => {
                if (confirm(`Supprimer la note "${note.displayTitle}" ?`)) {
                    this._noteManager.delete(note.id);
                    this._renderNotesList(list, panel);
                }
            });

            itemActions.appendChild(editBtn);
            itemActions.appendChild(deleteBtn);

            item.appendChild(itemHeader);
            item.appendChild(itemContent);
            item.appendChild(itemActions);
            list.appendChild(item);
        }
    }

    /**
     * Affiche l'éditeur de note (création ou modification).
     *
     * @param {HTMLElement} panel
     * @param {import('./Note.js').default|null} note - Note existante ou null pour création
     * @private
     */
    _showNoteEditor(panel, note) {
        const isEdit = note !== null;

        panel.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.className = 'board-notes-editor-header';

        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'btn btn--secondary btn--sm';
        backBtn.innerHTML = '← Retour';
        backBtn.addEventListener('click', () => {
            this._buildNotesPanel(panel);
        });

        const headerTitle = document.createElement('h3');
        headerTitle.className = 'board-notes-editor-title';
        headerTitle.textContent = isEdit ? 'Modifier la note' : 'Nouvelle note';

        header.appendChild(backBtn);
        header.appendChild(headerTitle);
        panel.appendChild(header);

        // Formulaire
        const form = document.createElement('div');
        form.className = 'board-notes-editor-form';

        // Titre
        const titleGroup = document.createElement('div');
        titleGroup.className = 'board-settings-field';

        const titleLabel = document.createElement('label');
        titleLabel.className = 'board-settings-field-label';
        titleLabel.textContent = 'Titre';

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.className = 'board-settings-input';
        titleInput.placeholder = 'Titre de la note...';
        titleInput.value = note?.title || '';

        titleGroup.appendChild(titleLabel);
        titleGroup.appendChild(titleInput);
        form.appendChild(titleGroup);

        // Contenu
        const contentGroup = document.createElement('div');
        contentGroup.className = 'board-settings-field';

        const contentLabel = document.createElement('label');
        contentLabel.className = 'board-settings-field-label';
        contentLabel.textContent = 'Contenu';

        const contentTextarea = document.createElement('textarea');
        contentTextarea.className = 'board-settings-input board-notes-editor-content';
        contentTextarea.placeholder = 'Écrivez votre note ici...';
        contentTextarea.rows = 10;
        contentTextarea.value = note?.content || '';

        contentGroup.appendChild(contentLabel);
        contentGroup.appendChild(contentTextarea);
        form.appendChild(contentGroup);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'board-notes-editor-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn--cancel';
        cancelBtn.textContent = 'Annuler';
        cancelBtn.addEventListener('click', () => {
            this._buildNotesPanel(panel);
        });

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'btn btn--primary';
        saveBtn.textContent = isEdit ? 'Enregistrer' : 'Créer';
        saveBtn.addEventListener('click', () => {
            const title = titleInput.value.trim();
            const content = contentTextarea.value.trim();

            if (!title && !content) {
                alert('Veuillez saisir un titre ou un contenu.');
                return;
            }

            if (isEdit) {
                this._noteManager.update(note.id, { title, content });
            } else {
                const currentUser = UserService.getCurrentUser();
                this._noteManager.add({
                    title,
                    content,
                    authorId: currentUser?.id || null,
                    authorName: currentUser?.name || 'Anonyme',
                });
            }

            this._buildNotesPanel(panel);
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(saveBtn);
        form.appendChild(actions);

        panel.appendChild(form);

        // Focus sur le titre
        titleInput.focus();
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    /**
     * Tronque un texte.
     *
     * @param {string} text
     * @param {number} max
     * @returns {string}
     * @private
     */
    _truncate(text, max) {
        if (!text) return '';
        return text.length > max ? text.slice(0, max) + '...' : text;
    }
}
