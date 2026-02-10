/**
 * styles.js — CSS pour ImageDropPlugin.
 */

export const STYLES = `
/* =========================================================
   1. Overlay de drop sur les colonnes
   ========================================================= */

.imgdrop-overlay {
    position: absolute;
    inset: 0;
    background: rgba(108, 99, 255, 0.15);
    border: 2px dashed var(--color-primary);
    border-radius: var(--radius-lg, 12px);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    z-index: 10;
}

.imgdrop-overlay span {
    background: var(--color-primary);
    color: white;
    padding: 8px 16px;
    border-radius: var(--radius-md, 6px);
    font-weight: 600;
    font-size: 0.9rem;
}

/* État actif (survol avec image) */
.column.imgdrop-active {
    position: relative;
}

.column.imgdrop-active .imgdrop-overlay {
    opacity: 1;
}

/* État loading */
.column.imgdrop-loading .imgdrop-overlay {
    opacity: 1;
    background: rgba(108, 99, 255, 0.25);
}

.column.imgdrop-loading .imgdrop-overlay span {
    animation: imgdrop-pulse 1s infinite;
}

.column.imgdrop-loading .imgdrop-overlay span::after {
    content: '...';
    animation: imgdrop-dots 1s steps(4) infinite;
}

@keyframes imgdrop-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}

@keyframes imgdrop-dots {
    0% { content: ''; }
    25% { content: '.'; }
    50% { content: '..'; }
    75% { content: '...'; }
}

/* Assure que la colonne a position relative pour l'overlay */
.column[data-id] {
    position: relative;
}

/* =========================================================
   2. Widget Image (carte)
   ========================================================= */

.card--image {
    padding: 8px !important;
}

.image-widget {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.image-widget__title {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.image-widget__img {
    width: 100%;
    height: auto;
    border-radius: 6px;
    display: block;
}

.image-widget__error {
    color: var(--color-text-muted);
    font-size: 12px;
    text-align: center;
    margin: 0;
    padding: 20px;
}

/* État loading (skeleton) */
.image-widget--loading {
    min-height: 80px;
}

.image-widget__skeleton {
    width: 100%;
    height: 80px;
    background: linear-gradient(
        90deg,
        var(--color-bg-secondary) 25%,
        var(--color-bg-tertiary) 50%,
        var(--color-bg-secondary) 75%
    );
    background-size: 200% 100%;
    border-radius: 6px;
    animation: imgdrop-skeleton 1.5s infinite;
}

@keyframes imgdrop-skeleton {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* =========================================================
   3. Vue détail (modal)
   ========================================================= */

.image-widget--detail {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.image-widget--detail .image-widget__img {
    max-width: 100%;
    max-height: 60vh;
    width: auto;
    height: auto;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s;
}

.image-widget--detail .image-widget__img:hover {
    transform: scale(1.02);
}

/* =========================================================
   4. Fullscreen overlay
   ========================================================= */

.image-widget__fullscreen {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    cursor: zoom-out;
    padding: 20px;
}

.image-widget__fullscreen img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 8px;
}
`;
