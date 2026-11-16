import React from 'react'
import PropTypes from 'prop-types';

const SkillCategory = ({ category }) => {
    // Two columns; the first gets the extra item when the count is odd.
    const half = Math.ceil(category.skills.length / 2);
    const groups = [category.skills.slice(0, half), category.skills.slice(half)].filter((group) => group.length);

    return (
        <div className="skills__content">
            <h3 className="skills__title">{category.name}</h3>

            <div className="skills__box">
                {groups.map((group, groupIndex) => (
                    <div className="skills__group" key={groupIndex}>
                        {group.map((skill) => (
                            <div className="skills__data" key={skill.name}>
                                <i className='bx bx-badge-check'></i>
                                <div>
                                    <h3 className="skills__name">{skill.name}</h3>
                                    {skill.level && <span className="skills__level">{skill.level}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

SkillCategory.propTypes = {
    category: PropTypes.shape({
        name: PropTypes.string.isRequired,
        skills: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string.isRequired,
            level: PropTypes.string,
        })).isRequired,
    }).isRequired,
};

export default SkillCategory
