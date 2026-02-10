/**
 * GeneralPanel — Onglet "Général" de la modale Board Settings.
 *
 * Contient :
 *   - Nom du board
 *   - Description (textarea)
 *   - Image de couverture (affichée sur la card HomeView)
 *   - Image de fond (avec drag & drop)
 *   - Zone d'injection pour plugins (via hook)
 */
import ImageStorageService from '../../services/ImageStorageService.js';
import StorageService from '../../services/StorageService.js';
import ExportImportService from '../../services/storage/ExportImportService.js';
import Router from '../../services/Router.js';
import { resolveBackgroundImageUrl, applyBackgroundStyle } from '../../utils/backgroundImage.js';
import Application from '../../Application.js';
import Hooks from '../../plugins/HookRegistry.js';
import ModalConfirmDelete from '../ModalConfirmDelete.js';

export default class GeneralPanel {
    /**
     * @type {import('../../models/Board.js').default}
     */
    _board;

    /**
     * Callback pour fermer la modale parente.
     * @type {Function}
     */
    _onClose;

    /**
     * @param {import('../../models/Board.js').default} board
     * @param {Object} [options]
     * @param {Function} [options.onClose] - Ferme la modale parente
     */
    constructor(board, { onClose } = {}) {
        this._board = board;
        this._onClose = onClose || (() => {});
    }

    /**
     * Construit le contenu du panel dans le conteneur fourni.
     *
     * @param {HTMLElement} panel
     */
    build(panel) {
        this._buildNameField(panel);
        this._buildDescriptionField(panel);
        this._buildCoverImageField(panel);
        this._buildBackgroundField(panel);
        this._buildExportField(panel);
        this._buildDangerZone(panel);
        this._buildPluginZone(panel);
    }

    // ---------------------------------------------------------------
    // Champs
    // ---------------------------------------------------------------

    /**
     * Champ nom du board.
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildNameField(panel) {
        const group = document.createElement('div');
        group.className = 'board-settings-field';

        const label = document.createElement('label');
        label.className = 'board-settings-field-label';
        label.textContent = 'Nom du board';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'board-settings-input';
        input.value = this._board.name;
        input.placeholder = 'Mon Kanban';

        input.addEventListener('input', () => {
            this._board.name = input.value || 'Kanban';
        });

        group.appendChild(label);
        group.appendChild(input);
        panel.appendChild(group);
    }

    /**
     * Champ description du board.
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildDescriptionField(panel) {
        const group = document.createElement('div');
        group.className = 'board-settings-field';

        const label = document.createElement('label');
        label.className = 'board-settings-field-label';
        label.textContent = 'Description';

        const textarea = document.createElement('textarea');
        textarea.className = 'board-settings-input board-settings-textarea';
        textarea.value = this._board.description || '';
        textarea.placeholder = 'Décrivez ce board...';
        textarea.rows = 3;

        textarea.addEventListener('input', () => {
            this._board.description = textarea.value;
        });

        group.appendChild(label);
        group.appendChild(textarea);
        panel.appendChild(group);
    }

    /**
     * Champ image de couverture (délègue à _buildImageDropField).
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildCoverImageField(panel) {
        this._buildImageDropField(panel, {
            label: 'Image de couverture',
            hint: "Affichée sur la card de la page d'accueil",
            boardProperty: 'coverImage',
            onAfterUpload: null,
            onAfterRemove: null,
        });
    }

    /**
     * Champ image de fond (délègue à _buildImageDropField).
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildBackgroundField(panel) {
        this._buildImageDropField(panel, {
            label: 'Image de fond',
            hint: null,
            boardProperty: 'backgroundImage',
            onAfterUpload: (imageUrl) => this._applyBackgroundToBoard(imageUrl),
            onAfterRemove: () => this._applyBackgroundToBoard(null),
        });
    }

    /**
     * Champ export du board (téléchargement JSON).
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildExportField(panel) {
        const group = document.createElement('div');
        group.className = 'board-settings-field';

        const label = document.createElement('label');
        label.className = 'board-settings-field-label';
        label.textContent = 'Export';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'board-settings-export-btn';
        btn.textContent = '📥 Exporter ce board';

        btn.addEventListener('click', async () => {
            const boardId = Application.instance?.currentBoardId;
            if (!boardId) return;

            btn.textContent = 'Exportation...';
            btn.disabled = true;

            try {
                const data = await ExportImportService.exportBoard(boardId);
                const json = JSON.stringify(data, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                const boardName = this._board.name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'board';
                const date = new Date().toISOString().slice(0, 10);
                const filename = `kanban-${boardName}-${date}.json`;

                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);

                Hooks.doAction('toast:show', { message: 'Board exporté', icon: '📥' });
            } catch (error) {
                console.error('[GeneralPanel] Erreur export:', error);
                Hooks.doAction('toast:show', { message: "Erreur lors de l'export", type: 'error' });
            } finally {
                btn.textContent = '📥 Exporter ce board';
                btn.disabled = false;
            }
        });

        group.appendChild(label);
        group.appendChild(btn);
        panel.appendChild(group);
    }

    /**
     * Zone danger : suppression du board.
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildDangerZone(panel) {
        const group = document.createElement('div');
        group.className = 'board-settings-field board-settings-danger-zone';

        const label = document.createElement('label');
        label.className = 'board-settings-field-label';
        label.textContent = 'Zone de danger';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'board-settings-delete-btn';
        btn.textContent = '🗑️ Supprimer ce board';

        btn.addEventListener('click', () => {
            const boardId = Application.instance?.currentBoardId;
            if (!boardId) return;

            const modal = new ModalConfirmDelete({
                title: 'Supprimer le kanban',
                message: `Voulez-vous vraiment supprimer "${this._board.name}" ? Cette action est irréversible.`,
                onConfirm: async () => {
                    await StorageService.deleteBoard(boardId);
                    this._onClose();
                    Router.navigate('/');
                },
            });
            modal.open();
        });

        group.appendChild(label);
        group.appendChild(btn);
        panel.appendChild(group);
    }

    /**
     * Zone d'injection pour les plugins.
     *
     * @param {HTMLElement} panel
     * @private
     */
    _buildPluginZone(panel) {
        const pluginZone = document.createElement('div');
        pluginZone.className = 'board-settings-plugin-zone';
        panel.appendChild(pluginZone);

        Hooks.doAction('modal:boardSettings:general', {
            panel: pluginZone,
            board: this._board,
        });
    }

