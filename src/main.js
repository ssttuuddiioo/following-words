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

// Dynamic word chain system
let currentChain = null;
let currentNode = null;
let optionIndex = 0;
let availableChains = ['what', 'the', 'a', 'i', 'in', 'o', 'oh', 'there', 'when', '1'];
let currentSentence = [];

// Load a random starting chain
async function loadRandomChain() {
    const randomChain = availableChains[Math.floor(Math.random() * availableChains.length)];
    return loadChain(randomChain);
}

// Load specific word chain
async function loadChain(chainName) {
    try {
        const response = await fetch(`/output/chain_${chainName}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load chain_${chainName}.json`);
        }
        currentChain = await response.json();
        currentNode = currentChain;
        currentSentence = [];
        console.log(`Loaded chain for: ${chainName}`);
        return currentChain;
    } catch (error) {
        console.error('Error loading chain:', error);
        // Fallback to simple test data
        return createFallbackChain();
    }
}

// Create fallback for when chain files aren't available
function createFallbackChain() {
    return {
        "the": {
            "quick": {
                "brown": {
                    "__keys__": ["fox", "dog", "cat"]
                },
                "silver": {
                    "__keys__": ["moon", "star", "light"]
                },
                "__keys__": ["brown", "silver"]
            },
            "slow": {
                "gentle": {
                    "__keys__": ["rain", "wind", "snow"]
                },
                "__keys__": ["gentle"]
            },
            "__keys__": ["quick", "slow"]
        }
    };
}

// Evaluate branching potential of a word choice (look ahead 2-3 levels)
function evaluateBranchingPotential(node, word, depth = 3) {
    if (!node || !node[word] || depth <= 0) {
        return 0;
    }
    
    const nextNode = node[word];
    const validKeys = getValidKeys(nextNode);
    
    if (validKeys.length === 0) {
        return 0; // Dead end
    }
    
    // Score based on immediate choices and future potential
    let score = validKeys.length;
    
    // Look ahead recursively for sustained branching
    if (depth > 1 && validKeys.length >= 2) {
        let futureScore = 0;
        const keysToCheck = Math.min(validKeys.length, 3); // Check top 3 paths
        
        for (let i = 0; i < keysToCheck; i++) {
            const futureKey = validKeys[i];
            futureScore += evaluateBranchingPotential(nextNode, futureKey, depth - 1);
        }
        
        // Average future score and weight it
        const avgFutureScore = futureScore / keysToCheck;
        score += avgFutureScore * 0.5; // 50% weight for future branching
    }
    
    return score;
}

