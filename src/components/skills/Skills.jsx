import React from 'react'
import './skills.css';
import { skills } from '../../data';
import SkillCategory from './SkillCategory';

const Skills = () => {
    return (
        <section className="skills section" id="skills">
            <h2 className="section__title">Skills</h2>
            <span className="section__subtitle">My technical level</span>

            <div className="skills__container container grid">
                {skills.map((category) => (
                    <SkillCategory key={category.id} category={category} />
                ))}
            </div>
        </section>
    )
}
export default Skills
