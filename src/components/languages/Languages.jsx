import React from 'react'
import PropTypes from 'prop-types';
import './languages.css';
import { profile } from '../../data';

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// "B1 - Conversational" -> { code: "B1", label: "Conversational" }
export const parseLevel = (level) => {
    const match = level.match(/^(A1|A2|B1|B2|C1|C2)\s*[-–]?\s*(.*)$/);
    return match ? { code: match[1], label: match[2] } : { code: null, label: level };
};

const LevelBar = ({ code }) => {
    const reached = CEFR_LEVELS.indexOf(code);
    return (
        <div className="languages__bar" role="img" aria-label={`CEFR level ${code} of C2`}>
            {CEFR_LEVELS.map((step, index) => (
                <span key={step} className={`languages__step${index <= reached ? ' languages__step--on' : ''}`}>
                    {step}
                </span>
            ))}
        </div>
    );
};

LevelBar.propTypes = {
    code: PropTypes.oneOf(CEFR_LEVELS).isRequired,
};

const Languages = () => {
    if (!profile.languages.length) return null;

    return (
        <section className="languages section" id="languages">
            <h2 className="section__title">Languages</h2>
            <span className="section__subtitle">How we can communicate</span>

            <div className="languages__container container grid">
                {profile.languages.map(({ language, level }) => {
                    const { code, label } = parseLevel(level);
                    return (
                        <article className="languages__card" key={language}>
                            <div className="languages__header">
                                <i className="bx bx-globe languages__icon"></i>
                                <div>
                                    <h3 className="languages__name">{language}</h3>
                                    <span className="languages__label">{label}</span>
                                </div>
                                {code && <span className="languages__code">{code}</span>}
                            </div>
                            {code && <LevelBar code={code} />}
                        </article>
                    );
                })}
            </div>
        </section>
    )
}
export default Languages
