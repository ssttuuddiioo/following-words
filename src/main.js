import './style.css';
import './main.css';
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
gsap.registerPlugin(ScrollToPlugin);

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

// SVG Stroke Animation System  
class SVGStrokeSystem {
    constructor() {
        this.container = document.getElementById('svg-background');
        this.currentSVG = null;
        this.svgNumbers = ['1', '2', '3', '4', '5', '6'];
        this.animatedPaths = [];
        
        this.initialize();
    }
    
    async initialize() {
        // Select random SVG
        const randomNumber = this.svgNumbers[Math.floor(Math.random() * this.svgNumbers.length)];
        await this.loadSVG(randomNumber);
    }
    
    async loadSVG(number) {
        try {
            console.log(`Loading SVG: ${number}.svg`);
            const response = await fetch(`/${number}.svg`);
            if (!response.ok) {
                throw new Error(`Failed to load ${number}.svg`);
            }
            const svgText = await response.text();
            this.container.innerHTML = svgText;
            
            // Get the loaded SVG and prepare it for animation
            this.currentSVG = this.container.querySelector('svg');
            if (this.currentSVG) {
                this.prepareSVGForAnimation();
            }
        } catch (error) {
            console.error('Error loading SVG:', error);
            this.createFallbackSVG();
        }
    }
    
