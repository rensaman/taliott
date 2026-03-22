import '@testing-library/jest-dom';
import './i18n.js';

// jsdom doesn't implement scrollTo/scrollIntoView — stub them out silently
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
