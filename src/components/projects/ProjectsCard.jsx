import React from 'react';
import PropTypes from 'prop-types';

const ProjectsCard = ({ project }) => {
    // Add console log to debug the GitHub URL
    console.log('Project GitHub URL:', project.github);

    return (
        <div className="projects__card">
            <div className="projects__img-container">
                <img src={project.image} alt={project.title} className="projects__img" />
            </div>

            <h3 className="projects__title">{project.title}</h3>
            <p className="projects__description">{project.description}</p>

            <div className="projects__tech">
                <h4 className="projects__tech-title">Key Technologies:</h4>
                <div className="projects__tech-items">
                    {project.technologies.map((tech, index) => (
                        <span key={index} className="projects__tech-item">{tech}</span>
                    ))}
                </div>
            </div>

            <div className="projects__links">
                {/* Use explicit URL instead of variable reference if there's an issue */}
                {project.title === "Portfolio Website" ? (
                    <a
                        href="https://github.com/mayeen/portfolio-website"
                        className="projects__link"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <i className="uil uil-github"></i> GitHub
                    </a>
                ) : (
                    <a
                        href="https://github.com/mayeen/NeurotechDemo"
                        className="projects__link"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <i className="uil uil-github"></i> GitHub
                    </a>
                )}

                {project.demo && (
                    <a
                        href={project.demo}
                        className="projects__link"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <i className="uil uil-eye"></i> Live Demo
                    </a>
                )}
            </div>
        </div>
    );
};

// Add PropTypes validation
ProjectsCard.propTypes = {
    project: PropTypes.shape({
        id: PropTypes.number.isRequired,
        image: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        technologies: PropTypes.arrayOf(PropTypes.string).isRequired,
        github: PropTypes.string.isRequired,
        demo: PropTypes.string
    }).isRequired
};

// Define PropTypes as before

export default ProjectsCard;