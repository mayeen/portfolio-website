import React from 'react'
import { profile } from '../../data';

const Info = () => {
    return (
        <div className="about__info grid">
            {profile.stats.map((stat) => (
                <div className="about__box" key={stat.label}>
                    <i className={`${stat.icon} about__icon`}></i>
                    <h3 className="about__title">{stat.label}</h3>
                    <div className="about__subttitle">{stat.value}</div>
                </div>
            ))}
        </div>
    )
}
export default Info
