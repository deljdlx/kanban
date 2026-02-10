/**
 * CommentsPanel — Onglet "Commentaires" de la modale carte.
 *
 * Affiche :
 *   - Formulaire d'ajout de commentaire (texte + fichiers joints)
 *   - Liste des commentaires (plus récent en haut)
 *   - Édition inline pour l'auteur/admin
 *   - Fichiers joints affichés en liens téléchargeables
 */
import UserService from '../../services/UserService.js';
import PermissionService from '../../services/PermissionService.js';
import Comment from '../../models/Comment.js';
import BoardService from '../../services/BoardService.js';
import StorageService from '../../services/StorageService.js';
import Application from '../../Application.js';
import { formatDateTime } from '../../utils/date.js';
import { getFileIcon, formatFileSize } from '../../utils/file.js';
import Hooks from '../../plugins/HookRegistry.js';
import UploadZone from '../../components/UploadZone.js';

export default class CommentsPanel {
    /**
     * @type {import('../../models/Card.js').default}
     */
    _card;

    /**
     * Conteneur de la liste de commentaires.
     * @type {HTMLElement|null}
     */
    _listContainer;

    /**
     * Callback pour notifier un changement (refresh historique).
     * @type {Function|null}
     */
    _onCommentChange;

    /**
     * Fichiers en attente avant soumission du commentaire.
     * @type {Array<File>}
     */
    _pendingFiles;

    /**
     * Instance UploadZone du formulaire (pour destroy au démontage).
     * @type {UploadZone|null}
     */
    _uploadZone;

    /**
     * @param {import('../../models/Card.js').default} card
     * @param {Object} [options]
     * @param {Function} [options.onCommentChange] - Callback après ajout/modif
     */
    constructor(card, { onCommentChange = null } = {}) {
        this._card = card;
        this._listContainer = null;
        this._onCommentChange = onCommentChange;
        this._pendingFiles = [];
        this._uploadZone = null;
    }

    /**
     * Construit et retourne l'élément DOM du panel.
     *
     * @returns {HTMLElement}
     */
    build() {
        const panel = document.createElement('div');
        panel.className = 'card-detail-panel';

        // Formulaire d'ajout
        panel.appendChild(this._buildForm());

        // Liste des commentaires
        this._listContainer = document.createElement('div');
        this._listContainer.className = 'card-detail-comments';
        this._renderList();
        panel.appendChild(this._listContainer);

        return panel;
    }

    /**
     * Nettoie les ressources (UploadZone).
     */
    destroy() {
        if (this._uploadZone) {
            this._uploadZone.destroy();
            this._uploadZone = null;
        }
    }

    // ---------------------------------------------------------------
    // Formulaire d'ajout
    // ---------------------------------------------------------------

    /**
     * Construit le formulaire de commentaire avec zone de chips
     * et barre d'actions (📎 à gauche, Commenter à droite).
     *
     * @returns {HTMLElement}
     * @private
     */
    _buildForm() {
        const form = document.createElement('div');
        form.className = 'card-detail-comment-form';

        const textarea = document.createElement('textarea');
        textarea.className = 'card-detail-comment-input';
        textarea.placeholder = 'Écrire un commentaire...';
        textarea.rows = 3;

        // Conteneur des chips fichiers en attente
        const chipsContainer = document.createElement('div');
        chipsContainer.className = 'card-detail-comment-files-pending';

        // Barre d'actions : UploadZone compact + bouton Commenter
        const actionsBar = document.createElement('div');
        actionsBar.className = 'card-detail-comment-form-actions';

        this._uploadZone = new UploadZone({
            onFiles: (fileList) => this._addPendingFiles(fileList, chipsContainer),
            multiple: true,
            compact: true,
        });
        actionsBar.appendChild(this._uploadZone.render());

        const submitBtn = document.createElement('button');
        submitBtn.className = 'card-detail-comment-submit';
        submitBtn.textContent = 'Commenter';

        submitBtn.addEventListener('click', () => {
            this._submitComment(textarea, chipsContainer);
        });

        actionsBar.appendChild(submitBtn);

        form.appendChild(textarea);
        form.appendChild(chipsContainer);
        form.appendChild(actionsBar);
        return form;
    }