    prepareSVGForAnimation() {
        // Find all path elements in the SVG
        const paths = this.currentSVG.querySelectorAll('path');
        
        paths.forEach((path, index) => {
            // Get path length for stroke animation
            const pathLength = path.getTotalLength();
            
            // Set initial state - path not drawn
            path.style.strokeDasharray = pathLength;
            path.style.strokeDashoffset = pathLength;
            path.style.stroke = 'white';
            path.style.strokeWidth = '3';
            path.style.strokeLinecap = 'round';
            path.style.strokeLinejoin = 'round';
            path.style.fill = 'none';
            path.style.filter = 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.3))';
            path.style.opacity = '0.8';
            
            this.animatedPaths.push({
                element: path,
                length: pathLength,
                progress: 0, // Track animation progress (0-100%)
                isErasing: false
            });
        });
        
        // Track overall progress
        this.totalProgress = 0;
        this.isErasing = false;
        
        console.log(`Prepared ${this.animatedPaths.length} paths for animation`);
    }

    
    animateOnChoice(choiceIndex) {
        if (this.animatedPaths.length === 0) return;
        
        // Advance progress by 5% per choice
        if (!this.isErasing) {
            this.totalProgress = Math.min(this.totalProgress + 5, 100);
            console.log(`SVG progress: ${this.totalProgress}%`);
            
            // If we've reached 100%, start erasing after a brief pause
            if (this.totalProgress >= 100) {
                setTimeout(() => {
                    this.startErasing();
                }, 800); // Brief pause before erasing
            }
        } else {
            // If erasing, advance erase progress by 3%
            this.totalProgress = Math.max(this.totalProgress - 3, 0);
            console.log(`SVG erase progress: ${100 - this.totalProgress}%`);
            
            // If fully erased, reset and start drawing again
            if (this.totalProgress <= 0) {
                this.isErasing = false;
                this.totalProgress = 5; // Start with first increment
            }
        }
        
        this.updatePathProgress();
    }
    
    updatePathProgress() {
        this.animatedPaths.forEach((pathData, index) => {
            const pathLength = pathData.length;
            
            if (!this.isErasing) {
                // Drawing mode: reduce strokeDashoffset to reveal stroke
                const targetOffset = pathLength * (1 - this.totalProgress / 100);
                
                gsap.to(pathData.element, {
                    strokeDashoffset: targetOffset,
                    duration: 0.8,
                    ease: "power2.out"
                });
            } else {
                // Erasing mode: increase strokeDashoffset to hide stroke from the end
                const currentProgress = this.totalProgress / 100;
                const targetOffset = pathLength * (1 - currentProgress);
                
                // For erasing, we want to hide from the end, so we adjust the dash array
                gsap.to(pathData.element, {
                    strokeDashoffset: targetOffset,
                    duration: 0.8,
                    ease: "power2.out"
                });
            }
        });
    }
    
    startErasing() {
        console.log('Starting erase animation');
        this.isErasing = true;
        this.totalProgress = 97; // Start erasing from nearly complete (100% - 3%)
        this.updatePathProgress();
    }
    
    createFallbackSVG() {
        // Create a simple fallback SVG if loading fails
        const fallbackSVG = `
            <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 250 Q 100 150 150 200 T 250 150 Q 300 100 350 150" 
                      stroke="white" stroke-width="3" fill="none" 
                      stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        this.container.innerHTML = fallbackSVG;
        this.currentSVG = this.container.querySelector('svg');
        this.prepareSVGForAnimation();
    }
    
    reset() {
        // Reset all paths and reload a new random SVG
        this.animatedPaths = [];
        this.totalProgress = 0;
        this.isErasing = false;
        this.initialize();
    }
    
    // Legacy method name compatibility
    growFromChoice(choiceIndex, wordChosen) {
        this.animateOnChoice(choiceIndex);
    }
    

}

// Initialize SVG system
let svgStrokeSystem = null;

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
    
    // Step 1: "following" appears (faster timing)
    storyTimeline.to(SELECTORS.FOLLOWING, {
        opacity: 1,
        duration: 0.2, // Faster: was 0.3
        ease: "power2.out"
    }, 0.07); // Earlier start
    
    // Step 2: Make SVG container visible and start path drawing
    storyTimeline.to(SELECTORS.DOTTED_LINE_CONTAINER, {
        opacity: 1,
        duration: 0.15, // Faster: was 0.2
        ease: "power2.out"
    }, 0.27);
    
    // Phase 1: Path draws in completely (faster)
    storyTimeline.to(path, {
        strokeDashoffset: 0, // Draw to 100%
        duration: 1.07, // Faster: was 1.6 (1.6/1.5 = 1.07)
        ease: "none" // Linear, constant speed
    }, 0.27);
    
    // Step 3: "words" appears earlier
    storyTimeline.to(SELECTORS.WORDS, {
        opacity: 1,
        duration: 0.2, // Faster: was 0.3
        ease: "power2.out"
    }, 1.07);
    
    // Fade out "following" (faster)
    storyTimeline.to(SELECTORS.FOLLOWING, {
        opacity: 0,
        duration: 0.53, // Faster: was 0.8
        ease: "power2.inOut"
    }, 1.33);
    
    // Step 4: "words" fades out (faster)
    storyTimeline.to(SELECTORS.WORDS, {
        opacity: 0,
        duration: 0.4, // Faster: was 0.6
        ease: "power2.inOut"
    }, 1.87);
    
    // Phase 2: Un-draw the path back to invisible (faster)
    storyTimeline.to(path, {
        strokeDashoffset: -pathLength, // slide dash to hide line again
        duration: 0.8, // Faster: was 1.2
        ease: "none"
    }, 1.87);
    
    // Step 5: SVG container fades out (faster)
    storyTimeline.to(SELECTORS.DOTTED_LINE_CONTAINER, {
        opacity: 0,
        duration: 0.2, // Faster: was 0.3
        ease: "power2.inOut"
    }, 2.67);
    
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
    
    // Third: Preload word chain BEFORE transitioning (faster timing)
    transitionTimeline.add(() => {
        // Start loading the word chain during the animation
        initializeWordChain();
    }, 2.87) // Faster: was 4.3 (4.3/1.5 = 2.87)
    
    // Fourth: Transition to next screen with overlapping fade (faster)
    .to(SELECTORS.INTRO_SCREEN, {
        opacity: 0,
        duration: 0.4, // Faster: was 0.6
        ease: "power2.inOut",
        onComplete: () => {
            gsap.set(SELECTORS.INTRO_SCREEN, { display: 'none' });
        }
    }, 3.0) // Faster: was 4.5 (4.5/1.5 = 3.0)
    .to(SELECTORS.OPTIONS_SCREEN, {
        display: 'block',
        opacity: 1,
        duration: 0.53, // Faster: was 0.8
        ease: "power3.out"
    }, 3.13); // Faster: was 4.7 (4.7/1.5 = 3.13)
});

function createOptionSet(choices) {
    // returns three options without inline positioning; container handles layout
    return choices.map((choice, index) => `
        <div class="option">
            <input type="radio" name="option" value="${choice}" id="option${index + 1}" data-keycode="${index + 1}" />
            <label for="option${index + 1}">${choice}</label>
            <span class="option-number">${index + 1}</span>
        </div>
    `).join('');
}


async function updateOptions() {
    const optionsContainer = document.querySelector(SELECTORS.OPTION_CONTAINER);
    const sentence = document.querySelector(SELECTORS.SENTENCE);
    console.log('🔄 updateOptions invoked | current sentence:"' + sentence.innerText + '" opacity:' , window.getComputedStyle(sentence).opacity);
    // Initialize chain if not loaded
    if (!currentChain) {
        await initializeWordChain();
    }
    
    // Get current word choices
    const choices = getCurrentOptions();
    console.log('🎲 Choices this step:', choices);
    
    if (choices.length === 0 || choices.every(choice => choice.startsWith('[') || choice === '...' || choice === '—')) {
        // End of chain reached - continue typing the rest
        console.log('🏁 Natural conclusion reached - continuing poem');
        typeCompletePoemContinuation();
        return;
    }
    
    // Fade out existing options first (only if there are actual options to fade out)
    const existingOptions = optionsContainer.children;
    const hasExistingOptions = existingOptions.length > 0 && 
                               [...existingOptions].some(option => option.querySelector && option.querySelector('input[type="radio"]'));
    
    if (hasExistingOptions) {
        await new Promise(resolve => {
            gsap.to(existingOptions, {
                opacity: 0,
                y: -8,
                duration: 0.25,
                stagger: 0.02,
                ease: "power2.in",
                onComplete: () => {
                    // Create new options after fadeout completes
                    optionsContainer.innerHTML = createOptionSet(choices);
                    resolve();
                }
            });
        });
    } else {
        // Create new options immediately if no existing ones
        optionsContainer.innerHTML = createOptionSet(choices);
    }

    // Reveal sentence only if we actually have text to show (avoid empty flash)
    if ((sentence.style.opacity === '0' || sentence.style.opacity === '') && sentence.innerText.trim().length > 0) {
        console.log('👁️ Revealing sentence now — text:', sentence.innerText);
        gsap.to(sentence, { 
            opacity: 1, 
            duration: 0.4, 
            ease: 'power2.out',
            delay: hasExistingOptions ? 0.05 : 0 // Minimal delay for smoother flow
        });
    } else if (sentence.innerText.trim().length === 0) {
        console.log('🚫 Skip reveal — sentence still empty, will be shown after first word typed');
    }
    
    console.log('💬 options_container rect', optionsContainer.getBoundingClientRect());
    // Fade in new options with stagger effect (or immediately if this is initial load)
    const newOptions = optionsContainer.children;
    
    // Always animate in new options (whether it's first load or subsequent)
    if (newOptions.length > 0) {
        gsap.fromTo(newOptions,
            { opacity: 0, y: 15 },
            { 
                opacity: 1, 
                y: 0, 
                duration: 0.6, 
                stagger: 0.08, 
                ease: "power2.out"
            }
        );
    }
    
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
                // Trigger SVG animation based on choice
                if (svgStrokeSystem) {
                    const choiceIndex = [...options].indexOf(option);
                    svgStrokeSystem.growFromChoice(choiceIndex, selectedWord);
                }
                
                // Animate option fade-out sequence, then type the selected word
                const allOpts = [...optionsContainer.querySelectorAll(SELECTORS.OPTION)];
                const otherOpts = allOpts.filter(o => o !== option);

                gsap.timeline()
                    .to(otherOpts, {
                        opacity: 0,
                        duration: 0.15,
                        stagger: 0.02,
                        ease: 'power2.in'
                    })
                    .to(option, {
                        opacity: 0,
                        duration: 0.2,
                        ease: 'power2.in',
                        onStart: () => {
                            typeWordToSentence(selectedWord, () => {
                                // Check future branching potential
                                const futureChoices = getValidKeys(nextNode);
                                if (futureChoices.length <= 1 && currentSentence.length >= 4) {
                                    console.log('🔄 Low branching ahead - offering restart to maintain choices');
                                    offerGracefulRestart();
                                } else {
                                    updateOptions();
                                }
                            }, true); // skipOptionFade: we already faded options
                        }
                    });
            } else {
                // Dead end reached (no next node)
                typeWordToSentence(selectedWord, () => {
                    updateOptions(); // This will trigger completion
                }, true);
            }
        });
    });
}

// Simplified and robust typing animation for selected words
function typeWordToSentence(word, callback, skipOptionFade = false) {
    const sentence = document.querySelector(SELECTORS.SENTENCE);
    console.log('⌨️ Typing started for word:', word, '| existing text:', sentence.innerText);
    const currentText = sentence.innerText.replace(/\|/g, ''); // Clean any leftover cursors
    const textToType = currentText ? ` ${word}` : word;
    
    // Ensure the sentence is visible
    gsap.set(sentence, { autoAlpha: 1 });
    
    // Clear options with a fade-out effect (unless caller already handled it)
    const optionsContainer = document.querySelector(SELECTORS.OPTION_CONTAINER);
    if (!skipOptionFade && optionsContainer.children.length > 0) {
        gsap.to(optionsContainer.children, {
            opacity: 0,
            duration: 0.2,
            onComplete: () => {
                optionsContainer.innerHTML = '';
            }
        });
    } else {
        // Caller will clean up or no options to clear
        optionsContainer.innerHTML = '';
    }
    
    let i = 0;
    const typeInterval = setInterval(() => {
        if (i < textToType.length) {
            sentence.innerHTML = currentText + textToType.substring(0, i + 1) + '<span class="typing-cursor">|</span>';
            i++;
        } else {
            clearInterval(typeInterval);
            // Remove cursor and finalize the sentence
            sentence.innerHTML = currentText + textToType;
            console.log('✅ Typing finished. New sentence text:', sentence.innerText);
            if (callback) {
                setTimeout(callback, 200); // Brief pause before next action
            }
        }
    }, 60); // Typing speed
}

// Initialize the word chain system with smart path selection
async function initializeWordChain() {
    const sentence = document.querySelector(SELECTORS.SENTENCE);
    
    // Initialize SVG system if not already created
    if (!svgStrokeSystem) {
        svgStrokeSystem = new SVGStrokeSystem();
    }
    
    // Prepare sentence element with smooth transition
    gsap.set(sentence, { opacity: 0 });
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
            // Prepare the sentence text (keep hidden until options ready)
            sentence.innerText = startingWord;
            console.log('📃 Initial sentence text set (hidden):', sentence.innerText);
            // We reveal the sentence later in updateOptions to avoid any flash
            
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

// Track how many poems have been generated
let poemCounter = 0;

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

// Generate attribution – first two poems get known authors in sequence
function generateAttribution(text, poemId) {
    // NOTE: Previously this function assigned random historical authors.
    // To ensure accuracy we now label poems as "Anonymous" unless we have
    // explicit metadata for the author embedded in the chain (not yet available).

    // Use the first few significant words for a generic title
    const words = text.split(/\s+/).filter(w => w.length > 3);
    const titleCore = words.slice(0, 3).join(' ').trim();
    const title = titleCore ? `\"${titleCore.replace(/^./, c => c.toUpperCase())}\"` : "Untitled";

    return {
        author: "",
        title,
        era: ""
    };
}

