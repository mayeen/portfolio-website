import React from 'react';
import PropTypes from 'prop-types';

// Renders a string where **text** becomes <b>text</b>. Nothing else is parsed,
// so content can never inject HTML.
const RichText = ({ text }) => {
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, index) =>
        index % 2 === 1 ? <b key={index}>{part}</b> : <React.Fragment key={index}>{part}</React.Fragment>
    );
};

RichText.propTypes = {
    text: PropTypes.string.isRequired,
};

export default RichText;