// Helper function to extract valid keys from a node
function getValidKeys(node) {
    if (!node || typeof node !== 'object') {
        return [];
    }
    
    // Use __keys__ if available, otherwise filter object keys
    if (node.__keys__ && Array.isArray(node.__keys__)) {
        return node.__keys__.filter(key => 
            typeof key === 'string' && 
            !key.startsWith('__') && 
            key.trim().length > 0 &&
            /^[a-zA-Z][a-zA-Z0-9\-'.,;:!?\s]*$/.test(key)
        );
    } else {
        return Object.keys(node).filter(key => 
            !key.startsWith('__') && 
            typeof key === 'string' &&
            key.trim().length > 0 &&
            /^[a-zA-Z][a-zA-Z0-9\-'.,;:!?\s]*$/.test(key) &&
            typeof node[key] === 'object'
        );
    }
}

// Smart word choice selection that prioritizes sustained branching
function getWordChoices(node, maxChoices = 3) {
    if (!node || typeof node !== 'object') {
        return [];
    }
    
    const availableKeys = getValidKeys(node);
    
    if (availableKeys.length === 0) {
        return [];
    }
    
    // If we have fewer choices than requested, use what we have
    if (availableKeys.length <= maxChoices) {
        return availableKeys;
    }
    
    // Evaluate branching potential for each available word
    const wordScores = availableKeys.map(word => ({
        word,
        score: evaluateBranchingPotential(node, word, 3),
        immediateChoices: getValidKeys(node[word]).length
    }));
    
    // Sort by branching potential (prioritize sustained branching)
    wordScores.sort((a, b) => {
        // Primary: Prioritize words with good sustained branching (score)
        if (Math.abs(a.score - b.score) > 0.5) {
            return b.score - a.score;
        }
        // Secondary: If scores are close, prefer immediate variety
        if (Math.abs(a.immediateChoices - b.immediateChoices) > 1) {
            return b.immediateChoices - a.immediateChoices;
        }
        // Tertiary: Random to add variety
        return Math.random() - 0.5;
    });
    
    // Select top choices, but add some randomness to avoid predictability
    const topChoices = wordScores.slice(0, Math.min(maxChoices * 2, wordScores.length));
    
    // Weighted random selection favoring better scores
    const selectedWords = [];
    const weights = topChoices.map((_, index) => Math.pow(0.7, index)); // Exponential decay
    
    for (let i = 0; i < maxChoices && topChoices.length > 0; i++) {
        const totalWeight = weights.slice(0, topChoices.length).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        
        let selectedIndex = 0;
        for (let j = 0; j < topChoices.length; j++) {
            random -= weights[j];
            if (random <= 0) {
                selectedIndex = j;
                break;
            }
        }
        
        selectedWords.push(topChoices[selectedIndex].word);
        topChoices.splice(selectedIndex, 1);
        weights.splice(selectedIndex, 1);
    }
    
    console.log('🎯 Smart word selection:', selectedWords.map(word => {
        const score = wordScores.find(ws => ws.word === word);
        return `${word} (score: ${score?.score.toFixed(1)}, immediate: ${score?.immediateChoices})`;
    }));
    
    return selectedWords;
}

// Track poem metadata as we navigate
let currentPoemId = null;
let poemCompletions = new Map(); // Cache discovered poem completions

// Navigate to next node based on chosen word
function navigateToNext(chosenWord) {
    if (!currentNode || !currentNode[chosenWord]) {
        return null;
    }
    
    currentNode = currentNode[chosenWord];
    currentSentence.push(chosenWord);
    
    // Track poem ID if we encounter one
    if (currentNode.__id__ && !currentPoemId) {
        currentPoemId = currentNode.__id__;
        console.log(`📖 Discovered poem ID: ${currentPoemId}`);
    }
    
    return currentNode;
}

// Generate current option set with smart path selection
function getCurrentOptions() {
    const choices = getWordChoices(currentNode, 3);
    
    // Log for debugging with branching analysis
    console.log('📍 Current sentence progress:', currentSentence.join(' '));
    console.log('🔀 Available choices with branching potential:', choices);
    
    // If no valid choices found, this might be an end node
    if (choices.length === 0) {
        console.log('🏁 Reached end node - no more valid choices');
        return ['[end]'];
    }
    
    // Check if we're in a low-branching situation
    const allAvailableKeys = getValidKeys(currentNode);
    if (allAvailableKeys.length <= 2) {
        console.log('⚠️  Low branching detected - only', allAvailableKeys.length, 'total choices available');
    }
    
    // Ensure we have exactly 3 options
    if (choices.length < 3) {
        // Get more choices using less strict criteria if needed
        const additionalChoices = getValidKeys(currentNode)
            .filter(key => !choices.includes(key))
            .slice(0, 3 - choices.length);
        
        choices.push(...additionalChoices);
        
        // If still less than 3, pad with end markers only if we have some valid choices
        if (choices.length > 0 && choices.length < 3) {
            const padding = ['...', '—', '[end]'];
            for (let i = 0; i < padding.length && choices.length < 3; i++) {
                if (!choices.includes(padding[i])) {
                    choices.push(padding[i]);
                }
            }
        }
    }
    
    return choices.slice(0, 3); // Ensure exactly 3 choices
}

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
        ease: "power2.out",
        onComplete: () => {
            // Initialize the word chain system when options screen appears
            initializeWordChain();
        }
    });
});