// Continue typing the rest of the poem seamlessly, letter by letter
async function typeCompletePoemContinuation() {
    const optionsContainer = document.querySelector(SELECTORS.OPTION_CONTAINER);
    const sentence = document.querySelector(SELECTORS.SENTENCE);
    
    // Clear options while we continue typing
    gsap.to(optionsContainer.children, {
        opacity: 0,
        duration: 0.2,
        onComplete: () => {
            optionsContainer.innerHTML = '';
        }
    });
    
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
            
            // Immediately start smooth transition to attribution and new poem (no pause)
            showPoemAttribution(poemData);
        }
    }, 45); // Letter-by-letter typing speed (similar to intro)
}

// Show attribution and then slide poem up and reset for new poem
function showPoemAttribution(poemData) {
    console.log('🎤 showPoemAttribution → author:', poemData.author, '| title:', poemData.title);
    
    const sentence = document.querySelector(SELECTORS.SENTENCE);
    const optionsContainer = document.querySelector(SELECTORS.OPTION_CONTAINER);
    
    // Create smooth transition timeline for attribution and new poem setup
    const attributionTimeline = gsap.timeline();
    
    // Phase 1: Fade in attribution smoothly (starts immediately after typing)
    attributionTimeline.add(() => {
        const currentHTML = sentence.innerHTML;
        const poemLine = currentHTML.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').trim();
        const query = encodeURIComponent(`${poemLine} poem`);
        const searchUrl = `https://www.google.com/search?q=${query}`;
        const attributionHTML = '<a href="' + searchUrl + '" target="_blank" rel="noopener noreferrer" style="color:inherit; text-decoration:underline;">Follow this thought</a>';
        sentence.innerHTML = currentHTML + '<br><br><div class="attribution-link" style="text-align:center; opacity:0; font-size:0.9rem; margin-top:1rem;">' + attributionHTML + '</div>';
        
        // Animate attribution fade-in
        gsap.to('.attribution-link', {
            opacity: 0.8,
            duration: 0.6,
            ease: "power2.out"
        });
    }, 0)
    
    // Phase 2: Simultaneously start new poem creation and slide transition (no pause)
    .add(() => {
        // Convert current elements to finished state
        sentence.classList.remove('sentence');
        sentence.classList.add('finished-sentence');
        optionsContainer.classList.remove('options_container');
        optionsContainer.classList.add('finished-options');
        
        // Create new poem elements
        const newElements = createNewPoemElements();
        
        // Simultaneous animations for smooth transition with vertical stacking
        const transitionTL = gsap.timeline();
        
        // Instead of sliding up with transform, just fade the old poem and keep it in document flow
        transitionTL.to([sentence, optionsContainer], {
            opacity: 0.8, // Fade but keep visible for scrolling
            duration: 0.6,
            ease: "power2.inOut",
            onComplete: () => {
                // Scroll to the new poem smoothly after old one fades
                const newSentence = newElements[0];
                if (newSentence) {
                    newSentence.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center'
                    });
                }
            }
        }, 0)
        
        // Fade in new poem elements at the same time
        .fromTo(newElements, {
            opacity: 0,
            y: 20
        }, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out"
        }, 0.2) // Slight delay for smoother feel
        
        // Initialize word chain as transition completes
        .add(() => {
            poemCounter++;
            // Reset SVG system for new poem if we have several poems
            if (poemCounter > 2 && svgStrokeSystem) {
                svgStrokeSystem.reset();
            }
            initializeWordChain();
        }, 0.4); // Start initialization slightly before transition ends
        
    }, 0.8); // Start transition 0.8s after attribution appears
}

