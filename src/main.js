import './style.css';
import './main.css';
import {gsap} from "gsap";

const timeline = gsap.timeline({
    defaults: {duration: 0.5, ease: 'power1.inOut'}
});

const SELECTORS = {
    INTRO_SCREEN: '.intro_screen',
    INTRO_TEXT_CONTAINER: '.intro_text_container',
    INTRO_TEXT: '.intro_text',
    CURSOR_CONTAINER: '.cursor_container',
    BLINKING_CURSOR: '.blinking_cursor',
    TYPED_TEXT: '.typed_text',
    TYPING_CURSOR: '.typing_cursor',
    TITLE_CONTAINER: '.title_container',
    ENTER_BUTTON: '.intro_screen .enter_button',
    OPTIONS_SCREEN: '.options_screen',
    OPTION: '.option',
    SENTENCE: '.sentence',
    OPTION_CONTAINER: '.options_container',
    DOTTED_LINE_CONTAINER: '.dotted_line_container',
    FOLLOWING: '.following',
    WORDS: '.words',
};

// Test sentence: If, of all words of tongue and pen,
const OPTION_SETS = [
    ['If', 'If', 'If'],
    ['of', 'of', 'of'],
    ['all', 'all', 'all'],
    ['words', 'words', 'words'],
    ['of', 'of', 'of'],
    ['tongue', 'tongue', 'tongue'],
    ['and', 'and', 'and'],
    ['pen,', 'pen,', 'pen,'],
];
let optionIndex = 0;

// SVG Animation Functions
async function loadDottedLineSVG() {
    try {
        const response = await fetch('/dotted-line.svg');
        const svgText = await response.text();
        const container = document.querySelector(SELECTORS.DOTTED_LINE_CONTAINER);
        container.innerHTML = svgText;
        
        // Initialize the SVG animation
        initializeDottedLineAnimation();
    } catch (error) {
        console.warn('Dotted line SVG not found. Please add dotted-line.svg to the public folder.');
    }
}

function initializeDottedLineAnimation() {
    const svg = document.querySelector(`${SELECTORS.DOTTED_LINE_CONTAINER} svg`);
    if (!svg) return;

    // Find the path element
    const path = svg.querySelector('path');
    if (!path) return;
    
    // Get the total length of the path for precise animation
    const pathLength = path.getTotalLength();
    
    // Apply GSAP styling and set initial state
    gsap.set(path, {
        stroke: "white",
        strokeWidth: 3,
        strokeDasharray: pathLength, // Single line that will draw in
        strokeDashoffset: pathLength,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        fill: "none",
        opacity: 0.9
    });
    
    // Hide the entire SVG container initially
    gsap.set(SELECTORS.DOTTED_LINE_CONTAINER, {
        opacity: 0
    });
    
    // Hide both words initially
    gsap.set([SELECTORS.FOLLOWING, SELECTORS.WORDS], {
        opacity: 0
    });
    
    // Hide title container initially (Enter button will be visible)
    gsap.set(SELECTORS.TITLE_CONTAINER, {
        opacity: 0,
        pointerEvents: 'none'
    });
}

