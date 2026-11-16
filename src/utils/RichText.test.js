import React from 'react';
import { render } from '@testing-library/react';
import RichText from './RichText';

const html = (text) => render(<p><RichText text={text} /></p>).container.firstChild.innerHTML;

describe('RichText', () => {
    test('turns **text** into <b>', () => {
        expect(html('Built **React** and **Python** apps')).toBe('Built <b>React</b> and <b>Python</b> apps');
    });

    test('leaves plain text alone', () => {
        expect(html('No markup here')).toBe('No markup here');
    });

    test('never renders HTML from content', () => {
        expect(html('<img src=x onerror=alert(1)> **ok**')).toBe('&lt;img src=x onerror=alert(1)&gt; <b>ok</b>');
    });
});
