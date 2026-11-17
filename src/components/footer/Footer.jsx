import React from 'react'
import "./footer.css"
import { useContent } from '../../content/ContentProvider';

const LINKS = [
    { href: '#about', label: 'About' },
    { href: '#projects', label: 'Projects' },
    { href: '#qualification', label: 'Qualification' },
];

export const Footer = () => {
    const { profile } = useContent();
    return (
        <footer className="footer">
            <div className="footer__container container">
                <h1 className="footer__title">{profile.shortName}</h1>
                <ul className="footer__list">
                    {LINKS.map((link) => (
                        <li key={link.href}>
                            <a href={link.href} className="footer__link">{link.label}</a>
                        </li>
                    ))}
                </ul>
                <div className="footer__social">
                    {profile.socials.map((social) => (
                        <a
                            key={social.platform}
                            href={social.url}
                            className="footer__social-icon"
                            target="_blank"
                            rel="noreferrer"
                            aria-label={social.platform}
                        >
                            <i className={social.icon}></i>
                        </a>
                    ))}
                </div>

                <span className="footer__copy">&#169; {profile.shortName}. All rights reserved</span>
            </div>
        </footer>
    )
}

export default Footer