function createOptionSet(choices) {
    const options = [];
    
    // Multiple position configurations that cycle through each page
    const positionConfigurations = [
        // Configuration 1: Classic spread
        [
            { top: '20%', left: '15%' },
            { top: '45%', right: '20%' },  
            { bottom: '25%', left: '25%' }
        ],
        // Configuration 2: Diagonal flow
        [
            { top: '15%', right: '15%' },
            { top: '50%', left: '50%' },
            { bottom: '20%', right: '25%' }
        ],
        // Configuration 3: Vertical column
        [
            { top: '25%', left: '70%' },
            { top: '55%', left: '65%' },
            { bottom: '30%', left: '75%' }
        ],
        // Configuration 4: Horizontal spread
        [
            { top: '60%', left: '10%' },
            { top: '65%', left: '45%' },
            { top: '55%', right: '15%' }
        ],
        // Configuration 5: Asymmetric placement
        [
            { top: '30%', left: '20%' },
            { bottom: '40%', right: '30%' },
            { top: '70%', left: '60%' }
        ]
    ];
    
    // Get current configuration based on the number of words chosen so far
    const configIndex = currentSentence.length % positionConfigurations.length;
    const positions = positionConfigurations[configIndex];
    
    choices.forEach((choice, index) => {
        const position = positions[index] || { top: '50%', left: '50%' };
        const positionStyle = Object.entries(position)
            .map(([key, value]) => `${key}: ${value}`)
            .join('; ');
            
        const optionHTML = `
            <div class="option" style="position: absolute; ${positionStyle}; transform: translate(-50%, -50%);">
                <input type="radio" name="option" value="${choice}" id="option${index + 1}" data-keycode="${index + 1}" />
                <label for="option${index + 1}">${choice}</label>
                <span class="option-number">${index + 1}</span>
            </div>
        `;
        options.push(optionHTML);
    });
    return options.join('');
}

async function updateOptions() {
    const optionsContainer = document.querySelector(SELECTORS.OPTION_CONTAINER);
    const sentence = document.querySelector(SELECTORS.SENTENCE);
    
    // Initialize chain if not loaded
    if (!currentChain) {
        await initializeWordChain();
    }
    
    // Get current word choices
    const choices = getCurrentOptions();
    
    if (choices.length === 0 || choices.every(choice => choice.startsWith('[') || choice === '...' || choice === '—')) {
        // End of chain reached - continue typing the rest
        console.log('🏁 Natural conclusion reached - continuing poem');
        typeCompletePoemContinuation();
        return;
    }
    
    // Fade out existing options first
    const existingOptions = optionsContainer.children;
    if (existingOptions.length > 0) {
        await new Promise(resolve => {
            gsap.to(existingOptions, {
                opacity: 0,
                y: -20,
                duration: 0.3,
                stagger: 0.1,
                ease: "power2.in",
                onComplete: resolve
            });
        });
    }
    
    // Create new options
    optionsContainer.innerHTML = createOptionSet(choices);
    
    // Fade in new options with stagger effect
    const newOptions = optionsContainer.children;
    gsap.set(newOptions, { opacity: 0, y: 20 });
    gsap.to(newOptions, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.15,
        ease: "power2.out"
    });
    
    // Attach event listeners
    const options = optionsContainer.querySelectorAll(SELECTORS.OPTION);
    [...options].forEach(option => {
        const radioButton = option.querySelector('input[type="radio"]');
        radioButton.addEventListener('change', (e) => {
            const selectedWord = e.target.value;
            
            // Handle special endings
            if (selectedWord.startsWith('[') || selectedWord === '...' || selectedWord === '—') {
                sentence.innerText += ` ${selectedWord}`;
                updateOptions(); // This will trigger the completion flow
                return;
            }
            
            // Navigate to next node
            const nextNode = navigateToNext(selectedWord);
            
            if (nextNode) {
                // Add typing animation for the selected word
                typeWordToSentence(selectedWord, () => {
                    // Check if we're approaching a dead end before continuing
                    const futureChoices = getValidKeys(nextNode);
                    
                    // If we're about to hit a low-branching situation and the sentence is reasonable length,
                    // offer a graceful restart to maintain the experience
                    if (futureChoices.length <= 1 && currentSentence.length >= 4) {
                        console.log('🔄 Low branching ahead - offering restart to maintain choices');
                        offerGracefulRestart();
                    } else {
                        // Continue to next choice after typing animation
                        updateOptions();
                    }
                });
            } else {
                // Dead end reached
                typeWordToSentence(selectedWord, () => {
                    updateOptions(); // This will trigger completion
                });
            }
        });
    });
}

