import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import './ScrollToTop.css';

const ScrollToTop = () => {
    const [isVisible, setIsVisible] = useState(false);

    // Show button when page is scrolled down
    const toggleVisibility = (e) => {
        // If event comes from an element, check its scrollTop
        // Otherwise fallback to window/documentElement
        const target = e.target;
        const scrolled = (target && target.scrollTop !== undefined && target !== document)
            ? target.scrollTop
            : (window.pageYOffset || document.documentElement.scrollTop);

        if (scrolled > 100) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    // Set the top coordinate to 0
    // make scrolling smooth
    const scrollToTop = () => {
        // 1. Try window first
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        // 2. Aggressively find any element that has scrolled and reset it
        // This handles cases where a dashboard or wrapper is the actual scroll container
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            if (el.scrollTop > 0) {
                el.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        });
    };

    useEffect(() => {
        // Use capturing phase (true) to catch scroll events from sub-elements
        window.addEventListener('scroll', toggleVisibility, true);
        return () => {
            window.removeEventListener('scroll', toggleVisibility, true);
        };
    }, []);

    return (
        <div className={`scroll-to-top ${isVisible ? 'visible' : ''}`}>
            <button
                onClick={scrollToTop}
                aria-label="Scroll to top"
                className="scroll-btn"
            >
                <ChevronUp size={24} />
            </button>
        </div>
    );
};

export default ScrollToTop;
