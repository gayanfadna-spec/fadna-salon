import React from 'react';

const ThemeToggle = () => {
    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'default';
        const themes = ['default', 'velox', 'sunset'];
        const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
        const newTheme = themes[nextIndex];
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <button
            onClick={toggleTheme}
            className="btn-primary"
            style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                aspectRatio: '1/1',
                fontSize: '1.2rem',
                borderRadius: '8px'
            }}
            title="Toggle Theme"
        >
            🎨
        </button>
    );
};

export default ThemeToggle;
