import React from 'react'
import './certifications.css';
import { certifications } from '../../data';
import { formatDate } from '../../utils/date';

const Certifications = () => {
    return (
        <section className="certifications section" id="certifications">
            <h2 className="section__title">Certifications</h2>
            <span className="section__subtitle">Verified credentials</span>

            <div className="certifications__container container grid">
                {certifications.map((cert) => (
                    <article className="certifications__card" key={cert.id}>
                        {cert.image ? (
                            <a href={cert.image} target="_blank" rel="noreferrer" className="certifications__img-link">
                                <img src={cert.image} alt={`${cert.name} certificate`} className="certifications__img" loading="lazy" />
                            </a>
                        ) : (
                            <i className={`${cert.icon} certifications__icon`}></i>
                        )}
                        <div className="certifications__details">
                            <h3 className="certifications__name">{cert.name}</h3>
                            <span className="certifications__meta">
                                {[cert.issuer, cert.code, formatDate(cert.issueDate)].filter(Boolean).join(' · ')}
                            </span>
                            {cert.credentialId && (
                                <span className="certifications__credential">Credential ID: {cert.credentialId}</span>
                            )}
                            {cert.verifyUrl && (
                                <a href={cert.verifyUrl} className="certifications__link" target="_blank" rel="noreferrer">
                                    Verify <i className="bx bx-right-arrow-alt"></i>
                                </a>
                            )}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    )
}
export default Certifications
