/**
 * UploadZone — Composant réutilisable de zone d'upload fichier.
 *
 * Deux modes d'affichage :
 *   - Standard : zone dashed avec label + bouton "parcourir" (ex: onglet Fichiers)
 *   - Compact  : bouton seul avec icône 📎 (ex: formulaire commentaire)
 *
 * Le composant gère le drag-drop avec un compteur d'entrées
 * pour éviter le flash au survol des éléments enfants.
 *
 * @example
 *   const zone = new UploadZone({
 *       onFiles: (files) => handleFiles(files),
 *       multiple: true,
 *   });
 *   container.appendChild(zone.render());
 *
 *   // Nettoyage
 *   zone.destroy();
 */
export default class UploadZone {
    /**
     * Callback appelé quand des fichiers sont sélectionnés (via browse ou drop).
     * @type {Function}
     */
    _onFiles;

    /**
     * Texte affiché dans la zone standard.
     * @type {string}
     */
    _label;

    /**
     * Autoriser la sélection multiple.
     * @type {boolean}
     */
    _multiple;

    /**
     * Filtre MIME pour l'input file (ex: "image/*,.pdf").
     * @type {string}
     */
    _accept;

    /**
     * Mode compact (bouton seul) vs standard (zone dashed).
     * @type {boolean}
     */
    _compact;

    /**
     * Texte du bouton parcourir (mode standard).
     * @type {string}
     */
    _browseLabel;

    /**
     * Élément DOM racine rendu.
     * @type {HTMLElement|null}
     */
    _element;

    /**
     * Compteur dragenter/dragleave pour gérer le survol des enfants.
     * @type {number}
     */
    _dragCounter;

    /**
     * Références aux handlers pour pouvoir les retirer au destroy.
     * @type {{ dragenter: Function, dragover: Function, dragleave: Function, drop: Function }|null}
     */
    _handlers;

    /**
     * @param {Object} options
     * @param {Function}  options.onFiles     - Callback recevant un FileList
     * @param {string}   [options.label]      - Texte de la zone (mode standard)
     * @param {boolean}  [options.multiple]   - Sélection multiple (défaut: false)
     * @param {string}   [options.accept]     - Filtre MIME de l'input file
     * @param {boolean}  [options.compact]    - Mode compact bouton (défaut: false)
     * @param {string}   [options.browseLabel] - Texte du bouton parcourir
     */
    constructor({
        onFiles,
        label = 'Glisser un fichier ici ou ',
        multiple = false,
        accept = '',
        compact = false,
        browseLabel = 'parcourir',
    }) {
        this._onFiles = onFiles;
        this._label = label;
        this._multiple = multiple;
        this._accept = accept;
        this._compact = compact;
        this._browseLabel = browseLabel;
        this._element = null;
        this._dragCounter = 0;
        this._handlers = null;
    }

    /**
     * Construit et retourne l'élément DOM.
     *
     * @returns {HTMLElement}
     */
    render() {
        if (this._compact) {
            this._element = this._buildCompact();
        } else {
            this._element = this._buildStandard();
        }
        return this._element;
    }

    /**
     * Détruit le composant et retire les event listeners.
     */
    destroy() {
        if (this._element && this._handlers) {
            this._element.removeEventListener('dragenter', this._handlers.dragenter);
            this._element.removeEventListener('dragover', this._handlers.dragover);
            this._element.removeEventListener('dragleave', this._handlers.dragleave);
            this._element.removeEventListener('drop', this._handlers.drop);
        }
        this._handlers = null;
        this._element = null;
    }

    // ---------------------------------------------------------------
    // Construction DOM
    // ---------------------------------------------------------------

    /**
     * Mode standard : zone dashed avec label + bouton parcourir.
     *
     * @returns {HTMLElement}
     * @private
     */
    _buildStandard() {
        const zone = document.createElement('div');
        zone.className = 'upload-zone';

        const label = document.createElement('span');
        label.className = 'upload-zone-label';
        label.textContent = this._label;

        const browseBtn = document.createElement('button');
        browseBtn.type = 'button';
        browseBtn.className = 'upload-zone-browse';
        browseBtn.textContent = this._browseLabel;

        const input = this._createInput();

        browseBtn.addEventListener('click', () => input.click());

        label.appendChild(browseBtn);
        zone.appendChild(label);
        zone.appendChild(input);

        this._attachDragDrop(zone);
        return zone;
    }

    /**
     * Mode compact : bouton seul avec icône 📎.
     *
     * @returns {HTMLElement}
     * @private
     */
    _buildCompact() {
        const zone = document.createElement('div');
        zone.className = 'upload-zone upload-zone--compact';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'upload-zone-attach-btn';
        btn.textContent = '\u{1F4CE}';
        btn.title = 'Joindre un fichier';

        const input = this._createInput();

        btn.addEventListener('click', () => input.click());

        zone.appendChild(btn);
        zone.appendChild(input);

        return zone;
    }

    /**
     * Crée l'input file caché (partagé entre les deux modes).
     *
     * @returns {HTMLInputElement}
     * @private
     */
    _createInput() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = this._multiple;
        if (this._accept) input.accept = this._accept;
        input.classList.add('hidden');

        input.addEventListener('change', () => {
            if (input.files.length > 0) {
                this._onFiles(input.files);
                input.value = '';
            }
        });

        return input;
    }

    // ---------------------------------------------------------------
    // Drag-drop
    // ---------------------------------------------------------------

    /**
     * Attache les listeners drag-drop sur la zone.
     *
     * Utilise un compteur pour éviter le flash au survol
     * des éléments enfants (dragenter/dragleave imbriqués).
     *
     * @param {HTMLElement} zone
     * @private
     */
    _attachDragDrop(zone) {
        this._handlers = {
            dragenter: (e) => {
                e.preventDefault();
                this._dragCounter++;
                zone.classList.add('upload-zone--dragover');
            },
            dragover: (e) => {
                e.preventDefault();
            },
            dragleave: () => {
                this._dragCounter--;
                if (this._dragCounter === 0) {
                    zone.classList.remove('upload-zone--dragover');
                }
            },
            drop: (e) => {
                e.preventDefault();
                this._dragCounter = 0;
                zone.classList.remove('upload-zone--dragover');
                if (e.dataTransfer.files.length > 0) {
                    this._onFiles(e.dataTransfer.files);
                }
            },
        };

        zone.addEventListener('dragenter', this._handlers.dragenter);
        zone.addEventListener('dragover', this._handlers.dragover);
        zone.addEventListener('dragleave', this._handlers.dragleave);
        zone.addEventListener('drop', this._handlers.drop);
    }
}
