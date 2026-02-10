/**
 * ExplorerView — Explorateur IndexedDB (outil dev).
 *
 * Permet de naviguer dans les 3 stores de la DB (meta, boards, images) :
 *   - Sidebar avec liste des stores et compteurs
 *   - Table des records d'un store
 *   - Detail d'un record avec JSON pretty-print
 *   - Preview des images (thumbnails + detail)
 *
 * Accessible via la route #/explorer.
 */
import StorageService from '../services/StorageService.js';
import Router from '../services/Router.js';

const STORES = StorageService.STORES;

/**
 * Noms des stores dans l'ordre d'affichage.
 * @type {string[]}
 */
const STORE_NAMES = [STORES.META, STORES.BOARDS, STORES.IMAGES];

/**
 * Descripteurs de rendu par store.
 * Chaque entrée définit comment afficher les records d'un store :
 *   - header : HTML du header de table
 *   - getKey : extrait la clé primaire d'un record
 *
 * Ajouter un store = ajouter une entrée ici (zéro modification ailleurs).
 *
 * @type {Object<string, { header: string, getKey: function(Object): string }>}
 */
const STORE_RENDERERS = {
    [STORES.META]: {
        header: '<tr><th>Key</th><th>Apercu</th></tr>',
        getKey: (record) => record.key,
    },
    [STORES.BOARDS]: {
        header: '<tr><th>ID</th><th>Nom</th><th>Colonnes</th><th>Cartes</th><th>Mis a jour</th></tr>',
        getKey: (record) => record.id,
    },
    [STORES.IMAGES]: {
        header: '<tr><th>ID</th><th>Preview</th><th>Board ID</th><th>Taille</th><th>MIME</th></tr>',
        getKey: (record) => record.id,
    },
};

export default class ExplorerView {
    /**
     * Element racine de la vue.
     * @type {HTMLElement|null}
     */
    _element;

    /**
     * Conteneur de la sidebar.
     * @type {HTMLElement|null}
     */
    _sidebar;

    /**
     * Zone de contenu principale.
     * @type {HTMLElement|null}
     */
    _content;

    /**
     * Store actuellement selectionne.
     * @type {string|null}
     */
    _activeStore;

    /**
     * Cle du record affiche en detail.
     * @type {string|null}
     */
    _activeRecordKey;

    /**
     * Object URLs de blobs a revoquer au destroy.
     * @type {string[]}
     */
    _objectUrls;

    /**
     * Compteur anti-race-condition pour les chargements async.
     * Incremente a chaque nouvelle requete, les requetes
     * dont l'ID ne correspond plus au compteur sont ignorees.
     * @type {number}
     */
    _requestId;

    constructor() {
        this._element = null;
        this._sidebar = null;
        this._content = null;
        this._activeStore = null;
        this._activeRecordKey = null;
        this._objectUrls = [];
        this._requestId = 0;
    }

    /**
     * Construit le DOM et l'attache au conteneur.
     *
     * @param {HTMLElement} container
     * @returns {Promise<void>}
     */
    async render(container) {
        this._element = document.createElement('div');
        this._element.className = 'explorer';

        // Sidebar
        this._sidebar = this._buildSidebar();
        this._element.appendChild(this._sidebar);

        // Contenu
        this._content = document.createElement('main');
        this._content.className = 'explorer-content';

        // Empty state par defaut
        this._content.innerHTML = `
            <div class="explorer-empty">
                <p>Selectionnez un store dans la sidebar</p>
            </div>
        `;

        this._element.appendChild(this._content);
        container.appendChild(this._element);

        // Charge les compteurs (async, sans bloquer le rendu)
        await this._loadStoreCounts();
    }

    /**
     * Detruit la vue : revoque les Object URLs, retire le DOM, null les refs.
     */
    destroy() {
        this._revokeObjectUrls();

        if (this._element) {
            this._element.remove();
            this._element = null;
        }

        this._sidebar = null;
        this._content = null;
        this._activeStore = null;
        this._activeRecordKey = null;
    }

    // ---------------------------------------------------------------
    // Construction du DOM
    // ---------------------------------------------------------------