    // ---------------------------------------------------------------
    // Drop zone image (pattern unifié)
    // ---------------------------------------------------------------

    /**
     * Construit un champ image drag & drop paramétré.
     * Remplace les anciens _buildCoverImageField et _buildBackgroundField
     * qui étaient quasi-identiques.
     *
     * @param {HTMLElement} panel - Conteneur parent
     * @param {Object} config
     * @param {string} config.label - Label du champ
     * @param {string|null} config.hint - Texte d'aide (null = pas de hint)
     * @param {string} config.boardProperty - Propriété du board ('coverImage' ou 'backgroundImage')
     * @param {Function|null} config.onAfterUpload - Callback après upload (reçoit l'URL)
     * @param {Function|null} config.onAfterRemove - Callback après suppression
     * @private
     */
    _buildImageDropField(panel, { label: labelText, hint, boardProperty, onAfterUpload, onAfterRemove }) {
        const group = document.createElement('div');
        group.className = 'board-settings-field';

        const label = document.createElement('label');
        label.className = 'board-settings-field-label';
        label.textContent = labelText;
        group.appendChild(label);

        if (hint) {
            const hintEl = document.createElement('p');
            hintEl.className = 'board-settings-hint';
            hintEl.textContent = hint;
            group.appendChild(hintEl);
        }

        const dropZone = document.createElement('div');
        dropZone.className = 'board-settings-dropzone';

        const dropText = document.createElement('span');
        dropText.className = 'board-settings-dropzone-text';
        dropText.textContent = 'Glissez une image ici ou cliquez pour sélectionner';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.className = 'board-settings-dropzone-input';

        const preview = document.createElement('div');
        preview.className = 'board-settings-dropzone-preview';

        // Charge la preview existante
        this._loadImagePreview(boardProperty, preview, dropZone);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'board-settings-dropzone-remove';
        removeBtn.textContent = '×';
        removeBtn.title = "Supprimer l'image";
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._board[boardProperty] = null;
            preview.style.backgroundImage = '';
            dropZone.classList.remove('board-settings-dropzone--has-image');
            if (onAfterRemove) onAfterRemove();
        });

        const handleFile = (file) => {
            this._handleImageUpload(file, boardProperty, preview, dropZone, onAfterUpload);
        };

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('board-settings-dropzone--active');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('board-settings-dropzone--active');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('board-settings-dropzone--active');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) handleFile(file);
        });
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) handleFile(file);
        });

        dropZone.appendChild(preview);
        dropZone.appendChild(dropText);
        dropZone.appendChild(fileInput);
        dropZone.appendChild(removeBtn);

        group.appendChild(dropZone);
        panel.appendChild(group);
    }

    /**
     * Charge la preview d'une image existante depuis une propriété du board.
     *
     * @param {string} boardProperty - 'coverImage' ou 'backgroundImage'
     * @param {HTMLElement} previewEl
     * @param {HTMLElement} dropZone
     * @private
     */
    async _loadImagePreview(boardProperty, previewEl, dropZone) {
        const imageRef = this._board[boardProperty];
        const imageUrl = await resolveBackgroundImageUrl(imageRef);
        if (imageUrl) {
            previewEl.style.backgroundImage = `url(${imageUrl})`;
            dropZone.classList.add('board-settings-dropzone--has-image');
        }
    }

    /**
     * Stocke un fichier image dans IndexedDB et met à jour la preview.
     *
     * @param {File} file
     * @param {string} boardProperty - 'coverImage' ou 'backgroundImage'
     * @param {HTMLElement} previewEl
     * @param {HTMLElement} dropZone
     * @param {Function|null} onAfterUpload - Callback post-upload (reçoit l'URL)
     * @private
     */
    async _handleImageUpload(file, boardProperty, previewEl, dropZone, onAfterUpload) {
        try {
            const boardId = Application.instance?.currentBoardId;
            const imageData = await ImageStorageService.store(file, boardId, null);

            this._board[boardProperty] = { id: imageData.id };

            const imageUrl = await ImageStorageService.getUrl(imageData.id);
            if (imageUrl) {
                previewEl.style.backgroundImage = `url(${imageUrl})`;
                dropZone.classList.add('board-settings-dropzone--has-image');
                if (onAfterUpload) onAfterUpload(imageUrl);
            }
        } catch (error) {
            console.error(`GeneralPanel: Erreur stockage ${boardProperty}`, error);
        }
    }

    /**
     * Applique l'image de fond au DOM du board.
     *
     * @param {string|null} imageUrl
     * @private
     */
    _applyBackgroundToBoard(imageUrl = null) {
        const boardEl = document.querySelector('.board');
        if (!boardEl) return;
        applyBackgroundStyle(boardEl, imageUrl);
    }
}
