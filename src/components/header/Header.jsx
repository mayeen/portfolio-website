import React, { useEffect, useState } from 'react'
import './header.css';
import { useContent } from '../../content/ContentProvider';

const NAV_ITEMS = [
    { href: '#home', label: 'Home', icon: 'uil uil-estate' },
    { href: '#about', label: 'About', icon: 'uil uil-user' },
    { href: '#qualification', label: 'Qualification', icon: 'uil uil-scenery' },
    { href: '#skills', label: 'Skills', icon: 'uil uil-file-alt' },
    { href: '#certifications', label: 'Certificates', icon: 'uil uil-award' },
    { href: '#projects', label: 'Projects', icon: 'uil uil-briefcase' },
    { href: '#contact', label: 'Contact', icon: 'uil uil-message' },
];

const Header = () => {
    const { profile } = useContent();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeNav, setActiveNav] = useState('#home');
    const [isScrolled, setIsScrolled] = useState(false);

    // Add a shadow to the header once the page is scrolled past the hero.
    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY >= 560);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header className={isScrolled ? 'header scroll-header' : 'header'}>
            <nav className="nav container">
                <a href="#home" className="nav__logo">{profile.shortName}</a>

                <div className={isMenuOpen ? 'nav__menu show-menu' : 'nav__menu'}>
                    <ul className="nav__list grid">
                        {NAV_ITEMS.map((item) => (
                            <li className="nav__item" key={item.href}>
                                <a
                                    href={item.href}
                                    onClick={() => setActiveNav(item.href)}
                                    className={activeNav === item.href ? 'nav__link active-link' : 'nav__link'}
                                >
                                    <i className={`${item.icon} nav__icon`}></i>{item.label}
                                </a>
                            </li>
                        ))}
                    </ul>

                    <i className="uil uil-times nav__close" onClick={() => setIsMenuOpen(!isMenuOpen)}></i>
                </div>

                <div className="nav__toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <i className="uil uil-apps"></i>
                </div>
            </nav>
        </header>
    )
}
export default Header