    /**
     * Construit la sidebar avec la liste des stores et le lien retour.
     *
     * @returns {HTMLElement}
     * @private
     */
    _buildSidebar() {
        const aside = document.createElement('aside');
        aside.className = 'explorer-sidebar';

        // Lien retour
        const backLink = document.createElement('a');
        backLink.className = 'explorer-back';
        backLink.textContent = '\u2190 Retour';
        backLink.addEventListener('click', (e) => {
            e.preventDefault();
            Router.navigate('/');
        });
        aside.appendChild(backLink);

        // Titre
        const title = document.createElement('h2');
        title.className = 'explorer-sidebar-title';
        title.textContent = 'IndexedDB Explorer';
        aside.appendChild(title);

        // Liste des stores
        const ul = document.createElement('ul');
        ul.className = 'explorer-store-list';

        for (const storeName of STORE_NAMES) {
            const li = document.createElement('li');
            li.className = 'explorer-store-item';
            li.dataset.store = storeName;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'explorer-store-name';
            nameSpan.textContent = storeName;

            const countSpan = document.createElement('span');
            countSpan.className = 'explorer-store-count';
            countSpan.textContent = '...';

            li.appendChild(nameSpan);
            li.appendChild(countSpan);

            li.addEventListener('click', () => this._showStoreRecords(storeName));

            ul.appendChild(li);
        }

        aside.appendChild(ul);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'explorer-sidebar-footer';
        footer.textContent = 'DB: kanban';
        aside.appendChild(footer);

        return aside;
    }

    // ---------------------------------------------------------------
    // Chargement des donnees
    // ---------------------------------------------------------------

    /**
     * Compte les records dans chaque store et met a jour les badges.
     *
     * @returns {Promise<void>}
     * @private
     */
    async _loadStoreCounts() {
        for (const storeName of STORE_NAMES) {
            // Guard : la vue a pu etre detruite pendant l'await
            if (!this._sidebar) return;

            const count = await StorageService.countRecords(storeName);
            const badge = this._sidebar.querySelector(
                `.explorer-store-item[data-store="${storeName}"] .explorer-store-count`,
            );
            if (badge) {
                badge.textContent = String(count);
            }
        }
    }

    /**
     * Met la classe active sur l'item du store selectionne.
     *
     * @param {string} storeName
     * @private
     */
    _setActiveStoreItem(storeName) {
        const items = this._sidebar.querySelectorAll('.explorer-store-item');
        for (const item of items) {
            item.classList.toggle('explorer-store-item--active', item.dataset.store === storeName);
        }
    }

    /**
     * Charge et affiche la liste des records d'un store.
     *
     * @param {string} storeName
     * @returns {Promise<void>}
     * @private
     */
    async _showStoreRecords(storeName) {
        // Cleanup des URLs de l'affichage precedent
        this._revokeObjectUrls();

        // Incremente le compteur pour invalider les requetes precedentes
        const requestId = ++this._requestId;

        this._activeStore = storeName;
        this._activeRecordKey = null;
        this._setActiveStoreItem(storeName);

        const records = await StorageService.getAllRecords(storeName);

        // Guard : une requete plus recente a pris le relais
        if (this._requestId !== requestId) return;

        this._content.innerHTML = '';

        // Breadcrumb
        this._content.appendChild(this._renderBreadcrumb(storeName));

        if (records.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'explorer-empty';
            empty.innerHTML = `<p>Aucun record dans "${this._escapeHtml(storeName)}"</p>`;
            this._content.appendChild(empty);
            return;
        }

        // Table
        const table = document.createElement('table');
        table.className = 'explorer-table';

        // Header selon le store
        const thead = document.createElement('thead');
        thead.innerHTML = this._getTableHeader(storeName);
        table.appendChild(thead);

        // Corps
        const tbody = document.createElement('tbody');
        for (const record of records) {
            const row = await this._renderRecordRow(record, storeName);

            // Guard : une requete plus recente a pris le relais
            if (this._requestId !== requestId) return;

            tbody.appendChild(row);
        }
        table.appendChild(tbody);

        this._content.appendChild(table);
    }

    /**
     * Retourne le HTML du header de table selon le store.
     *
     * @param {string} storeName
     * @returns {string}
     * @private
     */
    _getTableHeader(storeName) {
        const renderer = STORE_RENDERERS[storeName];
        return renderer ? renderer.header : '<tr><th>Key</th><th>Apercu</th></tr>';
    }

