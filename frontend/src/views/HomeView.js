/**
 * HomeView — Page d'accueil affichant les boards disponibles.
 *
 * Affiche une grille de cards representant chaque board avec :
 *   - Nom du board
 *   - Nombre de colonnes et cartes
 *   - Date de derniere modification
 *   - Actions (ouvrir, dupliquer, supprimer)
 *
 * Permet aussi de creer un nouveau board.
 */
import StorageService from '../services/StorageService.js';
import ImageStorageService from '../services/ImageStorageService.js';
import ExportImportService from '../services/storage/ExportImportService.js';
import Router from '../services/Router.js';
import Hooks from '../plugins/HookRegistry.js';
import ModalConfirmDelete from './ModalConfirmDelete.js';
import { generateDemoColumns } from '../data/demoBoard.js';
import { formatRelativeDate } from '../utils/date.js';
import { animate, stagger } from 'animejs';

export default class HomeView {
    /**
     * Element racine de la vue.
     * @type {HTMLElement|null}
     */
    _element;

    /**
     * Grille des boards (pour refresh).
     * @type {HTMLElement|null}
     */
    _grid;

    /**
     * Input file pour l'import (pour cleanup si destroy() pendant le file picker).
     * @type {HTMLInputElement|null}
     */
    _fileInput;

    constructor() {
        this._element = null;
        this._grid = null;
        this._fileInput = null;
    }

    /**
     * Rend la vue et l'attache au conteneur.
     *
     * @param {HTMLElement} container
     * @returns {Promise<void>}
     */
    async render(container) {
        this._element = document.createElement('div');
        this._element.className = 'home';

        // Header de la page
        const header = document.createElement('header');
        header.className = 'home-header';

        const title = document.createElement('h1');
        title.className = 'home-title';
        title.textContent = 'Mes Kanbans';

        const buttons = document.createElement('div');
        buttons.className = 'home-header-buttons';

        const newBtn = document.createElement('button');
        newBtn.className = 'home-new-btn';
        newBtn.textContent = '+ Nouveau Kanban';
        newBtn.addEventListener('click', () => this._createNewBoard());

        const demoBtn = document.createElement('button');
        demoBtn.className = 'home-demo-btn';
        demoBtn.textContent = '+ Kanban de démo';
        demoBtn.addEventListener('click', () => this._createDemoBoard());

        const importBtn = document.createElement('button');
        importBtn.className = 'home-demo-btn';
        importBtn.textContent = '📂 Importer';
        importBtn.addEventListener('click', () => this._importBoard());

        buttons.appendChild(newBtn);
        buttons.appendChild(demoBtn);
        buttons.appendChild(importBtn);

        // IndexedDB Explorer : outil de dev, masqué en production
        if (import.meta.env.DEV) {
            const explorerLink = document.createElement('a');
            explorerLink.className = 'home-demo-btn';
            explorerLink.href = '#/explorer';
            explorerLink.textContent = 'IndexedDB Explorer';
            buttons.appendChild(explorerLink);
        }

        header.appendChild(title);
        header.appendChild(buttons);
        this._element.appendChild(header);

        // Grille des boards
        this._grid = document.createElement('div');
        this._grid.className = 'home-grid';
        this._element.appendChild(this._grid);

        // Charge et affiche les boards
        await this._loadBoards();

        container.appendChild(this._element);

        // Animation d'entrée des cards
        this._animateCards();
    }

    /**
     * Anime les cards de la grille en cascade.
     * @private
     */
    _animateCards() {
        const cards = this._grid.querySelectorAll('.home-card');
        if (!cards.length) return;

        animate(cards, {
            opacity: [0, 1],
            translateY: [60, 0],
            scale: [0.85, 1],
            delay: stagger(150),
            duration: 800,
            ease: 'outBack',
        });
    }

    /**
     * Detruit la vue.
     */
    destroy() {
        if (this._fileInput) {
            this._fileInput.remove();
            this._fileInput = null;
        }
        if (this._element) {
            this._element.remove();
            this._element = null;
        }
        this._grid = null;
    }

    /**
     * Retourne l'element DOM de la vue.
     *
     * @returns {HTMLElement|null}
     */
    getElement() {
        return this._element;
    }

    /**
     * Charge les boards depuis le storage et les affiche.
     *
     * @returns {Promise<void>}
     * @private
     */
    async _loadBoards() {
        const registry = await StorageService.getBoardRegistry();
        this._grid.innerHTML = '';

        if (registry.boards.length === 0) {
            this._renderEmptyState();
            return;
        }

        // Tri par date de modification (plus recent en premier)
        const sortedBoards = [...registry.boards].sort((a, b) => {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });

        for (const board of sortedBoards) {
            const card = this._createBoardCard(board);
            this._grid.appendChild(card);
        }
    }

    /**
     * Affiche un message quand il n'y a pas de boards.
     *
     * @private
     */
    _renderEmptyState() {
        const empty = document.createElement('div');
        empty.className = 'home-empty';

        const icon = document.createElement('div');
        icon.className = 'home-empty-icon';
        icon.textContent = '📋';

        const text = document.createElement('p');
        text.className = 'home-empty-text';
        text.textContent = 'Aucun kanban pour le moment';

        const hint = document.createElement('p');
        hint.className = 'home-empty-hint';
        hint.textContent = 'Cliquez sur "+ Nouveau Kanban" pour commencer';

        empty.appendChild(icon);
        empty.appendChild(text);
        empty.appendChild(hint);
        this._grid.appendChild(empty);
    }