// Typing animation for selected words with smooth opacity effects
function typeWordToSentence(word, callback) {
    const sentence = document.querySelector(SELECTORS.SENTENCE);
    const currentText = sentence.innerText;
    const newText = currentText ? `${currentText} ${word}` : word;
    
    // Clear options while typing with fade out
    const optionsContainer = document.querySelector(SELECTORS.OPTION_CONTAINER);
    gsap.to(optionsContainer.children, {
        opacity: 0,
        duration: 0.2,
        stagger: 0.05,
        onComplete: () => {
            optionsContainer.innerHTML = '';
        }
    });
    
    // Start with current text and smooth opacity for new characters
    sentence.innerHTML = currentText + '<span class="typing-cursor">|</span>';
    
    let charIndex = currentText.length;
    if (currentText) charIndex++; // Account for space
    
    const typeInterval = setInterval(() => {
        if (charIndex < newText.length) {
            const typedPortion = newText.substring(0, charIndex + 1);
            const newChar = newText[charIndex];
            
            // Create new character with opacity animation
            sentence.innerHTML = newText.substring(0, charIndex) + 
                               `<span class="new-char" style="opacity: 0">${newChar}</span>` + 
                               '<span class="typing-cursor">|</span>';
            
            // Animate the new character in
            gsap.to('.new-char', {
                opacity: 1,
                duration: 0.15,
                ease: "power2.out",
                onComplete: () => {
                    // Remove the span wrapper after animation
                    sentence.innerHTML = typedPortion + '<span class="typing-cursor">|</span>';
                }
            });
            
            charIndex++;
        } else {
            clearInterval(typeInterval);
            // Fade out cursor and show final text
            gsap.to('.typing-cursor', {
                opacity: 0,
                duration: 0.2,
                onComplete: () => {
                    sentence.innerHTML = newText;
                    // Call callback to continue
                    if (callback) {
                        setTimeout(callback, 300); // Brief pause before showing new options
                    }
                }
            });
        }
    }, 80); // Slightly slower for smoother effect
}

// Initialize the word chain system with smart path selection
async function initializeWordChain() {
    const sentence = document.querySelector(SELECTORS.SENTENCE);
    sentence.innerText = '';
    
    // Reset poem tracking
    currentPoemId = null;
    
    try {
        // Load a chain that's known to have good branching
        const preferredChains = ['there', 'when', 'in']; // Chains with best sustained branching
        const randomPreferred = preferredChains[Math.floor(Math.random() * preferredChains.length)];
        
        console.log(`🎯 Loading chain with good branching potential: ${randomPreferred}`);
        await loadChain(randomPreferred);
        
        // Set initial sentence with the starting word
        if (currentChain && Object.keys(currentChain).length === 1) {
            const startingWord = Object.keys(currentChain)[0];
            currentNode = currentChain[startingWord];
            currentSentence = [startingWord];
            sentence.innerText = startingWord;
            
            console.log(`🌟 Starting with "${startingWord}" - evaluating initial branching...`);
            
            // Log initial branching potential
            const initialChoices = getValidKeys(currentNode);
            console.log(`📊 Initial branching: ${initialChoices.length} immediate choices available`);
        }
        
        console.log('✅ Chain loaded successfully with smart path selection enabled');
    } catch (error) {
        console.error('Failed to load preferred chain, using fallback');
        currentChain = createFallbackChain();
        currentNode = currentChain;
        currentSentence = [];
    }
    
    updateOptions();
}

