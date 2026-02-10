/**
 * Snowflake.js — Classe représentant un flocon individuel.
 *
 * Chaque flocon possède une position, une vélocité, et des paramètres
 * physiques (gravité, friction, vent) passés à la construction.
 * Cela permet de modifier les settings à chaud : les nouveaux flocons
 * utilisent les valeurs courantes, les anciens gardent les leurs.
 */

export default class Snowflake {
    /**
     * @param {number} x        - Position X initiale (curseur)
     * @param {number} y        - Position Y initiale (curseur)
     * @param {number} vx       - Vélocité horizontale (basée sur la souris)
     * @param {number} vy       - Vélocité verticale (basée sur la souris)
     * @param {number} size     - Rayon du flocon (pixels)
     * @param {number} lifetime - Durée de vie en secondes
     * @param {Object} physics  - { gravity, friction, windAmplitude, windFrequency }
     */
    constructor(x, y, vx, vy, size, lifetime, physics) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.lifetime = lifetime;
        this.age = 0;

        this._gravity = physics.gravity;
        this._friction = physics.friction;
        this._windAmplitude = physics.windAmplitude;
        this._windFrequency = physics.windFrequency;

        // Décalage aléatoire pour que chaque flocon oscille différemment
        this.windOffset = Math.random() * Math.PI * 2;
    }

    /**
     * @returns {boolean} true si le flocon est encore vivant
     */
    get alive() {
        return this.age < this.lifetime;
    }

    /**
     * @returns {number} Opacité entre 1 (neuf) et 0 (mort), avec un fade-out
     */
    get opacity() {
        const remaining = 1 - this.age / this.lifetime;
        // Fade-out sur le dernier tiers de la vie
        return Math.min(1, remaining * 3);
    }

    /**
     * Met à jour la position et la vélocité du flocon.
     *
     * @param {number} dt - Delta time en secondes
     */
    update(dt) {
        this.age += dt;

        // Gravité : le flocon tombe
        this.vy += this._gravity * dt;

        // Friction : ralentit progressivement
        this.vx *= this._friction;
        this.vy *= this._friction;

        // Vent sinusoïdal : oscillation latérale douce
        const wind = Math.sin(this.age * this._windFrequency + this.windOffset) * this._windAmplitude * dt;

        this.x += this.vx * dt + wind;
        this.y += this.vy * dt;
    }
}