function createStorylineAnimation() {
    const svg = document.querySelector(`${SELECTORS.DOTTED_LINE_CONTAINER} svg`);
    if (!svg) return;

    const path = svg.querySelector('path');
    if (!path) return;
    
    const pathLength = path.getTotalLength();
    
    // Create the complete storyline timeline
    const storyTimeline = gsap.timeline();
    
    // Step 0: Make title container visible first (immediately)
    storyTimeline.to(SELECTORS.TITLE_CONTAINER, {
        opacity: 1,
        pointerEvents: 'auto',
        duration: 0.1,
        ease: "power2.out"
    });
    
    // Step 1: "following" appears (0.1s - 0.4s)
    storyTimeline.to(SELECTORS.FOLLOWING, {
        opacity: 1,
        duration: 0.3,
        ease: "power2.out"
    }, 0.1);
    
    // Step 2: Make SVG container visible and start path drawing (0.4s - 1.4s)
    storyTimeline.to(SELECTORS.DOTTED_LINE_CONTAINER, {
        opacity: 1,
        duration: 0.2,
        ease: "power2.out"
    }, 0.4);
    
    // Phase 1: Path draws in completely (0.4s - 2.0s)
    storyTimeline.to(path, {
        strokeDashoffset: 0, // Draw to 100%
        duration: 1.6,
        ease: "none" // Linear, constant speed
    }, 0.4);
    
    // Step 3: At 75% of drawing (1.6s) - "words" appears
    storyTimeline.to(SELECTORS.WORDS, {
        opacity: 1,
        duration: 0.3,
        ease: "power2.out"
    }, 1.6);
    
    // Phase 2: Line travels through by creating moving segment (2.0s - 3.6s)
    // Seamlessly transition to traveling effect
    storyTimeline.set(path, {
        strokeDasharray: function() {
            return `${pathLength * 0.75} ${pathLength * 0.25}`; // 75% visible, 25% gap
        },
        strokeDashoffset: pathLength * 0.75 // Start position matches end of drawing
    }, 2.0);
    
    // "following" starts fading as line begins traveling (2.0s)
    storyTimeline.to(SELECTORS.FOLLOWING, {
        opacity: 0,
        duration: 0.8,
        ease: "power2.inOut"
    }, 2.0);
    
    // Animate the traveling line effect (2.0s - 3.6s)
    storyTimeline.to(path, {
        strokeDashoffset: -pathLength * 0.5, // Travel completely through and off
        duration: 1.6,
        ease: "none" // Linear, constant speed to match drawing phase
    }, 2.0);
    
    // Step 4: "words" fades out as line exits (2.8s)
    storyTimeline.to(SELECTORS.WORDS, {
        opacity: 0,
        duration: 0.6,
        ease: "power2.inOut"
    }, 2.8);
    
    // Step 5: SVG container fades out (3.4s)
    storyTimeline.to(SELECTORS.DOTTED_LINE_CONTAINER, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.inOut"
    }, 3.4);
    
    return storyTimeline;
}

const enterButton = document.querySelector(SELECTORS.ENTER_BUTTON);
enterButton?.addEventListener('click', () => {
    // Create smooth transition timeline
    const transitionTimeline = gsap.timeline();
    
    // First: Fade out intro text and enter button
    transitionTimeline.to([SELECTORS.INTRO_TEXT_CONTAINER, SELECTORS.ENTER_BUTTON], {
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut"
    });
    
    // Second: Start the "following words" animation sequence
    const storyAnimation = createStorylineAnimation();
    transitionTimeline.add(storyAnimation, 0.5);
    
    // Third: Transition to next screen after all individual elements have faded
    transitionTimeline.to(SELECTORS.INTRO_SCREEN, {
        opacity: 0,
        display: 'none',
        duration: 0.2,
        ease: "power2.inOut"
    }, 4.2) // Wait until 0.5s + 3.7s story
    .to(SELECTORS.OPTIONS_SCREEN, {
        display: 'block',
        opacity: 1,
        duration: 0.3,
        ease: "power2.out"
    });
});

function createOptionSet(set) {
    const options = [];
    set.forEach((option, index) => {
        const optionHTML = `
            <div class="option">
                <input type="radio" name="option_${index + 1}" value="${option}" id="option${index + 1}">
                <label for="option${index + 1}">${option}</label>
                <label for="option${index + 1}">${index + 1}</label>
            </div>
        `;
        options.push(optionHTML);
    });
    return options.join('');
}

