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
                                    <span><i className="uil uil-calendar-alt"></i> 09/2022 - present</span>
                                    <span><i className="uil uil-location-point"></i> Germany</span>
                                </div>
                                <div className="qualification__company-desc">
                                    Accelerating clients existing website using our Html caching mechanism
                                </div>
                                <span className="qualification__tech-title">Responsibilities:</span>
                                <ul className="qualification__bullet-list">
                                    <li>Search and optimize clients code for better web vitals like <b>LCP</b>, <b>CLS</b> using <b>JavaScript</b>, <b>Regex</b> and <b>CSS</b> rules.</li>
                                    <li>Integrate our product, SpeedKit according to client's code for dynamic change detection, merging remote contents.</li>
                                    <li>Continuous development of integration project using <b>TypeScript</b>.</li>
                                    <li>Conducted <b>black-box testing</b> to validate system functionality.</li>
                                </ul>
                                <div className="qualification__tech">
                                    <span className="qualification__tech-title">Key Technologies:</span>
                                    <div className="qualification__tech-items">
                                        <span className="qualification__tech-item">JavaScript</span>
                                        <span className="qualification__tech-item">TypeScript</span>
                                        <span className="qualification__tech-item">RegEx</span>
                                        <span className="qualification__tech-item">HTML</span>
                                        <span className="qualification__tech-item">CSS</span>
                                        <span className="qualification__tech-item">Blackbox Testing</span>
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
                                    <span><i className="uil uil-location-point"></i> Bangladesh</span>
                                </div>
                                <div className="qualification__company-desc">
                                    Software solution provider for foreign clients
                                </div>
                                <span className="qualification__tech-title">Responsibilities:</span>
                                <ul className="qualification__bullet-list">
                                    <li>Converting complex business requirements into highly scalable backend using <b>C# (.NET)</b> for our core product, BrandShare.</li>
                                    <li>Implementing robust front-end using <b>Angular 2/5/9</b>, <b>AngularJS</b>, <b>Bootstrap</b> while working side by side with off-shore client designers.</li>
                                    <li>Integrated <b>30+ third-party APIs</b> to enhance product functionality and user experience.</li>
                                    <li>Designed <b>RESTful APIs</b> to expose core business logic, improving system interoperability by <b>40%</b>.</li>
                                    <li>Developed internal tools for asynchronous/scheduled workflows, reducing manual effort by <b>75%</b> and accelerating task completion.</li>
                                    <li>Adapted <b>micro-team model</b> within Scrum frameworks to meet critical deadlines without compromising quality (<b>100% on-time delivery</b>).</li>
                                </ul>
                                <div className="qualification__tech">
                                    <span className="qualification__tech-title">Key Technologies:</span>
                                    <div className="qualification__tech-items">
                                        <span className="qualification__tech-item">C#</span>
                                        <span className="qualification__tech-item">.Net Core</span>
                                        <span className="qualification__tech-item">Angular</span>
                                        <span className="qualification__tech-item">RESTful API</span>
                                        <span className="qualification__tech-item">SQLServer</span>
                                        <span className="qualification__tech-item">AWS</span>
                                        <span className="qualification__tech-item">Microservice</span>
                                        <span className="qualification__tech-item">Git</span>
                                        <span className="qualification__tech-item">Jira</span>
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
                                    <span><i className="uil uil-location-point"></i> Bangladesh</span>
                                </div>
                                <div className="qualification__company-desc">
                                    Provides telecommunication-based solutions to government run organization
                                </div>
                                <span className="qualification__tech-title">Responsibilities:</span>
                                <ul className="qualification__bullet-list">
                                    <li>Engineered a scalable clinic management system from scratch using <b>.NET MVC</b>, supporting <b>15+ clinics</b> in the local market and reducing administrative workload by <b>30%</b> through automation.</li>
                                    <li>Continuous engagement with clients for requirement analysis and blackbox testing to ensure quality output.</li>
                                    <li>Implemented authenticator device SDK to create custom authentication app in <b>ASP.Net</b> using <b>WEB API</b> for government project.</li>
                                </ul>
                                <div className="qualification__tech">
                                    <span className="qualification__tech-title">Key Technologies:</span>
                                    <div className="qualification__tech-items">
                                        <span className="qualification__tech-item">C#</span>
                                        <span className="qualification__tech-item">ASP.NET</span>
                                        <span className="qualification__tech-item">Bootstrap</span>
                                        <span className="qualification__tech-item">RESTful API</span>
                                        <span className="qualification__tech-item">SQL Server</span>
                                        <span className="qualification__tech-item">Blackbox Testing</span>
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
                                    <span><i className="uil uil-calendar-alt"></i> 04/2022 - 09/2025</span>
                                    <span><i className="uil uil-location-point"></i> Germany</span>
                                </div>
                                <div className="qualification__company-desc">
                                    Core Curriculum:
                                </div>
                                <ul className="qualification__bullet-list">
                                    <li>Web Science, Engineering Web & Data Intensive System, Data Science, Big Data Analysis</li>
                                </ul>
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
                                    <span><i className="uil uil-calendar-alt"></i> 07/2013 - 06/2017</span>
                                    <span><i className="uil uil-location-point"></i> Bangladesh</span>
                                </div>
                                <div className="qualification__company-desc">
                                    Core Curriculum:
                                </div>
                                <ul className="qualification__bullet-list">
                                    <li>Algorithm, Data Structure, Object Oriented Programming, Software Engineering</li>
                                </ul>
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