// Create new poem elements and return them for animation
function createNewPoemElements() {
    const optionsScreen = document.querySelector(SELECTORS.OPTIONS_SCREEN);
    
    // Create new poem elements that will stack naturally in document flow
    const newSentence = document.createElement('div');
    newSentence.className = 'sentence';
    newSentence.innerHTML = '';
    
    const newOptionsContainer = document.createElement('div');
    newOptionsContainer.className = 'options_container';
    newOptionsContainer.innerHTML = '';
    
    // Add new elements to the screen (they will stack below previous poems)
    optionsScreen.appendChild(newSentence);
    optionsScreen.appendChild(newOptionsContainer);
    
    // Set initial state for animation (no transform positioning needed)
    gsap.set([newSentence, newOptionsContainer], {
        opacity: 0,
        y: 20, // Small offset for smooth fade-in animation
        zIndex: 1000 // Ensure new elements appear above finished ones during creation
    });
    
    return [newSentence, newOptionsContainer];
}

// This function is no longer needed - poems now reset in place

// Offer graceful restart when approaching dead ends
function offerGracefulRestart() {
    typeCompletePoemContinuation();
}

// Load and initialize the dotted line SVG when the page loads
loadDottedLineSVG();

// Typewriter effect variables
const INTRO_TEXT_CONTENT = "Every thought is a path shaped by\nthe words we choose";
let typingStarted = false;

