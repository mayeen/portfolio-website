import React, {useState} from 'react'
import './qualification.css';

const Qualification = () => {
    const [toggleState, setToggleState] = useState(1);

    const toggleTab = (index) => {
        setToggleState(index);
    }
    return (
        <section className="qualification section">
            <h2 className="section__title">Qualification</h2>
            <span className="section__subtitle">My Personal Journey</span>

            <div className="qualification__container container">
                <div className="qualification__tabs">
                    <div className={
                        toggleState === 1
                            ? "qualification__button qualification__active button--flex"
                            : "qualification__button button--flex"
                    }
                         onClick={() => toggleTab(1)}>
                        <i className="uil uil-graduation-cap qualification__icon"></i>Experience
                    </div>

                    <div className={
                        toggleState === 2
                            ? "qualification__button qualification__active button--flex"
                            : "qualification__button button--flex"
                    }
                         onClick={() => toggleTab(2)}
                    >
                        <i className="uil uil-briefcase-alt qualification__icon"></i>Education
                    </div>
                </div>

                <div className="qualification__sections">
                    <div className={
                        toggleState === 1
                            ? "qualification__content qualification__content-active"
                            : "qualification__content"
                    }>
                        <div className="qualification__data">
                            <div>
                                <h3 className="qualification__title">Product Integration Engineer</h3>
                                <span className="qualification__subtitle">Baqend Gmbh</span>
                                <div className="qualification__calendar">
                                    <i className="uil uil-calendar-alt"></i> 2022-2025
                                </div>
                            </div>
                            <div>
                                <span className="qualification__rounder"></span>
                                <span className="qualification__line"></span>
                            </div>
                        </div>

                        <div className="qualification__data">
                            <div></div>

                            <div>
                                <span className="qualification__rounder"></span>
                                <span className="qualification__line"></span>
                            </div>

                            <div>
                                <h3 className="qualification__title">System Developer</h3>
                                <span className="qualification__subtitle">Wunderman Thompson</span>
                                <div className="qualification__calendar">
                                    <i className="uil uil-calendar-alt"></i> 2019-2022
                                </div>
                            </div>

                        </div>

                        <div className="qualification__data">
                            <div>
                                <h3 className="qualification__title">Product Integration Engineer</h3>
                                <span className="qualification__subtitle">Baqend Gmbh</span>
                                <div className="qualification__calendar">
                                    <i className="uil uil-calendar-alt"></i> 2022-2025
                                </div>
                            </div>
                            <div>
                                <span className="qualification__rounder"></span>
                                <span className="qualification__line"></span>
                            </div>
                        </div>

                        <div className="qualification__data">
                            <div></div>

                            <div>
                                <span className="qualification__rounder"></span>
                                <span className="qualification__line"></span>
                            </div>

                            <div>
                                <h3 className="qualification__title">Junior Software Developer</h3>
                                <span className="qualification__subtitle">Totaltel Private Ltd</span>
                                <div className="qualification__calendar">
                                    <i className="uil uil-calendar-alt"></i> 2017-2019
                                </div>
                            </div>

                        </div>
                    </div>


                    <div className={
                        toggleState === 2
                            ? "qualification__content qualification__content-active"
                            : "qualification__content"
                    }>
                        <div className="qualification__data">
                            <div>
                                <h3 className="qualification__title">M.Sc</h3>
                                <span className="qualification__subtitle">Universität Koblenz</span>
                                <div className="qualification__calendar">
                                    <i className="uil uil-calendar-alt"></i> 2022-2025
                                </div>
                            </div>
                            <div>
                                <span className="qualification__rounder"></span>
                                <span className="qualification__line"></span>
                            </div>
                        </div>

                        <div className="qualification__data">
                            <div></div>

                            <div>
                                <span className="qualification__rounder"></span>
                                <span className="qualification__line"></span>
                            </div>

                            <div>
                                <h3 className="qualification__title">System Developer</h3>
                                <span className="qualification__subtitle">Wunderman Thompson</span>
                                <div className="qualification__calendar">
                                    <i className="uil uil-calendar-alt"></i> 2019-2022
                                </div>
                            </div>

                        </div>

                        <div className="qualification__data">
                            <div>
                                <h3 className="qualification__title">Product Integration Engineer</h3>
                                <span className="qualification__subtitle">Baqend Gmbh</span>
                                <div className="qualification__calendar">
                                    <i className="uil uil-calendar-alt"></i> 2022-2025
                                </div>
                            </div>
                            <div>
                                <span className="qualification__rounder"></span>
                                <span className="qualification__line"></span>
                            </div>
                        </div>

                        <div className="qualification__data">
                            <div></div>

                            <div>
                                <span className="qualification__rounder"></span>
                                <span className="qualification__line"></span>
                            </div>

                            <div>
                                <h3 className="qualification__title">Junior Software Developer</h3>
                                <span className="qualification__subtitle">Totaltel Private Ltd</span>
                                <div className="qualification__calendar">
                                    <i className="uil uil-calendar-alt"></i> 2017-2019
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
export default Qualification