function updateOptions() {
    const optionsContainer = document.querySelector(SELECTORS.OPTION_CONTAINER);
    optionsContainer.innerHTML = createOptionSet((OPTION_SETS[optionIndex]));
    // attach event listeners
    const options = optionsContainer.querySelectorAll(SELECTORS.OPTION);
    [...options].forEach(option => {
        const sentence = document.querySelector(SELECTORS.SENTENCE);
        const radioButton = option.querySelector('input[type="radio"]');
        radioButton.addEventListener('change', (e) => {
            const selectedText = e.target.value;
            sentence.innerText += ` ${selectedText}`;
            if (optionIndex < OPTION_SETS.length - 1) {
                optionIndex++;
                updateOptions();
            } else {
                optionsContainer.remove();
                // TODO: reveal scene;
            }
        });
    });
}

updateOptions();

// Load and initialize the dotted line SVG when the page loads
loadDottedLineSVG();

// Typewriter effect variables
const INTRO_TEXT_CONTENT = "Words trace paths others have taken.\nYou can follow, wander, or carve your own\nway into the unknown";
let typingStarted = false;

// Typewriter animation function
function startTypewriterEffect() {
    if (typingStarted) return;
    typingStarted = true;
    
    // Hide initial cursor and show typing container
    gsap.to(SELECTORS.CURSOR_CONTAINER, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.out",
        onComplete: () => {
            document.querySelector(SELECTORS.CURSOR_CONTAINER).style.display = 'none';
            document.querySelector(SELECTORS.INTRO_TEXT).style.display = 'block';
            gsap.to(SELECTORS.INTRO_TEXT, {
                opacity: 1,
                duration: 0.3,
                ease: "power2.out"
            });
        }
    });
    
    // Type out the text character by character
    const typedTextElement = document.querySelector(SELECTORS.TYPED_TEXT);
    const characters = INTRO_TEXT_CONTENT.split('');
    let currentIndex = 0;
    
    const typeInterval = setInterval(() => {
        if (currentIndex < characters.length) {
            const char = characters[currentIndex];
            if (char === '\n') {
                typedTextElement.innerHTML += '<br>';
            } else {
                typedTextElement.innerHTML += char;
            }
            currentIndex++;
        } else {
            clearInterval(typeInterval);
            // Hide typing cursor and show Enter button after a brief pause
            setTimeout(() => {
                gsap.to(SELECTORS.TYPING_CURSOR, {
                    opacity: 0,
                    duration: 0.3,
                    ease: "power2.out"
                });
                gsap.to(SELECTORS.ENTER_BUTTON, {
                    opacity: 1,
                    pointerEvents: 'auto',
                    duration: 0.5,
                    ease: "power2.out"
                });
            }, 500);
        }
    }, 10000 / INTRO_TEXT_CONTENT.length); // 15 seconds total divided by character count (5x slower)
}

// Listen for any key press, click, or touch to start typing
document.addEventListener('keydown', (e) => {
    if (!typingStarted) {
        startTypewriterEffect();
    }
});

// Listen for click/tap to start typing (mobile support)
document.addEventListener('click', (e) => {
    if (!typingStarted) {
        startTypewriterEffect();
    }
});

// Listen for touch events to start typing (mobile support)
document.addEventListener('touchstart', (e) => {
    if (!typingStarted) {
        startTypewriterEffect();
        e.preventDefault(); // Prevent click event from also firing
    }
});

window.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        // Click Enter button if it's visible
        if (enterButton && window.getComputedStyle(enterButton).opacity !== '0') {
            enterButton.click();
        }
    }
    if (e.key === '1') {
        const firstOption = document.querySelector(`${SELECTORS.OPTION} input[type="radio"]`);
        if (firstOption) {
            firstOption.checked = true;
            firstOption.dispatchEvent(new Event('change'));
        }
    }
    if (e.key === '2') {
        const secondOption = document.querySelectorAll(`${SELECTORS.OPTION} input[type="radio"]`)[1];
        if (secondOption) {
            secondOption.checked = true;
            secondOption.dispatchEvent(new Event('change'));
        }
    }
    if (e.key === '3') {
        const thirdOption = document.querySelectorAll(`${SELECTORS.OPTION} input[type="radio"]`)[2];
        if (thirdOption) {
            thirdOption.checked = true;
            thirdOption.dispatchEvent(new Event('change'));
        }
    }
});
