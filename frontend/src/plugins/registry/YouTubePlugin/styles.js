/**
 * styles.js — CSS pour YouTubePlugin.
 */

export const STYLES = `
/* =========================================================
   1. Formulaire Modal
   ========================================================= */

.youtube-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.youtube-form__intro {
    color: var(--color-text-muted);
    font-size: 14px;
    margin: 0;
}

.youtube-form__preview {
    min-height: 20px;
}

.youtube-form__thumbnail {
    max-width: 100%;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.youtube-form__error {
    color: var(--color-danger);
    font-size: 13px;
    margin: 0;
}

.youtube-form__submit {
    align-self: flex-start;
    margin-top: 8px;
}

.youtube-form__submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* =========================================================
   2. Carte YouTube (widget)
   ========================================================= */

.card--youtube {
    padding: 8px !important;
}

.youtube-widget {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.youtube-widget__title {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.youtube-widget__video-wrapper {
    position: relative;
    width: 100%;
    padding-bottom: 56.25%; /* Ratio 16:9 */
    background: #000;
    border-radius: 6px;
    overflow: hidden;
}

.youtube-widget__thumbnail {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: filter 0.2s ease;
}

.youtube-widget__thumbnail:hover {
    filter: brightness(0.9);
}

.youtube-widget__thumbnail:hover .youtube-widget__play-btn {
    transform: scale(1.1);
    background: rgba(255, 0, 0, 1);
}

.youtube-widget__play-btn {
    width: 48px;
    height: 34px;
    background: rgba(255, 0, 0, 0.85);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 18px;
    transition: transform 0.2s ease, background 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.youtube-widget__iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: none;
}

/* =========================================================
   3. Vue détail (modal)
   ========================================================= */

.youtube-widget--detail {
    max-width: 640px;
    margin: 0 auto;
    gap: 16px;
}

.youtube-widget--detail .youtube-widget__title {
    font-size: 18px;
    text-align: center;
}

.youtube-widget--detail .youtube-widget__video-wrapper {
    border-radius: 12px;
}

.youtube-widget--detail .youtube-widget__play-btn {
    width: 68px;
    height: 48px;
    font-size: 24px;
    border-radius: 12px;
}
`;