    /**
     * Construit une ligne de table pour un record.
     *
     * @param {Object} record
     * @param {string} storeName
     * @returns {Promise<HTMLTableRowElement>}
     * @private
     */
    async _renderRecordRow(record, storeName) {
        const tr = document.createElement('tr');
        tr.className = 'explorer-row';

        const key = this._getRecordKey(record, storeName);
        tr.addEventListener('click', () => this._showRecordDetail(key, storeName));

        switch (storeName) {
            case STORES.META:
                tr.innerHTML = `
                    <td class="explorer-cell-mono">${this._escapeHtml(record.key)}</td>
                    <td>${this._escapeHtml(this._truncate(JSON.stringify(record), 80))}</td>
                `;
                break;

            case STORES.BOARDS:
                tr.innerHTML = `
                    <td class="explorer-cell-mono">${this._escapeHtml(record.id)}</td>
                    <td>${this._escapeHtml(record.name || '(sans nom)')}</td>
                    <td>${Array.isArray(record.columns) ? record.columns.length : '?'}</td>
                    <td>${this._countCards(record)}</td>
                    <td>${record.updatedAt ? new Date(record.updatedAt).toLocaleString() : '-'}</td>
                `;
                break;

            case STORES.IMAGES: {
                // Thumbnail via Object URL
                const thumbTd = document.createElement('td');
                if (record.blob) {
                    const url = URL.createObjectURL(record.blob);
                    this._objectUrls.push(url);
                    const img = document.createElement('img');
                    img.className = 'explorer-thumbnail';
                    img.src = url;
                    img.alt = 'thumbnail';
                    thumbTd.appendChild(img);
                } else {
                    thumbTd.textContent = '-';
                }

                tr.innerHTML = `
                    <td class="explorer-cell-mono">${this._escapeHtml(record.id)}</td>
                    <td></td>
                    <td class="explorer-cell-mono">${this._escapeHtml(record.boardId || '-')}</td>
                    <td>${record.size ? this._formatBytes(record.size) : '-'}</td>
                    <td>${this._escapeHtml(record.mimeType || '-')}</td>
                `;
                // Remplace la cellule placeholder du thumbnail
                tr.children[1].replaceWith(thumbTd);
                break;
            }
        }

        return tr;
    }

    /**
     * Extrait la cle primaire d'un record selon le store.
     *
     * @param {Object} record
     * @param {string} storeName
     * @returns {string}
     * @private
     */
    _getRecordKey(record, storeName) {
        const renderer = STORE_RENDERERS[storeName];
        return renderer ? renderer.getKey(record) : record.id;
    }

    /**
     * Compte le nombre total de cartes dans un board.
     *
     * @param {Object} boardRecord
     * @returns {number|string}
     * @private
     */
    _countCards(boardRecord) {
        if (!Array.isArray(boardRecord.columns)) return '?';
        let count = 0;
        for (const col of boardRecord.columns) {
            if (Array.isArray(col.cards)) {
                count += col.cards.length;
            }
        }
        return count;
    }

    // ---------------------------------------------------------------
    // Detail d'un record
    // ---------------------------------------------------------------

    /**
     * Charge un record et affiche son detail (JSON + preview image).
     *
     * @param {string} key - Cle du record
     * @param {string} storeName
     * @returns {Promise<void>}
     * @private
     */
    async _showRecordDetail(key, storeName) {
        // Cleanup des URLs precedentes
        this._revokeObjectUrls();

        // Incremente le compteur pour invalider les requetes precedentes
        const requestId = ++this._requestId;

        this._activeRecordKey = key;

        const record = await StorageService.getRecord(storeName, key);

        // Guard : une requete plus recente a pris le relais
        if (this._requestId !== requestId) return;

        this._content.innerHTML = '';

        // Breadcrumb
        this._content.appendChild(this._renderBreadcrumb(storeName, key));

        if (!record) {
            const empty = document.createElement('div');
            empty.className = 'explorer-empty';
            empty.innerHTML = `<p>Record introuvable : "${this._escapeHtml(key)}"</p>`;
            this._content.appendChild(empty);
            return;
        }

        // Preview image si c'est un record du store images avec un blob
        if (storeName === STORES.IMAGES && record.blob) {
            try {
                const dataUrl = await StorageService.blobToDataUrl(record.blob);

                // Guard : une requete plus recente a pris le relais
                if (this._requestId !== requestId) return;

                const img = document.createElement('img');
                img.className = 'explorer-detail-image';
                img.src = dataUrl;
                img.alt = `Image ${key}`;
                this._content.appendChild(img);
            } catch {
                // Ignore les erreurs de conversion
            }
        }

        // JSON pretty-print
        const pre = document.createElement('pre');
        pre.className = 'explorer-json';
        pre.textContent = JSON.stringify(record, this._jsonReplacer, 2);
        this._content.appendChild(pre);
    }