    /**
     * Ajoute des fichiers à la liste d'attente et met à jour les chips.
     *
     * @param {FileList} fileList
     * @param {HTMLElement} chipsContainer
     * @private
     */
    _addPendingFiles(fileList, chipsContainer) {
        for (const file of fileList) {
            this._pendingFiles.push(file);
        }
        this._renderPendingChips(chipsContainer);
    }

    /**
     * Affiche les chips des fichiers en attente.
     * Chaque chip montre icône + nom + taille + bouton ✕ pour retirer.
     *
     * @param {HTMLElement} container
     * @private
     */
    _renderPendingChips(container) {
        container.innerHTML = '';

        for (let i = 0; i < this._pendingFiles.length; i++) {
            const file = this._pendingFiles[i];

            const chip = document.createElement('span');
            chip.className = 'card-detail-comment-file-chip';

            const icon = getFileIcon(file.type);
            const size = formatFileSize(file.size);
            chip.textContent = `${icon} ${file.name} (${size})`;

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'card-detail-comment-file-chip-remove';
            removeBtn.textContent = '\u2715';
            removeBtn.title = 'Retirer';

            const fileRef = file;
            removeBtn.addEventListener('click', () => {
                const idx = this._pendingFiles.indexOf(fileRef);
                if (idx !== -1) this._pendingFiles.splice(idx, 1);
                this._renderPendingChips(container);
            });

            chip.appendChild(removeBtn);
            container.appendChild(chip);
        }
    }

    /**
     * Soumet le commentaire : stocke les fichiers en IndexedDB,
     * crée le Comment avec les métadonnées, et reset le formulaire.
     *
     * @param {HTMLTextAreaElement} textarea
     * @param {HTMLElement} chipsContainer
     * @private
     */
    async _submitComment(textarea, chipsContainer) {
        const text = textarea.value.trim();
        if (!text && this._pendingFiles.length === 0) return;

        const boardId = Application.instance?.currentBoardId;
        const currentUser = UserService.getCurrentUser();

        // Stocke les fichiers en IndexedDB et collecte les métadonnées
        const fileMetas = [];
        if (this._pendingFiles.length > 0) {
            if (!boardId) {
                console.warn('[CommentsPanel] boardId indisponible — fichiers joints ignorés');
                Hooks.doAction('toast:show', {
                    message: 'Impossible de joindre les fichiers (board non chargé)',
                    type: 'warning',
                });
            } else {
                for (const file of this._pendingFiles) {
                    try {
                        const id = await StorageService.storeImage({
                            blob: file,
                            boardId,
                            cardId: this._card.id,
                            mimeType: file.type || 'application/octet-stream',
                        });

                        fileMetas.push({
                            id,
                            name: file.name,
                            size: file.size,
                            mimeType: file.type || 'application/octet-stream',
                        });
                    } catch (err) {
                        console.error(`[CommentsPanel] Échec stockage "${file.name}" :`, err);
                    }
                }
            }
        }

        const comment = new Comment({
            text: text || '',
            authorId: currentUser ? currentUser.id : null,
            files: fileMetas,
        });

        this._card.addComment(comment);
        Hooks.doAction('comment:added', { comment, card: this._card });

        // Reset
        textarea.value = '';
        this._pendingFiles = [];
        this._renderPendingChips(chipsContainer);
        this._renderList();
        this._notifyChange();
        await BoardService.save();
    }

    // ---------------------------------------------------------------
    // Liste des commentaires
    // ---------------------------------------------------------------

    /**
     * Rend la liste des commentaires.
     *
     * @private
     */
    _renderList() {
        this._listContainer.innerHTML = '';

        const comments = this._card.comments;
        const currentUser = UserService.getCurrentUser();

        if (comments.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'card-detail-comments-empty';
            empty.textContent = 'Aucun commentaire';
            this._listContainer.appendChild(empty);
            return;
        }

        // Plus récent en haut
        const sorted = [...comments].reverse();

        for (const comment of sorted) {
            this._listContainer.appendChild(this._buildCommentItem(comment));
        }
    }

