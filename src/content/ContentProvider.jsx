import React, { createContext, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import * as bundled from '../data';

// Portfolio content for every component.
// 1. Renders immediately with the data bundled at build time (src/data, generated from content/cv.md).
// 2. Then fetches /api/content (Azure Function -> Cosmos DB) and swaps it in if it is newer.
// If the API is slow, down or returns something unexpected, the bundled data simply stays.

export const SECTIONS = ['profile', 'experience', 'education', 'skills', 'projects', 'certifications'];

const BUNDLED = Object.fromEntries(SECTIONS.map((name) => [name, bundled[name]]));

/** Accept only a response with every section in the expected shape. */
export function isValidContent(data) {
    if (!data || typeof data !== 'object') return false;
    const { profile } = data;
    const profileLists = ['stats', 'socials', 'languages'];
    if (!profile || typeof profile.name !== 'string' || !profileLists.every((key) => Array.isArray(profile[key]))) {
        return false;
    }
    return SECTIONS.slice(1).every((name) => Array.isArray(data[name]));
}

const sameContent = (a, b) => SECTIONS.every((name) => JSON.stringify(a[name]) === JSON.stringify(b[name]));

/** Fetch content from the API; resolves to valid content or null. Never throws. */
export async function loadContent({ endpoint, timeoutMs, fetchImpl }) {
    if (typeof fetchImpl !== 'function' || typeof AbortController === 'undefined') return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchImpl(endpoint, { signal: controller.signal, headers: { Accept: 'application/json' } });
        if (!response.ok) return null;
        const data = await response.json();
        return isValidContent(data) ? Object.fromEntries(SECTIONS.map((name) => [name, data[name]])) : null;
    } catch {
        return null; // network error, timeout (abort) or invalid JSON
    } finally {
        clearTimeout(timer);
    }
}

const ContentContext = createContext(BUNDLED);

export function ContentProvider({ children, endpoint = '/api/content', timeoutMs = 5000, fetchImpl }) {
    const [content, setContent] = useState(BUNDLED);

    useEffect(() => {
        let active = true;
        const impl = fetchImpl ?? (typeof window !== 'undefined' ? window.fetch?.bind(window) : undefined);
        loadContent({ endpoint, timeoutMs, fetchImpl: impl }).then((fresh) => {
            if (active && fresh && !sameContent(fresh, BUNDLED)) setContent(fresh);
        });
        return () => {
            active = false;
        };
    }, [endpoint, timeoutMs, fetchImpl]);

    return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

ContentProvider.propTypes = {
    children: PropTypes.node.isRequired,
    endpoint: PropTypes.string,
    timeoutMs: PropTypes.number,
    fetchImpl: PropTypes.func,
};

/** { profile, experience, education, skills, projects, certifications } */
export const useContent = () => useContext(ContentContext);
