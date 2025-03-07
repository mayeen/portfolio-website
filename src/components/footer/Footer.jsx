import React from 'react'
import "./footer.css"

export const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer__container container">
                <h1 className="footer__title">Shahriar</h1>
                <ul className="footer__list">
                    <li>
                        <a href="#about" className="footer__link">About</a>
                    </li>
                    <li>
                        <a href="#portfolio" className="footer__link">Projects</a>
                    </li>
                    <li>
                        <a href="#qualification" className="footer__link">Qualification</a>
                    </li>
                </ul>
                <div className="footer__social">
                    <a href="https://www.linkedin.com/in/kazi-mostafa-shahriar-051321139/" className="footer__social-icon"
                       target="_blank" rel="noreferrer">
                        <i className='bx bxl-linkedin-square contact__card-icon'></i>
                    </a>
                    <a href="https://github.com/mayeen" className="footer__social-icon" target="_blank" rel="noreferrer">
                        <i className='bx bxl-github'></i>
                    </a>
                </div>

                <span className="footer__copy">&#169; Shahriar. All rights reserved</span>
            </div>
        </footer>
    )
}

export default Footer