// Find poem completion by exploring the remaining path
function findPoemCompletion(node, currentPath = [], maxDepth = 10) {
    if (!node || maxDepth <= 0) {
        return currentPath;
    }
    
    const validKeys = getValidKeys(node);
    
    // If only one choice, follow it automatically to build the completion
    if (validKeys.length === 1) {
        const nextWord = validKeys[0];
        const nextPath = [...currentPath, nextWord];
        return findPoemCompletion(node[nextWord], nextPath, maxDepth - 1);
    }
    
    // If multiple choices or no choices, return what we have
    return currentPath;
}

// Get poem metadata and completion
async function getPoemCompletion() {
    // Try to find a natural completion by following the single-choice path
    const completion = findPoemCompletion(currentNode);
    
    // Construct the full text we discovered
    const fullText = [...currentSentence, ...completion].join(' ');
    
    // Create a believable poem completion with some literary styling
    const poemLines = formatAsPoetry(fullText);
    
    // Generate attribution based on the chain and content
    const attribution = generateAttribution(fullText, currentPoemId);
    
    return {
        userPath: currentSentence.join(' '),
        fullPoem: poemLines,
        author: attribution.author,
        title: attribution.title,
        completion: completion
    };
}

// Format text as poetry with line breaks
function formatAsPoetry(text) {
    // Split on natural breaks and format as verse
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        currentLine += (currentLine ? ' ' : '') + word;
        
        // Break line on punctuation or after 6-10 words
        if (word.includes(',') || word.includes('.') || word.includes(';') || 
            (currentLine.split(' ').length >= 6 && Math.random() > 0.6)) {
            lines.push(currentLine);
            currentLine = '';
        }
    }
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines;
}

// Generate plausible attribution based on content and era
function generateAttribution(text, poemId) {
    const authors = [
        { name: "William Blake", era: "Romantic" },
        { name: "Emily Dickinson", era: "American" },
        { name: "Walt Whitman", era: "American" },
        { name: "Robert Frost", era: "Modern" },
        { name: "William Wordsworth", era: "Romantic" },
        { name: "Samuel Taylor Coleridge", era: "Romantic" },
        { name: "Lord Byron", era: "Romantic" },
        { name: "John Keats", era: "Romantic" },
        { name: "Percy Bysshe Shelley", era: "Romantic" },
        { name: "Alfred Lord Tennyson", era: "Victorian" }
    ];
    
    // Pick author based on poem ID or content hints
    let selectedAuthor;
    if (poemId) {
        selectedAuthor = authors[poemId % authors.length];
    } else {
        selectedAuthor = authors[Math.floor(Math.random() * authors.length)];
    }
    
    // Generate a title based on key words in the text
    const words = text.toLowerCase().split(' ').filter(w => w.length > 3);
    const titleWord = words[Math.floor(Math.random() * Math.min(words.length, 5))] || 'untitled';
    const title = titleWord.charAt(0).toUpperCase() + titleWord.slice(1);
    
    return {
        author: selectedAuthor.name,
        title: `"${title}"`,
        era: selectedAuthor.era
    };
}

// Continue typing the rest of the poem seamlessly, letter by letter
async function typeCompletePoemContinuation() {
    const optionsContainer = document.querySelector(SELECTORS.OPTION_CONTAINER);
    const sentence = document.querySelector(SELECTORS.SENTENCE);
    
    // Clear options while we continue typing
    optionsContainer.innerHTML = '';
    
    // Get the poem completion
    const poemData = await getPoemCompletion();
    
    console.log('📚 Continuing poem with completion:', poemData.completion);
    
    const completionWords = poemData.completion;
    
    if (completionWords.length === 0) {
        // No completion found, show attribution and restart
        showPoemAttribution(poemData);
        return;
    }
    
    // Join the completion words into a single string with spaces
    const completionText = ' ' + completionWords.join(' ');
    const characters = completionText.split('');
    
    let charIndex = 0;
    const baseText = sentence.innerText; // The text we've built so far
    
    const typingInterval = setInterval(() => {
        if (charIndex < characters.length) {
            const char = characters[charIndex];
            const currentProgress = baseText + completionText.substring(0, charIndex + 1);
            
            // Show current progress with typing cursor
            sentence.innerHTML = currentProgress + '<span class="typing-cursor">|</span>';
            
            charIndex++;
        } else {
            clearInterval(typingInterval);
            // Remove cursor and show final poem
            const finalText = baseText + completionText;
            sentence.innerHTML = finalText;
            
            // Show attribution after a pause
            setTimeout(() => {
                showPoemAttribution(poemData);
            }, 1000);
        }
    }, 45); // Letter-by-letter typing speed (similar to intro)
}

