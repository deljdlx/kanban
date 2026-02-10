/**
 * FileAttachmentPlugin — Attacher des fichiers à une carte.
 *
 * Fonctionnalités :
 *   - Onglet "Fichiers" dans la modale d'édition (upload, liste, téléchargement, suppression)
 *   - Badge "📎 N" sur les cartes ayant des fichiers joints
 *   - Nettoyage automatique des blobs quand une carte est supprimée
 *
 * Stockage :
 *   - Blobs dans IndexedDB store `images` (via StorageService.storeImage)
 *   - Métadonnées dans card.data.files[] : { id, name, size, mimeType, createdAt, description }
 *
 * Hooks utilisés :
 *   - modal:cardDetail:renderContent : grille de fichiers en lecture seule
 *   - modal:editCard:opened          : onglet "Fichiers" (upload, édition, suppression)
 *   - card:rendered                   : badge 📎 N sur les cartes
 *   - card:deleted                    : supprime les blobs orphelins
 */
import StorageService from '../../../services/StorageService.js';
import BoardService from '../../../services/BoardService.js';
import Application from '../../../Application.js';
import UploadZone from '../../../components/UploadZone.js';
import { getFileIcon, formatFileSize } from '../../../utils/file.js';

export default {
    // ---------------------------------------------------------------
    // État interne
    // ---------------------------------------------------------------

    /** @type {Array<{ hookName: string, callback: Function }>} Pour uninstall auto */
    _registeredHooks: [],

    /** @type {UploadZone|null} Instance courante pour cleanup avant rebuild */
    _uploadZone: null,

    // ---------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------

    /**
     * Installe le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        this._registeredHooks = [];

        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        this._listen(hooks, 'modal:cardDetail:renderContent', (ctx) => this._onCardDetail(ctx));
        this._listen(hooks, 'modal:editCard:opened', (ctx) => this._onModalEditCard(ctx));
        this._listen(hooks, 'card:rendered', (ctx) => this._onCardRendered(ctx));
        this._listen(hooks, 'card:deleted', (ctx) => this._onCardDeleted(ctx));
    },

    /**
     * Désinstalle le plugin.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        for (const { hookName, callback } of this._registeredHooks) {
            hooks.removeAction(hookName, callback);
        }
        this._registeredHooks = [];

        if (this._uploadZone) {
            this._uploadZone.destroy();
            this._uploadZone = null;
        }
    },

    /**
     * Enregistre un hook et le track pour uninstall automatique.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     * @param {string} hookName
     * @param {Function} callback
     * @private
     */
    _listen(hooks, hookName, callback) {
        hooks.addAction(hookName, callback);
        this._registeredHooks.push({ hookName, callback });
    },

    // ---------------------------------------------------------------
    // Hook : modal:cardDetail:renderContent
    // ---------------------------------------------------------------

    /**
     * Injecte la grille de fichiers joints dans le panel "Informations"
     * de la modale détail carte. Lecture seule (pas de suppression ni upload).
     *
     * @param {{ card: import('../../../models/Card.js').default, panel: HTMLElement }} ctx
     * @private
     */
    _onCardDetail({ card, panel }) {
        const files = card.data.files;
        if (!files || files.length === 0) return;

        const section = document.createElement('div');
        section.className = 'fap-detail-section';

        const label = document.createElement('div');
        label.className = 'card-detail-field-label';
        label.textContent = 'Fichiers joints';
        section.appendChild(label);

        const grid = document.createElement('div');
        grid.className = 'fap-files-list';

        for (const file of files) {
            grid.appendChild(this._buildDetailFileCard(file));
        }

        section.appendChild(grid);
        panel.appendChild(section);
    },

    /**
     * Construit une card fichier en lecture seule (pour la modale détail).
     * Affiche icône, nom, taille, description et lien de téléchargement.
     *
     * @param {Object} file - Métadonnées du fichier
     * @returns {HTMLElement}
     * @private
     */
    _buildDetailFileCard(file) {
        const item = this._buildFileCardBase(file);

        // Description (texte pur, pas éditable)
        if (file.description) {
            const desc = document.createElement('span');
            desc.className = 'fap-file-description';
            desc.textContent = file.description;
            desc.title = file.description;
            item.appendChild(desc);
        }

        // Lien téléchargement
        const dlLink = document.createElement('a');
        dlLink.className = 'fap-btn fap-btn--download fap-detail-download';
        dlLink.textContent = '\u2B07';
        dlLink.title = 'Télécharger';
        dlLink.download = file.name;

        StorageService.getImageUrl(file.id).then((url) => {
            if (url) dlLink.href = url;
        });

        item.appendChild(dlLink);
        return item;
    },

    // ---------------------------------------------------------------
    // Hook : modal:editCard:opened
    // ---------------------------------------------------------------

    /**
     * Ajoute l'onglet "Fichiers" dans la modale d'édition.
     *
     * @param {{ card: import('../../../models/Card.js').default, addTab: Function }} ctx
     * @private
     */
    _onModalEditCard({ card, addTab }) {
        const panel = addTab('Fichiers', { order: 5 });
        this._buildFilesPanel(panel, card);
    },

    /**
     * Construit le contenu du panel Fichiers.
     *
     * @param {HTMLElement} panel
     * @param {import('../../../models/Card.js').default} card
     * @private
     */
    _buildFilesPanel(panel, card) {
        // Cleanup de l'UploadZone précédente avant rebuild
        if (this._uploadZone) {
            this._uploadZone.destroy();
            this._uploadZone = null;
        }

        panel.innerHTML = '';

        // Liste des fichiers
        const list = document.createElement('div');
        list.className = 'fap-files-list';

        const files = card.data.files || [];

        if (files.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'fap-empty';
            empty.textContent = 'Aucun fichier joint.';
            list.appendChild(empty);
        } else {
            for (const file of files) {
                list.appendChild(this._buildFileItem(file, card, panel));
            }
        }

        panel.appendChild(list);

        // Zone d'upload (composant réutilisable)
        this._uploadZone = new UploadZone({
            onFiles: (fileList) => this._addFiles(card, fileList, panel),
            multiple: true,
        });
        panel.appendChild(this._uploadZone.render());
    },

    /**
     * Construit une ligne de fichier.
     *
     * @param {Object} file - Métadonnées du fichier
     * @param {import('../../../models/Card.js').default} card
     * @param {HTMLElement} panel - Pour refresh après suppression
     * @returns {HTMLElement}
     * @private
     */
    _buildFileItem(file, card, panel) {
        const item = this._buildFileCardBase(file);

        // Description (cliquable pour éditer inline)
        const desc = document.createElement('span');
        desc.className = 'fap-file-description fap-file-description--editable';
        if (file.description) {
            desc.textContent = file.description;
        } else {
            desc.textContent = 'Ajouter une description\u2026';
            desc.classList.add('fap-file-description--empty');
        }
        desc.addEventListener('click', (e) => {
            e.stopPropagation();
            this._editDescription(desc, file, card);
        });

        // Actions
        const actions = document.createElement('div');
        actions.className = 'fap-file-actions';

        // Lien natif <a download> — le navigateur gère le téléchargement
        // directement au clic utilisateur (pas de perte de gesture context).
        const dlLink = document.createElement('a');
        dlLink.className = 'fap-btn fap-btn--download';
        dlLink.textContent = '⬇';
        dlLink.title = 'Télécharger';
        dlLink.download = file.name;

        // Charge le blob URL en async (via le cache StorageService)
        StorageService.getImageUrl(file.id).then((url) => {
            if (url) dlLink.href = url;
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'fap-btn fap-btn--delete';
        delBtn.textContent = '✕';
        delBtn.title = 'Supprimer';
        delBtn.addEventListener('click', () => this._removeFile(card, file.id, panel));

        actions.appendChild(dlLink);
        actions.appendChild(delBtn);

        item.appendChild(desc);
        item.appendChild(actions);
        return item;
    },

    // ---------------------------------------------------------------
    // CRUD fichiers
    // ---------------------------------------------------------------

    /**
     * Ajoute plusieurs fichiers à une carte.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {FileList} fileList
     * @param {HTMLElement} panel - Pour refresh
     * @private
     */
    async _addFiles(card, fileList, panel) {
        const boardId = Application.instance?.currentBoardId;
        if (!boardId) return;

        const existingFiles = card.data.files || [];
        const newFiles = [...existingFiles];

        for (const file of fileList) {
            try {
                const id = await StorageService.storeImage({
                    blob: file,
                    boardId,
                    cardId: card.id,
                    mimeType: file.type || 'application/octet-stream',
                });

                newFiles.push({
                    id,
                    name: file.name,
                    size: file.size,
                    mimeType: file.type || 'application/octet-stream',
                    description: '',
                    createdAt: new Date().toISOString(),
                });
            } catch (err) {
                console.error(`[FileAttachment] Échec stockage "${file.name}" :`, err);
            }
        }

        // Persiste même si certains fichiers ont échoué (les réussis sont ajoutés)
        if (newFiles.length !== existingFiles.length) {
            card.updateData({ files: newFiles });
            await BoardService.save();
        }
        this._buildFilesPanel(panel, card);
        this._refreshBadge(card);
    },

    /**
     * Supprime un fichier d'une carte.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {string} fileId
     * @param {HTMLElement} panel - Pour refresh
     * @private
     */
    async _removeFile(card, fileId, panel) {
        try {
            await StorageService.deleteImage(fileId);
        } catch (err) {
            console.warn('[FileAttachment] Échec suppression blob :', fileId, err);
            // Continue quand même : on retire la métadonnée, le GC nettoiera le blob
        }

        const files = (card.data.files || []).filter((f) => f.id !== fileId);
        card.updateData({ files });
        await BoardService.save();
        this._buildFilesPanel(panel, card);
        this._refreshBadge(card);
    },

    /**
     * Active l'édition inline de la description d'un fichier.
     * Remplace le <span> par un <input>, sauvegarde au blur/Enter, annule à Escape.
     *
     * @param {HTMLElement} descEl - Élément <span> de la description
     * @param {Object} file - Métadonnées du fichier
     * @param {import('../../../models/Card.js').default} card
     * @private
     */
    _editDescription(descEl, file, card) {
        // Relit la description depuis card.data pour éviter les références stale
        const currentFile = (card.data.files || []).find((f) => f.id === file.id);
        const currentDesc = currentFile?.description || '';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'fap-file-description-input';
        input.value = currentDesc;
        input.placeholder = 'Description du fichier\u2026';

        const save = () => {
            const newDesc = input.value.trim();
            this._updateFileDescription(card, file.id, newDesc);

            // Met à jour le span inline sans reconstruire le panel
            descEl.textContent = newDesc || 'Ajouter une description\u2026';
            descEl.className =
                'fap-file-description fap-file-description--editable' + (newDesc ? '' : ' fap-file-description--empty');
            input.replaceWith(descEl);
        };

        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            }
            if (e.key === 'Escape') {
                // Annule : restaure le span original sans sauvegarder
                input.removeEventListener('blur', save);
                input.replaceWith(descEl);
            }
        });

        descEl.replaceWith(input);
        input.focus();
    },

    /**
     * Persiste la description d'un fichier dans card.data.files.
     *
     * @param {import('../../../models/Card.js').default} card
     * @param {string} fileId
     * @param {string} description
     * @private
     */
    async _updateFileDescription(card, fileId, description) {
        const files = (card.data.files || []).map((f) => (f.id === fileId ? { ...f, description } : f));
        card.updateData({ files });
        await BoardService.save();
    },

    // ---------------------------------------------------------------
    // Hook : card:rendered
    // ---------------------------------------------------------------

    /**
     * Injecte un badge 📎 N sur les cartes ayant des fichiers.
     *
     * @param {{ card: import('../../../models/Card.js').default, element: HTMLElement }} ctx
     * @private
     */
    _onCardRendered({ card, element }) {
        this._updateBadge(element, card.data.files);
    },

    // ---------------------------------------------------------------
    // Hook : card:deleted
    // ---------------------------------------------------------------

    /**
     * Supprime les blobs des fichiers quand une carte est supprimée.
     *
     * @param {{ card: import('../../../models/Card.js').default }} ctx
     * @private
     */
    async _onCardDeleted({ card }) {
        const files = card.data.files;
        if (!files || files.length === 0) return;

        for (const file of files) {
            try {
                await StorageService.deleteImage(file.id);
            } catch {
                // Silently ignore — le GC rattrapera si nécessaire
            }
        }
    },

    // ---------------------------------------------------------------
    // Badge refresh
    // ---------------------------------------------------------------

    /**
     * Met à jour le badge 📎 sur l'élément DOM de la carte dans le board.
     * Appelé après ajout/suppression de fichier depuis la modale.
     *
     * @param {import('../../../models/Card.js').default} card
     * @private
     */
    _refreshBadge(card) {
        const el = document.querySelector(`.card[data-id="${card.id}"]`);
        if (!el) return;
        this._updateBadge(el, card.data.files);
    },

    /**
     * Injecte ou retire le badge 📎 N sur un élément carte.
     *
     * @param {HTMLElement} element - Élément DOM .card
     * @param {Array|undefined} files - Liste des fichiers
     * @private
     */
    _updateBadge(element, files) {
        const existing = element.querySelector('.fap-badge');
        if (existing) existing.remove();

        if (!files || files.length === 0) return;

        const badge = document.createElement('span');
        badge.className = 'fap-badge';
        badge.textContent = `📎 ${files.length}`;
        badge.title = `${files.length} fichier(s) joint(s)`;
        element.appendChild(badge);
    },

    // ---------------------------------------------------------------
    // Utilitaires
    // ---------------------------------------------------------------

    /**
     * Construit la base d'une card fichier : icône, nom, taille.
     * Partagé entre la vue édition et la vue détail.
     *
     * @param {Object} file - Métadonnées du fichier
     * @returns {HTMLElement}
     * @private
     */
    _buildFileCardBase(file) {
        const item = document.createElement('div');
        item.className = 'fap-file-item';

        const icon = document.createElement('span');
        icon.className = 'fap-file-icon';
        icon.textContent = getFileIcon(file.mimeType);

        const name = document.createElement('span');
        name.className = 'fap-file-name';
        name.textContent = file.name;
        name.title = file.name;

        const size = document.createElement('span');
        size.className = 'fap-file-size';
        size.textContent = formatFileSize(file.size);

        item.appendChild(icon);
        item.appendChild(name);
        item.appendChild(size);
        return item;
    },
};
