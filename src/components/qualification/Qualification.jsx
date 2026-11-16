import React, { useState } from 'react'
import PropTypes from 'prop-types';
import './qualification.css';
import { experience, education } from '../../data';
import RichText from '../../utils/RichText';
import { formatDateRange } from '../../utils/date';

const TABS = [
    { id: 'experience', label: 'Experience', icon: 'uil uil-briefcase-alt' },
    { id: 'education', label: 'Education', icon: 'uil uil-graduation-cap' },
];

const Timeline = () => (
    <div>
        <span className="qualification__rounder"></span>
        <span className="qualification__line"></span>
    </div>
);

// Items alternate left/right of the timeline.
const TimelineItem = ({ index, children }) => (
    <div className="qualification__data">
        {index % 2 === 0 ? (
            <>
                <div>{children}</div>
                <Timeline />
            </>
        ) : (
            <>
                <div></div>
                <Timeline />
                <div>{children}</div>
            </>
        )}
    </div>
);

TimelineItem.propTypes = {
    index: PropTypes.number.isRequired,
    children: PropTypes.node.isRequired,
};

const Header = ({ title, subtitle, startDate, endDate, location }) => (
    <>
        <h3 className="qualification__title">{title}</h3>
        <span className="qualification__subtitle">{subtitle}</span>
        <div className="qualification__calendar-location">
            <span><i className="uil uil-calendar-alt"></i> {formatDateRange(startDate, endDate)}</span>
            <span><i className="uil uil-location-point"></i> {location}</span>
        </div>
    </>
);

Header.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string.isRequired,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    location: PropTypes.string.isRequired,
};

const ExperienceItem = ({ item }) => (
    <>
        <Header
            title={item.role}
            subtitle={item.company}
            startDate={item.startDate}
            endDate={item.endDate}
            location={item.location}
        />
        <div className="qualification__company-desc">{item.summary}</div>
        <span className="qualification__tech-title">Responsibilities:</span>
        <ul className="qualification__bullet-list">
            {item.bullets.map((bullet) => (
                <li key={bullet}><RichText text={bullet} /></li>
            ))}
        </ul>
        <div className="qualification__tech">
            <span className="qualification__tech-title">Key Technologies:</span>
            <div className="qualification__tech-items">
                {item.technologies.map((tech) => (
                    <span key={tech} className="qualification__tech-item">{tech}</span>
                ))}
            </div>
        </div>
    </>
);

ExperienceItem.propTypes = {
    item: PropTypes.shape({
        role: PropTypes.string.isRequired,
        company: PropTypes.string.isRequired,
        location: PropTypes.string.isRequired,
        startDate: PropTypes.string,
        endDate: PropTypes.string,
        summary: PropTypes.string.isRequired,
        bullets: PropTypes.arrayOf(PropTypes.string).isRequired,
        technologies: PropTypes.arrayOf(PropTypes.string).isRequired,
    }).isRequired,
};

const EducationItem = ({ item }) => (
    <>
        <Header
            title={item.degree}
            subtitle={item.institution}
            startDate={item.startDate}
            endDate={item.endDate}
            location={item.location}
        />
        {item.coursework.length > 0 && (
            <>
                <div className="qualification__company-desc">Core Curriculum:</div>
                <ul className="qualification__bullet-list">
                    <li>{item.coursework.join(', ')}</li>
                </ul>
            </>
        )}
    </>
);

EducationItem.propTypes = {
    item: PropTypes.shape({
        degree: PropTypes.string.isRequired,
        institution: PropTypes.string.isRequired,
        location: PropTypes.string.isRequired,
        startDate: PropTypes.string,
        endDate: PropTypes.string,
        coursework: PropTypes.arrayOf(PropTypes.string).isRequired,
    }).isRequired,
};

const Qualification = () => {
    const [activeTab, setActiveTab] = useState('experience');

    const sections = {
        experience: experience.map((item, index) => (
            <TimelineItem key={item.id} index={index}><ExperienceItem item={item} /></TimelineItem>
        )),
        education: education.map((item, index) => (
            <TimelineItem key={item.id} index={index}><EducationItem item={item} /></TimelineItem>
        )),
    };

    return (
        <section className="qualification section" id="qualification">
            <h2 className="section__title">Qualification</h2>
            <span className="section__subtitle">My Personal Journey</span>

            <div className="qualification__container container">
                <div className="qualification__tabs">
                    {TABS.map((tab) => (
                        <div
                            key={tab.id}
                            className={`qualification__button button--flex${activeTab === tab.id ? ' qualification__active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <i className={`${tab.icon} qualification__icon`}></i>{tab.label}
                        </div>
                    ))}
                </div>

                <div className="qualification__sections">
                    {TABS.map((tab) => (
                        <div
                            key={tab.id}
                            className={`qualification__content${activeTab === tab.id ? ' qualification__content-active' : ''}`}
                        >
                            {sections[tab.id]}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
export default Qualification