    /**
     * Construit un élément commentaire.
     *
     * @param {import('../../models/Comment.js').default} comment
     * @returns {HTMLElement}
     * @private
     */
    _buildCommentItem(comment) {
        const el = document.createElement('div');
        el.className = 'card-detail-comment';

        // Header : avatar + nom + date + bouton modifier
        const header = document.createElement('div');
        header.className = 'card-detail-comment-header';

        const user = comment.authorId ? UserService.getUserById(comment.authorId) : null;

        if (user) {
            const avatar = document.createElement('span');
            avatar.className = 'card-detail-user-avatar';
            avatar.textContent = user.initials;
            avatar.style.backgroundColor = user.color;
            header.appendChild(avatar);

            const name = document.createElement('span');
            name.className = 'card-detail-comment-author';
            name.textContent = user.name;
            header.appendChild(name);
        } else {
            const name = document.createElement('span');
            name.className = 'card-detail-comment-author';
            name.textContent = 'Inconnu';
            header.appendChild(name);
        }

        const date = document.createElement('span');
        date.className = 'card-detail-comment-date';
        date.textContent = formatDateTime(comment.date);
        header.appendChild(date);

        // Bouton modifier (visible si admin ou auteur)
        if (PermissionService.canEditComment(comment.authorId)) {
            const editBtn = document.createElement('button');
            editBtn.className = 'card-detail-comment-edit';
            editBtn.textContent = 'Modifier';
            editBtn.addEventListener('click', () => {
                this._enterEditMode(el, comment);
            });
            header.appendChild(editBtn);
        }

        // Texte du commentaire (avec hook pour Markdown)
        const text = document.createElement('div');
        text.className = 'card-detail-comment-text';
        text.textContent = comment.text;
        Hooks.doAction('render:comment', {
            element: text,
            text: comment.text,
            context: 'modal',
        });

        el.appendChild(header);
        el.appendChild(text);

        // Fichiers joints au commentaire
        const files = comment.files;
        if (files && files.length > 0) {
            const filesContainer = document.createElement('div');
            filesContainer.className = 'card-detail-comment-files';

            for (const file of files) {
                const link = document.createElement('a');
                link.className = 'card-detail-comment-file-link';
                link.download = file.name;
                link.title = `${file.name} (${formatFileSize(file.size)})`;
                link.textContent = `${getFileIcon(file.mimeType)} ${file.name} (${formatFileSize(file.size)})`;

                // Lien désactivé tant que l'URL n'est pas chargée
                link.classList.add('comment-file-link--loading');

                StorageService.getImageUrl(file.id)
                    .then((url) => {
                        if (url) {
                            link.href = url;
                            link.classList.remove('comment-file-link--loading');
                        }
                    })
                    .catch(() => {
                        /* fichier indisponible */
                    });

                filesContainer.appendChild(link);
            }

            el.appendChild(filesContainer);
        }

        return el;
    }

    /**
     * Remplace le texte d'un commentaire par un formulaire d'édition inline.
     *
     * @param {HTMLElement} commentEl
     * @param {import('../../models/Comment.js').default} comment
     * @private
     */
    _enterEditMode(commentEl, comment) {
        const textEl = commentEl.querySelector('.card-detail-comment-text');
        if (!textEl) return;

        const editArea = document.createElement('div');
        editArea.className = 'card-detail-comment-edit-form';

        const textarea = document.createElement('textarea');
        textarea.className = 'card-detail-comment-input';
        textarea.value = comment.text;
        textarea.rows = 3;

        const actions = document.createElement('div');
        actions.className = 'card-detail-comment-edit-actions';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'card-detail-comment-submit';
        saveBtn.textContent = 'Enregistrer';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'card-detail-comment-cancel';
        cancelBtn.textContent = 'Annuler';

        saveBtn.addEventListener('click', () => {
            const newText = textarea.value.trim();
            if (!newText || newText === comment.text) {
                this._renderList();
                return;
            }

            const currentUser = UserService.getCurrentUser();
            this._card.updateComment(comment.id, newText, currentUser ? currentUser.id : null);
            this._renderList();
            this._notifyChange();
            // save() async — errors handled internally by BoardService
            BoardService.save();
        });

        cancelBtn.addEventListener('click', () => {
            this._renderList();
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(saveBtn);
        editArea.appendChild(textarea);
        editArea.appendChild(actions);

        textEl.replaceWith(editArea);

        // Masque le bouton "Modifier" pendant l'édition
        const editBtn = commentEl.querySelector('.card-detail-comment-edit');
        if (editBtn) editBtn.classList.add('hidden');
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    /**
     * Notifie le parent d'un changement (pour refresh historique).
     *
     * @private
     */
    _notifyChange() {
        if (this._onCommentChange) {
            this._onCommentChange();
        }
    }
}
