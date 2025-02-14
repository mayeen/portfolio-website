import React from 'react'

const Info = () => {
    return (
        <div className="about__info grid">
            <div className="about__box">
                <i className='bx bx-award about__icon'></i>
                <h3 className="about__title">Full time Experience</h3>
                <div className="about__subttitle">5 years</div>
            </div>

            <div className="about__box">
                <i className='bx bx-briefcase-alt about__icon'></i>
                <h3 className="about__title">Working Student</h3>
                <div className="about__subttitle">2 years</div>
            </div>

            <div className="about__box">
                <i className='bx bx-support about__icon'></i>
                <h3 className="about__title">Code Lover</h3>
                <div className="about__subttitle">For life</div>
            </div>

        </div>
    )
}
export default Info
