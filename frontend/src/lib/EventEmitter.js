/**
 * EventEmitter — Micro système d'événements.
 *
 * Classe de base héritable par les models pour notifier les views
 * de tout changement d'état (pattern Observer).
 */
export default class EventEmitter {
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this._listeners = new Map();
    }

    /**
     * Enregistre un callback pour un événement donné.
     *
     * @param {string} event  - Nom de l'événement (ex: 'change')
     * @param {Function} callback - Fonction appelée quand l'événement est émis
     */
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
    }

    /**
     * Supprime un callback précédemment enregistré.
     *
     * @param {string} event    - Nom de l'événement
     * @param {Function} callback - La même référence de fonction passée à on()
     */
    off(event, callback) {
        const callbacks = this._listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    /**
     * Émet un événement — appelle tous les callbacks enregistrés.
     *
     * @param {string} event - Nom de l'événement
     * @param {...*} args    - Arguments transmis aux callbacks
     */
    emit(event, ...args) {
        const callbacks = this._listeners.get(event);
        if (callbacks) {
            callbacks.forEach((callback) => callback(...args));
        }
    }
}
