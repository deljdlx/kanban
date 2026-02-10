/**
 * PermissionService — Gère les droits d'action selon le rôle de l'utilisateur connecté.
 *
 * Table de permissions statique : chaque action est associée aux rôles autorisés.
 * On interroge `can(action)` pour savoir si l'utilisateur courant a le droit,
 * et `canEditComment(authorId)` pour la logique spécifique aux commentaires.
 */
import UserService from './UserService.js';

/**
 * Table action → rôles autorisés.
 * Les clés correspondent aux actions métier utilisées dans les vues.
 *
 * @type {Object<string, string[]>}
 */
const PERMISSIONS = {
    addColumn: ['admin'],
    renameColumn: ['admin'],
    deleteColumn: ['admin'],
    reorderColumns: ['admin'],
    addCard: ['admin', 'member'],
    editCard: ['admin', 'member'],
    deleteCard: ['admin', 'member'],
    moveCard: ['admin', 'member'],
    comment: ['admin', 'member', 'viewer'],
    editOwnComment: ['admin', 'member', 'viewer'],
    editAnyComment: ['admin'],
};

class PermissionService {
    /**
     * Vérifie si l'utilisateur connecté peut effectuer l'action donnée.
     *
     * @param {string} action - Clé de la table PERMISSIONS (ex: 'addCard')
     * @returns {boolean}
     */
    can(action) {
        const user = UserService.getCurrentUser();
        if (!user || !user.role) {
            return false;
        }
        const allowed = PERMISSIONS[action];
        if (!allowed) {
            return false;
        }
        return allowed.includes(user.role);
    }

    /**
     * Vérifie si l'utilisateur connecté peut modifier un commentaire donné.
     * Un admin peut modifier tous les commentaires ; les autres seulement les leurs.
     *
     * @param {string|null} authorId - ID de l'auteur du commentaire
     * @returns {boolean}
     */
    canEditComment(authorId) {
        if (this.can('editAnyComment')) {
            return true;
        }
        if (!this.can('editOwnComment')) {
            return false;
        }
        const user = UserService.getCurrentUser();
        return user && user.id === authorId;
    }
}

import Container from '../Container.js';

const permissionService = new PermissionService();
Container.set('PermissionService', permissionService);

export { PermissionService };
export default permissionService;
