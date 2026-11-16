import React, { useEffect, useState } from 'react'
import "./scrollup.css"

const ScrollUp = () => {
    const [isVisible, setIsVisible] = useState(false);

    // Show the button once the page is scrolled past the hero.
    useEffect(() => {
        const onScroll = () => setIsVisible(window.scrollY >= 560);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <a href="#home" className={isVisible ? 'scrollup show-scroll' : 'scrollup'} aria-label="Scroll to top">
            <i className="uil uil-arrow-up scrollup__icon"></i>
        </a>
    )
}

export default ScrollUp