// Typewriter animation function
function startTypewriterEffect() {
    if (typingStarted) return;
    typingStarted = true;
    
    // Hide initial cursor and show typing container with smooth transition
    const transitionTimeline = gsap.timeline();
    
    transitionTimeline
        .to(SELECTORS.CURSOR_CONTAINER, {
            opacity: 0,
            duration: 0.2, // Faster: was 0.3
            ease: "power2.out"
        })
        .set(SELECTORS.CURSOR_CONTAINER, { display: 'none' })
        .set(SELECTORS.INTRO_TEXT, { display: 'block', opacity: 0 })
        .to(SELECTORS.INTRO_TEXT, {
            opacity: 1,
            duration: 0.25, // Faster: was 0.4
            ease: "power2.out"
        }, "-=0.05"); // Tighter timing
    
    // Smooth letter-by-letter fade-in effect with leading cursor
    const typedTextElement = document.querySelector(SELECTORS.TYPED_TEXT);
    const typingCursor = document.querySelector(SELECTORS.TYPING_CURSOR);
    const characters = INTRO_TEXT_CONTENT.split('');
    let currentIndex = 0;
    
    // Function to rebuild text with cursor in the correct position
    function updateTextWithCursor() {
        typedTextElement.innerHTML = '';
        
        // Add revealed letters
        for (let i = 0; i < currentIndex; i++) {
            const char = characters[i];
            if (char === '\n') {
                typedTextElement.appendChild(document.createElement('br'));
            } else {
                const span = document.createElement('span');
                span.textContent = char;
                span.style.opacity = '1';
                span.classList.add('letter-revealed');
                typedTextElement.appendChild(span);
            }
        }
        
        // Add cursor at current position (leading the next letter)
        if (currentIndex < characters.length) {
            typedTextElement.appendChild(typingCursor);
        }
        
        // Add unrevealed letters (hidden but maintaining layout)
        for (let i = currentIndex; i < characters.length; i++) {
            const char = characters[i];
            if (char === '\n') {
                typedTextElement.appendChild(document.createElement('br'));
            } else {
                const span = document.createElement('span');
                span.textContent = char;
                span.style.opacity = '0';
                span.style.visibility = 'hidden';
                span.classList.add('letter-unrevealed');
                typedTextElement.appendChild(span);
            }
        }
        
        // If all letters are revealed, add cursor at the end
        if (currentIndex >= characters.length) {
            typedTextElement.appendChild(typingCursor);
        }
    }
    
    // Initial setup
    updateTextWithCursor();
    
    // Animate letters appearing with smooth fade
    const revealInterval = setInterval(() => {
        if (currentIndex < characters.length) {
            currentIndex++;
            
            // Update the text structure with cursor in new position
            updateTextWithCursor();
            
            // Animate the newly revealed letter
            const revealedLetters = typedTextElement.querySelectorAll('.letter-revealed');
            if (revealedLetters.length > 0) {
                const lastRevealed = revealedLetters[revealedLetters.length - 1];
                lastRevealed.style.opacity = '0';
                lastRevealed.style.transition = 'opacity 0.4s ease-out';
                
                // Trigger fade in
                setTimeout(() => {
                    lastRevealed.style.opacity = '1';
                }, 10);
            }
        } else {
            clearInterval(revealInterval);
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
            }, 200);
        }
    }, (10000 / characters.length) * 0.33); // 1.5x faster (was 0.5, now 0.33)
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
async function skipToOptions() {
    // Kill any ongoing GSAP animations
    gsap.killTweensOf("*");
    
    // Create smooth skip transition
    const skipTimeline = gsap.timeline();
    
    // Fade out intro screen
    skipTimeline.to(SELECTORS.INTRO_SCREEN, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.inOut",
        onComplete: () => {
            gsap.set(SELECTORS.INTRO_SCREEN, { display: 'none' });
        }
    });
    
    // Initialize word chain during fade
    skipTimeline.add(async () => {
        await initializeWordChain();
    }, 0.1);
    
    // Fade in options screen
    skipTimeline.to(SELECTORS.OPTIONS_SCREEN, {
        display: 'block',
        opacity: 1,
        duration: 0.4,
        ease: "power2.out"
    }, 0.2);
}

