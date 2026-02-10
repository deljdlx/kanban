/**
 * ImagePastePlugin — Coller des images dans les descriptions et commentaires.
 *
 * Deux mecanismes complementaires :
 *   1. Hook modal:editCard:opened → attache un paste handler sur le textarea description
 *   2. Delegation d'evenements sur document → capture le paste sur les textareas
 *      de commentaire (.card-detail-comment-input) de la modale de detail
 *
 * Quand l'utilisateur colle une image :
 *   1. L'image est stockee dans IndexedDB via ImageStorageService
 *   2. Un marqueur markdown ![image](img:<id>) est insere dans le texte
 *   3. Le MarkdownPlugin resoudra le img:<id> en Object URL au rendu
 */
import ImageStorageService from '../../../services/ImageStorageService.js';
import Application from '../../../Application.js';
import { generateId } from '../../../utils/id.js';

const ImagePastePlugin = {
    /** @type {Array<{ hookName: string, callback: Function }>} */
    _registeredHooks: [],

    /** @type {Function|null} Handler global pour le paste sur les commentaires */
    _documentPasteHandler: null,

    /**
     * Installe le plugin : ecoute l'ouverture de la modale d'edition
     * et attache un listener global pour les commentaires.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    install(hooks) {
        this._registeredHooks = [];
        if (typeof this._injectStyles === 'function') {
            this._injectStyles();
        }

        // Hook pour la description dans ModalEditCard
        const cb = (ctx) => this._onModalEditCard(ctx);
        hooks.addAction('modal:editCard:opened', cb);
        this._registeredHooks.push({ hookName: 'modal:editCard:opened', callback: cb });

        // Delegation globale pour les textareas de commentaire
        this._documentPasteHandler = (e) => this._onDocumentPaste(e);
        document.addEventListener('paste', this._documentPasteHandler, true);
    },

    /**
     * Desinstalle le plugin : retire tous les hooks et le listener global.
     *
     * @param {import('../../HookRegistry.js').default} hooks
     */
    uninstall(hooks) {
        for (const { hookName, callback } of this._registeredHooks) {
            hooks.removeAction(hookName, callback);
        }
        this._registeredHooks = [];

        if (this._documentPasteHandler) {
            document.removeEventListener('paste', this._documentPasteHandler, true);
            this._documentPasteHandler = null;
        }
    },

    /**
     * Callback quand la modale d'edition s'ouvre.
     * Attache un listener paste sur le textarea de description.
     *
     * @param {{ cardId: string, body: HTMLElement, onClose: Function }} ctx
     * @private
     */
    _onModalEditCard({ cardId, body, onClose }) {
        const textarea = body.querySelector('textarea.textarea');
        if (!textarea) return;

        const handler = (e) => this._onPaste(e, textarea, cardId);
        textarea.addEventListener('paste', handler);
        onClose(() => textarea.removeEventListener('paste', handler));
    },

    /**
     * Delegation globale : intercepte le paste sur les textareas de commentaire.
     * Cible les elements avec la classe .card-detail-comment-input.
     *
     * @param {ClipboardEvent} e
     * @private
     */
    _onDocumentPaste(e) {
        const textarea = e.target;
        if (!(textarea instanceof HTMLTextAreaElement)) return;
        if (!textarea.classList.contains('card-detail-comment-input')) return;

        // cardId null : l'image est liee au board, pas a une carte specifique
        this._onPaste(e, textarea, null);
    },

    /**
     * Gere le paste d'une image depuis le presse-papier.
     * Stocke l'image et insere le markdown correspondant.
     *
     * @param {ClipboardEvent} e
     * @param {HTMLTextAreaElement} textarea
     * @param {string|null} cardId
     * @private
     */
    async _onPaste(e, textarea, cardId) {
        const files = Array.from(e.clipboardData?.files || []);
        const imageFile = files.find((f) => f.type.startsWith('image/'));
        if (!imageFile) return; // Pas d'image → laisser le paste normal

        e.preventDefault();

        const boardId = Application.instance?.currentBoardId;
        if (!boardId) return;

        // Marker unique pour eviter les collisions si 2 pastes rapides
        const uid = generateId('img');
        const marker = `![Chargement...](uploading-${uid})`;
        this._insertAtCursor(textarea, marker);

        try {
            const { id } = await ImageStorageService.store(imageFile, boardId, cardId);
            const markdown = `![image](img:${id})`;

            // Remplace le marker par le vrai markdown
            textarea.value = textarea.value.replace(marker, markdown);
        } catch (err) {
            console.error('[ImagePastePlugin] Erreur stockage image :', err);
            textarea.value = textarea.value.replace(marker, '');
        }
    },

    /**
     * Insere du texte a la position courante du curseur dans le textarea.
     *
     * @param {HTMLTextAreaElement} textarea
     * @param {string} text
     * @private
     */
    _insertAtCursor(textarea, text) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = textarea.value.substring(0, start);
        const after = textarea.value.substring(end);
        textarea.value = before + text + after;
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
    },
};

export default ImagePastePlugin;