    /**
     * Cree une card pour un board.
     *
     * @param {Object} board - Metadonnees du board
     * @returns {HTMLElement}
     * @private
     */
    _createBoardCard(board) {
        const card = document.createElement('article');
        card.className = 'home-card';
        card.dataset.id = board.id;

        const boardHref = '#/board/' + board.id;

        // Image de couverture (chargée async)
        if (board.coverImageId) {
            const cover = document.createElement('a');
            cover.className = 'home-card-cover';
            cover.href = boardHref;
            card.appendChild(cover);

            ImageStorageService.getUrl(board.coverImageId)
                .then((url) => {
                    if (url) {
                        cover.style.backgroundImage = `url(${url})`;
                    }
                })
                .catch(() => {
                    /* image de couverture indisponible */
                });
        }

        // Zone cliquable principale (lien pour middle-click / Ctrl+click)
        const main = document.createElement('a');
        main.className = 'home-card-main';
        main.href = boardHref;

        // Nom du board
        const name = document.createElement('h2');
        name.className = 'home-card-name';
        name.textContent = board.name;

        // Stats
        const stats = document.createElement('div');
        stats.className = 'home-card-stats';
        stats.innerHTML = `
            <span class="home-card-stat">
                <span class="home-card-stat-icon">📊</span>
                ${board.columnCount} colonne${board.columnCount !== 1 ? 's' : ''}
            </span>
            <span class="home-card-stat">
                <span class="home-card-stat-icon">🎫</span>
                ${board.cardCount} carte${board.cardCount !== 1 ? 's' : ''}
            </span>
        `;

        // Date de modification
        const date = document.createElement('div');
        date.className = 'home-card-date';
        date.textContent = formatRelativeDate(board.updatedAt);

        main.appendChild(name);

        // Description (tronquée à 2 lignes via CSS)
        if (board.description) {
            const desc = document.createElement('p');
            desc.className = 'home-card-description';
            desc.textContent = board.description;
            main.appendChild(desc);
        }

        main.appendChild(stats);
        main.appendChild(date);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'home-card-actions';

        const duplicateBtn = document.createElement('button');
        duplicateBtn.className = 'home-card-action';
        duplicateBtn.title = 'Dupliquer';
        duplicateBtn.textContent = '📋';
        duplicateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._duplicateBoard(board.id, board.name);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'home-card-action home-card-action--danger';
        deleteBtn.title = 'Supprimer';
        deleteBtn.textContent = '🗑️';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._confirmDeleteBoard(board.id, board.name);
        });

        actions.appendChild(duplicateBtn);
        actions.appendChild(deleteBtn);

        card.appendChild(main);
        card.appendChild(actions);

        return card;
    }

    /**
     * Cree un nouveau board et redirige vers celui-ci.
     *
     * @returns {Promise<void>}
     * @private
     */
    async _createNewBoard() {
        const boardId = await StorageService.createBoard('Nouveau Kanban');
        Router.navigate('/board/' + boardId);
    }

    /**
     * Cree un board de demo avec des colonnes et tickets pre-remplis.
     *
     * @returns {Promise<void>}
     * @private
     */
    async _createDemoBoard() {
        const boardId = await StorageService.createBoard('Projet Demo');
        const boardData = await StorageService.loadBoard(boardId);

        boardData.columns = generateDemoColumns();

        await StorageService.saveBoard(boardId, boardData);
        Router.navigate('/board/' + boardId);
    }

    /**
     * Duplique un board et rafraichit la liste.
     *
     * @param {string} boardId
     * @param {string} name
     * @returns {Promise<void>}
     * @private
     */
    async _duplicateBoard(boardId, name) {
        await StorageService.duplicateBoard(boardId, `${name} (copie)`);
        await this._loadBoards();
    }

    /**
     * Demande confirmation avant de supprimer un board.
     *
     * @param {string} boardId
     * @param {string} name
     * @private
     */
    _confirmDeleteBoard(boardId, name) {
        const modal = new ModalConfirmDelete({
            title: 'Supprimer le kanban',
            message: `Voulez-vous vraiment supprimer "${name}" ? Cette action est irreversible.`,
            onConfirm: async () => {
                await StorageService.deleteBoard(boardId);
                await this._loadBoards();
            },
        });
        modal.open();
    }

    /**
     * Ouvre un file picker pour importer un board depuis un fichier JSON.
     *
     * @private
     */
    _importBoard() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.classList.add('hidden');

        // Track pour cleanup dans destroy()
        this._fileInput = input;

        input.addEventListener('change', async () => {
            const file = input.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                let stats;
                if (data.type === 'single-board') {
                    const result = await ExportImportService.importBoard(data);
                    stats = result;
                } else {
                    const result = await ExportImportService.importAll(data, { merge: true });
                    stats = result.stats;
                }

                // Message de succès avec stats
                const parts = [];
                if (stats.boardId) {
                    parts.push('1 board');
                } else if (stats.boardsImported) {
                    parts.push(`${stats.boardsImported} board${stats.boardsImported > 1 ? 's' : ''}`);
                }
                if (stats.imagesImported) {
                    parts.push(`${stats.imagesImported} image${stats.imagesImported > 1 ? 's' : ''}`);
                }
                const detail = parts.length > 0 ? ` (${parts.join(', ')})` : '';

                Hooks.doAction('toast:show', {
                    message: `Board importé${detail}`,
                    icon: '📂',
                });

                await this._loadBoards();
                this._animateCards();
            } catch (error) {
                console.error('[HomeView] Erreur import:', error);
                Hooks.doAction('toast:show', {
                    message: "Erreur lors de l'import : fichier invalide",
                    type: 'error',
                });
            } finally {
                input.remove();
                this._fileInput = null;
            }
        });

        document.body.appendChild(input);
        input.click();
    }
}