    /**
     * Replacer pour JSON.stringify : remplace les Blob par un placeholder lisible.
     *
     * @param {string} key
     * @param {*} value
     * @returns {*}
     * @private
     */
    _jsonReplacer(key, value) {
        if (value instanceof Blob) {
            const size = value.size;
            const type = value.type || 'unknown';
            // Format taille lisible
            let sizeStr;
            if (size < 1024) {
                sizeStr = size + 'B';
            } else if (size < 1024 * 1024) {
                sizeStr = (size / 1024).toFixed(1) + 'KB';
            } else {
                sizeStr = (size / (1024 * 1024)).toFixed(1) + 'MB';
            }
            return `[Blob: ${sizeStr}, ${type}]`;
        }
        return value;
    }

    // ---------------------------------------------------------------
    // Breadcrumb
    // ---------------------------------------------------------------

    /**
     * Construit le fil d'Ariane cliquable.
     *
     * @param {string} storeName
     * @param {string|null} [key=null] - Cle du record (si detail)
     * @returns {HTMLElement}
     * @private
     */
    _renderBreadcrumb(storeName, key = null) {
        const nav = document.createElement('nav');
        nav.className = 'explorer-breadcrumb';

        // Lien "stores"
        const storesLink = document.createElement('a');
        storesLink.textContent = 'Stores';
        storesLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Deselectionne tout
            this._activeStore = null;
            this._activeRecordKey = null;
            this._setActiveStoreItem('');
            this._revokeObjectUrls();
            this._content.innerHTML = `
                <div class="explorer-empty">
                    <p>Selectionnez un store dans la sidebar</p>
                </div>
            `;
        });
        nav.appendChild(storesLink);

        // Separateur
        const sep1 = document.createElement('span');
        sep1.className = 'explorer-breadcrumb-separator';
        sep1.textContent = '/';
        nav.appendChild(sep1);

        if (key) {
            // Lien cliquable vers la liste du store
            const storeLink = document.createElement('a');
            storeLink.textContent = storeName;
            storeLink.addEventListener('click', (e) => {
                e.preventDefault();
                this._showStoreRecords(storeName);
            });
            nav.appendChild(storeLink);

            const sep2 = document.createElement('span');
            sep2.className = 'explorer-breadcrumb-separator';
            sep2.textContent = '/';
            nav.appendChild(sep2);

            // Cle du record (pas cliquable, c'est la page courante)
            const keySpan = document.createElement('span');
            keySpan.textContent = key;
            nav.appendChild(keySpan);
        } else {
            // Nom du store (pas cliquable, c'est la page courante)
            const storeSpan = document.createElement('span');
            storeSpan.textContent = storeName;
            nav.appendChild(storeSpan);
        }

        return nav;
    }

    // ---------------------------------------------------------------
    // Utilitaires
    // ---------------------------------------------------------------

    /**
     * Revoque toutes les Object URLs trackees.
     * Appele au changement de store et dans destroy().
     *
     * @private
     */
    _revokeObjectUrls() {
        for (const url of this._objectUrls) {
            URL.revokeObjectURL(url);
        }
        this._objectUrls = [];
    }

    /**
     * Formate une taille en bytes en string lisible (KB/MB).
     *
     * @param {number} bytes
     * @returns {string}
     * @private
     */
    _formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    /**
     * Tronque une chaine a la longueur donnee.
     *
     * @param {string} str
     * @param {number} maxLen
     * @returns {string}
     * @private
     */
    _truncate(str, maxLen) {
        if (str.length <= maxLen) return str;
        return str.substring(0, maxLen) + '...';
    }

    /**
     * Echappe le HTML pour eviter les injections XSS.
     *
     * @param {string} str
     * @returns {string}
     * @private
     */
    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