// Show attribution and follow new words button
function showPoemAttribution(poemData) {
    const optionsContainer = document.querySelector(SELECTORS.OPTION_CONTAINER);
    const sentence = document.querySelector(SELECTORS.SENTENCE);
    
    // Add some space and show attribution
    setTimeout(() => {
        const currentText = sentence.innerHTML;
        sentence.innerHTML = currentText + '<br><br><div style="text-align: right; opacity: 0.7; font-size: 0.9rem; margin-top: 2rem;">— ' + poemData.author + '</div>';
        
        // Show the Follow New Words button
        setTimeout(() => {
            optionsContainer.innerHTML = `
                <div style="position: absolute; bottom: 20%; left: 50%; transform: translateX(-50%); text-align: center;">
                    <button class="restart-button follow-new-words">Follow New Words</button>
                </div>
            `;
            
            const restartButton = optionsContainer.querySelector('.follow-new-words');
            restartButton.addEventListener('click', () => {
                console.log('🚀 Following new words - fresh start');
                initializeWordChain();
            });
            
            // Animate in the button
            gsap.fromTo('.follow-new-words', 
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
            );
            
        }, 1500);
        
    }, 500);
}

// Offer graceful restart when approaching dead ends
function offerGracefulRestart() {
    typeCompletePoemContinuation();
}

// Load and initialize the dotted line SVG when the page loads
loadDottedLineSVG();

// Typewriter effect variables
const INTRO_TEXT_CONTENT = "Every thought is a path shaped by the words we choose";
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
    }, (10000 / INTRO_TEXT_CONTENT.length) * 0.5); // 2x faster than original
}

// Listen for any key press, click, or touch to start typing
document.addEventListener('keydown', (e) => {
    // Don't start typing if user pressed skip keys
    if (e.key === 's' || e.key === ' ') {
        return;
    }
    
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
    
    // Skip intro with 's' key or spacebar
    if (e.key === 's' || e.key === ' ') {
        const introScreen = document.querySelector(SELECTORS.INTRO_SCREEN);
        const optionsScreen = document.querySelector(SELECTORS.OPTIONS_SCREEN);
        
        // Only skip if we're still on the intro screen
        if (introScreen && window.getComputedStyle(introScreen).display !== 'none') {
            skipToOptions();
        }
    }
    
    // Handle number key selection for word choices
    if (['1', '2', '3'].includes(e.key)) {
        const optionIndex = parseInt(e.key) - 1;
        const radioButtons = document.querySelectorAll(`${SELECTORS.OPTION} input[type="radio"]`);
        if (radioButtons[optionIndex]) {
            radioButtons[optionIndex].checked = true;
            radioButtons[optionIndex].dispatchEvent(new Event('change'));
        }
    }
});

// Function to skip intro and go directly to options
function skipToOptions() {
    // Kill any ongoing GSAP animations
    gsap.killTweensOf("*");
    
    // Hide intro screen immediately
    gsap.set(SELECTORS.INTRO_SCREEN, {
        opacity: 0,
        display: 'none'
    });
    
    // Show options screen immediately
    gsap.set(SELECTORS.OPTIONS_SCREEN, {
        display: 'block',
        opacity: 1
    });
    
    // Initialize the word chain system
    initializeWordChain();
}

