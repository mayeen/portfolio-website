import React, { useState } from 'react';
import './projects.css';
import { projectsData } from './Data';
import ProjectsCard from './ProjectsCard';

const Projects = () => {
    const [currentProject, setCurrentProject] = useState(0);

    const nextProject = () => {
        setCurrentProject((prev) =>
            prev === projectsData.length - 1 ? 0 : prev + 1
        );
    };

    const prevProject = () => {
        setCurrentProject((prev) =>
            prev === 0 ? projectsData.length - 1 : prev - 1
        );
    };

    return (
        <section className="projects section" id="projects">
            <h2 className="section__title">Projects</h2>
            <span className="section__subtitle">My recent work</span>

            <div className="projects__container container">
                <div className="projects__content">
                    <div className="projects__navigation">
                        <div className="projects__arrow projects__arrow-left" onClick={prevProject}>
                            <i className="uil uil-angle-left-b"></i>
                        </div>

                        <div className="projects__slides">
                            {projectsData.map((project, index) => (
                                <div
                                    key={index}
                                    className={`projects__slide ${currentProject === index ? 'projects__slide-active' : ''}`}
                                >
                                    <ProjectsCard
                                        key={index}
                                        project={project}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="projects__arrow projects__arrow-right" onClick={nextProject}>
                            <i className="uil uil-angle-right-b"></i>
                        </div>
                    </div>

                    <div className="projects__dots">
                        {projectsData.map((_, index) => (
                            <span
                                key={index}
                                className={`projects__dot ${currentProject === index ? 'projects__dot-active' : ''}`}
                                onClick={() => setCurrentProject(index)}
                            ></span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Projects;