// GSAP Animated Gradient Background
class GradientBackground {
    constructor() {
        this.initializeGradientAnimation();
    }
    
    initializeGradientAnimation() {
        // Define gradient states
        const gradientState1 = "linear-gradient(217deg, rgba(255,100,150,.7), rgba(255,100,150,0) 70.71%), linear-gradient(127deg, rgba(100,200,255,.8), rgba(100,200,255,0) 70.71%), linear-gradient(336deg, rgba(255,200,100,.6), rgba(255,200,100,0) 70.71%)";
        
        const gradientState2 = "linear-gradient(45deg, rgba(150,100,255,.8), rgba(150,100,255,0) 70.71%), linear-gradient(200deg, rgba(100,255,150,.7), rgba(100,255,150,.1) 70.71%), linear-gradient(320deg, rgba(255,150,200,.9), rgba(255,150,200,0.2) 70.71%)";
        
        const gradientState3 = "linear-gradient(120deg, rgba(255,200,100,.6), rgba(255,200,100,0) 70.71%), linear-gradient(300deg, rgba(100,150,255,.8), rgba(100,150,255,0) 70.71%), linear-gradient(60deg, rgba(200,255,150,.7), rgba(200,255,150,0) 70.71%)";
        
        const gradientState4 = "linear-gradient(180deg, rgba(200,100,255,.7), rgba(200,100,255,0) 70.71%), linear-gradient(80deg, rgba(255,180,100,.6), rgba(255,180,100,0) 70.71%), linear-gradient(270deg, rgba(100,255,200,.8), rgba(100,255,200,0) 70.71%)";
        
        // Create the animation timeline
        const gradientTimeline = gsap.timeline({
            repeat: -1,
            yoyo: false,
            ease: "none"
        });
        
        // Chain the gradient animations
        gradientTimeline
            .set("#gradient-background", { background: gradientState1 })
            .to("#gradient-background", { 
                duration: 16, 
                background: gradientState2,
                ease: "power2.inOut"
            })
            .to("#gradient-background", { 
                duration: 16, 
                background: gradientState3,
                ease: "power2.inOut"
            })
            .to("#gradient-background", { 
                duration: 16, 
                background: gradientState4,
                ease: "power2.inOut"
            })
            .to("#gradient-background", { 
                duration: 16, 
                background: gradientState1,
                ease: "power2.inOut"
            });
        
        // Add subtle opacity pulsing
        gsap.to("#gradient-background", {
            opacity: 0.6,
            duration: 8,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }
}

// Initialize the gradient background animation
document.addEventListener('DOMContentLoaded', () => {
    new GradientBackground();
});

