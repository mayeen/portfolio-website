import React from 'react'
import { profile } from '../../data';

const Social = () => {
    return (
        <div className="home__social">
            {profile.socials.map((social) => (
                <a
                    key={social.platform}
                    href={social.url}
                    className="home__social-icon"
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.platform}
                >
                    <i className={`${social.icon} contact__card-icon`}></i>
                </a>
            ))}
        </div>
    )
}
export default Social
