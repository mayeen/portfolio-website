import React, {useState} from 'react'
import './qualification.css';

const Qualification = () => {
    const [toggleState, setToggleState] = useState(1);

    const toggleTab = (index) => {
        setToggleState(index);
    }
    return (
        <section className="qualification section" id="qualification">
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
                        <i className="uil uil-briefcase-alt qualification__icon"></i>Experience
                    </div>

                    <div className={
                        toggleState === 2
                            ? "qualification__button qualification__active button--flex"
                            : "qualification__button button--flex"
                    }
                         onClick={() => toggleTab(2)}
                    >
                        <i className="uil uil-graduation-cap qualification__icon"></i>Education
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
                                <div className="qualification__calendar-location">
                                    <span><i className="uil uil-calendar-alt"></i> 09/2022 - 03/2025</span>
                                    <span><i className="uil uil-location-point"></i> Hamburg</span>
                                </div>
                                <div className="qualification__company-desc">
                                    Accelerating clients existing website using our Html caching mechanism
                                </div>
                                <span className="qualification__tech-title">Responsibilities:</span>
                                <ul className="qualification__bullet-list">
                                    <li>Search and optimize clients code for better web vitals like LCP, CLS using
                                        JavaScript, Regex and CSS rules.
                                    </li>
                                    <li>Integrate our product, SpeedKit according to client's code for dynamic change
                                        detection, merging remote contents.
                                    </li>
                                    <li>Continuous development of integration project using TypeScript.</li>
                                    <li>Blackbox testing to ensure error free and quality output after integration.</li>
                                </ul>
                                <div className="qualification__tech">
                                    <span className="qualification__tech-title">Key Technologies:</span>
                                    <div className="qualification__tech-items">
                                        <span className="qualification__tech-item">JavaScript</span>
                                        <span className="qualification__tech-item">TypeScript</span>
                                        <span className="qualification__tech-item">RegEx</span>
                                        <span className="qualification__tech-item">CSS</span>
                                        <span className="qualification__tech-item">HTML</span>
                                    </div>
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
                                <div className="qualification__calendar-location">
                                    <span><i className="uil uil-calendar-alt"></i> 04/2019 - 03/2022</span>
                                    <span><i className="uil uil-location-point"></i> Dhaka</span>
                                </div>
                                <div className="qualification__company-desc">
                                    Software solution provider for foreign clients
                                </div>
                                <span className="qualification__tech-title">Responsibilities:</span>
                                <ul className="qualification__bullet-list">
                                    <li>Converting complex business requirements into highly scalable backend using C#
                                        (.NET) for our core product, BrandShare.
                                    </li>
                                    <li>Implementing robust front-end using Angular 2/5/9, AngularJS, Bootstrap 4 while
                                        working side by side with off-shore client designers.
                                    </li>
                                    <li>Frequent integration of 3rd party API for better user experience using our
                                        product.
                                    </li>
                                    <li>Developing RESTful API to expose business functionalities while maintaining
                                        integrity of the system.
                                    </li>
                                    <li>Building in house tools for asynchronous and scheduled business need to lessen
                                        manual working overhead upto 75%.
                                    </li>
                                </ul>
                                <div className="qualification__tech">
                                    <span className="qualification__tech-title">Key Technologies:</span>
                                    <div className="qualification__tech-items">
                                        <span className="qualification__tech-item">C# (.NET)</span>
                                        <span className="qualification__tech-item">Angular</span>
                                        <span className="qualification__tech-item">AngularJS</span>
                                        <span className="qualification__tech-item">Bootstrap</span>
                                        <span className="qualification__tech-item">RESTful API</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="qualification__data">
                            <div>
                                <h3 className="qualification__title">Junior Software Developer</h3>
                                <span className="qualification__subtitle">Totaltel Private Ltd</span>
                                <div className="qualification__calendar-location">
                                    <span><i className="uil uil-calendar-alt"></i> 06/2017 - 04/2019</span>
                                    <span><i className="uil uil-location-point"></i> Dhaka</span>
                                </div>
                                <div className="qualification__company-desc">
                                    Provides telecommunication-based solutions to government run organization
                                </div>
                                <span className="qualification__tech-title">Responsibilities:</span>
                                <ul className="qualification__bullet-list">
                                    <li>Creating a scalable clinic management system from scratch using .NET MVC for
                                        local market.
                                    </li>
                                    <li>Continuous engagement with clients for requirement analysis and blackbox testing
                                        to ensure quality output.
                                    </li>
                                    <li>Implemented authenticator device SDK to create custom authentication app in
                                        ASP.Net using WEB API for govt. project.
                                    </li>
                                </ul>
                                <div className="qualification__tech">
                                    <span className="qualification__tech-title">Key Technologies:</span>
                                    <div className="qualification__tech-items">
                                        <span className="qualification__tech-item">.NET MVC</span>
                                        <span className="qualification__tech-item">ASP.NET</span>
                                        <span className="qualification__tech-item">WEB API</span>
                                        <span className="qualification__tech-item">SQL Server</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <span className="qualification__rounder"></span>
                                <span className="qualification__line"></span>
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
                                <h3 className="qualification__title">M.Sc. in Web and Data Science</h3>
                                <span className="qualification__subtitle">Universität Koblenz</span>
                                <div className="qualification__calendar-location">
                                    <span><i className="uil uil-calendar-alt"></i> 2022-2024</span>
                                    <span><i className="uil uil-location-point"></i> Germany</span>
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
                                <h3 className="qualification__title">B.Sc. in Computer Science and Engineering</h3>
                                <span className="qualification__subtitle">Ahsanullah University of Science & Technology</span>
                                <div className="qualification__calendar-location">
                                    <span><i className="uil uil-calendar-alt"></i> 2013-2017</span>
                                    <span><i className="uil uil-location-point"></i> Bangladesh</span>
                                </div>
                            </div>
                        </div>

                        <div className="qualification__data">
                            <div>
                                <h3 className="qualification__title">Higher Secondary Certificate</h3>
                                <span className="qualification__subtitle">Rajuk Uttara Model College</span>
                                <div className="qualification__calendar-location">
                                    <span><i className="uil uil-calendar-alt"></i> 2012</span>
                                    <span><i className="uil uil-location-point"></i> Bangladesh</span>
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
                                <h3 className="qualification__title">Secondary School Certificate</h3>
                                <span className="qualification__subtitle">Rajuk Uttara Model College</span>
                                <div className="qualification__calendar-location">
                                    <span><i className="uil uil-calendar-alt"></i> 2010</span>
                                    <span><i className="uil uil-location-point"></i> Bangladesh</span>
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