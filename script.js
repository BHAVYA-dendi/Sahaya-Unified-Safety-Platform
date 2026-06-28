// =======================
// SAHAYA NATIONAL SAFETY PLATFORM
// Complete Single Page Application with Backend API
// =======================

// API Configuration
const API_BASE_URL ='https://sahaya-unified-safety-platform.onrender.com/api';

// API Helper Functions
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('sahaya_token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }
    
    return data;
}

async function apiGet(endpoint) {
    return apiRequest(endpoint, { method: 'GET' });
}

async function apiPost(endpoint, body) {
    return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

async function apiPut(endpoint, body) {
    return apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body)
    });
}

async function apiDelete(endpoint) {
    return apiRequest(endpoint, { method: 'DELETE' });
}

// Global Variables
let currentUser = null;
let registrationData = {};
let currentRegistrationStep = 1;
let sosTimer = null;
let isRecording = false;
let sosActive = false;
let sosTimeoutId = null;

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupSOSButtons();
    setupPortalCards();
    setupPasswordStrength();
    requestNotificationPermission();
});

function initializeApp() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('themeToggle');

    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeToggle) themeToggle.innerHTML = '🌙 Dark Mode';
    } else {
        document.body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
        if (themeToggle) themeToggle.innerHTML = '☀️ Light Mode';
    }
    // Check if user is already logged in
    const savedUser = localStorage.getItem('sahaya_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        
        // Check URL hash for direct screen navigation
        const hash = window.location.hash.replace('#', '');
        if (hash && document.getElementById(hash)) {
            showScreen(hash);
        } else {
            showScreen('dashboardScreen');
            loadDashboard();
        }
    }
    
    // Add emergency styles
    addEmergencyStyles();
}

// =======================
// SCREEN MANAGEMENT
// =======================
function showScreen(screenId) {
    // Hide all screens - both class and inline style
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
        screen.style.display = 'none';
    });
    
    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        targetScreen.style.display = 'block';
        
        // Initialize screen-specific content
        initializeScreen(screenId);
    }
}

function initializeScreen(screenId) {
    switch(screenId) {
        case 'dashboardScreen':
            loadDashboard();
            break;
        case 'womenScreen':
            loadWomenSafety();
            break;
        case 'childScreen':
            loadChildSafety();
            break;
        case 'elderlyScreen':
            loadElderlySafety();
            break;
        case 'disasterScreen':
            loadDisasterAlerts();
            break;
        case 'healthScreen':
            loadHealthEmergency();
            break;
        case 'profileScreen':
            loadProfile();
            break;
    }
}

// =======================
// AUTHENTICATION
// =======================
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Validate email format
    if (!validateEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    // Validate password is not empty
    if (!password) {
        showNotification('Please enter your password', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showNotification(data.message || 'Login failed', 'error');
            return;
        }
        
        // Store token and user data
        localStorage.setItem('sahaya_token', data.token);
        localStorage.setItem('sahaya_user', JSON.stringify(data.user));
        currentUser = data.user;
        
        showNotification('Login successful! Welcome back!', 'success');
        showScreen('dashboardScreen');
        loadDashboard();
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please try again.', 'error');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('sahaya_token');
    localStorage.removeItem('sahaya_user');
    showNotification('Logged out successfully', 'success');
    showScreen('welcomeScreen');
}

// =======================
// REGISTRATION FLOW
// =======================
function nextRegistrationStep(step) {
    // Validate current step
    if (!validateRegistrationStep(currentRegistrationStep)) {
        return;
    }
    
    // Save current step data
    saveRegistrationData(currentRegistrationStep);
    
    // Update progress bar
    updateProgressBar(currentRegistrationStep, 'completed');
    updateProgressBar(step, 'active');
    
    // Show next screen
    const screenMap = {
        1: 'registrationScreen',
        2: 'addressScreen',
        3: 'identityScreen',
        4: 'emergencyScreen',
        5: 'familyScreen',
        6: 'portalScreen',
        7: 'reviewScreen'
    };
    
    showScreen(screenMap[step]);
    currentRegistrationStep = step;
    
    // Load review data if going to review step
    if (step === 7) {
        loadReviewData();
    }
}

function validateRegistrationStep(step) {
    switch(step) {
        case 1: // Basic Details
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const dob = document.getElementById('dob').value;
            const gender = document.getElementById('gender').value;
            
            if (!firstName || !lastName || !dob || !gender) {
                showNotification('Please fill all required fields', 'error');
                return false;
            }
            break;
            
        case 2: // Address & Contact
            const houseNo = document.getElementById('houseNo').value.trim();
            const street = document.getElementById('street').value.trim();
            const city = document.getElementById('city').value.trim();
            const state = document.getElementById('state').value.trim();
            const pinCode = document.getElementById('pinCode').value.trim();
            const phoneNumber = document.getElementById('phoneNumber').value.trim();
            const email = document.getElementById('email').value.trim();
            
            if (!houseNo || !street || !city || !state || !pinCode || !phoneNumber || !email) {
                showNotification('Please fill all required fields', 'error');
                return false;
            }
            
            if (!validateEmail(email)) {
                showNotification('Please enter a valid email address', 'error');
                return false;
            }
            
            if (!validatePhone(phoneNumber)) {
                showNotification('Please enter a valid 10-digit phone number', 'error');
                return false;
            }
            
            if (!validatePinCode(pinCode)) {
                showNotification('Please enter a valid 6-digit PIN code', 'error');
                return false;
            }

            // Password validation
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (!password || !confirmPassword) {
                showNotification('Password and confirm password are required', 'error');
                return false;
            }

            const passwordValidation = validatePassword(password);
            if (!passwordValidation.valid) {
                showNotification(passwordValidation.message, 'error');
                return false;
            }

            if (password !== confirmPassword) {
                showNotification('Passwords do not match', 'error');
                return false;
            }
            break;
            
        case 3: // Identity Verification
            const aadhaarNumber = document.getElementById('aadhaarNumber').value.trim();
            
            if (!aadhaarNumber) {
                showNotification('Aadhaar number is required', 'error');
                return false;
            }
            
            if (!validateAadhaar(aadhaarNumber)) {
                showNotification('Please enter a valid 12-digit Aadhaar number', 'error');
                return false;
            }
            break;
            
        case 4: // Emergency Contacts
            const contact1Name = document.getElementById('contact1Name').value.trim();
            const contact1Relation = document.getElementById('contact1Relation').value;
            const contact1Phone = document.getElementById('contact1Phone').value.trim();
            
            if (!contact1Name || !contact1Relation || !contact1Phone) {
                showNotification('Primary emergency contact details are required', 'error');
                return false;
            }
            
            if (!validatePhone(contact1Phone)) {
                showNotification('Please enter a valid 10-digit phone number for primary contact', 'error');
                return false;
            }
            
            // Validate secondary contact
            const contact2Name = document.getElementById('contact2Name').value.trim();
            const contact2Phone = document.getElementById('contact2Phone').value.trim();
            const contact2Relation = document.getElementById('contact2Relation').value;
            
            if (!contact2Name || !contact2Phone || !contact2Relation) {
                showNotification('Secondary emergency contact is required', 'error');
                return false;
            }

            if (!validatePhone(contact2Phone)) {
                showNotification('Please enter a valid 10-digit phone number for secondary contact', 'error');
                return false;
            }
            
            // Validate additional contacts if any
            const additionalContacts = document.querySelectorAll('.additional-contact');
            for (let i = 0; i < additionalContacts.length; i++) {
                const contact = additionalContacts[i];
                const name = contact.querySelector('.contact-name').value.trim();
                const phone = contact.querySelector('.contact-phone').value.trim();
                const relation = contact.querySelector('.contact-relation').value;
                
                if (name || phone || relation) {
                    if (!name || !phone || !relation) {
                        showNotification(`Please complete all fields for additional contact ${i + 1}`, 'error');
                        return false;
                    }
                    if (!validatePhone(phone)) {
                        showNotification(`Please enter a valid phone number for additional contact ${i + 1}`, 'error');
                        return false;
                    }
                }
            }
            break;
            
        case 5: // Family Details
            const numChildren = document.getElementById('numChildren')?.value || '0';
            const numElderly = document.getElementById('numElderly')?.value || '0';
            
            // Save family counts
            registrationData.numChildren = parseInt(numChildren);
            registrationData.numElderly = parseInt(numElderly);
            
            // Collect children details if any
            registrationData.children = [];
            if (parseInt(numChildren) > 0) {
                for (let i = 1; i <= parseInt(numChildren); i++) {
                    const name = document.getElementById(`child${i}Name`)?.value?.trim() || '';
                    const age = document.getElementById(`child${i}Age`)?.value || '';
                    const gender = document.getElementById(`child${i}Gender`)?.value || '';
                    
                    if (name && age && gender) {
                        registrationData.children.push({ name, age, gender, type: 'child' });
                    }
                }
            }
            
            // Collect elderly details if any
            registrationData.elderly = [];
            if (parseInt(numElderly) > 0) {
                for (let i = 1; i <= parseInt(numElderly); i++) {
                    const name = document.getElementById(`elderly${i}Name`)?.value?.trim() || '';
                    const age = document.getElementById(`elderly${i}Age`)?.value || '';
                    const gender = document.getElementById(`elderly${i}Gender`)?.value || '';
                    
                    if (name && age && gender) {
                        registrationData.elderly.push({ name, age, gender, type: 'elderly' });
                    }
                }
            }
            break;
            
        case 6: // Portal Selection
            const selectedPortals = document.querySelectorAll('.portal-checkbox:checked');
            if (selectedPortals.length === 0) {
                showNotification('Please select at least one safety portal', 'error');
                return false;
            }
            
            // Check elderly role if elderly portal is selected
            const elderlyCheckbox = document.querySelector('input[value="elderly"]:checked');
            if (elderlyCheckbox) {
                const elderRole = document.getElementById('elderRole').value;
                if (!elderRole) {
                    showNotification('Please select your role for Elderly Safety Portal', 'error');
                    return false;
                }
            }
            break;
    }
    
    return true;
}

function saveRegistrationData(step) {
    switch(step) {
        case 1: // Basic Details
            registrationData.firstName = document.getElementById('firstName').value.trim();
            registrationData.lastName = document.getElementById('lastName').value.trim();
            registrationData.dob = document.getElementById('dob').value;
            registrationData.gender = document.getElementById('gender').value;
            registrationData.profilePhoto = document.getElementById('photoPreview').querySelector('img')?.src || '';
            break;
            
        case 2: // Address & Contact
            registrationData.houseNo = document.getElementById('houseNo').value.trim();
            registrationData.street = document.getElementById('street').value.trim();
            registrationData.city = document.getElementById('city').value.trim();
            registrationData.state = document.getElementById('state').value.trim();
            registrationData.pinCode = document.getElementById('pinCode').value.trim();
            registrationData.phoneNumber = document.getElementById('phoneNumber').value.trim();
            registrationData.email = document.getElementById('email').value.trim();
            registrationData.password = document.getElementById('password').value;
            break;
            
        case 3: // Identity Verification
            registrationData.aadhaarNumber = document.getElementById('aadhaarNumber').value.trim();
            registrationData.aadhaarPhoto = document.getElementById('aadhaarPreview').querySelector('img')?.src || '';
            registrationData.medicalInfo = document.getElementById('medicalInfo').value.trim();
            break;
            
        case 4: // Emergency Contacts
            registrationData.emergencyContacts = [{
                name: document.getElementById('contact1Name').value.trim(),
                relation: document.getElementById('contact1Relation').value,
                phone: document.getElementById('contact1Phone').value.trim()
            }];
            
            const contact2Name = document.getElementById('contact2Name').value.trim();
            if (contact2Name) {
                registrationData.emergencyContacts.push({
                    name: contact2Name,
                    relation: document.getElementById('contact2Relation').value,
                    phone: document.getElementById('contact2Phone').value.trim()
                });
            }
            
            // Save additional contacts
            const additionalContacts = document.querySelectorAll('.additional-contact');
            additionalContacts.forEach(contact => {
                const name = contact.querySelector('.contact-name').value.trim();
                const phone = contact.querySelector('.contact-phone').value.trim();
                const relation = contact.querySelector('.contact-relation').value;
                
                if (name && phone && relation) {
                    registrationData.emergencyContacts.push({
                        name: name,
                        relation: relation,
                        phone: phone
                    });
                }
            });
            
            console.log('Emergency contacts saved:', registrationData.emergencyContacts);
            break;
            
        case 5: // Family Details
            const numChildren = document.getElementById('numChildren')?.value || '0';
            const numElderly = document.getElementById('numElderly')?.value || '0';
            
            registrationData.numChildren = parseInt(numChildren);
            registrationData.numElderly = parseInt(numElderly);
            
            // Collect children details if any
            registrationData.children = [];
            if (parseInt(numChildren) > 0) {
                for (let i = 1; i <= parseInt(numChildren); i++) {
                    const name = document.getElementById(`child${i}Name`)?.value?.trim() || '';
                    const age = document.getElementById(`child${i}Age`)?.value || '';
                    const gender = document.getElementById(`child${i}Gender`)?.value || '';
                    
                    if (name && age && gender) {
                        registrationData.children.push({ name, age, gender, type: 'child' });
                    }
                }
            }
            
            // Collect elderly details if any
            registrationData.elderly = [];
            if (parseInt(numElderly) > 0) {
                for (let i = 1; i <= parseInt(numElderly); i++) {
                    const name = document.getElementById(`elderly${i}Name`)?.value?.trim() || '';
                    const age = document.getElementById(`elderly${i}Age`)?.value || '';
                    const gender = document.getElementById(`elderly${i}Gender`)?.value || '';
                    
                    if (name && age && gender) {
                        registrationData.elderly.push({ name, age, gender, type: 'elderly' });
                    }
                }
            }
            break;
            
        case 6: // Portal Selection
            const selectedPortals = document.querySelectorAll('.portal-checkbox:checked');
            registrationData.portals = Array.from(selectedPortals).map(cb => cb.value);
            
            const elderRole = document.getElementById('elderRole').value;
            if (elderRole) {
                registrationData.elderRole = elderRole;
            }
            break;
    }
}

function updateProgressBar(step, status) {
    const stepElement = document.getElementById(`step${step}`);
    if (stepElement) {
        stepElement.className = `progress-step ${status}`;
        if (status === 'completed') {
            stepElement.textContent = '✓';
        } else if (status === 'active') {
            stepElement.textContent = step;
        }
    }
}

function loadReviewData() {
    // Personal Information
    const personalReview = document.getElementById('personalReview');
    personalReview.innerHTML = `
        <p><strong>Name:</strong> ${registrationData.firstName} ${registrationData.lastName}</p>
        <p><strong>Date of Birth:</strong> ${registrationData.dob}</p>
        <p><strong>Gender:</strong> ${registrationData.gender}</p>
        ${registrationData.profilePhoto ? `<p><strong>Photo:</strong> Uploaded</p>` : ''}
    `;
    
    // Address & Contact
    const addressReview = document.getElementById('addressReview');
    const fullAddress = `${registrationData.houseNo}, ${registrationData.street}, ${registrationData.city}, ${registrationData.state} - ${registrationData.pinCode}`;
    addressReview.innerHTML = `
        <p><strong>Address:</strong> ${fullAddress}</p>
        <p><strong>Phone:</strong> ${registrationData.phoneNumber}</p>
        <p><strong>Email:</strong> ${registrationData.email}</p>
    `;
    
    // Emergency Contacts
    const emergencyReview = document.getElementById('emergencyReview');
    let emergencyHtml = '';
    registrationData.emergencyContacts.forEach((contact, index) => {
        emergencyHtml += `
            <p><strong>Contact ${index + 1}:</strong> ${contact.name} (${contact.relation}) - ${contact.phone}</p>
        `;
    });
    emergencyReview.innerHTML = emergencyHtml;
    
    // Family Members
    const familyReview = document.getElementById('familyReview');
    let familyHtml = '';
    
    if (registrationData.children && registrationData.children.length > 0) {
        familyHtml += '<h4>👶 Children</h4>';
        registrationData.children.forEach((child, index) => {
            familyHtml += `<p><strong>Child ${index + 1}:</strong> ${child.name}, Age: ${child.age}, Gender: ${child.gender}</p>`;
        });
    }
    
    if (registrationData.elderly && registrationData.elderly.length > 0) {
        familyHtml += '<h4>👴 Elderly Members</h4>';
        registrationData.elderly.forEach((elderly, index) => {
            familyHtml += `<p><strong>Elderly ${index + 1}:</strong> ${elderly.name}, Age: ${elderly.age}, Gender: ${elderly.gender}</p>`;
        });
    }
    
    if (familyHtml === '') {
        familyHtml = '<p>No family members added</p>';
    }
    
    familyReview.innerHTML = familyHtml;
    
    // Selected Portals
    const portalReview = document.getElementById('portalReview');
    const portalNames = {
        'women': 'Women Safety Portal',
        'child': 'Child Safety Portal',
        'disaster': 'Disaster Management Portal',
        'elderly': 'Senior Citizen Safety Portal',
        'health': 'Health Emergency Portal'
    };
    
    let portalHtml = '';
    if (registrationData.portals && registrationData.portals.length > 0) {
        registrationData.portals.forEach(portal => {
            portalHtml += `<p>🧩 ${portalNames[portal]}</p>`;
        });
    } else {
        portalHtml = '<p>No portals selected</p>';
    }
    
    if (registrationData.elderRole) {
        portalHtml += `<p><strong>Elderly Role:</strong> ${registrationData.elderRole === 'caregiver' ? 'Caregiver' : 'Elderly Person'}</p>`;
    }
    
    portalReview.innerHTML = portalHtml;
}

async function completeRegistration() {
    // Add timestamp
    registrationData.registeredAt = new Date().toISOString();
    registrationData.isActive = true;
    
    try {
        showNotification('Creating your account...', 'info');
        
        // Register via API
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showNotification(data.message || 'Registration failed', 'error');
            return;
        }
        
        // Store token and user data
        localStorage.setItem('sahaya_token', data.token);
        localStorage.setItem('sahaya_user', JSON.stringify(data.user));
        currentUser = data.user;
        
        // Show success message
        showNotification('Registration completed successfully! 🎉', 'success');
        
        // Navigate to dashboard
        setTimeout(() => {
            showScreen('dashboardScreen');
            loadDashboard();
        }, 2000);
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed. Please try again.', 'error');
    }
}

// =======================
// VALIDATION FUNCTIONS
// =======================
function validateEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
}

function validatePhone(phone) {
    const phonePattern = /^[0-9]{10}$/;
    return phonePattern.test(phone);
}

function validatePinCode(pinCode) {
    const pinPattern = /^[0-9]{6}$/;
    return pinPattern.test(pinCode);
}

function validateAadhaar(aadhaar) {
    const aadhaarPattern = /^[0-9]{12}$/;
    return aadhaarPattern.test(aadhaar);
}

function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (password.length < minLength) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!hasUpperCase) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!hasLowerCase) {
        return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!hasNumber) {
        return { valid: false, message: 'Password must contain at least one number' };
    }
    if (!hasSpecialChar) {
        return { valid: false, message: 'Password must contain at least one special character (!@#$%^&* etc.)' };
    }

    return { valid: true, message: 'Password is valid' };
}

function checkPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
}

function setupPasswordStrength() {
    const passwordInput = document.getElementById('password');
    const strengthIndicator = document.getElementById('passwordStrength');
    
    if (passwordInput && strengthIndicator) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            if (password.length > 0) {
                const strength = checkPasswordStrength(password);
                strengthIndicator.className = 'password-strength ' + strength;
                strengthIndicator.textContent = 'Strength: ' + strength.charAt(0).toUpperCase() + strength.slice(1);
            } else {
                strengthIndicator.className = 'password-strength';
                strengthIndicator.textContent = '';
            }
        });
    }
}

// =======================
// FILE UPLOAD HANDLERS
// =======================
function previewPhoto(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('photoPreview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Profile Photo">`;
        };
        reader.readAsDataURL(file);
    }
}

function previewAadhaar(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('aadhaarPreview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Aadhaar Card">`;
        };
        reader.readAsDataURL(file);
    }
}

// =======================
// PORTAL SELECTION
// =======================
function setupPortalCards() {
    const portalCards = document.querySelectorAll('.portal-card');
    
    portalCards.forEach(card => {
        card.addEventListener('click', function() {
            const checkbox = this.querySelector('.portal-checkbox');
            checkbox.checked = !checkbox.checked;
            
            if (checkbox.checked) {
                this.classList.add('selected');
            } else {
                this.classList.remove('selected');
            }
            
            // Handle elderly role section
            if (checkbox.value === 'elderly') {
                toggleElderRole();
            }
        });
    });
}

function toggleElderRole() {
    const elderlyCheckbox = document.querySelector('input[value="elderly"]');
    const elderRoleSection = document.getElementById('elderRoleSection');
    
    if (elderlyCheckbox.checked) {
        elderRoleSection.style.display = 'block';
    } else {
        elderRoleSection.style.display = 'none';
        document.getElementById('elderRole').value = '';
    }
}

// =======================
// DASHBOARD
// =======================
function loadDashboard() {
    if (!currentUser) return;
    
    // Update user info
    document.getElementById('dashboardUserName').textContent = `Welcome, ${currentUser.firstName}!`;
    document.getElementById('dashboardUserEmail').textContent = currentUser.email;
    
    // Update user photo
    const userPhoto = document.getElementById('dashboardUserPhoto');
    if (currentUser.profilePhoto) {
        userPhoto.src = currentUser.profilePhoto;
    } else {
        userPhoto.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%233b82f6"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40">👤</text></svg>';
    }
    
    // Load user portals
    loadUserPortals();
}

function loadFamilyStatus() {
    const familyData = localStorage.getItem('familyData');
    const familySection = document.getElementById('familyStatusSection');
    const familyList = document.getElementById('familyMembersList');
    
    if (!familyData || !familySection) return;
    
    const family = JSON.parse(familyData);
    
    if (family.children.length > 0 || family.elderly.length > 0) {
        familySection.style.display = 'block';
        
        let html = '';
        
        family.children.forEach((child, index) => {
            html += `
                <div class="family-member">
                    <div class="member-info">
                        <span class="member-icon">👶</span>
                        <span class="member-name">${child.name}</span>
                    </div>
                    <div class="member-status">${child.status || 'Safe'}</div>
                </div>
            `;
        });
        
        family.elderly.forEach((elder, index) => {
            html += `
                <div class="family-member">
                    <div class="member-info">
                        <span class="member-icon">👴</span>
                        <span class="member-name">${elder.name}</span>
                    </div>
                    <div class="member-status">${elder.status || 'Safe'}</div>
                </div>
            `;
        });
        
        familyList.innerHTML = html;
    }
}

function updateSystemStatus() {
    // Update last updated time
    const now = new Date().toLocaleTimeString();
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        lastUpdated.textContent = `⏱ Last Updated: ${now}`;
    }
    
    // Simulate battery check
    setTimeout(() => {
        const batteryStatus = document.getElementById('batteryStatus');
        if (batteryStatus) {
            batteryStatus.textContent = '⚠️ Battery: Low - Please charge device';
            showNotification('Battery low - please charge device', 'warning');
        }
    }, 10000);
    
    // Auto safety check
    setTimeout(() => {
        const safe = confirm('Are you safe?');
        if (!safe) {
            sendSOS();
        }
    }, 15000);
}

function updateLiveLocation() {
    const locationElement = document.getElementById('liveLocation');
    if (!locationElement || !navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude.toFixed(4);
        const lon = position.coords.longitude.toFixed(4);
        locationElement.textContent = `📍 Current Location: ${lat}, ${lon}`;
    }, (error) => {
        locationElement.textContent = '📍 Location: Unable to get location';
    });
}

function loadUserPortals() {
    const portalContainer = document.getElementById('dashboardPortals');
    if (!portalContainer || !currentUser.portals) return;
    
    const portalConfigs = {
        'women': {
            icon: '👩',
            title: 'Women Safety',
            description: 'Emergency alerts and safety tools',
            screen: 'womenScreen'
        },
        'child': {
            icon: '👶',
            title: 'Child Safety',
            description: 'Real-time tracking and monitoring',
            screen: 'childScreen'
        },
        'disaster': {
            icon: '🌪',
            title: 'Disaster Management',
            description: 'Alerts and emergency resources',
            screen: 'disasterScreen'
        },
        'elderly': {
            icon: '👴',
            title: 'Elderly Safety',
            description: 'Health monitoring and care',
            screen: 'elderlyScreen'
        },
        'health': {
            icon: '🏥',
            title: 'Health Emergency',
            description: 'Medical alerts and assistance',
            screen: 'healthScreen'
        }
    };
    
    let portalHtml = '';
    currentUser.portals.forEach(portal => {
        const config = portalConfigs[portal];
        if (config) {
            portalHtml += `
                <div class="portal-card" onclick="showScreen('${config.screen}')">
                    <div class="portal-icon">${config.icon}</div>
                    <h3>${config.title}</h3>
                    <p>${config.description}</p>
                    <div class="portal-status active">Active</div>
                </div>
            `;
        }
    });
    
    portalContainer.innerHTML = portalHtml;
}

// =======================
// PORTAL SCREENS
// =======================
function loadWomenSafety() {
    const statusDiv = document.getElementById('womenStatus');
    if (statusDiv) {
        statusDiv.innerHTML = `
            <p>🛡️ Women Safety Portal Active</p>
            <p>All safety features are ready</p>
        `;
    }
}

function loadElderlySafety() {
    const viewContainer = document.getElementById('elderlyView');
    if (!viewContainer) return;
    
    if (!currentUser || !currentUser.portals.includes('elderly')) return;
    
    if (currentUser.elderRole === 'caregiver') {
        // Caregiver View
        viewContainer.innerHTML = `
            <div class="caregiver-view">
                <div class="tool-card">
                    <h3>👴 Elderly Status</h3>
                    <p><strong>Status:</strong> Safe</p>
                    <p><strong>Location:</strong> Home</p>
                    <p><strong>Last Active:</strong> 5 minutes ago</p>
                </div>
                
                <div class="tool-card">
                    <h3>🏥 Health Monitoring</h3>
                    <p><strong>Heart Rate:</strong> Normal</p>
                    <p><strong>Blood Pressure:</strong> Normal</p>
                    <p><strong>Medication:</strong> Taken on time</p>
                </div>
                
                <div class="tool-card">
                    <h3>📞 Emergency Actions</h3>
                    <button class="sos-btn-small" onclick="sendSOS()">Send Emergency Alert</button>
                    <button class="btn btn-info" onclick="checkElderlyStatus()">Check Status</button>
                </div>
            </div>
        `;
    } else {
        // Elderly Self View
        viewContainer.innerHTML = `
            <div class="elderly-self-view">
                <div class="tool-card">
                    <h3>🚨 Emergency SOS</h3>
                    <p>Immediate alert to caregivers and emergency contacts</p>
                    <button class="sos-btn-small" onclick="sendSOS()">Activate SOS</button>
                </div>
                
                <div class="tool-card">
                    <h3>⚠️ Fall Detection</h3>
                    <p>Report a fall or emergency situation</p>
                    <button class="btn btn-warning" onclick="reportFall()">Report Fall</button>
                </div>
                
                <div class="tool-card">
                    <h3>📞 Contact Family</h3>
                    <p>Quick call to family members</p>
                    <button class="btn btn-secondary" onclick="callFamily()">Call Family</button>
                </div>
                
                <div class="tool-card">
                    <h3>💊 Medication Reminder</h3>
                    <p>Set and manage medication reminders</p>
                    <button class="btn btn-info" onclick="setMedicationReminder()">Set Reminder</button>
                </div>
            </div>
        `;
    }
    
    if (statusDiv) {
        statusDiv.innerHTML = `
            <p>👴 Elderly Safety Portal Active</p>
            <p>Role: ${currentUser.elderRole === 'caregiver' ? 'Caregiver' : 'Elderly Person'}</p>
        `;
    }
}

function loadDisasterAlerts() {
    const statusDiv = document.getElementById('disasterStatus');
    if (statusDiv) {
        statusDiv.innerHTML = `
            <p>🌪 Disaster Management Portal Active</p>
            <p>Monitoring local emergency alerts</p>
        `;
    }
}

// ... (rest of the code remains the same)
function loadHealthEmergency() {
    const statusDiv = document.getElementById('healthStatus');
    if (statusDiv) {
        statusDiv.innerHTML = `
            <p>🏥 Health Emergency Portal Active</p>
            <p>Medical assistance ready</p>
        `;
    }
}

function loadProfile() {
    if (!currentUser) {
        console.log('❌ No current user data available');
        return;
    }
    
    console.log('🔄 Loading profile with user data:', currentUser);
    
    // Update profile header
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profilePhone = document.getElementById('profilePhone');
    
    if (profileName) profileName.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    if (profileEmail) profileEmail.textContent = currentUser.email;
    if (profilePhone) profilePhone.textContent = `+91 ${currentUser.phoneNumber}`;
    
    // Update profile photo
    const profileAvatar = document.getElementById('profileAvatar') || document.getElementById('dashboardUserPhoto');
    if (profileAvatar) {
        if (currentUser.profilePhoto) {
            profileAvatar.src = currentUser.profilePhoto;
        } else {
            profileAvatar.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%233b82f6"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40">👤</text></svg>';
        }
    }
    
    // Update address
    const profileAddress = document.getElementById('profileAddress');
    if (profileAddress) {
        const fullAddress = currentUser.houseNo && currentUser.street && currentUser.city && currentUser.state && currentUser.pinCode 
            ? `${currentUser.houseNo}, ${currentUser.street}, ${currentUser.city}, ${currentUser.state} - ${currentUser.pinCode}`
            : 'Address not available';
        profileAddress.textContent = fullAddress;
        console.log('📍 Address set to:', fullAddress);
    }
    
    // Update emergency contacts
    const emergencyContactsDiv = document.getElementById('profileEmergencyContacts');
    if (emergencyContactsDiv) {
        if (currentUser.emergencyContacts && currentUser.emergencyContacts.length > 0) {
            console.log('📞 Loading emergency contacts:', currentUser.emergencyContacts.length);
            let contactsHtml = '';
            currentUser.emergencyContacts.forEach((contact, index) => {
                console.log(`📞 Contact ${index + 1}:`, contact);
                contactsHtml += `
                    <div style="margin-bottom: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                        <p style="margin: 0; font-weight: bold;">${contact.name}</p>
                        <p style="margin: 5px 0; opacity: 0.8;">${contact.relation}</p>
                        <p style="margin: 0; color: #4CAF50;">📞 ${contact.phone}</p>
                    </div>
                `;
            });
            emergencyContactsDiv.innerHTML = contactsHtml;
            console.log('✅ Emergency contacts displayed');
        } else {
            emergencyContactsDiv.innerHTML = '<p>No emergency contacts added</p>';
            console.log('⚠️ No emergency contacts found');
        }
    }
    
    // Update family members
    const profileFamilyMembers = document.getElementById('profileFamilyMembers');
    if (profileFamilyMembers) {
        console.log('👨‍👩‍👧‍👦 Loading family members...');
        loadFamilyMembers();
    }
    
    // Update active portals
    const portalsDiv = document.getElementById('profilePortals');
    if (portalsDiv && currentUser.portals) {
        const portalNames = {
            'women': 'Women Safety',
            'child': 'Child Safety',
            'disaster': 'Disaster Management',
            'elderly': 'Elderly Safety',
            'health': 'Health Emergency'
        };
        
        let portalsHtml = '';
        currentUser.portals.forEach(portal => {
            portalsHtml += `<p>🧩 ${portalNames[portal]}</p>`;
        });
        portalsDiv.innerHTML = portalsHtml;
    }
}

// =======================
// CHILD SAFETY FUNCTIONS - PARENT MONITORING SYSTEM WITH DATA MANAGEMENT
// =======================

// Data Storage Keys
const CHILDREN_DATA_KEY = 'sahaya_children_data';
const SAFE_ZONES_KEY = 'sahaya_safe_zones';
const LOCATION_HISTORY_KEY = 'sahaya_location_history';

let monitoredChildren = [];
let currentMonitoredChild = null;
let safeZonesData = [];

// =======================
// DATA MANAGEMENT FUNCTIONS
// =======================

function getChildrenData() {
    const saved = localStorage.getItem(CHILDREN_DATA_KEY);
    if (saved) {
        return JSON.parse(saved);
    }
    return [];
}

function saveChildrenData(children) {
    localStorage.setItem(CHILDREN_DATA_KEY, JSON.stringify(children));
}

function getSafeZonesData() {
    const saved = localStorage.getItem(SAFE_ZONES_KEY);
    if (saved) {
        return JSON.parse(saved);
    }
    return [];
}

function saveSafeZonesData(zones) {
    localStorage.setItem(SAFE_ZONES_KEY, JSON.stringify(zones));
}

function addChild(childData) {
    const children = getChildrenData();
    const newChild = {
        id: Date.now().toString(),
        name: childData.name,
        age: parseInt(childData.age),
        phone: childData.phone || '',
        photo: childData.photo || null,
        location: { lat: 20.5937, lng: 78.9629 },
        battery: 85,
        signal: 'Strong',
        safeZone: null,
        isSafe: true,
        createdAt: new Date().toISOString()
    };
    children.push(newChild);
    saveChildrenData(children);
    return newChild;
}

function updateChild(childId, updates) {
    const children = getChildrenData();
    const index = children.findIndex(c => c.id === childId);
    if (index !== -1) {
        children[index] = { ...children[index], ...updates };
        saveChildrenData(children);
        return children[index];
    }
    return null;
}

function deleteChild(childId) {
    const children = getChildrenData().filter(c => c.id !== childId);
    saveChildrenData(children);
}

function addSafeZone(zoneData) {
    const zones = getSafeZonesData();
    const newZone = {
        id: Date.now().toString(),
        name: zoneData.name,
        address: zoneData.address,
        radius: parseInt(zoneData.radius),
        color: zoneData.color || '#4CAF50',
        childId: currentMonitoredChild ? currentMonitoredChild.id : null,
        createdAt: new Date().toISOString()
    };
    zones.push(newZone);
    saveSafeZonesData(zones);
    return newZone;
}

function deleteSafeZone(zoneId) {
    const zones = getSafeZonesData().filter(z => z.id !== zoneId);
    saveSafeZonesData(zones);
}

// =======================
// PORTAL LOADING
// =======================

function loadChildSafety() {
    console.log('👶 Loading Child Safety Monitor...');
    
    const children = getChildrenData();
    monitoredChildren = children;
    
    const selectorBar = document.getElementById('childSelectorBar');
    const noChildWarning = document.getElementById('noChildWarning');
    const dashboard = document.getElementById('childMonitoringDashboard');
    const dropdown = document.getElementById('childSelectDropdown');
    
    if (!selectorBar || !noChildWarning || !dashboard) {
        console.error('❌ Child monitoring elements not found');
        return;
    }
    
    if (children.length === 0) {
        // No children added - show setup prompt
        selectorBar.style.display = 'none';
        noChildWarning.style.display = 'block';
        dashboard.style.display = 'none';
    } else if (children.length === 1) {
        // One child - auto select
        selectorBar.style.display = 'flex';
        noChildWarning.style.display = 'none';
        dashboard.style.display = 'block';
        document.getElementById('selectedChildInfo').textContent = `👤 ${children[0].name} • ${children[0].age} years`;
        currentMonitoredChild = children[0];
        initializeChildMonitoring(children[0]);
    } else {
        // Multiple children - show selector
        selectorBar.style.display = 'flex';
        noChildWarning.style.display = 'none';
        dashboard.style.display = 'none';
        
        // Populate dropdown
        dropdown.innerHTML = '<option value="">Select Child...</option>';
        children.forEach((child, index) => {
            dropdown.innerHTML += `<option value="${child.id}">${child.name} (${child.age} years)</option>`;
        });
    }
}

function switchMonitoredChild(childId) {
    if (childId === '') {
        document.getElementById('childMonitoringDashboard').style.display = 'none';
        return;
    }
    
    const children = getChildrenData();
    currentMonitoredChild = children.find(c => c.id === childId);
    
    if (currentMonitoredChild) {
        document.getElementById('childMonitoringDashboard').style.display = 'block';
        document.getElementById('selectedChildInfo').textContent = `👤 ${currentMonitoredChild.name} • ${currentMonitoredChild.age} years`;
        initializeChildMonitoring(currentMonitoredChild);
    }
}

// =======================
// MODAL MANAGEMENT
// =======================

function openChildSetupModal() {
    const modal = document.getElementById('childSetupModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('childSetupForm').reset();
        document.getElementById('childPhotoPreview').textContent = '👶';
    }
}

function closeChildSetupModal() {
    const modal = document.getElementById('childSetupModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function saveChildDetails(event) {
    event.preventDefault();
    
    const name = document.getElementById('childNameInput').value.trim();
    const age = document.getElementById('childAgeInput').value;
    const phone = document.getElementById('childPhoneInput').value.trim();
    
    if (!name || !age) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    
    const newChild = addChild({ name, age, phone });
    showNotification(`✅ ${name} added successfully!`, 'success');
    closeChildSetupModal();
    
    // Reload the child safety screen
    loadChildSafety();
}

function openSafeZoneModal() {
    if (!currentMonitoredChild) {
        showNotification('Please select a child first', 'warning');
        return;
    }
    const modal = document.getElementById('safeZoneModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('safeZoneForm').reset();
        selectZoneColor('#4CAF50');
    }
}

function closeSafeZoneModal() {
    const modal = document.getElementById('safeZoneModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function selectZoneColor(color) {
    document.getElementById('zoneColorInput').value = color;
    document.querySelectorAll('.zone-color-btn').forEach(btn => {
        if (btn.dataset.color === color) {
            btn.style.border = '3px solid var(--text-color)';
        } else {
            btn.style.border = '3px solid transparent';
        }
    });
}

function saveSafeZone(event) {
    event.preventDefault();
    
    const name = document.getElementById('zoneNameInput').value.trim();
    const address = document.getElementById('zoneAddressInput').value.trim();
    const radius = document.getElementById('zoneRadiusInput').value;
    const color = document.getElementById('zoneColorInput').value;
    
    if (!name || !address) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    
    addSafeZone({ name, address, radius, color });
    showNotification(`🛡️ Safe zone "${name}" added!`, 'success');
    closeSafeZoneModal();
    
    // Refresh the safe zones display
    renderSafeZones();
}

// =======================
// CHILD MODE (CHILD'S APP)
// =======================

function openChildMode() {
    if (!currentMonitoredChild) {
        showNotification('Please select or add a child first', 'warning');
        return;
    }
    
    // Set child name in the app
    const nameEl = document.getElementById('childAppName');
    if (nameEl) {
        nameEl.textContent = `Hi ${currentMonitoredChild.name}!`;
    }
    
    showScreen('childModeScreen');
}

function exitChildMode() {
    showScreen('childScreen');
    // Reload to refresh data
    loadChildSafety();
}

function childAppSOS() {
    const confirmMsg = `🚨 EMERGENCY\n\nSend SOS alert to your parents?\n\nThis will send your location immediately.`;
    if (confirm(confirmMsg)) {
        showNotification('🚨 SOS Sent! Parents alerted.', 'success');
        
        // Show alert on parent screen
        setTimeout(() => {
            const banner = document.getElementById('childSOSBanner');
            if (banner) {
                banner.style.display = 'block';
                setTimeout(() => {
                    banner.style.display = 'none';
                }, 15000);
            }
        }, 1000);
    }
}

function childAppShareLocation() {
    showNotification('📍 Location shared with parents!', 'success');
}

function childAppCallParent() {
    showNotification('📞 Calling parent...', 'info');
    setTimeout(() => {
        showNotification('Connected to parent', 'success');
    }, 2000);
}

function childAppSafeArrival() {
    showNotification('✅ Safe arrival message sent to parents!', 'success');
}

function childAppNeedPickup() {
    showNotification('🚗 Pickup request sent to parents!', 'success');
}

function initializeChildMonitoring(child) {
    console.log('Initializing monitoring for:', child.name);
    
    // Render location map
    renderChildLocationMap(child);
    
    // Update status
    updateChildStatusCard(child);
    
    // Render safe zones
    renderSafeZones();
    
    // Render location history
    renderLocationHistory(child);
    
    // Start live updates
    startChildLocationUpdates(child);
}

function renderChildLocationMap(child) {
    const mapContainer = document.getElementById('childLocationMap');
    const addressDiv = document.getElementById('childAddress');
    
    if (!mapContainer) return;
    
    // Get safe zones for this child
    const zones = getSafeZonesData().filter(z => !z.childId || z.childId === child.id);
    
    // Create a proper grid-based map with clear cell borders
    const rows = 6;
    const cols = 6;
    
    let gridCells = '';
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            // Create checkerboard pattern with blue tint
            const isEven = (r + c) % 2 === 0;
            const bgColor = isEven ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.05)';
            
            gridCells += `
                <div style="
                    position: absolute; 
                    top: ${(r / rows) * 100}%; 
                    left: ${(c / cols) * 100}%; 
                    width: ${100 / cols}%; 
                    height: ${100 / rows}%; 
                    background: ${bgColor};
                    border-right: 2px solid rgba(59, 130, 246, 0.3);
                    border-bottom: 2px solid rgba(59, 130, 246, 0.3);
                    box-sizing: border-box;
                "></div>
            `;
        }
    }
    
    // Place safe zones in specific grid cells
    const zonePositions = [
        { row: 1, col: 1, zone: zones[0] || { name: '🏠 Home', color: '#4CAF50', radius: 200 } },
        { row: 2, col: 4, zone: zones[1] || null },
        { row: 4, col: 2, zone: zones[2] || null }
    ].filter(p => p.zone);
    
    const zonesHtml = zonePositions.map((pos, i) => {
        const size = pos.zone.radius > 500 ? '80%' : pos.zone.radius > 200 ? '70%' : '60%';
        const top = ((pos.row / rows) + (1/rows/2)) * 100;
        const left = ((pos.col / cols) + (1/cols/2)) * 100;
        
        return `
            <div style="
                position: absolute; 
                top: ${top}%; 
                left: ${left}%; 
                transform: translate(-50%, -50%);
                width: ${size}; 
                height: ${size}; 
                min-width: 80px;
                min-height: 80px;
                border: 3px solid ${pos.zone.color}; 
                border-radius: 50%; 
                background: ${pos.zone.color}15;
                display: flex; 
                align-items: center; 
                justify-content: center;
                box-shadow: 0 0 0 4px var(--card-bg), 0 0 15px ${pos.zone.color}60;
                z-index: 10;
            ">
                <span style="
                    color: ${pos.zone.color}; 
                    font-size: 11px; 
                    font-weight: bold; 
                    text-align: center;
                    padding: 5px;
                    background: var(--card-bg);
                    border-radius: 10px;
                    border: 1px solid ${pos.zone.color};
                ">${pos.zone.name}</span>
            </div>
        `;
    }).join('');
    
    // Child marker - center of map
    const childMarker = `
        <div style="
            position: absolute; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%); 
            z-index: 20;
            display: flex;
            flex-direction: column;
            align-items: center;
        ">
            <div style="
                width: 44px; 
                height: 44px; 
                background: linear-gradient(135deg, #4CAF50, #45a049); 
                border-radius: 50%; 
                border: 4px solid white; 
                box-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 0 2px #4CAF50; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                animation: pulse 2s infinite;
            ">
                <span style="font-size: 20px;">👶</span>
            </div>
            <div style="
                margin-top: 8px;
                background: white; 
                color: #333; 
                padding: 6px 14px; 
                border-radius: 20px; 
                font-size: 12px; 
                font-weight: bold; 
                white-space: nowrap; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.2); 
                border: 2px solid #4CAF50;
            ">
                ${child.name}
            </div>
        </div>
    `;
    
    mapContainer.innerHTML = `
        <div style="
            width: 100%; 
            height: 100%; 
            position: relative; 
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            border-radius: 10px; 
            overflow: hidden;
            border: 3px solid #3b82f6;
            box-shadow: inset 0 2px 8px rgba(59,130,246,0.2);
        ">
            <!-- Inner Frame Border -->
            <div style="
                position: absolute; 
                top: 8px; 
                left: 8px; 
                right: 8px; 
                bottom: 8px; 
                border: 2px solid #3b82f6; 
                border-radius: 8px;
                pointer-events: none;
                z-index: 40;
            "></div>
            
            <!-- Grid Cells -->
            ${gridCells}
            
            <!-- Safe Zones -->
            ${zonesHtml}
            
            <!-- Child Marker -->
            ${childMarker}
            
            <!-- Map Controls / Legend -->
            <div style="
                position: absolute; 
                bottom: 15px; 
                left: 15px; 
                right: 15px; 
                background: rgba(219, 234, 254, 0.95); 
                padding: 15px; 
                border-radius: 10px; 
                border: 2px solid #3b82f6;
                box-shadow: 0 4px 15px rgba(59,130,246,0.2);
                z-index: 50;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="width: 16px; height: 16px; background: #4CAF50; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 1px #4CAF50;"></div>
                            <span style="color: #1e3a5f; font-size: 13px; font-weight: 600;">${child.name}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="color: #1e3a5f; font-size: 13px; font-weight: 500;">📍 ${child.location.lat.toFixed(4)}, ${child.location.lng.toFixed(4)}</span>
                        </div>
                    </div>
                    <div style="
                        background: rgba(76,175,80,0.15); 
                        color: #4CAF50; 
                        padding: 6px 12px; 
                        border-radius: 20px; 
                        font-size: 12px; 
                        font-weight: bold;
                        border: 1px solid #4CAF50;
                    ">
                        ● LIVE
                    </div>
                </div>
            </div>
            
            <!-- Compass -->
            <div style="
                position: absolute; 
                top: 15px; 
                right: 15px; 
                background: rgba(219, 234, 254, 0.95); 
                width: 45px; 
                height: 45px; 
                border-radius: 50%; 
                border: 2px solid #3b82f6; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                box-shadow: 0 4px 10px rgba(59,130,246,0.2);
                z-index: 50;
            ">
                <span style="font-size: 18px; font-weight: bold; color: #1d4ed8;">N</span>
            </div>
            
            <!-- Scale Indicator -->
            <div style="
                position: absolute; 
                top: 15px; 
                left: 15px; 
                background: rgba(219, 234, 254, 0.95); 
                padding: 8px 12px; 
                border-radius: 6px; 
                border: 2px solid #3b82f6;
                font-size: 11px; 
                color: #1d4ed8;
                z-index: 50;
            ">
                500m
            </div>
        </div>
    `;
    
    // Address info with better styling
    const firstZone = zones[0];
    if (addressDiv) {
        addressDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="
                    width: 50px; 
                    height: 50px; 
                    border-radius: 50%; 
                    background: ${firstZone ? firstZone.color + '20' : 'rgba(76,175,80,0.15)'}; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-size: 24px;
                    border: 2px solid ${firstZone ? firstZone.color : '#4CAF50'};
                ">🏠</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: var(--success-color); font-size: 16px; margin-bottom: 3px;">
                        ${firstZone ? firstZone.name + ' Zone' : 'Home Zone'} - Safe Area
                    </div>
                    <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 2px;">
                        ${firstZone ? firstZone.address : '123 Residential Area, Near City Center'}
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary);">
                        📍 Accuracy: ±15 meters • 🔄 Updated just now
                    </div>
                </div>
            </div>
        `;
    }
}

function updateChildStatusCard(child) {
    const statusCard = document.getElementById('safetyStatusCard');
    const safeZoneName = document.getElementById('safeZoneName');
    const batteryEl = document.getElementById('childBattery');
    const signalEl = document.getElementById('childSignal');
    
    if (!statusCard) return;
    
    // Update safety status
    if (child.isSafe) {
        statusCard.style.borderColor = 'var(--success-color)';
        statusCard.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
            <h4 style="color: var(--success-color); margin: 0 0 5px 0;">SAFE</h4>
        `;
        if (safeZoneName) safeZoneName.textContent = `Inside: ${child.safeZone || 'Safe Area'}`;
    } else {
        statusCard.style.borderColor = '#ff4444';
        statusCard.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
            <h4 style="color: #ff4444; margin: 0 0 5px 0;">OUTSIDE ZONE</h4>
        `;
        if (safeZoneName) safeZoneName.textContent = 'Outside safe area!';
    }
    
    // Update device status
    if (batteryEl) {
        batteryEl.textContent = child.battery + '%';
        batteryEl.style.color = child.battery < 20 ? '#ff4444' : 'var(--success-color)';
    }
    if (signalEl) signalEl.textContent = child.signal;
}

function renderSafeZones() {
    const container = document.getElementById('safeZonesList');
    const noZonesMsg = document.getElementById('noSafeZonesMsg');
    if (!container) return;
    
    // Get actual saved zones from localStorage
    const zones = getSafeZonesData();
    
    // Filter zones for current child if we have one
    const childZones = currentMonitoredChild 
        ? zones.filter(z => !z.childId || z.childId === currentMonitoredChild.id)
        : zones;
    
    if (childZones.length === 0) {
        container.innerHTML = '';
        if (noZonesMsg) noZonesMsg.style.display = 'block';
        return;
    }
    
    if (noZonesMsg) noZonesMsg.style.display = 'none';
    
    container.innerHTML = childZones.map(zone => `
        <div class="safe-zone-card" style="background: var(--card-bg); border: 3px solid ${zone.color}; border-radius: 12px; padding: 18px; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <button onclick="deleteSafeZone('${zone.id}'); renderSafeZones();" style="position: absolute; top: 10px; right: 10px; background: var(--card-bg); border: 2px solid #ff4444; color: #ff4444; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; font-weight: bold;">×</button>
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; padding-right: 30px;">
                <h4 style="margin: 0; color: ${zone.color}; font-size: 16px; font-weight: bold;">${zone.name}</h4>
            </div>
            <div style="color: var(--text-secondary); font-size: 13px; margin-bottom: 8px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">${zone.address}</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary); font-size: 12px;">📐 ${zone.radius}m radius</span>
                <span style="background: ${zone.color}20; color: ${zone.color}; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; border: 2px solid ${zone.color};">● Active</span>
            </div>
        </div>
    `).join('');
}

function renderLocationHistory(child) {
    const container = document.getElementById('locationHistory');
    if (!container) return;
    
    const history = [
        { time: '08:30 AM', location: '🏠 Left Home', status: 'normal' },
        { time: '08:45 AM', location: '🚌 Boarded School Bus', status: 'normal' },
        { time: '09:15 AM', location: '🏫 Arrived at School', status: 'safe' },
        { time: '03:30 PM', location: '🏫 Left School', status: 'normal' },
        { time: '04:00 PM', location: '🏠 Arrived Home', status: 'safe' },
        { time: 'Now', location: '🏠 At Home - Safe Zone', status: 'current' }
    ];
    
    container.innerHTML = history.map((item, index) => `
        <div style="display: flex; gap: 15px; padding: 16px; border: 2px solid ${item.status === 'current' ? 'var(--success-color)' : item.status === 'safe' ? 'var(--info-color)' : 'var(--border-color)'}; background: ${item.status === 'current' ? 'rgba(76,175,80,0.1)' : 'var(--card-bg)'}; margin-bottom: 12px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <div style="min-width: 75px; color: var(--text-secondary); font-size: 13px; font-weight: bold; border-right: 2px solid var(--border-color); padding-right: 12px; display: flex; align-items: center;">${item.time}</div>
            <div style="flex: 1; color: ${item.status === 'current' ? 'var(--success-color)' : 'var(--text-color)'}; font-size: 14px; display: flex; align-items: center;">${item.location}</div>
            ${item.status === 'current' ? '<span style="background: var(--success-color); color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;">● LIVE</span>' : ''}
        </div>
    `).join('');
}

function startChildLocationUpdates(child) {
    // Simulate live location updates
    setInterval(() => {
        // Random small location changes
        child.location.lat += (Math.random() - 0.5) * 0.0001;
        child.location.lng += (Math.random() - 0.5) * 0.0001;
        child.battery = Math.max(0, child.battery - 1);
        
        // Update time
        const timeEl = document.getElementById('locationUpdateTime');
        if (timeEl) timeEl.textContent = 'Updated: Just now';
        
        // Re-render map occasionally
        if (Math.random() > 0.7) {
            renderChildLocationMap(child);
        }
    }, 5000);
}

// Quick Actions
function callChild() {
    if (currentMonitoredChild) {
        showNotification(`📞 Calling ${currentMonitoredChild.name}...`, 'info');
        setTimeout(() => {
            showNotification(`Connected to ${currentMonitoredChild.name}`, 'success');
        }, 2000);
    }
}

function sendChildMessage() {
    const message = prompt('Enter message to send to child:');
    if (message && currentMonitoredChild) {
        showNotification(`💬 Message sent to ${currentMonitoredChild.name}`, 'success');
    }
}

// Legacy function updates
function checkSafeZone() {
    if (currentMonitoredChild) {
        const isSafe = currentMonitoredChild.isSafe;
        showNotification(
            isSafe ? 
            `✅ ${currentMonitoredChild.name} is in safe zone: ${currentMonitoredChild.safeZone}` : 
            `⚠️ ${currentMonitoredChild.name} is outside the designated safe zone!`,
            isSafe ? 'success' : 'warning'
        );
    }
}

function setupGeofencing() {
    showNotification('🛡️ Geofencing setup: Add new safe zones for your child', 'info');
}

function childAlert() {
    checkSafeZone();
}

function updateChildLocation() {
    // Legacy function - now handled by renderChildLocationMap
}

function updateChildActivity() {
    // Legacy function - activity monitoring removed
}

function sendChildAlertToParents() {
    // Legacy function - handled by childSOSDemo
}

// =======================
// ELDERLY SAFETY FUNCTIONS
// =======================
function reportFall() {
    const statusDiv = document.getElementById('elderlyStatus');
    if (statusDiv) {
        statusDiv.innerHTML = `
            <p>🚨 Fall detected! Alerting caregivers...</p>
            <p>Emergency contacts will be notified</p>
        `;
        statusDiv.style.color = '#ef4444';
    }
    
    // Send alert to emergency contacts
    if (currentUser && currentUser.emergencyContacts) {
        currentUser.emergencyContacts.forEach(contact => {
            console.log(`Fall alert sent to ${contact.name}`);
        });
    }
    
    showNotification('Fall alert sent to emergency contacts', 'success');
    
    setTimeout(() => {
        if (statusDiv) {
            statusDiv.innerHTML = `<p>✅ Fall alert sent successfully</p>`;
            statusDiv.style.color = '#22c55e';
        }
    }, 3000);
}

function callFamily() {
    fakeCall(); // Use the existing fake call function
}

function checkElderlyStatus() {
    showNotification('Checking elderly status...', 'info');
    
    setTimeout(() => {
        showNotification('✅ Elderly person is safe and active', 'success');
    }, 2000);
}

function setMedicationReminder() {
    showNotification('Opening medication reminder setup...', 'info');
    // Implementation for medication reminder
}

// =======================
// WOMEN SAFETY FUNCTIONS
// =======================
function startRecording() {
    const statusDiv = document.getElementById('womenStatus');
    
    if (isRecording) {
        showNotification('Recording already in progress', 'warning');
        return;
    }
    
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            isRecording = true;
            
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <p>🔴 Recording in progress...</p>
                    <p>Tap to stop recording</p>
                `;
                statusDiv.style.color = '#ef4444';
            }
            
            // Create video preview
            const video = document.createElement('video');
            video.autoplay = true;
            video.muted = true;
            video.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                width: 200px;
                height: 150px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                z-index: 9999;
                border: 2px solid #ef4444;
            `;
            video.srcObject = stream;
            document.body.appendChild(video);
            
            // Stop recording after 30 seconds or on click
            const stopRecording = () => {
                stream.getTracks().forEach(track => track.stop());
                video.remove();
                isRecording = false;
                
                if (statusDiv) {
                    statusDiv.innerHTML = `
                        <p>✅ Recording saved and shared with contacts</p>
                    `;
                    statusDiv.style.color = '#22c55e';
                }
                
                showNotification('Recording saved and shared with emergency contacts', 'success');
            };
            
            video.addEventListener('click', stopRecording);
            setTimeout(stopRecording, 30000);
        })
        .catch(err => {
            console.log('Recording failed:', err);
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <p>❌ Camera access denied</p>
                    <p>Please enable camera permissions</p>
                `;
                statusDiv.style.color = '#ef4444';
            }
            showNotification('Camera access denied. Please enable permissions.', 'error');
        });
}

function fakeCall() {
    const callScreen = document.createElement('div');
    callScreen.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #1e293b, #020617);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
    `;
    
    callScreen.innerHTML = `
        <div style="font-size: 4rem; margin-bottom: 20px;">📞</div>
        <h2 style="margin-bottom: 10px;">Incoming Call</h2>
        <p style="font-size: 1.2rem; margin-bottom: 30px;">Family Member</p>
        <button onclick="this.parentElement.remove()" style="
            background: #ef4444;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 25px;
            font-size: 1rem;
            cursor: pointer;
        ">Decline</button>
    `;
    
    document.body.appendChild(callScreen);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (callScreen.parentElement) {
            callScreen.remove();
        }
    }, 10000);
}

function findSafeRoute() {
    showNotification('Finding safest route to your destination...', 'info');
    
    setTimeout(() => {
        showNotification('Safe route found! Opening maps...', 'success');
        // Open Google Maps
        window.open('https://maps.google.com');
    }, 2000);
}

function showDangerZones() {
    console.log('🗺️ Loading danger zones map...');
    
    // Get the danger zones section
    const dangerSection = document.getElementById('dangerZonesSection');
    if (!dangerSection) {
        console.error('❌ Danger zones section not found');
        alert('Error: Danger zones section not found in HTML');
        return;
    }
    
    // Hide all screens first
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
        screen.style.display = 'none';
    });
    
    // Show danger zones section
    dangerSection.classList.add('active');
    dangerSection.style.display = 'block';
    console.log('✅ Danger zones section displayed');
    
    // Show immediate notification
    showNotification('🗺️ Loading danger zones map...', 'info');
    
    // Initialize map immediately
    console.log('🗺️ Initializing map...');
    initializeDangerZonesMap();
    
    // Load and render danger zones
    loadDangerZonesData();
    
    // Get user location
    getCurrentLocation();
    
    console.log('✅ Danger zones map loaded successfully');
}

function hideDangerZones() {
    console.log('🔙 Returning to Women Safety screen...');
    
    // Hide danger zones section explicitly
    const dangerSection = document.getElementById('dangerZonesSection');
    if (dangerSection) {
        dangerSection.style.display = 'none';
        dangerSection.classList.remove('active');
    }
    
    // Show women screen using proper screen management
    showScreen('womenScreen');
    
    console.log('✅ Women Safety screen displayed');
}

function initializeDangerZonesMap() {
    const mapContainer = document.getElementById('dangerZonesMap');
    if (!mapContainer) {
        console.error('❌ Map container not found');
        return;
    }
    
    console.log('🗺️ Creating real geolocation-based danger zones map...');
    
    // Get user's real location first
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                console.log('📍 User location:', userLat, userLng);
                
                // Create map centered on user's real location
                createRealLocationMap(mapContainer, userLat, userLng);
            },
            (error) => {
                console.warn('⚠️ Could not get location, using default:', error.message);
                // Use default location if geolocation fails
                createRealLocationMap(mapContainer, 20.5937, 78.9629); // India center
            }
        );
    } else {
        console.warn('⚠️ Geolocation not supported');
        createRealLocationMap(mapContainer, 20.5937, 78.9629);
    }
}

function createRealLocationMap(container, userLat, userLng) {
    // Create cleaner map layout - just the map, info is on the right side now
    container.innerHTML = `
        <div style="width: 100%; height: 100%; position: relative; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 10px; overflow: hidden;">
            
            <!-- Map Background with streets -->
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0;">
                <!-- Main Roads -->
                <div style="position: absolute; top: 0; left: 30%; width: 8px; height: 100%; background: rgba(255,255,255,0.15);"></div>
                <div style="position: absolute; top: 0; left: 70%; width: 8px; height: 100%; background: rgba(255,255,255,0.15);"></div>
                <div style="position: absolute; top: 40%; left: 0; width: 100%; height: 8px; background: rgba(255,255,255,0.15);"></div>
                <div style="position: absolute; top: 70%; left: 0; width: 100%; height: 8px; background: rgba(255,255,255,0.15);"></div>
                
                <!-- Cross Streets -->
                <div style="position: absolute; top: 0; left: 15%; width: 4px; height: 100%; background: rgba(255,255,255,0.08);"></div>
                <div style="position: absolute; top: 0; left: 50%; width: 4px; height: 100%; background: rgba(255,255,255,0.08);"></div>
                <div style="position: absolute; top: 0; left: 85%; width: 4px; height: 100%; background: rgba(255,255,255,0.08);"></div>
                <div style="position: absolute; top: 20%; left: 0; width: 100%; height: 4px; background: rgba(255,255,255,0.08);"></div>
                <div style="position: absolute; top: 55%; left: 0; width: 100%; height: 4px; background: rgba(255,255,255,0.08);"></div>
                <div style="position: absolute; top: 85%; left: 0; width: 100%; height: 4px; background: rgba(255,255,255,0.08);"></div>
                
                <!-- Street Labels -->
                <div style="position: absolute; top: 5px; left: 32%; color: rgba(255,255,255,0.4); font-size: 10px; font-weight: bold;">Main Road</div>
                <div style="position: absolute; top: 42%; left: 5px; color: rgba(255,255,255,0.4); font-size: 10px; font-weight: bold;">Center Ave</div>
                <div style="position: absolute; top: 72%; left: 5px; color: rgba(255,255,255,0.4); font-size: 10px; font-weight: bold;">Park Street</div>
                <div style="position: absolute; top: 5px; left: 72%; color: rgba(255,255,255,0.4); font-size: 10px; font-weight: bold;">Highway 1</div>
                <div style="position: absolute; top: 22%; right: 5px; color: rgba(255,255,255,0.4); font-size: 10px; font-weight: bold;">Cross Rd</div>
                <div style="position: absolute; top: 57%; right: 5px; color: rgba(255,255,255,0.4); font-size: 10px; font-weight: bold;">Market St</div>
                <div style="position: absolute; bottom: 5px; right: 5px; color: rgba(255,255,255,0.4); font-size: 10px; font-weight: bold;">Uni Road</div>
            </div>
            
            <!-- YOUR REAL LOCATION - Prominent Green Marker in Center -->
            <div id="userLocationMarker" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); 
                width: 60px; height: 60px; background: radial-gradient(circle, #4CAF50 0%, #2E7D32 100%); border-radius: 50%; 
                display: flex; align-items: center; justify-content: center; font-size: 28px;
                box-shadow: 0 0 40px rgba(76,175,80,1), 0 0 80px rgba(76,175,80,0.6), 0 0 120px rgba(76,175,80,0.3);
                border: 4px solid white; z-index: 100;">
                📍
            </div>
            
            <!-- Pulsing Ring Around User Location -->
            <div style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); 
                width: 100px; height: 100px; border: 3px solid rgba(76,175,80,0.5); border-radius: 50%; 
                animation: pulse-user 2s infinite; z-index: 99;"></div>
            
            <!-- Location Label - YOU ARE HERE -->
            <div style="position: absolute; left: 50%; top: calc(50% + 50px); transform: translateX(-50%); 
                background: linear-gradient(90deg, #4CAF50, #2E7D32); color: white; padding: 8px 16px; border-radius: 20px; 
                font-size: 12px; font-weight: bold; white-space: nowrap; z-index: 99;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5); border: 2px solid white;">
                📍 YOU ARE HERE
            </div>
            
            <!-- Location Coordinates Display (Top Left) -->
            <div style="position: absolute; top: 15px; left: 15px; background: rgba(0,0,0,0.85); 
                color: #4CAF50; padding: 12px 18px; border-radius: 10px; font-size: 12px; 
                border: 2px solid #4CAF50; z-index: 95; box-shadow: 0 4px 15px rgba(0,0,0,0.4);">
                <div style="font-weight: bold; margin-bottom: 5px; color: #4CAF50; font-size: 13px;">📍 Your Location</div>
                <div style="font-family: monospace; color: #fff;">Lat: ${userLat.toFixed(4)}</div>
                <div style="font-family: monospace; color: #fff;">Lng: ${userLng.toFixed(4)}</div>
            </div>
            
            <!-- DANGER ZONES - Better Positioned -->
            
            <!-- HIGH DANGER: Bus Station (Near Highway) -->
            <div data-danger-level="high" onclick="showZoneDetails('Bus Station', 'high', 15, 'High risk area, especially at night. Multiple incidents reported.')" style="
                position: absolute; left: 72%; top: 35%; width: 110px; height: 110px;
                background: radial-gradient(circle, rgba(255,0,0,0.7) 0%, rgba(255,0,0,0.4) 40%, rgba(255,0,0,0.1) 70%, transparent 100%);
                border: 4px solid #ff0000; border-radius: 50%; cursor: pointer;
                box-shadow: 0 0 40px rgba(255,0,0,0.9), inset 0 0 30px rgba(255,0,0,0.5);
                z-index: 50; transition: all 0.3s ease;">
                <div style="position: absolute; top: -35px; left: 50%; transform: translateX(-50%); 
                    background: rgba(255,0,0,0.95); color: white; padding: 6px 12px; border-radius: 6px; 
                    font-size: 12px; font-weight: bold; white-space: nowrap; border: 2px solid #ff0000;
                    box-shadow: 0 3px 15px rgba(0,0,0,0.5);">
                    🚌 Bus Station
                </div>
                <div style="position: absolute; bottom: -30px; left: 50%; transform: translateX(-50%); 
                    background: #ff0000; color: white; padding: 4px 10px; border-radius: 12px; 
                    font-size: 10px; font-weight: bold; box-shadow: 0 2px 10px rgba(0,0,0,0.4);">
                    🔴 HIGH RISK
                </div>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: white; color: #ff0000; padding: 4px 10px; border-radius: 50%; 
                    font-size: 14px; font-weight: bold; min-width: 30px; text-align: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                    15
                </div>
            </div>
            
            <!-- HIGH DANGER: Central Park (Isolated Area) -->
            <div data-danger-level="high" onclick="showZoneDetails('Central Park', 'high', 12, 'Isolated area with poor lighting. Avoid after dark.')" style="
                position: absolute; left: 18%; top: 65%; width: 100px; height: 100px;
                background: radial-gradient(circle, rgba(255,0,0,0.7) 0%, rgba(255,0,0,0.4) 40%, rgba(255,0,0,0.1) 70%, transparent 100%);
                border: 4px solid #ff0000; border-radius: 50%; cursor: pointer;
                box-shadow: 0 0 40px rgba(255,0,0,0.9), inset 0 0 30px rgba(255,0,0,0.5);
                z-index: 50; transition: all 0.3s ease;">
                <div style="position: absolute; top: -35px; left: 50%; transform: translateX(-50%); 
                    background: rgba(255,0,0,0.95); color: white; padding: 6px 12px; border-radius: 6px; 
                    font-size: 12px; font-weight: bold; white-space: nowrap; border: 2px solid #ff0000;
                    box-shadow: 0 3px 15px rgba(0,0,0,0.5);">
                    🌳 Central Park
                </div>
                <div style="position: absolute; bottom: -30px; left: 50%; transform: translateX(-50%); 
                    background: #ff0000; color: white; padding: 4px 10px; border-radius: 12px; 
                    font-size: 10px; font-weight: bold; box-shadow: 0 2px 10px rgba(0,0,0,0.4);">
                    🔴 HIGH RISK
                </div>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: white; color: #ff0000; padding: 4px 10px; border-radius: 50%; 
                    font-size: 14px; font-weight: bold; min-width: 30px; text-align: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                    12
                </div>
            </div>
            
            <!-- MEDIUM DANGER: Night Market -->
            <div data-danger-level="medium" onclick="showZoneDetails('Night Market', 'medium', 8, 'Crowded area with pickpocketing risks. Stay alert.')" style="
                position: absolute; left: 52%; top: 58%; width: 85px; height: 85px;
                background: radial-gradient(circle, rgba(255,140,0,0.6) 0%, rgba(255,140,0,0.3) 40%, rgba(255,140,0,0.1) 70%, transparent 100%);
                border: 3px solid #ff8c00; border-radius: 50%; cursor: pointer;
                box-shadow: 0 0 30px rgba(255,140,0,0.8), inset 0 0 20px rgba(255,140,0,0.4);
                z-index: 50; transition: all 0.3s ease;">
                <div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); 
                    background: rgba(255,140,0,0.95); color: white; padding: 5px 10px; border-radius: 5px; 
                    font-size: 11px; font-weight: bold; white-space: nowrap; border: 2px solid #ff8c00;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.4);">
                    🏪 Night Market
                </div>
                <div style="position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); 
                    background: #ff8c00; color: white; padding: 3px 8px; border-radius: 10px; 
                    font-size: 9px; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                    🟠 MEDIUM
                </div>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: white; color: #ff8c00; padding: 3px 8px; border-radius: 50%; 
                    font-size: 12px; font-weight: bold; min-width: 25px; text-align: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                    8
                </div>
            </div>
            
            <!-- MEDIUM DANGER: Shopping Mall -->
            <div data-danger-level="medium" onclick="showZoneDetails('Shopping Mall', 'medium', 6, 'Theft incidents in parking areas. Secure your belongings.')" style="
                position: absolute; left: 85%; top: 22%; width: 80px; height: 80px;
                background: radial-gradient(circle, rgba(255,140,0,0.6) 0%, rgba(255,140,0,0.3) 40%, rgba(255,140,0,0.1) 70%, transparent 100%);
                border: 3px solid #ff8c00; border-radius: 50%; cursor: pointer;
                box-shadow: 0 0 30px rgba(255,140,0,0.8), inset 0 0 20px rgba(255,140,0,0.4);
                z-index: 50; transition: all 0.3s ease;">
                <div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); 
                    background: rgba(255,140,0,0.95); color: white; padding: 5px 10px; border-radius: 5px; 
                    font-size: 11px; font-weight: bold; white-space: nowrap; border: 2px solid #ff8c00;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.4);">
                    🛒 Shopping Mall
                </div>
                <div style="position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); 
                    background: #ff8c00; color: white; padding: 3px 8px; border-radius: 10px; 
                    font-size: 9px; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                    🟠 MEDIUM
                </div>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: white; color: #ff8c00; padding: 3px 8px; border-radius: 50%; 
                    font-size: 12px; font-weight: bold; min-width: 25px; text-align: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                    6
                </div>
            </div>
            
            <!-- LOW DANGER: University Area -->
            <div data-danger-level="low" onclick="showZoneDetails('University Area', 'low', 3, 'Generally safe with regular patrols. Normal precautions.')" style="
                position: absolute; left: 35%; top: 18%; width: 70px; height: 70px;
                background: radial-gradient(circle, rgba(255,193,7,0.5) 0%, rgba(255,193,7,0.25) 40%, rgba(255,193,7,0.1) 70%, transparent 100%);
                border: 3px solid #ffc107; border-radius: 50%; cursor: pointer;
                box-shadow: 0 0 25px rgba(255,193,7,0.7), inset 0 0 15px rgba(255,193,7,0.3);
                z-index: 50; transition: all 0.3s ease;">
                <div style="position: absolute; top: -28px; left: 50%; transform: translateX(-50%); 
                    background: rgba(255,193,7,0.95); color: #333; padding: 4px 10px; border-radius: 5px; 
                    font-size: 11px; font-weight: bold; white-space: nowrap; border: 2px solid #ffc107;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                    🎓 University
                </div>
                <div style="position: absolute; bottom: -22px; left: 50%; transform: translateX(-50%); 
                    background: #ffc107; color: #333; padding: 2px 8px; border-radius: 10px; 
                    font-size: 9px; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                    🟡 LOW
                </div>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: white; color: #333; padding: 2px 6px; border-radius: 50%; 
                    font-size: 11px; font-weight: bold; min-width: 22px; text-align: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                    3
                </div>
            </div>
            
            <!-- Pulsing Animation CSS -->
            <style>
                @keyframes pulse-user {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.5; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
            </style>
        </div>
    `;
    
    console.log('✅ Real location-based danger zones map created');
}

// Helper function to show zone details
function showZoneDetails(name, type, incidents, description) {
    const infoDiv = document.getElementById('selectedDangerInfo');
    if (infoDiv) {
        const recommendations = {
            'high': '⚠️ AVOID this area completely. Take alternative routes and stay in well-lit public areas.',
            'medium': '⚡ Exercise caution when passing through. Stay alert and avoid isolated spots.',
            'low': '✓ Generally safe, but remain vigilant and aware of surroundings.'
        };
        
        const typeColors = {
            'high': '#ff4444',
            'medium': '#ff9800', 
            'low': '#ffc107'
        };
        
        const typeBgColors = {
            'high': 'rgba(255,68,68,0.2)',
            'medium': 'rgba(255,152,0,0.2)', 
            'low': 'rgba(255,193,7,0.2)'
        };
        
        const riskLabels = {
            'high': '🔴 HIGH RISK',
            'medium': '🟠 MEDIUM RISK',
            'low': '🟡 LOW RISK'
        };
        
        infoDiv.innerHTML = `
            <div style="background: ${typeBgColors[type]}; padding: 20px; border-radius: 12px; border: 2px solid ${typeColors[type]}; margin-bottom: 20px;">
                <div style="color: #ffffff; margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between;">
                    <strong style="color: ${typeColors[type]}; font-size: 22px;">${name}</strong>
                    <span style="background: ${typeColors[type]}; color: ${type === 'low' ? '#000' : '#fff'}; padding: 5px 12px; border-radius: 15px; font-size: 12px; font-weight: bold;">${riskLabels[type]}</span>
                </div>
                
                <div style="color: #ffffff; font-size: 15px; margin-bottom: 15px; line-height: 1.5;">
                    ${description}
                </div>
                
                <div style="display: flex; gap: 20px; margin-bottom: 15px;">
                    <div style="text-align: center; padding: 10px 20px; background: rgba(0,0,0,0.5); border-radius: 10px;">
                        <div style="font-size: 28px; font-weight: bold; color: ${typeColors[type]};">${incidents}</div>
                        <div style="font-size: 11px; color: #ccc;">INCIDENTS</div>
                    </div>
                    <div style="flex: 1; display: flex; align-items: center; padding: 10px 15px; background: rgba(0,0,0,0.5); border-radius: 10px;">
                        <div style="color: #ffd700; font-size: 14px; line-height: 1.4;">
                            ${recommendations[type]}
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="padding: 15px; background: rgba(255,255,255,0.05); border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="color: #888; font-size: 12px; text-align: center;">
                    💡 Click another zone to compare • Use map to navigate
                </div>
            </div>
        `;
    }
}

function loadDangerZonesData() {
    // Sample danger zones data (in real implementation, this would come from backend API)
    dangerZonesData = [
        {
            id: 1,
            name: "Central Park Area",
            type: "high",
            description: "Recent incidents reported",
            coordinates: { x: 200, y: 150, radius: 50 },
            incidents: 12
        },
        {
            id: 2,
            name: "Night Market District",
            type: "medium", 
            description: "Moderate risk area",
            coordinates: { x: 100, y: 200, radius: 40 },
            incidents: 5
        },
        {
            id: 3,
            name: "University Campus",
            type: "low",
            description: "Generally safe with occasional issues",
            coordinates: { x: 300, y: 100, radius: 30 },
            incidents: 2
        },
        {
            id: 4,
            name: "Bus Station Vicinity",
            type: "high",
            description: "High risk during late hours",
            coordinates: { x: 150, y: 300, radius: 45 },
            incidents: 8
        },
        {
            id: 5,
            name: "Shopping Complex",
            type: "medium",
            description: "Pickpocketing incidents reported",
            coordinates: { x: 350, y: 250, radius: 35 },
            incidents: 4
        }
    ];
    
    console.log('🗺️ Loaded danger zones:', dangerZonesData.length);
    renderDangerZones();
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log('📍 User location:', userLocation);
                updateUserLocationMarker();
                checkNearbyDangerZones();
            },
            (error) => {
                console.error('❌ Location error:', error);
                showNotification('Unable to get your location', 'error');
            }
        );
    } else {
        showNotification('Geolocation not supported by your browser', 'error');
    }
}

function updateUserLocationMarker() {
    if (!mapInstance || !mapInstance.userMarker) return;
    
    // Update user location marker position
    mapInstance.userMarker.style.left = '50%';
    mapInstance.userMarker.style.top = '50%';
    mapInstance.userMarker.style.transform = 'translate(-50%, -50%)';
}

// Global variable to track current filter
let currentDangerFilter = 'all';

function renderDangerZones() {
    // This function is now handled by the static HTML map
    // Filter functionality is implemented via filterDangerZones()
    console.log('🗺️ Map uses static HTML - use filter dropdown to show/hide zones');
}

function filterDangerZones(filterType) {
    // Use passed filter type or current global filter
    const filter = filterType || currentDangerFilter || 'all';
    currentDangerFilter = filter;
    
    console.log('🔍 Filtering danger zones:', filter);
    
    // Get all danger zone elements
    const allZones = document.querySelectorAll('[data-danger-level]');
    
    // Show/hide zones based on filter
    let visibleCount = 0;
    
    allZones.forEach(zone => {
        const zoneLevel = zone.getAttribute('data-danger-level');
        
        if (filter === 'all' || zoneLevel === filter) {
            zone.style.display = 'block';
            zone.style.opacity = '1';
            visibleCount++;
        } else {
            zone.style.display = 'none';
            zone.style.opacity = '0';
        }
    });
    
    console.log(`✅ Showing ${visibleCount} zones (filter: ${filter})`);
}

function addDangerLevelAttributes() {
    // Add data-danger-level attributes to zone elements based on their onclick content
    const zoneElements = document.querySelectorAll('[onclick^="showZoneDetails"]');
    zoneElements.forEach(el => {
        const onclickText = el.getAttribute('onclick');
        if (onclickText.includes("'high'")) {
            el.setAttribute('data-danger-level', 'high');
        } else if (onclickText.includes("'medium'")) {
            el.setAttribute('data-danger-level', 'medium');
        } else if (onclickText.includes("'low'")) {
            el.setAttribute('data-danger-level', 'low');
        }
    });
    console.log('✅ Added danger level attributes to', zoneElements.length, 'zones');
}

function refreshDangerZones() {
    console.log('🔄 Refreshing danger zones map...');
    
    // Re-initialize the map
    const mapContainer = document.getElementById('dangerZonesMap');
    if (!mapContainer) {
        console.error('❌ Map container not found');
        return;
    }
    
    // Get current user location again
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                console.log('📍 Updated location:', userLat, userLng);
                
                // Recreate map with updated location
                createRealLocationMap(mapContainer, userLat, userLng);
                
                // Reset zone details panel
                resetZoneDetailsPanel();
                
                showNotification('🔄 Map refreshed with current location!', 'success');
            },
            (error) => {
                console.warn('⚠️ Could not get location, using default:', error.message);
                // Recreate map with default location
                createRealLocationMap(mapContainer, 20.5937, 78.9629);
                
                resetZoneDetailsPanel();
                
                showNotification('🔄 Map refreshed!', 'success');
            }
        );
    } else {
        // Recreate map with default location
        createRealLocationMap(mapContainer, 20.5937, 78.9629);
        
        resetZoneDetailsPanel();
        
        showNotification('🔄 Map refreshed!', 'success');
    }
}

function resetZoneDetailsPanel() {
    const infoDiv = document.getElementById('selectedDangerInfo');
    if (infoDiv) {
        infoDiv.innerHTML = `
            <div style="color: #ccc; text-align: center; padding: 50px 20px;">
                <div style="font-size: 60px; margin-bottom: 25px;">🗺️</div>
                <div style="font-size: 18px; line-height: 1.6; margin-bottom: 20px;">Click on any danger zone marker on the map to view details</div>
                <div style="padding: 20px; background: rgba(255,255,255,0.1); border-radius: 12px; font-size: 14px; color: #ffd700; border: 1px solid rgba(255,215,0,0.3);">
                    <strong>💡 Legend:</strong><br>
                    <span style="color: #ff4444;">● Red</span> = High Danger<br>
                    <span style="color: #ff9800;">● Orange</span> = Medium<br>
                    <span style="color: #ffc107;">● Yellow</span> = Low
                </div>
            </div>
        `;
    }
}

function getDangerGlowColor(type) {
    switch(type) {
        case 'high': return 'rgba(255, 68, 68, 0.6)';
        case 'medium': return 'rgba(255, 152, 0, 0.6)';
        case 'low': return 'rgba(255, 193, 7, 0.6)';
        default: return 'rgba(108, 117, 125, 0.6)';
    }
}

function getDangerZoneColor(type) {
    switch(type) {
        case 'high': return '#ff4444'; // Red
        case 'medium': return '#ff9800'; // Orange  
        case 'low': return '#ffc107'; // Yellow
        default: return '#6c757d'; // Gray
    }
}

function filterDangerZones() {
    renderDangerZones();
    console.log('🔍 Filtered danger zones by level:', document.getElementById('dangerLevelFilter').value);
}

function refreshDangerZones() {
    console.log('🔄 Refreshing danger zones...');
    loadDangerZonesData();
    renderDangerZones();
    showNotification('Danger zones refreshed', 'success');
}

function checkNearbyDangerZones() {
    if (!userLocation) return;
    
    const nearbyZones = dangerZonesData.filter(zone => {
        const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            zone.coordinates.x, zone.coordinates.y
        );
        return distance <= zone.coordinates.radius;
    });
    
    if (nearbyZones.length > 0) {
        const highRiskZones = nearbyZones.filter(zone => zone.type === 'high');
        
        if (highRiskZones.length > 0) {
            showNotification('⚠️ WARNING: You are near high danger zones!', 'error');
            updateSelectedDangerInfo(highRiskZones[0]);
        } else {
            showNotification('⚠️ You are near moderate risk areas', 'warning');
        }
    }
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    // Simple distance calculation (in real app, use proper geodesic calculation)
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLng/2);
    const c = Math.cos(dLat/2) * Math.cos(dLng/2);
    const d = 2 * Math.asin(Math.sqrt(a*a + c*c));
    return R * d;
}

function updateSelectedDangerInfo(zone) {
    const infoDiv = document.getElementById('selectedDangerInfo');
    if (!infoDiv) return;
    
    infoDiv.innerHTML = `
        <h5>⚠️ ${zone.name}</h5>
        <p><strong>Danger Level:</strong> ${zone.type.toUpperCase()}</p>
        <p><strong>Description:</strong> ${zone.description}</p>
        <p><strong>Incidents:</strong> ${zone.incidents} reported</p>
        <p><strong>Radius:</strong> ${zone.coordinates.radius} meters</p>
        <p><strong>Recommendation:</strong> ${getSafetyRecommendation(zone.type)}</p>
    `;
}

function getSafetyRecommendation(dangerType) {
    switch(dangerType) {
        case 'high': 
            return 'AVOID this area completely. Take alternative routes and stay in well-lit public areas.';
        case 'medium': 
            return 'Exercise caution when passing through this area. Stay alert and avoid isolated spots.';
        case 'low': 
            return 'Generally safe, but remain vigilant and aware of surroundings.';
        default: 
            return 'Stay alert and follow safety guidelines.';
    }
}

const safetyScenarios = {
    walking: {
        icon: '🚶‍♀️',
        title: 'Walking Alone',
        color: '#ff4444',
        tips: [
            { icon: '📱', title: 'Stay Connected', desc: 'Keep your phone charged and accessible. Share your live location with a trusted contact.' },
            { icon: '👀', title: 'Stay Alert', desc: 'Avoid using headphones or being distracted by your phone. Be aware of your surroundings.' },
            { icon: '💡', title: 'Well-Lit Routes', desc: 'Stick to well-lit, populated streets. Avoid shortcuts through dark or isolated areas.' },
            { icon: '🎒', title: 'Secure Belongings', desc: 'Keep bags and purses close to your body. Don\'t flash expensive items.' },
            { icon: '🏃', title: 'Confident Walk', desc: 'Walk with purpose and confidence. Avoid looking lost or uncertain.' },
            { icon: '🆘', title: 'Emergency Ready', desc: 'Have emergency contacts on speed dial. Know the locations of nearby safe spots.' }
        ],
        emergency: 'If followed: Cross the street, enter a public place, call police (100), or shout for help.'
    },
    transport: {
        icon: '🚕',
        title: 'Public Transport',
        color: '#ff9800',
        tips: [
            { icon: '📍', title: 'Share Details', desc: 'Share cab/auto number and driver details with family/friends before starting.' },
            { icon: '🪟', title: 'Back Seat', desc: 'Sit in the back seat in taxis/cabs. Keep windows slightly open for ventilation and shouting.' },
            { icon: '🗺️', title: 'Know Route', desc: 'Use GPS to track the route. Speak up if driver takes wrong/unfamiliar routes.' },
            { icon: '🚌', title: 'Safe Spots', desc: 'On buses/trains, sit near the driver or in designated women\'s sections.' },
            { icon: '⏰', title: 'Timing', desc: 'Avoid late-night travel alone. If necessary, use trusted services with tracking.' },
            { icon: '💰', title: 'Payment Ready', desc: 'Keep exact change ready to minimize stop time. Don\'t reveal large amounts of cash.' }
        ],
        emergency: 'If uncomfortable: Ask to stop at a busy area, call emergency services (100/1091), or press panic button in cab.'
    },
    home: {
        icon: '🏠',
        title: 'Home Safety',
        color: '#4CAF50',
        tips: [
            { icon: '🔒', title: 'Secure Entry', desc: 'Always lock doors and windows. Use peephole before opening door.' },
            { icon: '👁️', title: 'Verify Identity', desc: 'Never open door for strangers. Verify service personnel IDs before entry.' },
            { icon: '📹', title: 'Security Cameras', desc: 'Install doorbell cameras or security systems. Keep recordings backed up.' },
            { icon: '👥', title: 'Neighbor Network', desc: 'Build trust with neighbors. Share emergency contacts with them.' },
            { icon: '💡', title: 'Lighting', desc: 'Keep entryways well-lit. Use timers for lights when away.' },
            { icon: '📋', title: 'Delivery Safety', desc: 'Have deliveries left at door or use secure lockers. Avoid opening door late at night.' }
        ],
        emergency: 'If intruder: Don\'t confront, go to safe room, call police (100), press panic button if available.'
    },
    social: {
        icon: '🎉',
        title: 'Social Events',
        color: '#9c27b0',
        tips: [
            { icon: '👭', title: 'Buddy System', desc: 'Go with trusted friends. Establish a meeting point and check-in times.' },
            { icon: '🍷', title: 'Drink Safety', desc: 'Never leave drinks unattended. Don\'t accept drinks from strangers.' },
            { icon: '📱', title: 'Stay Connected', desc: 'Keep phone charged. Share location with someone not at the event.' },
            { icon: '🚗', title: 'Transport Plan', desc: 'Plan ride home in advance. Use trusted transport apps with live sharing.' },
            { icon: '⏱️', title: 'Know Your Limits', desc: 'Set a time to leave. Trust your instincts if situation feels unsafe.' },
            { icon: '🎒', title: 'Minimal Valuables', desc: 'Carry only essentials. Keep ID, emergency cash, and phone secure.' }
        ],
        emergency: 'If harassed: Find security/bouncer, move to public area, call friends or police (100/1091).'    
    },
    workplace: {
        icon: '💼',
        title: 'Workplace Safety',
        color: '#2196F3',
        tips: [
            { icon: '📋', title: 'Know Policy', desc: 'Familiarize yourself with company harassment policies and reporting procedures.' },
            { icon: '📍', title: 'Share Schedule', desc: 'Inform family of work hours and overtime. Share when leaving office late.' },
            { icon: '🅿️', title: 'Parking Safety', desc: 'Park in well-lit areas. Have keys ready before reaching your vehicle.' },
            { icon: '🚶', title: 'Leave Together', desc: 'Leave with colleagues when working late. Use security escort if available.' },
            { icon: '📞', title: 'Report Issues', desc: 'Report inappropriate behavior immediately. Document incidents with dates/times.' },
            { icon: '🆘', title: 'Panic Button', desc: 'Know location of emergency buttons. Save security and HR contacts on phone.' }
        ],
        emergency: 'If harassed: Document incident, report to HR/ICC, seek legal help if needed. Helpline: 1091.'
    },
    online: {
        icon: '📱',
        title: 'Online Safety',
        color: '#00BCD4',
        tips: [
            { icon: '🔐', title: 'Privacy Settings', desc: 'Set social media profiles to private. Limit personal information shared online.' },
            { icon: '📸', title: 'Photo Caution', desc: 'Don\'t share intimate photos. Be careful with location tags on posts.' },
            { icon: '🛑', title: 'Block & Report', desc: 'Block harassers immediately. Report abuse to platforms and authorities.' },
            { icon: '💬', title: 'Stranger Danger', desc: 'Don\'t meet online friends alone. If meeting, choose public places with friends.' },
            { icon: '🔑', title: 'Strong Passwords', desc: 'Use unique passwords. Enable two-factor authentication on all accounts.' },
            { icon: '⚠️', title: 'Phishing Alert', desc: 'Don\'t click suspicious links. Verify before sharing personal/financial info.' }
        ],
        emergency: 'If harassed online: Save evidence (screenshots), report to cyber cell (1930), block perpetrator.'
    }
};

function showSafetyTips() {
    const modal = document.getElementById('safetyTipsModal');
    if (modal) {
        modal.style.display = 'block';
        // Reset to scenario selection
        document.getElementById('scenarioSelectionView').style.display = 'block';
        document.getElementById('scenarioTipsView').style.display = 'none';
    } else {
        showNotification('Safety Tips feature not available', 'error');
    }
}

function closeSafetyTipsModal() {
    const modal = document.getElementById('safetyTipsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showScenarioTips(scenarioKey) {
    const scenario = safetyScenarios[scenarioKey];
    if (!scenario) return;
    
    const selectionView = document.getElementById('scenarioSelectionView');
    const tipsView = document.getElementById('scenarioTipsView');
    const contentDiv = document.getElementById('scenarioTipsContent');
    
    // Build tips HTML
    const tipsHTML = scenario.tips.map((tip, index) => `
        <div style="background: rgba(255,255,255,0.05); border: 1px solid ${scenario.color}40; border-radius: 12px; padding: 20px; margin-bottom: 15px; display: flex; align-items: flex-start; gap: 15px; animation: slideIn 0.3s ease ${index * 0.1}s both;">
            <div style="font-size: 28px; flex-shrink: 0;">${tip.icon}</div>
            <div>
                <h5 style="color: ${scenario.color}; margin: 0 0 8px 0; font-size: 16px;">${tip.title}</h5>
                <p style="color: #cccccc; margin: 0; font-size: 14px; line-height: 1.5;">${tip.desc}</p>
            </div>
        </div>
    `).join('');
    
    contentDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 25px;">
            <div style="font-size: 48px; margin-bottom: 10px;">${scenario.icon}</div>
            <h3 style="color: ${scenario.color}; margin: 0 0 10px 0; font-size: 24px;">${scenario.title}</h3>
            <div style="height: 3px; width: 60px; background: ${scenario.color}; margin: 0 auto; border-radius: 2px;"></div>
        </div>
        
        <div style="margin-bottom: 20px;">
            ${tipsHTML}
        </div>
        
        <div style="background: linear-gradient(135deg, ${scenario.color}30, ${scenario.color}10); border: 2px solid ${scenario.color}; border-radius: 12px; padding: 20px; margin-top: 20px;">
            <h4 style="color: ${scenario.color}; margin: 0 0 12px 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                🚨 Emergency Action
            </h4>
            <p style="color: #ffffff; margin: 0; font-size: 15px; line-height: 1.6;">${scenario.emergency}</p>
        </div>
        
        <div style="text-align: center; margin-top: 25px; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 10px;">
            <p style="color: #888; margin: 0; font-size: 13px;">
                📞 Emergency Helplines: Police 100 | Women Helpline 1091 | Cyber Crime 1930
            </p>
        </div>
        
        <style>
            @keyframes slideIn {
                from { opacity: 0; transform: translateX(-20px); }
                to { opacity: 1; transform: translateX(0); }
            }
        </style>
    `;
    
    // Switch views
    selectionView.style.display = 'none';
    tipsView.style.display = 'block';
}

function backToScenarios() {
    document.getElementById('scenarioSelectionView').style.display = 'block';
    document.getElementById('scenarioTipsView').style.display = 'none';
}

// =======================
// DISASTER MANAGEMENT FUNCTIONS
// =======================
function showShelters() {
    showNotification('Finding nearby emergency shelters...', 'info');
    
    navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        setTimeout(() => {
            showNotification('Found 3 nearby shelters', 'success');
            // Open Google Maps for shelters
            window.open(`https://www.google.com/maps/search/emergency+shelter+near+me/@${lat},${lon}`);
        }, 1500);
    });
}

function showEvacuationRoutes() {
    showNotification('Loading evacuation routes...', 'info');
    
    const container = document.getElementById('evacuationRoutesContainer');
    const list = document.getElementById('evacuationRoutesList');
    
    if (!container || !list) return;
    
    // Sample evacuation routes data
    const routes = [
        {
            name: 'Route A - Main Highway',
            distance: '5.2 km',
            time: '12 mins',
            status: 'Clear',
            statusColor: '#22c55e',
            shelter: 'City Convention Center',
            directions: ['Head north on Main St', 'Turn right on Highway 101', 'Continue for 4.5 km', 'Turn left at Emergency Shelter sign']
        },
        {
            name: 'Route B - Coastal Road',
            distance: '8.7 km',
            time: '18 mins',
            status: 'Heavy Traffic',
            statusColor: '#f59e0b',
            shelter: 'Beach Community Hall',
            directions: ['Take Marine Drive east', 'Follow coastal road for 6 km', 'Turn right at Beach Road', 'Continue to Community Hall']
        },
        {
            name: 'Route C - Inland Path',
            distance: '12.3 km',
            time: '25 mins',
            status: 'Clear',
            statusColor: '#22c55e',
            shelter: 'Mount High School',
            directions: ['Head west on Oak Avenue', 'Turn left on Hill Road', 'Continue uphill for 8 km', 'School is on your right']
        },
        {
            name: 'Route D - Expressway',
            distance: '15.1 km',
            time: '20 mins',
            status: 'Partial Closure',
            statusColor: '#ef4444',
            shelter: 'Central Stadium',
            directions: ['Take Expressway North', 'Exit at Gate 45', 'Follow detour signs', 'Continue to Stadium parking']
        }
    ];
    
    // Generate HTML for routes
    list.innerHTML = routes.map((route, index) => `
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 15px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <h4 style="margin: 0; color: var(--text-color); font-size: 16px;">${route.name}</h4>
                <span style="background: ${route.statusColor}20; color: ${route.statusColor}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; border: 1px solid ${route.statusColor}40;">${route.status}</span>
            </div>
            <div style="display: flex; gap: 20px; margin-bottom: 12px; font-size: 13px; color: var(--text-secondary);">
                <span>📏 ${route.distance}</span>
                <span>⏱️ ${route.time}</span>
                <span>🏠 ${route.shelter}</span>
            </div>
            <div style="background: var(--bg-color); border-radius: 8px; padding: 12px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: var(--text-secondary); font-weight: bold;">📍 Directions:</p>
                <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: var(--text-color);">
                    ${route.directions.map(d => `<li style="margin-bottom: 4px;">${d}</li>`).join('')}
                </ol>
            </div>
        </div>
    `).join('');
    
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
}

function closeEvacuationRoutes() {
    const container = document.getElementById('evacuationRoutesContainer');
    if (container) container.style.display = 'none';
}

// Default emergency supplies
const DEFAULT_SUPPLIES = [
    { id: 'supply_1', name: '📱 Mobile Phone + Charger', checked: false, category: 'essential' },
    { id: 'supply_2', name: '💧 Water (3 days supply)', checked: false, category: 'essential' },
    { id: 'supply_3', name: '🍫 Non-perishable Food', checked: false, category: 'essential' },
    { id: 'supply_4', name: '🔦 Flashlight + Batteries', checked: false, category: 'essential' },
    { id: 'supply_5', name: '🔥 First Aid Kit', checked: false, category: 'essential' },
    { id: 'supply_6', name: '🧻 Toiletries & Hygiene Items', checked: false, category: 'personal' },
    { id: 'supply_7', name: '👕 Change of Clothes', checked: false, category: 'personal' },
    { id: 'supply_8', name: '💊 Prescription Medications', checked: false, category: 'medical' },
    { id: 'supply_9', name: '💵 Cash & Important Documents', checked: false, category: 'essential' },
    { id: 'supply_10', name: '📻 Battery-powered Radio', checked: false, category: 'essential' }
];

// Get or initialize supplies from localStorage
function getSupplies() {
    const stored = localStorage.getItem('emergencySupplies');
    if (stored) {
        return JSON.parse(stored);
    }
    // Initialize with defaults
    localStorage.setItem('emergencySupplies', JSON.stringify(DEFAULT_SUPPLIES));
    return DEFAULT_SUPPLIES;
}

// Save supplies to localStorage
function saveSupplies(supplies) {
    localStorage.setItem('emergencySupplies', JSON.stringify(supplies));
}

// Toggle supply item checked status
function toggleSupply(id) {
    let supplies = getSupplies();
    const supply = supplies.find(s => s.id === id);
    if (supply) {
        supply.checked = !supply.checked;
        saveSupplies(supplies);
        renderSuppliesList();
    }
}

// Add new supply item
function addSupplyItem() {
    const input = document.getElementById('newSupplyInput');
    const name = input.value.trim();
    
    if (!name) {
        showNotification('Please enter an item name', 'warning');
        return;
    }
    
    let supplies = getSupplies();
    const newSupply = {
        id: 'supply_' + Date.now(),
        name: name,
        checked: false,
        category: 'custom'
    };
    
    supplies.push(newSupply);
    saveSupplies(supplies);
    input.value = '';
    renderSuppliesList();
    showNotification('Item added to checklist!', 'success');
}

// Delete supply item
function deleteSupply(id) {
    let supplies = getSupplies();
    supplies = supplies.filter(s => s.id !== id);
    saveSupplies(supplies);
    renderSuppliesList();
}

// Render the supplies checklist
function renderSuppliesList() {
    const supplies = getSupplies();
    const list = document.getElementById('emergencySuppliesList');
    const progressText = document.getElementById('suppliesProgressText');
    const progressBar = document.getElementById('suppliesProgressBar');
    
    if (!list) return;
    
    const checkedCount = supplies.filter(s => s.checked).length;
    const totalCount = supplies.length;
    const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;
    
    if (progressText) progressText.textContent = `${checkedCount}/${totalCount}`;
    if (progressBar) progressBar.style.width = `${progress}%`;
    
    // Group by category
    const categories = {
        essential: '⚠️ Essential Items',
        personal: '👤 Personal Items',
        medical: '💊 Medical Items',
        custom: '📝 Custom Items'
    };
    
    let html = '';
    
    Object.keys(categories).forEach(cat => {
        const catSupplies = supplies.filter(s => s.category === cat);
        if (catSupplies.length > 0) {
            html += `<div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: var(--warning-color); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">${categories[cat]}</h4>`;
            
            catSupplies.forEach(supply => {
                html += `
                    <div onclick="toggleSupply('${supply.id}')" style="display: flex; align-items: center; padding: 12px 15px; margin-bottom: 8px; background: ${supply.checked ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; border: 2px solid ${supply.checked ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 10px; cursor: pointer; transition: all 0.3s;">
                        <div style="width: 24px; height: 24px; border: 2px solid ${supply.checked ? '#22c55e' : 'var(--text-secondary)'}; border-radius: 6px; margin-right: 12px; display: flex; align-items: center; justify-content: center; background: ${supply.checked ? '#22c55e' : 'transparent'}; transition: all 0.3s;">
                            ${supply.checked ? '<span style="color: white; font-size: 16px;">✓</span>' : ''}
                        </div>
                        <span style="flex: 1; font-size: 15px; color: ${supply.checked ? 'var(--text-secondary)' : 'var(--text-color)'}; text-decoration: ${supply.checked ? 'line-through' : 'none'}; transition: all 0.3s;">${supply.name}</span>
                        ${supply.category === 'custom' ? `<button onclick="event.stopPropagation(); deleteSupply('${supply.id}')" style="background: none; border: none; color: var(--danger-color); font-size: 18px; cursor: pointer; padding: 0 5px;" title="Remove item">🗑️</button>` : ''}
                    </div>
                `;
            });
            
            html += `</div>`;
        }
    });
    
    list.innerHTML = html;
}

function showSupplies() {
    showNotification('Loading emergency supply checklist...', 'info');
    
    const container = document.getElementById('emergencySuppliesContainer');
    if (!container) return;
    
    renderSuppliesList();
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
    
    // Add enter key support for input
    const input = document.getElementById('newSupplyInput');
    if (input) {
        input.onkeypress = function(e) {
            if (e.key === 'Enter') {
                addSupplyItem();
            }
        };
    }
}

function closeSupplies() {
    const container = document.getElementById('emergencySuppliesContainer');
    if (container) container.style.display = 'none';
}

// India Emergency Helpline Numbers
const EMERGENCY_NUMBERS = [
    {
        number: '112',
        name: 'National Emergency',
        description: 'All-in-one emergency number',
        icon: '🚨',
        color: '#ef4444'
    },
    {
        number: '108',
        name: 'Disaster Management',
        description: 'NDMA Emergency Response',
        icon: '🌪️',
        color: '#f59e0b'
    },
    {
        number: '101',
        name: 'Fire Service',
        description: 'Fire & Rescue Services',
        icon: '🔥',
        color: '#ea580c'
    },
    {
        number: '102',
        name: 'Ambulance',
        description: 'Medical Emergency',
        icon: '🚑',
        color: '#22c55e'
    },
    {
        number: '100',
        name: 'Police',
        description: 'Law Enforcement',
        icon: '👮',
        color: '#3b82f6'
    },
    {
        number: '1070',
        name: 'Control Room',
        description: 'District Emergency',
        icon: '📞',
        color: '#8b5cf6'
    }
];

function callEmergencyServices() {
    console.log('callEmergencyServices() called');
    showNotification('Connecting to emergency services...', 'info');
    
    const container = document.getElementById('emergencyCallContainer');
    const list = document.getElementById('emergencyNumbersList');
    
    console.log('Container found:', !!container, 'List found:', !!list);
    
    if (!container || !list) {
        console.error('Emergency call container or list not found!');
        return;
    }
    
    // Generate emergency number cards with onclick for confirmation
    list.innerHTML = EMERGENCY_NUMBERS.map(emergency => `
        <div onclick="handleEmergencyCall('${emergency.number}', '${emergency.name}', '${emergency.icon}')" style="background: linear-gradient(135deg, ${emergency.color}15, ${emergency.color}05); border: 2px solid ${emergency.color}40; border-radius: 15px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 10px 30px ${emergency.color}30'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
            <div style="font-size: 40px; margin-bottom: 10px;">${emergency.icon}</div>
            <div style="font-size: 28px; font-weight: bold; color: ${emergency.color}; margin-bottom: 5px;">${emergency.number}</div>
            <div style="font-size: 16px; font-weight: bold; color: var(--text-color); margin-bottom: 5px;">${emergency.name}</div>
            <div style="font-size: 13px; color: var(--text-secondary);">${emergency.description}</div>
        </div>
    `).join('');
    
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
}

function closeEmergencyCall() {
    const container = document.getElementById('emergencyCallContainer');
    if (container) container.style.display = 'none';
}

// Fake call simulation variables
let fakeCallTimer = null;
let fakeCallSeconds = 0;
let isMuted = false;
let isSpeakerOn = false;

// Handle emergency number click with confirmation
function handleEmergencyCall(number, name, icon) {
    // Show confirmation dialog
    const confirmCall = confirm(`📞 Call ${name} (${number})?\n\nThis will dial the emergency number. Are you sure?`);
    
    if (confirmCall) {
        // Start fake call simulation for demo
        startFakeCall(number, name, icon);
    }
}

// Start fake call simulation
function startFakeCall(number, name, icon) {
    const overlay = document.getElementById('fakeCallOverlay');
    const serviceName = document.getElementById('callServiceName');
    const serviceNumber = document.getElementById('callServiceNumber');
    const callStatus = document.getElementById('callStatus');
    const timer = document.getElementById('callTimer');
    
    if (!overlay) return;
    
    // Set call info
    serviceName.textContent = name || 'Emergency';
    serviceNumber.textContent = number || '112';
    callStatus.textContent = '📞 Ringing...';
    callStatus.style.color = '#22c55e';
    timer.textContent = '00:00';
    
    // Reset states
    isMuted = false;
    isSpeakerOn = false;
    fakeCallSeconds = 0;
    
    // Show overlay
    overlay.style.display = 'flex';
    
    // Simulate ringing for 3 seconds then "connected"
    setTimeout(() => {
        if (overlay.style.display === 'flex') {
            callStatus.textContent = '🔴 Connected';
            callStatus.style.color = '#ef4444';
            
            // Start timer
            fakeCallTimer = setInterval(() => {
                fakeCallSeconds++;
                const mins = Math.floor(fakeCallSeconds / 60).toString().padStart(2, '0');
                const secs = (fakeCallSeconds % 60).toString().padStart(2, '0');
                timer.textContent = `${mins}:${secs}`;
            }, 1000);
        }
    }, 3000);
}

// End fake call
function endFakeCall() {
    const overlay = document.getElementById('fakeCallOverlay');
    
    if (fakeCallTimer) {
        clearInterval(fakeCallTimer);
        fakeCallTimer = null;
    }
    
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    const mins = Math.floor(fakeCallSeconds / 60).toString().padStart(2, '0');
    const secs = (fakeCallSeconds % 60).toString().padStart(2, '0');
    showNotification(`Call ended. Duration: ${mins}:${secs}`, 'info');
}

// Toggle mute
function toggleMute() {
    isMuted = !isMuted;
    showNotification(isMuted ? '🔇 Muted' : '🔊 Unmuted', 'info');
}

// Toggle speaker
function toggleSpeaker() {
    isSpeakerOn = !isSpeakerOn;
    showNotification(isSpeakerOn ? '🔊 Speaker On' : '🎧 Speaker Off', 'info');
}

// =======================
// HEALTH EMERGENCY FUNCTIONS
// =======================

// Sample nearby hospitals data
const NEARBY_HOSPITALS = [
    { name: 'Apollo Hospital', distance: '2.3 km', phone: '080-4030-4050', emergency: '108' },
    { name: 'Fortis Healthcare', distance: '4.1 km', phone: '080-6620-4444', emergency: '108' },
    { name: 'St. John\'s Hospital', distance: '5.8 km', phone: '080-2206-5000', emergency: '102' },
    { name: 'Manipal Hospital', distance: '7.2 km', phone: '080-2502-4444', emergency: '108' },
    { name: 'Victoria Hospital', distance: '8.5 km', phone: '080-2670-1150', emergency: '102' }
];

function medicalEmergency() {
    // First send the main SOS
    sendSOS();
    
    // Show hospital notification panel
    showHospitalNotification();
}

function showHospitalNotification() {
    const container = document.getElementById('emergencyCallContainer');
    const list = document.getElementById('emergencyNumbersList');
    
    if (!container || !list) return;
    
    // Update header for hospitals
    const header = container.querySelector('h3');
    if (header) {
        header.textContent = '🏥 Nearby Hospitals';
        header.style.color = '#ef4444';
    }
    
    // Update description
    const desc = container.querySelector('p');
    if (desc) {
        desc.innerHTML = '🚨 Medical Emergency Alert Sent!<br>Select a hospital to call directly.';
    }
    
    // Generate hospital cards
    list.innerHTML = NEARBY_HOSPITALS.map(hospital => `
        <div onclick="handleHospitalCall('${hospital.name}', '${hospital.phone}', '${hospital.emergency}')" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05)); border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 15px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 10px 30px rgba(239, 68, 68, 0.3)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
            <div style="font-size: 40px; margin-bottom: 10px;">🏥</div>
            <div style="font-size: 18px; font-weight: bold; color: var(--text-color); margin-bottom: 5px;">${hospital.name}</div>
            <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">
                <span style="margin-right: 15px;">📍 ${hospital.distance}</span>
            </div>
            <div style="font-size: 20px; font-weight: bold; color: #22c55e; margin-bottom: 5px;">
                📞 ${hospital.phone}
            </div>
            <div style="font-size: 13px; color: var(--text-secondary);">
                Emergency: ${hospital.emergency}
            </div>
            <div style="margin-top: 10px; padding: 8px; background: rgba(34, 197, 94, 0.15); border-radius: 8px; font-size: 12px; color: #22c55e;">
                Click to Call
            </div>
        </div>
    `).join('');
    
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
    
    // Show notification
    showNotification('🚨 Medical SOS sent! Nearby hospitals notified.', 'danger');
    
    // Simulate sending notifications to hospitals
    setTimeout(() => {
        showNotification('📨 Alerts sent to 5 nearby hospitals', 'info');
    }, 1500);
    
    setTimeout(() => {
        showNotification('📍 Your location shared with emergency services', 'info');
    }, 3000);
}

function handleHospitalCall(hospitalName, phone, emergencyNumber) {
    // Show confirmation
    const confirmCall = confirm(`📞 Call ${hospitalName}?\n\nPhone: ${phone}\nEmergency: ${emergencyNumber}\n\nYour location will be shared with the hospital.`);
    
    if (confirmCall) {
        // Start fake call simulation
        startFakeCall(phone, hospitalName, '🏥');
        
        // In a real app, this would dial: window.location.href = `tel:${phone}`;
    }
}

function findHospitals() {
    showNotification('Finding nearby hospitals...', 'info');
    
    navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        setTimeout(() => {
            showNotification('Found 5 nearby hospitals', 'success');
            // Open Google Maps for hospitals
            window.open(`https://www.google.com/maps/search/hospital+near+me/@${lat},${lon}`);
        }, 1500);
    });
}

let medicationReminders = JSON.parse(localStorage.getItem('medicationReminders')) || [];
let reminderCheckInterval = null;

function setupMedication() {
    console.log('setupMedication() called');
    showNotification('Opening medication reminder setup...', 'info');
    
    const container = document.getElementById('medicationReminderContainer');
    console.log('Container found:', !!container);
    
    if (container) {
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log('Container displayed and scrolled into view');
        renderRemindersList();
        console.log('Reminders rendered');
        startReminderChecker();
        console.log('Checker started');
        showNotification('Medication reminder form opened! Fill in details and click Set Reminder', 'success');
    } else {
        console.error('medicationReminderContainer not found!');
        showNotification('Error: Could not open reminder form', 'error');
    }
}

function closeMedicationReminder() {
    const container = document.getElementById('medicationReminderContainer');
    if (container) container.style.display = 'none';
    stopReminderChecker();
}

function addMedicationReminder() {
    const medicine = document.getElementById('medicineName').value.trim();
    const date = document.getElementById('reminderDate').value;
    const time = document.getElementById('reminderTime').value;
    const type = document.getElementById('alarmType').value;
    const purpose = document.getElementById('reminderPurpose').value.trim();
    
    if (!medicine || !date || !time) {
        showNotification('Please fill medicine name, date and time', 'warning');
        return;
    }
    
    const reminder = {
        id: Date.now(),
        medicine,
        date,
        time,
        type,
        purpose: purpose || 'Take medication',
        active: true
    };
    
    medicationReminders.push(reminder);
    saveReminders();
    renderRemindersList();
    
    document.getElementById('medicineName').value = '';
    document.getElementById('reminderDate').value = '';
    document.getElementById('reminderTime').value = '';
    document.getElementById('reminderPurpose').value = '';
    
    showNotification(`Reminder set for ${medicine} at ${time}`, 'success');
}

function saveReminders() {
    localStorage.setItem('medicationReminders', JSON.stringify(medicationReminders));
}

function deleteReminder(id) {
    medicationReminders = medicationReminders.filter(r => r.id !== id);
    saveReminders();
    renderRemindersList();
}

function toggleReminder(id) {
    const reminder = medicationReminders.find(r => r.id === id);
    if (reminder) {
        reminder.active = !reminder.active;
        saveReminders();
        renderRemindersList();
    }
}

function renderRemindersList() {
    const list = document.getElementById('remindersList');
    if (!list) return;
    
    if (medicationReminders.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-secondary);"><div style="font-size:48px;margin-bottom:15px;">💊</div><p>No reminders set</p></div>';
        return;
    }
    
    const sorted = [...medicationReminders].sort((a, b) => 
        new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time)
    );
    
    list.innerHTML = sorted.map(r => {
        const now = new Date();
        const reminderTime = new Date(r.date + 'T' + r.time);
        const isPast = reminderTime < now;
        const status = r.active ? (isPast ? 'Overdue' : 'Active') : 'Paused';
        const color = r.active ? (isPast ? '#ef4444' : '#22c55e') : '#64748b';
        const icon = { 'once': '⏰', 'daily': '📅', 'weekly': '📆' }[r.type];
        
        return `<div style="background:var(--input-bg);border:2px solid ${color}40;border-radius:12px;padding:15px;margin-bottom:12px;display:flex;align-items:center;gap:15px;">
            <div style="width:50px;height:50px;border-radius:50%;background:${color}20;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">💊</div>
            <div style="flex:1;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">
                    <span style="font-weight:bold;color:var(--text-color);">${r.medicine}</span>
                    <span style="font-size:12px;padding:3px 8px;background:${color}20;color:${color};border-radius:20px;">${icon} ${status}</span>
                </div>
                <div style="color:var(--text-secondary);font-size:13px;">📅 ${new Date(r.date).toLocaleDateString()} at ${r.time} | 📝 ${r.purpose}</div>
            </div>
            <div style="display:flex;gap:8px;">
                <button onclick="toggleReminder(${r.id})" style="padding:8px 12px;background:${r.active ? '#22c55e' : '#64748b'};border:none;border-radius:8px;color:white;cursor:pointer;font-size:12px;">${r.active ? '⏸️' : '▶️'}</button>
                <button onclick="deleteReminder(${r.id})" style="padding:8px 12px;background:#ef4444;border:none;border-radius:8px;color:white;cursor:pointer;font-size:12px;">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function startReminderChecker() {
    if (reminderCheckInterval) return;
    reminderCheckInterval = setInterval(checkReminders, 60000);
    checkReminders();
}

function stopReminderChecker() {
    if (reminderCheckInterval) {
        clearInterval(reminderCheckInterval);
        reminderCheckInterval = null;
    }
}

function checkReminders() {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    
    medicationReminders.forEach(r => {
        if (!r.active) return;
        let shouldTrigger = false;
        
        if (r.type === 'once' && r.date === currentDate && r.time === currentTime) shouldTrigger = true;
        else if (r.type === 'daily' && r.time === currentTime) shouldTrigger = true;
        else if (r.type === 'weekly') {
            const reminderDay = new Date(r.date).getDay();
            if (reminderDay === now.getDay() && r.time === currentTime) shouldTrigger = true;
        }
        
        if (shouldTrigger) {
            showNotification(`⏰ TIME FOR MEDICINE: ${r.medicine}!`, 'warning', 10000);
        }
    });
}

// =======================
// MEDICAL HISTORY FUNCTIONS
// =======================

let medicalHistory = JSON.parse(localStorage.getItem('medicalHistory')) || [];

function viewMedicalHistory() {
    showNotification('Loading medical history...', 'info');
    
    const container = document.getElementById('medicalHistoryContainer');
    if (container) {
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        renderMedicalHistoryList();
        setupFileUploadListener();
        showNotification('Medical history loaded! Add your records below', 'success');
    } else {
        console.error('medicalHistoryContainer not found!');
        showNotification('Error: Could not load medical history', 'error');
    }
}

function closeMedicalHistory() {
    const container = document.getElementById('medicalHistoryContainer');
    if (container) {
        container.style.display = 'none';
    }
}

function setupFileUploadListener() {
    const fileInput = document.getElementById('medicalReportFile');
    const fileLabel = document.getElementById('fileLabelText');
    const selectedFileName = document.getElementById('selectedFileName');
    
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const fileName = file.name;
                const fileSize = (file.size / 1024).toFixed(1) + ' KB';
                
                if (fileLabel) {
                    fileLabel.textContent = '📎 ' + fileName + ' (' + fileSize + ')';
                }
                if (selectedFileName) {
                    selectedFileName.textContent = fileName;
                    selectedFileName.style.display = 'inline-block';
                }
                
                showNotification('Report selected: ' + fileName, 'info');
            }
        });
    }
}

function addMedicalHistory() {
    const condition = document.getElementById('medicalCondition').value.trim();
    const date = document.getElementById('medicalDate').value;
    const doctor = document.getElementById('medicalDoctor').value.trim();
    const notes = document.getElementById('medicalNotes').value.trim();
    const fileInput = document.getElementById('medicalReportFile');
    
    if (!condition || !date) {
        showNotification('Please fill condition and date', 'warning');
        return;
    }
    
    const record = {
        id: Date.now(),
        condition,
        date,
        doctor: doctor || 'Not specified',
        notes: notes || 'No additional notes',
        hasFile: false,
        fileName: null,
        fileData: null,
        createdAt: new Date().toISOString()
    };
    
    // Handle file upload
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('File too large! Max 5MB allowed', 'warning');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            record.hasFile = true;
            record.fileName = file.name;
            record.fileType = file.type;
            record.fileData = e.target.result;
            
            saveAndRenderRecord(record);
        };
        reader.readAsDataURL(file);
    } else {
        saveAndRenderRecord(record);
    }
}

function saveAndRenderRecord(record) {
    medicalHistory.push(record);
    localStorage.setItem('medicalHistory', JSON.stringify(medicalHistory));
    renderMedicalHistoryList();
    
    // Clear form
    document.getElementById('medicalCondition').value = '';
    document.getElementById('medicalDate').value = '';
    document.getElementById('medicalDoctor').value = '';
    document.getElementById('medicalNotes').value = '';
    document.getElementById('medicalReportFile').value = '';
    
    const fileLabel = document.getElementById('fileLabelText');
    const selectedFileName = document.getElementById('selectedFileName');
    if (fileLabel) fileLabel.textContent = '📁 Click to upload report';
    if (selectedFileName) selectedFileName.style.display = 'none';
    
    showNotification('Medical record added successfully!', 'success');
}

function deleteMedicalRecord(id) {
    if (confirm('Are you sure you want to delete this medical record?')) {
        medicalHistory = medicalHistory.filter(r => r.id !== id);
        localStorage.setItem('medicalHistory', JSON.stringify(medicalHistory));
        renderMedicalHistoryList();
        showNotification('Record deleted', 'info');
    }
}

function viewMedicalFile(recordId) {
    const record = medicalHistory.find(r => r.id === recordId);
    if (record && record.hasFile && record.fileData) {
        // Open file in new tab
        const newWindow = window.open();
        if (newWindow) {
            newWindow.document.write(`
                <html>
                <head>
                    <title>Medical Report - ${record.fileName}</title>
                    <style>
                        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1a1a2e; }
                        .container { text-align: center; padding: 20px; }
                        img, embed { max-width: 100%; max-height: 90vh; border-radius: 8px; }
                        .info { color: white; margin-bottom: 20px; font-family: sans-serif; }
                        .download-btn { 
                            display: inline-block; 
                            margin-top: 20px; 
                            padding: 12px 24px; 
                            background: #22c55e; 
                            color: white; 
                            text-decoration: none; 
                            border-radius: 8px; 
                            font-family: sans-serif;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="info">
                            <h2>${record.condition}</h2>
                            <p>Date: ${new Date(record.date).toLocaleDateString()}</p>
                            <p>File: ${record.fileName}</p>
                        </div>
                        ${record.fileType && record.fileType.startsWith('image/') 
                            ? `<img src="${record.fileData}" alt="Medical Report">` 
                            : `<embed src="${record.fileData}" type="${record.fileType || 'application/pdf'}" width="100%" height="600px">`
                        }
                        <br>
                        <a href="${record.fileData}" download="${record.fileName}" class="download-btn">⬇️ Download Report</a>
                    </div>
                </body>
                </html>
            `);
        }
    } else {
        showNotification('No file attached to this record', 'warning');
    }
}

function renderMedicalHistoryList() {
    const list = document.getElementById('medicalHistoryList');
    if (!list) return;
    
    if (medicalHistory.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <div style="font-size: 64px; margin-bottom: 20px;">📋</div>
                <p style="font-size: 16px; margin-bottom: 10px;">No medical records yet</p>
                <p style="font-size: 13px; opacity: 0.7;">Add your first medical record above</p>
            </div>
        `;
        return;
    }
    
    // Sort by date (newest first)
    const sortedHistory = [...medicalHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    list.innerHTML = sortedHistory.map(record => {
        const hasAttachment = record.hasFile;
        const attachmentIcon = hasAttachment ? '📎' : '';
        const attachmentText = hasAttachment ? `<span style="color: #22c55e; font-size: 12px;">📎 ${record.fileName}</span>` : '<span style="color: #64748b; font-size: 12px;">No attachment</span>';
        
        return `
            <div style="background: var(--input-bg); border: 2px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 15px; transition: all 0.3s;" onmouseover="this.style.borderColor='rgba(34, 197, 94, 0.6)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='rgba(34, 197, 94, 0.3)'; this.style.transform='translateY(0)';">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div>
                        <div style="font-size: 18px; font-weight: bold; color: var(--text-color); margin-bottom: 5px;">
                            🏥 ${record.condition} ${attachmentIcon}
                        </div>
                        <div style="color: var(--text-secondary); font-size: 13px;">
                            📅 ${new Date(record.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                    <button onclick="deleteMedicalRecord(${record.id})" style="background: #ef4444; border: none; border-radius: 8px; color: white; padding: 8px 12px; cursor: pointer; font-size: 12px; transition: all 0.3s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">🗑️ Delete</button>
                </div>
                
                <div style="background: var(--bg-color); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 14px;">
                        <div>
                            <span style="color: var(--text-secondary); font-size: 12px;">👨‍⚕️ Doctor/Hospital</span>
                            <div style="color: var(--text-color); font-weight: 500;">${record.doctor}</div>
                        </div>
                        <div>
                            <span style="color: var(--text-secondary); font-size: 12px;">📝 Notes</span>
                            <div style="color: var(--text-color);">${record.notes}</div>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    ${attachmentText}
                    ${hasAttachment ? `<button onclick="viewMedicalFile(${record.id})" style="background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 8px; color: #22c55e; padding: 8px 16px; cursor: pointer; font-size: 13px; transition: all 0.3s;" onmouseover="this.style.background='rgba(34, 197, 94, 0.3)'" onmouseout="this.style.background='rgba(34, 197, 94, 0.2)'">👁️ View Report</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// =======================
// ENHANCED SOS SYSTEM
// =======================
function setupSOSButtons() {
    const sosButtons = document.querySelectorAll('.sos-btn, .sos-btn-small');
    
    sosButtons.forEach(btn => {
        // Mouse events
        btn.addEventListener('mousedown', () => {
            sosTimer = setTimeout(() => {
                sendSOS();
            }, 2000); // 2 second hold
        });
        
        btn.addEventListener('mouseup', () => {
            clearTimeout(sosTimer);
        });
        
        btn.addEventListener('mouseleave', () => {
            clearTimeout(sosTimer);
        });
        
        // Touch events for mobile
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            sosTimer = setTimeout(() => {
                sendSOS();
            }, 2000);
        });
        
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            clearTimeout(sosTimer);
        });
    });
    
    // Floating SOS button
    const floatingSos = document.getElementById('floatingSos');
    if (floatingSos) {
        floatingSos.addEventListener('click', sendSOS);
    }
}

function sendSOS() {
    if (!currentUser) {
        showNotification('Please login or register to use SOS', 'error');
        return;
    }
    
    // If SOS already active, don't start again
    if (sosActive) {
        showNotification('SOS already active! Click the STOP button to cancel.', 'warning');
        return;
    }
    
    // Disable SOS button and show visual feedback
    const sosButtons = document.querySelectorAll('.sos-button, #sosButton, .emergency-btn');
    sosButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        btn.innerHTML = '🚨 ACTIVATING...';
    });
    
    // Show emergency activation with countdown
    sosActive = true;
    document.body.style.backgroundColor = '#7f1d1d';
    
    // Create stop SOS button
    createStopSOSButton();
    
    // Show countdown notification
    showNotification('SOS will activate in 5 seconds... Click STOP to cancel', 'warning');
    
    // Start countdown
    let countdown = 5;
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            showNotification(`SOS activating in ${countdown} seconds...`, 'warning');
        }
    }, 1000);
    
    // Activate SOS after 5 seconds (unless stopped)
    sosTimeoutId = setTimeout(() => {
        clearInterval(countdownInterval);
        if (sosActive) {
            activateSOS();
        }
    }, 5000);
}

async function activateSOS() {
    // Remove stop button
    removeStopSOSButton();
    
    // Start recording
    startEmergencyRecording();
    
    // Get location
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        
        try {
            // Send SOS to backend API
            const response = await apiPost('/sos/alert', {
                latitude: lat,
                longitude: lon,
                locationAccuracy: pos.coords.accuracy,
                message: `🚨 SOS ALERT from ${currentUser.firstName} ${currentUser.lastName}`,
                hasRecording: true,
                contactsNotified: (currentUser.emergencyContacts || []).map(c => ({
                    name: c.name,
                    phone: c.phone,
                    notifiedAt: new Date()
                }))
            });
            
            showNotification('SOS alert sent to backend and emergency contacts', 'success');
        } catch (error) {
            console.error('SOS API error:', error);
            showNotification('SOS alert sent locally (API unavailable)', 'warning');
        }
        
        const message = `🚨 SOS ALERT!
Name: ${currentUser.firstName} ${currentUser.lastName}
Location: https://maps.google.com/?q=${lat},${lon}
Time: ${new Date().toLocaleString()}
Phone: ${currentUser.phoneNumber}`;
        
        // Send to emergency contacts
        if (currentUser.emergencyContacts) {
            currentUser.emergencyContacts.forEach(contact => {
                console.log(`SOS sent to ${contact.name}: ${message}`);
            });
        }
        
        // Play emergency sound
        playEmergencySound();
        
        // Show emergency status
        showEmergencyStatus();
        
        // Send browser notification
        sendBrowserNotification('🚨 SOS ACTIVATED', `Emergency alert sent to ${currentUser.emergencyContacts?.length || 0} contacts`);
        
        // Reset after 10 seconds
        setTimeout(() => {
            resetSOS();
        }, 10000);
    });
}

function createStopSOSButton() {
    // Remove existing button if any
    removeStopSOSButton();
    
    const stopBtn = document.createElement('button');
    stopBtn.id = 'stop-sos-btn';
    stopBtn.innerHTML = '🛑 STOP SOS';
    stopBtn.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #22c55e, #16a34a);
        color: white;
        border: none;
        padding: 20px 40px;
        border-radius: 50px;
        font-size: 1.5rem;
        font-weight: bold;
        cursor: pointer;
        z-index: 10001;
        box-shadow: 0 10px 40px rgba(34, 197, 94, 0.6);
        animation: pulse 1s infinite;
    `;
    
    stopBtn.onclick = stopSOS;
    document.body.appendChild(stopBtn);
}

function removeStopSOSButton() {
    const stopBtn = document.getElementById('stop-sos-btn');
    if (stopBtn) {
        stopBtn.remove();
    }
}

function stopSOS() {
    // Clear the activation timeout
    if (sosTimeoutId) {
        clearTimeout(sosTimeoutId);
        sosTimeoutId = null;
    }
    
    // Reset SOS state
    sosActive = false;
    
    // Remove stop button
    removeStopSOSButton();
    
    // Reset background
    document.body.style.backgroundColor = '';
    
    // Re-enable SOS buttons and restore original text
    const sosButtons = document.querySelectorAll('.sos-button, #sosButton, .emergency-btn');
    sosButtons.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.innerHTML = '🚨 SOS';
    });
    
    // Show cancellation notification
    showNotification('SOS cancelled successfully', 'success');
}

function resetSOS() {
    sosActive = false;
    removeStopSOSButton();
    document.body.style.backgroundColor = '';
    
    // Re-enable SOS buttons and restore original text
    const sosButtons = document.querySelectorAll('.sos-button, #sosButton, .emergency-btn');
    sosButtons.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.innerHTML = '🚨 SOS';
    });
}

function debugEmergencyContacts() {
    console.log('=== DEBUG EMERGENCY CONTACTS ===');
    console.log('Current user:', currentUser);
    console.log('Emergency contacts from user:', currentUser?.emergencyContacts);
    console.log('Type of emergency contacts:', typeof currentUser?.emergencyContacts);
    console.log('Is array:', Array.isArray(currentUser?.emergencyContacts));
    
    const debugInfo = document.getElementById('debugInfo');
    if (debugInfo) {
        debugInfo.innerHTML = `
            <strong>Debug Info:</strong><br>
            User loaded: ${currentUser ? 'Yes' : 'No'}<br>
            Emergency contacts exist: ${currentUser?.emergencyContacts ? 'Yes' : 'No'}<br>
            Emergency contacts count: ${currentUser?.emergencyContacts?.length || 0}<br>
            Type: ${typeof currentUser?.emergencyContacts}<br>
            Is Array: ${Array.isArray(currentUser?.emergencyContacts)}<br>
            <button onclick="testAPIConnection()" style="margin-top: 10px; padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">Test API Connection</button>
            <button onclick="loadEmergencyContacts()" style="margin-top: 10px; padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">Reload Emergency Contacts</button>
        `;
    }
    
    // Force reload emergency contacts
    loadEmergencyContacts();
}

async function testAPIConnection() {
    console.log('=== TESTING API CONNECTION ===');
    
    // First, check what we have in localStorage
    const savedUser = localStorage.getItem('sahaya_user');
    console.log('📱 Saved user from localStorage:', savedUser ? JSON.parse(savedUser) : 'None');
    
    // Check current user variable
    console.log('👤 Current user variable:', currentUser);
    
    try {
        const response = await apiGet('/auth/me');
        console.log('🌐 API Test Response:', response);
        
        if (response.user) {
            console.log('✅ API working - Full user data:', response.user);
            console.log('✅ Emergency contacts:', response.user.emergencyContacts);
            console.log('✅ Address fields:', {
                houseNo: response.user.houseNo,
                street: response.user.street,
                city: response.user.city,
                state: response.user.state,
                pinCode: response.user.pinCode
            });
            console.log('✅ Portals:', response.user.portals);
            
            currentUser = response.user;
            localStorage.setItem('sahaya_user', JSON.stringify(currentUser));
            
            // Force reload all profile data
            loadProfile();
            loadEmergencyContacts();
            loadFamilyMembers();
            
            // Update debug info with detailed data
            const debugInfo = document.getElementById('debugInfo');
            if (debugInfo) {
                debugInfo.innerHTML = `
                    <strong>✅ API Data Loaded!</strong><br>
                    User: ${currentUser.firstName} ${currentUser.lastName}<br>
                    Emergency Contacts: ${currentUser.emergencyContacts?.length || 0}<br>
                    Address: ${currentUser.houseNo ? 'Available' : 'Missing'}<br>
                    <button onclick="showRawData()" style="margin-top: 10px; padding: 5px 10px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Show Raw Data</button>
                `;
            }
        } else {
            console.log('❌ API returned no user data');
        }
    } catch (error) {
        console.error('❌ API Test Failed:', error);
    }
}

function showRawData() {
    alert('Current User Data:\n\n' + JSON.stringify(currentUser, null, 2));
}

// Comprehensive Edit Profile Helper Functions
function populateEditEmergencyContacts() {
    const container = document.getElementById('editEmergencyContacts');
    container.innerHTML = '';
    
    const contacts = currentUser.emergencyContacts || [];
    contacts.forEach((contact, index) => {
        const contactDiv = document.createElement('div');
        contactDiv.className = 'edit-contact-item';
        contactDiv.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Contact Name</label>
                    <input type="text" class="edit-contact-name" value="${contact.name}" required>
                </div>
                <div class="form-group">
                    <label>Relationship</label>
                    <select class="edit-contact-relation" required>
                        <option value="parent" ${contact.relation === 'parent' ? 'selected' : ''}>Parent</option>
                        <option value="spouse" ${contact.relation === 'spouse' ? 'selected' : ''}>Spouse</option>
                        <option value="sibling" ${contact.relation === 'sibling' ? 'selected' : ''}>Sibling</option>
                        <option value="friend" ${contact.relation === 'friend' ? 'selected' : ''}>Friend</option>
                        <option value="guardian" ${contact.relation === 'guardian' ? 'selected' : ''}>Guardian</option>
                        <option value="other" ${contact.relation === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Phone Number</label>
                <input type="tel" class="edit-contact-phone" value="${contact.phone}" required maxlength="10">
            </div>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeEditEmergencyContact(this)">Remove</button>
            <hr>
        `;
        container.appendChild(contactDiv);
    });
}

function populateEditFamilyMembers() {
    const container = document.getElementById('editFamilyMembers');
    container.innerHTML = '';
    
    // Add children
    const children = currentUser.children || [];
    children.forEach((child, index) => {
        const childDiv = document.createElement('div');
        childDiv.className = 'edit-family-item';
        childDiv.innerHTML = `
            <h5>👶 Child ${index + 1}</h5>
            <div class="form-row">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" class="edit-child-name" value="${child.name}" required>
                </div>
                <div class="form-group">
                    <label>Age</label>
                    <input type="number" class="edit-child-age" value="${child.age}" min="0" max="18" required>
                </div>
            </div>
            <div class="form-group">
                <label>Gender</label>
                <select class="edit-child-gender" required>
                    <option value="male" ${child.gender === 'male' ? 'selected' : ''}>Male</option>
                    <option value="female" ${child.gender === 'female' ? 'selected' : ''}>Female</option>
                    <option value="other" ${child.gender === 'other' ? 'selected' : ''}>Other</option>
                </select>
            </div>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeEditFamilyMember(this)">Remove Child</button>
            <hr>
        `;
        container.appendChild(childDiv);
    });
    
    // Add elderly
    const elderly = currentUser.elderly || [];
    elderly.forEach((elder, index) => {
        const elderDiv = document.createElement('div');
        elderDiv.className = 'edit-family-item';
        elderDiv.innerHTML = `
            <h5>👴 Elderly ${index + 1}</h5>
            <div class="form-row">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" class="edit-elderly-name" value="${elder.name}" required>
                </div>
                <div class="form-group">
                    <label>Age</label>
                    <input type="number" class="edit-elderly-age" value="${elder.age}" min="60" required>
                </div>
            </div>
            <div class="form-group">
                <label>Gender</label>
                <select class="edit-elderly-gender" required>
                    <option value="male" ${elder.gender === 'male' ? 'selected' : ''}>Male</option>
                    <option value="female" ${elder.gender === 'female' ? 'selected' : ''}>Female</option>
                    <option value="other" ${elder.gender === 'other' ? 'selected' : ''}>Other</option>
                </select>
            </div>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeEditFamilyMember(this)">Remove Elderly</button>
            <hr>
        `;
        container.appendChild(elderDiv);
    });
}

function populateEditPortals() {
    const portals = currentUser.portals || [];
    document.getElementById('editPortalWomen').checked = portals.includes('women');
    document.getElementById('editPortalChild').checked = portals.includes('child');
    document.getElementById('editPortalDisaster').checked = portals.includes('disaster');
    document.getElementById('editPortalElderly').checked = portals.includes('elderly');
    document.getElementById('editPortalHealth').checked = portals.includes('health');
}

function addEditEmergencyContact() {
    const container = document.getElementById('editEmergencyContacts');
    const contactDiv = document.createElement('div');
    contactDiv.className = 'edit-contact-item';
    contactDiv.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Contact Name</label>
                <input type="text" class="edit-contact-name" required>
            </div>
            <div class="form-group">
                <label>Relationship</label>
                <select class="edit-contact-relation" required>
                    <option value="">Select Relationship</option>
                    <option value="parent">Parent</option>
                    <option value="spouse">Spouse</option>
                    <option value="sibling">Sibling</option>
                    <option value="friend">Friend</option>
                    <option value="guardian">Guardian</option>
                    <option value="other">Other</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Phone Number</label>
            <input type="tel" class="edit-contact-phone" required maxlength="10">
        </div>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeEditEmergencyContact(this)">Remove</button>
        <hr>
    `;
    container.appendChild(contactDiv);
}

function addEditFamilyMember() {
    const type = prompt('Add family member type: "child" or "elderly"');
    if (!type || (type !== 'child' && type !== 'elderly')) return;
    
    const container = document.getElementById('editFamilyMembers');
    const memberDiv = document.createElement('div');
    memberDiv.className = 'edit-family-item';
    
    const icon = type === 'child' ? '👶' : '👴';
    const label = type === 'child' ? 'Child' : 'Elderly';
    const ageMin = type === 'child' ? 0 : 60;
    const ageMax = type === 'child' ? 18 : 120;
    
    memberDiv.innerHTML = `
        <h5>${icon} New ${label}</h5>
        <div class="form-row">
            <div class="form-group">
                <label>Name</label>
                <input type="text" class="edit-${type}-name" required>
            </div>
            <div class="form-group">
                <label>Age</label>
                <input type="number" class="edit-${type}-age" min="${ageMin}" max="${ageMax}" required>
            </div>
        </div>
        <div class="form-group">
            <label>Gender</label>
            <select class="edit-${type}-gender" required>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
            </select>
        </div>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeEditFamilyMember(this)">Remove ${label}</button>
        <hr>
    `;
    container.appendChild(memberDiv);
}

function removeEditEmergencyContact(button) {
    button.parentElement.remove();
}

function removeEditFamilyMember(button) {
    button.parentElement.remove();
}

function closeEditProfileModal() {
    document.getElementById('editProfileModal').style.display = 'none';
}

// Update handleEditProfile to handle comprehensive data
async function handleEditProfile(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        showNotification('Updating profile...', 'info');
        
        // Collect basic information
        const updateData = {
            firstName: document.getElementById('editFirstName').value,
            lastName: document.getElementById('editLastName').value,
            email: document.getElementById('editEmail').value,
            phoneNumber: document.getElementById('editPhone').value,
            
            // Address information
            houseNo: document.getElementById('editHouseNo').value,
            street: document.getElementById('editStreet').value,
            city: document.getElementById('editCity').value,
            state: document.getElementById('editState').value,
            pinCode: document.getElementById('editPinCode').value,
            
            // Medical information
            medicalInfo: document.getElementById('editMedicalInfo').value,
            
            // Collect emergency contacts
            emergencyContacts: [],
            
            // Collect family members
            children: [],
            elderly: [],
            
            // Collect portals
            portals: []
        };
        
        // Collect emergency contacts
        const contactNames = document.querySelectorAll('.edit-contact-name');
        const contactRelations = document.querySelectorAll('.edit-contact-relation');
        const contactPhones = document.querySelectorAll('.edit-contact-phone');
        
        for (let i = 0; i < contactNames.length; i++) {
            if (contactNames[i].value && contactPhones[i].value) {
                updateData.emergencyContacts.push({
                    name: contactNames[i].value,
                    relation: contactRelations[i].value,
                    phone: contactPhones[i].value
                });
            }
        }
        
        // Collect children
        const childNames = document.querySelectorAll('.edit-child-name');
        const childAges = document.querySelectorAll('.edit-child-age');
        const childGenders = document.querySelectorAll('.edit-child-gender');
        
        for (let i = 0; i < childNames.length; i++) {
            if (childNames[i].value && childAges[i].value) {
                updateData.children.push({
                    name: childNames[i].value,
                    age: parseInt(childAges[i].value),
                    gender: childGenders[i].value,
                    type: 'child'
                });
            }
        }
        
        // Collect elderly
        const elderlyNames = document.querySelectorAll('.edit-elderly-name');
        const elderlyAges = document.querySelectorAll('.edit-elderly-age');
        const elderlyGenders = document.querySelectorAll('.edit-elderly-gender');
        
        for (let i = 0; i < elderlyNames.length; i++) {
            if (elderlyNames[i].value && elderlyAges[i].value) {
                updateData.elderly.push({
                    name: elderlyNames[i].value,
                    age: parseInt(elderlyAges[i].value),
                    gender: elderlyGenders[i].value,
                    type: 'elderly'
                });
            }
        }
        
        // Collect portals
        if (document.getElementById('editPortalWomen').checked) updateData.portals.push('women');
        if (document.getElementById('editPortalChild').checked) updateData.portals.push('child');
        if (document.getElementById('editPortalDisaster').checked) updateData.portals.push('disaster');
        if (document.getElementById('editPortalElderly').checked) updateData.portals.push('elderly');
        if (document.getElementById('editPortalHealth').checked) updateData.portals.push('health');
        
        console.log('🔄 Sending profile update:', updateData);
        
        // Send update to backend
        const response = await apiPut('/user/profile', updateData);
        
        if (response.success) {
            // Update local user data
            currentUser = response.user;
            localStorage.setItem('sahaya_user', JSON.stringify(currentUser));
            
            // Refresh profile display
            loadProfile();
            
            // Close modal
            closeEditProfileModal();
            
            showNotification('Profile updated successfully! ✅', 'success');
        } else {
            showNotification(response.message || 'Failed to update profile', 'error');
        }
        
    } catch (error) {
        console.error('Profile update error:', error);
        showNotification('Failed to update profile', 'error');
    }
}

function startEmergencyRecording() {
    if (isRecording) return;
    
    try {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                isRecording = true;
                
                // Store stream globally so we can stop it later
                window.currentRecordingStream = stream;
                
                // Create camera preview container
                const previewContainer = document.createElement('div');
                previewContainer.id = 'camera-preview-container';
                previewContainer.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 200px;
                    height: 150px;
                    background: #000;
                    border-radius: 10px;
                    overflow: hidden;
                    z-index: 9998;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                `;
                
                // Create video element for preview
                const video = document.createElement('video');
                video.id = 'camera-preview';
                video.srcObject = stream;
                video.autoplay = true;
                video.muted = true;
                video.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                `;
                
                previewContainer.appendChild(video);
                document.body.appendChild(previewContainer);
                
                // Create recording indicator (moved to left side to avoid conflict)
                const indicator = document.createElement('div');
                indicator.id = 'recording-indicator';
                indicator.innerHTML = '🔴 REC';
                indicator.style.cssText = `
                    position: fixed;
                    top: 20px;
                    left: 20px;
                    background: #dc2626;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 20px;
                    font-weight: bold;
                    z-index: 9999;
                    animation: pulse 1s infinite;
                `;
                document.body.appendChild(indicator);
                
                // Create stop recording button (separate from SOS stop button)
                const stopBtn = document.createElement('button');
                stopBtn.id = 'stop-recording-btn';
                stopBtn.innerHTML = '⏹ STOP REC';
                stopBtn.style.cssText = `
                    position: fixed;
                    top: 70px;
                    left: 20px;
                    background: #dc2626;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 20px;
                    cursor: pointer;
                    font-weight: bold;
                    z-index: 9999;
                `;
                stopBtn.onclick = function() {
                    stopEmergencyRecording();
                    showNotification('Recording stopped', 'success');
                };
                document.body.appendChild(stopBtn);
                
                // Show notification
                showNotification('Camera recording started', 'warning');
                
                // Auto stop after 30 seconds
                setTimeout(() => {
                    if (isRecording) {
                        stopEmergencyRecording();
                    }
                }, 30000);
            })
            .catch(err => {
                console.error("Camera access failed:", err);
                showNotification('Camera access failed. SOS sent without recording.', 'warning');
            });
    } catch (err) {
        console.error("Emergency recording failed:", err);
        showNotification('Recording failed. SOS sent without recording.', 'warning');
    }
}

function stopEmergencyRecording() {
    const stream = window.currentRecordingStream;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    
    // Remove camera preview
    const previewContainer = document.getElementById('camera-preview-container');
    if (previewContainer) {
        previewContainer.remove();
    }
    
    // Remove recording indicator
    const indicator = document.getElementById('recording-indicator');
    if (indicator) {
        indicator.remove();
    }
    
    // Remove stop recording button
    const stopBtn = document.getElementById('stop-recording-btn');
    if (stopBtn) {
        stopBtn.remove();
    }
    
    window.currentRecordingStream = null;
    isRecording = false;
}

function playEmergencySound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        
        // Repeat 3 times
        setTimeout(() => playEmergencySound(), 1000);
        setTimeout(() => playEmergencySound(), 2000);
    } catch (err) {
        console.log("Emergency sound failed:", err);
    }
}

function showEmergencyStatus() {
    const statusElements = [
        'womenStatus',
        'childStatus', 
        'elderlyStatus',
        'disasterStatus',
        'healthStatus'
    ];
    
    statusElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <p>🚨 SOS ACTIVATED</p>
                <p>✅ Location Shared</p>
                <p>🎥 Recording Started</p>
                <p>📞 Alert sent to emergency contacts</p>
            `;
            element.style.color = '#ef4444';
            element.classList.add('emergency-active');
        }
    });
}

// =======================
// UTILITY FUNCTIONS
// =======================
function shareLocation() {
    if (!currentUser) {
        showNotification('Please login to share location', 'error');
        return;
    }
    
    navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const locationUrl = `https://maps.google.com/?q=${lat},${lon}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'My Location',
                text: `My current location: ${locationUrl}`,
                url: locationUrl
            });
        } else {
            navigator.clipboard.writeText(locationUrl);
            showNotification('Location copied to clipboard', 'success');
        }
    });
}

function showEmergencyContacts() {
    if (!currentUser || !currentUser.emergencyContacts) {
        showNotification('No emergency contacts found', 'warning');
        return;
    }
    
    let contactInfo = 'Emergency Contacts:\n\n';
    currentUser.emergencyContacts.forEach((contact, index) => {
        contactInfo += `${index + 1}. ${contact.name} (${contact.relation})\n   📞 ${contact.phone}\n\n`;
    });
    
    alert(contactInfo);
}

function showNotifications() {
    showNotification('You have no new notifications', 'info');
}

function showProfile() {
    showScreen('profileScreen');
}

function editProfile() {
    if (!currentUser) return;
    
    console.log('🔄 Opening comprehensive edit profile for:', currentUser);
    
    // Populate basic information
    document.getElementById('editFirstName').value = currentUser.firstName;
    document.getElementById('editLastName').value = currentUser.lastName;
    document.getElementById('editEmail').value = currentUser.email;
    document.getElementById('editPhone').value = currentUser.phoneNumber;
    
    // Populate address information
    document.getElementById('editHouseNo').value = currentUser.houseNo || '';
    document.getElementById('editStreet').value = currentUser.street || '';
    document.getElementById('editCity').value = currentUser.city || '';
    document.getElementById('editState').value = currentUser.state || '';
    document.getElementById('editPinCode').value = currentUser.pinCode || '';
    
    // Populate medical information
    document.getElementById('editMedicalInfo').value = currentUser.medicalInfo || '';
    
    // Populate emergency contacts
    populateEditEmergencyContacts();
    
    // Populate family members
    populateEditFamilyMembers();
    
    // Populate portal selection
    populateEditPortals();
    
    // Show modal
    document.getElementById('editProfileModal').style.display = 'block';
}

async function handleEditProfile(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    // Get form values
    const firstName = document.getElementById('editFirstName').value.trim();
    const lastName = document.getElementById('editLastName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const houseNo = document.getElementById('editHouseNo').value.trim();
    const street = document.getElementById('editStreet').value.trim();
    const city = document.getElementById('editCity').value.trim();
    const state = document.getElementById('editState').value.trim();
    const pinCode = document.getElementById('editPinCode').value.trim();
    
    // Validate
    if (!validateEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    if (!validatePhone(phone)) {
        showNotification('Please enter a valid 10-digit phone number', 'error');
        return;
    }
    
    if (!validatePinCode(pinCode)) {
        showNotification('Please enter a valid 6-digit PIN code', 'error');
        return;
    }
    
    try {
        showNotification('Updating profile...', 'info');
        
        // Update via API
        const response = await apiPut('/user/profile', {
            firstName,
            lastName,
            email,
            phoneNumber: phone,
            houseNo,
            street,
            city,
            state,
            pinCode
        });
        
        // Update local user data
        currentUser = response.user;
        localStorage.setItem('sahaya_user', JSON.stringify(currentUser));
        
        // Update profile display
        updateProfileDisplay();
        
        // Close modal and show success
        closeEditProfileModal();
        showNotification('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Profile update error:', error);
        showNotification('Failed to update profile: ' + error.message, 'error');
    }
}

function changePassword() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    // Clear form
    document.getElementById('changePasswordForm').reset();
    document.getElementById('newPasswordStrength').textContent = '';
    document.getElementById('newPasswordStrength').className = 'password-strength';
    
    // Show modal
    document.getElementById('changePasswordModal').classList.add('active');
    
    // Setup password strength indicator for new password
    const newPasswordInput = document.getElementById('newPassword');
    const strengthIndicator = document.getElementById('newPasswordStrength');
    
    newPasswordInput.addEventListener('input', function() {
        const password = this.value;
        if (password.length > 0) {
            const strength = checkPasswordStrength(password);
            strengthIndicator.className = 'password-strength ' + strength;
            strengthIndicator.textContent = 'Strength: ' + strength.charAt(0).toUpperCase() + strength.slice(1);
        } else {
            strengthIndicator.className = 'password-strength';
            strengthIndicator.textContent = '';
        }
    });
}

function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.remove('active');
}

function handleChangePassword(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    // Verify current password
    if (currentUser.password !== currentPassword) {
        showNotification('Current password is incorrect', 'error');
        return;
    }
    
    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
        showNotification(passwordValidation.message, 'error');
        return;
    }
    
    // Check passwords match
    if (newPassword !== confirmNewPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }
    
    // Update password
    currentUser.password = newPassword;
    localStorage.setItem('sahaya_user', JSON.stringify(currentUser));
    
    // Close modal and show success
    closeChangePasswordModal();
    showNotification('Password changed successfully!', 'success');
}

function updateProfileDisplay() {
    if (!currentUser) return;
    
    // Update profile header
    document.getElementById('profileName').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profilePhone').textContent = `+91 ${currentUser.phoneNumber}`;
    
    // Update address
    const address = `${currentUser.houseNo}, ${currentUser.street}, ${currentUser.city}, ${currentUser.state} - ${currentUser.pinCode}`;
    document.getElementById('profileAddress').textContent = address;
}

async function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        try {
            // Delete via API
            await apiDelete('/user');
            
            // Clear local storage
            localStorage.removeItem('sahaya_token');
            localStorage.removeItem('sahaya_user');
            currentUser = null;
            
            showNotification('Account deleted successfully', 'success');
            showScreen('welcomeScreen');
        } catch (error) {
            console.error('Delete account error:', error);
            showNotification('Failed to delete account: ' + error.message, 'error');
        }
    }
}

// Emergency Contact Counter
let additionalContactCount = 0;

function addEmergencyContact() {
    additionalContactCount++;
    
    const container = document.getElementById('additionalContacts');
    
    const contactDiv = document.createElement('div');
    contactDiv.className = 'emergency-contact additional-contact';
    contactDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4>Additional Emergency Contact ${additionalContactCount}</h4>
            <button type="button" class="btn btn-danger" onclick="this.parentElement.parentElement.remove(); additionalContactCount--;" style="padding: 5px 10px; font-size: 0.8rem;">Remove</button>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Contact Name</label>
                <input type="text" class="contact-name" placeholder="Enter contact name">
            </div>
            <div class="form-group">
                <label>Relationship</label>
                <select class="contact-relation">
                    <option value="">Select Relationship</option>
                    <option value="parent">Parent</option>
                    <option value="spouse">Spouse</option>
                    <option value="sibling">Sibling</option>
                    <option value="friend">Friend</option>
                    <option value="guardian">Guardian</option>
                    <option value="neighbor">Neighbor</option>
                    <option value="colleague">Colleague</option>
                    <option value="other">Other</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Phone Number</label>
            <input type="tel" class="contact-phone" placeholder="Enter phone number" maxlength="10">
        </div>
    `;
    
    container.appendChild(contactDiv);
    
    // Scroll to the new contact
    contactDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// =======================
// NOTIFICATION SYSTEM
// =======================
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function sendBrowserNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🚨</text></svg>'
        });
    }
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// =======================
// UTILITY STYLES
// =======================
function addEmergencyStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .emergency-active {
            animation: emergencyPulse 1s infinite;
        }
        
        @keyframes emergencyPulse {
            0%, 100% { 
                background: rgba(239, 68, 68, 0.2);
                border-color: #ef4444;
            }
            50% { 
                background: rgba(239, 68, 68, 0.4);
                border-color: #dc2626;
            }
        }
    `;
    document.head.appendChild(style);
}
// =======================
// THEME SYSTEM
// =======================

function setTheme(theme) {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');

    if (theme === 'light') {
        body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
        if (themeToggle) themeToggle.innerHTML = '🌙 Dark Mode';
    } else {
        body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
        if (themeToggle) themeToggle.innerHTML = '☀️ Light Mode';
    }

    showNotification(`Switched to ${theme} mode`, 'success');
}

function toggleTheme() {
    const body = document.body;
    const isLight = body.classList.contains('light-theme');
    setTheme(isLight ? 'dark' : 'light');
}

// =======================
// FAMILY FORMS GENERATION
// =======================
function generateFamilyForms() {
    const container = document.getElementById('familyFormsContainer');
    const numChildren = parseInt(document.getElementById('numChildren').value) || 0;
    const numElderly = parseInt(document.getElementById('numElderly').value) || 0;
    
    let html = '';
    
    // Generate children forms
    if (numChildren > 0) {
        html += '<div class="form-section"><h3>👶 Children Details</h3>';
        for (let i = 1; i <= numChildren; i++) {
            html += `
                <div class="family-member-form">
                    <h4>Child ${i}</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Name *</label>
                            <input type="text" id="child${i}Name" placeholder="Child's name" required>
                        </div>
                        <div class="form-group">
                            <label>Age *</label>
                            <input type="number" id="child${i}Age" min="0" max="18" placeholder="Age" required>
                        </div>
                        <div class="form-group">
                            <label>Gender *</label>
                            <select id="child${i}Gender" required>
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
    }
    
    // Generate elderly forms
    if (numElderly > 0) {
        html += '<div class="form-section"><h3>👴 Elderly Members Details</h3>';
        for (let i = 1; i <= numElderly; i++) {
            html += `
                <div class="family-member-form">
                    <h4>Elderly Member ${i}</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Name *</label>
                            <input type="text" id="elderly${i}Name" placeholder="Name" required>
                        </div>
                        <div class="form-group">
                            <label>Age *</label>
                            <input type="number" id="elderly${i}Age" min="60" placeholder="Age" required>
                        </div>
                        <div class="form-group">
                            <label>Gender *</label>
                            <select id="elderly${i}Gender" required>
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
    }
    
    container.innerHTML = html;
}

// =======================
// FAMILY MANAGEMENT API
// =======================
async function getFamilyMembers() {
    try {
        const response = await apiGet('/family');
        return response.familyMembers || [];
    } catch (error) {
        console.error('Get family members error:', error);
        return [];
    }
}

async function addFamilyMember(memberData) {
    try {
        const response = await apiPost('/family', memberData);
        showNotification('Family member added successfully', 'success');
        return response.familyMember;
    } catch (error) {
        console.error('Add family member error:', error);
        showNotification('Failed to add family member: ' + error.message, 'error');
        return null;
    }
}

async function updateFamilyMember(id, updates) {
    try {
        const response = await apiPut(`/family/${id}`, updates);
        showNotification('Family member updated successfully', 'success');
        return response.familyMember;
    } catch (error) {
        console.error('Update family member error:', error);
        showNotification('Failed to update family member: ' + error.message, 'error');
        return null;
    }
}

async function updateFamilyMemberLocation(id, lat, lng) {
    try {
        const response = await apiPut(`/family/${id}/location`, { lat, lng });
        return response.familyMember;
    } catch (error) {
        console.error('Update location error:', error);
        return null;
    }
}

async function updateFamilyMemberStatus(id, status) {
    try {
        const response = await apiPut(`/family/${id}/status`, { status });
        return response.familyMember;
    } catch (error) {
        console.error('Update status error:', error);
        return null;
    }
}

async function removeFamilyMember(id) {
    try {
        await apiDelete(`/family/${id}`);
        showNotification('Family member removed successfully', 'success');
        return true;
    } catch (error) {
        console.error('Remove family member error:', error);
        showNotification('Failed to remove family member: ' + error.message, 'error');
        return false;
    }
}

// =======================
// UPLOAD API
// =======================
async function uploadProfilePhoto(file) {
    try {
        const formData = new FormData();
        formData.append('profilePhoto', file);
        
        const token = localStorage.getItem('sahaya_token');
        const response = await fetch(`${API_BASE_URL}/upload/profile`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        
        return data.fileUrl;
    } catch (error) {
        console.error('Upload error:', error);
        showNotification('Upload failed: ' + error.message, 'error');
        return null;
    }
}

async function uploadAadhaarPhoto(file) {
    try {
        const formData = new FormData();
        formData.append('aadhaarPhoto', file);
        
        const token = localStorage.getItem('sahaya_token');
        const response = await fetch(`${API_BASE_URL}/upload/aadhaar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        
        return data.fileUrl;
    } catch (error) {
        console.error('Upload error:', error);
        showNotification('Upload failed: ' + error.message, 'error');
        return null;
    }
}

// =======================
// NAVIGATION HELPERS
// =======================
function goToPage(pageName) {
    window.location.href = pageName;
}

function goToDashboard() {
    if (document.getElementById('dashboardScreen')) {
        showScreen('dashboardScreen');
    } else {
        window.location.href = 'index.html';
    }
}

function goToPortal(portalName) {
    const portalPages = {
        'women': 'women.html',
        'child': 'child.html',
        'elderly': 'elderly.html',
        'disaster': 'disaster.html',
        'health': 'health.html'
    };
    
    if (portalPages[portalName]) {
        window.location.href = portalPages[portalName];
    }
}

// =======================
// USER LOADING FOR PORTAL PAGES
// =======================
async function loadUser() {
    const token = localStorage.getItem('sahaya_token');
    const savedUser = localStorage.getItem('sahaya_user');
    
    if (!token && !savedUser) {
        showNotification('Please login first', 'error');
        window.location.href = 'index.html';
        return null;
    }
    
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    
    // Try to fetch fresh user data from API
    try {
        console.log('Fetching user data from API...');
        const response = await apiGet('/auth/me');
        console.log('API response:', response);
        
        if (response.user) {
            currentUser = response.user;
            console.log('Updated user data from API:', currentUser);
            localStorage.setItem('sahaya_user', JSON.stringify(currentUser));
        } else {
            console.log('No user data in API response');
        }
    } catch (error) {
        console.error('API fetch error:', error);
        console.log('Using cached user data');
    }
    
    // Update UI with user info
    const welcomeUser = document.getElementById('welcomeUser');
    const userPhoto = document.getElementById('userPhoto');
    const userInfo = document.getElementById('userInfo');
    
    if (welcomeUser && currentUser) {
        welcomeUser.textContent = `Welcome, ${currentUser.firstName}!`;
    }
    if (userPhoto && currentUser?.profilePhoto) {
        userPhoto.src = currentUser.profilePhoto;
    }
    if (userInfo && currentUser) {
        userInfo.textContent = `User: ${currentUser.firstName} ${currentUser.lastName}`;
    }
    
    return currentUser;
}

async function loadChildUser() {
    await loadUser();
    const childUser = document.getElementById('childUser');
    if (childUser && currentUser) {
        childUser.textContent = `Parent: ${currentUser.firstName} ${currentUser.lastName}`;
    }
}

async function loadDisasterUser() {
    await loadUser();
    const disasterUser = document.getElementById('disasterUser');
    if (disasterUser && currentUser) {
        disasterUser.textContent = `Stay safe, ${currentUser.firstName}!`;
    }
}

async function loadPortals() {
    const container = document.getElementById('portalContainer');
    if (!container || !currentUser?.portals) return;
    
    const portalConfigs = {
        'women': { icon: '👩', title: 'Women Safety', screen: 'womenScreen', color: '#ec4899' },
        'child': { icon: '👶', title: 'Child Safety', screen: 'childScreen', color: '#3b82f6' },
        'elderly': { icon: '👴', title: 'Elderly Safety', screen: 'elderlyScreen', color: '#22c55e' },
        'disaster': { icon: '🌪', title: 'Disaster Alerts', screen: 'disasterScreen', color: '#f97316' },
        'health': { icon: '🏥', title: 'Health Emergency', screen: 'medicalScreen', color: '#ef4444' }
    };
    
    let html = '';
    currentUser.portals.forEach(portal => {
        const config = portalConfigs[portal];
        if (config) {
            html += `<button onclick="switchScreen('${config.screen}')" style="border-left: 4px solid ${config.color};">${config.icon} ${config.title}</button>`;
        }
    });
    
    container.innerHTML = html || '<p>No portals activated</p>';
}

async function loadFamily() {
    const familyCard = document.getElementById('familyCard');
    const familyInfo = document.getElementById('familyInfo');
    
    if (!familyCard || !familyInfo) return;
    
    const members = await getFamilyMembers();
    
    if (members.length === 0) {
        familyCard.style.display = 'none';
        return;
    }
    
    familyCard.style.display = 'block';
    let html = '';
    members.forEach(member => {
        const icon = member.type === 'child' ? '👶' : '👴';
        html += `<p>${icon} ${member.name} - Status: ${member.status || 'Unknown'}</p>`;
    });
    familyInfo.innerHTML = html;
}

async function loadFamilyMembers() {
    const profileFamilyMembers = document.getElementById('profileFamilyMembers');
    if (!profileFamilyMembers) return;
    
    console.log('👨‍👩‍👧‍👦 Loading family members from user data...');
    
    // Check if user has family data
    if (!currentUser) {
        console.log('❌ No current user available');
        profileFamilyMembers.innerHTML = '<p>No user data available</p>';
        return;
    }
    
    // Get family data from registration (children and elderly arrays)
    const children = currentUser.children || [];
    const elderly = currentUser.elderly || [];
    const allMembers = [...children, ...elderly];
    
    console.log('👶 Children:', children);
    console.log('👴 Elderly:', elderly);
    console.log('👨‍👩‍👧‍👦 Total family members:', allMembers.length);
    
    if (allMembers.length === 0) {
        profileFamilyMembers.innerHTML = '<p>No family members added</p>';
        console.log('⚠️ No family members found in user data');
        return;
    }
    
    let familyHtml = '';
    allMembers.forEach((member, index) => {
        const icon = member.type === 'child' ? '👶' : '👴';
        const age = member.age || 'Unknown';
        const gender = member.gender || 'Unknown';
        
        console.log(`👤 Family member ${index + 1}:`, member);
        
        familyHtml += `
            <div style="margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <p style="margin: 0; font-weight: bold;">
                    ${icon} ${member.name} (${member.type})
                </p>
                <p style="margin: 5px 0; opacity: 0.8;">Age: ${age} | Gender: ${gender}</p>
                <p style="margin: 0; color: #4CAF50;">
                    Status: Active
                </p>
            </div>
        `;
    });
    
    profileFamilyMembers.innerHTML = familyHtml;
    console.log('✅ Family members displayed successfully');
}

async function loadEmergencyContacts() {
    const emergencyContactsDiv = document.getElementById('profileEmergencyContacts');
    if (!emergencyContactsDiv) {
        console.log('Emergency contacts div not found');
        return;
    }
    
    // Wait for user data to be loaded
    if (!currentUser) {
        console.log('User not loaded yet, waiting...');
        setTimeout(loadEmergencyContacts, 500); // Reduced wait time
        return;
    }
    
    console.log('Current user data:', currentUser);
    console.log('Emergency contacts from user object:', currentUser.emergencyContacts);
    
    // Check if emergency contacts exist and are valid
    if (!currentUser.emergencyContacts) {
        emergencyContactsDiv.innerHTML = '<p>No emergency contacts found</p>';
        return;
    }
    
    if (!Array.isArray(currentUser.emergencyContacts)) {
        console.log('Emergency contacts is not an array:', typeof currentUser.emergencyContacts);
        emergencyContactsDiv.innerHTML = '<p>Emergency contacts data error</p>';
        return;
    }
    
    if (currentUser.emergencyContacts.length === 0) {
        emergencyContactsDiv.innerHTML = '<p>No emergency contacts added</p>';
        console.log('No emergency contacts found');
        return;
    }
    
    let contactsHtml = '';
    let validContacts = 0;
    
    currentUser.emergencyContacts.forEach((contact, index) => {
        console.log(`Processing Contact ${index + 1}:`, contact);
        // Make sure we have the required fields
        if (contact.name && contact.phone) {
            validContacts++;
            contactsHtml += `
                <div style="margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                    <p style="margin: 0; font-weight: bold;">${contact.name}</p>
                    <p style="margin: 5px 0; opacity: 0.8;">${contact.relation || 'Contact'}</p>
                    <p style="margin: 0; color: #4CAF50;">📞 ${contact.phone}</p>
                </div>
            `;
        } else {
            console.log(`Invalid contact ${index + 1}:`, contact);
        }
    });
    
    console.log(`Found ${validContacts} valid contacts out of ${currentUser.emergencyContacts.length}`);
    
    if (contactsHtml === '') {
        emergencyContactsDiv.innerHTML = '<p>No valid emergency contacts found</p>';
    } else {
        emergencyContactsDiv.innerHTML = contactsHtml;
        console.log('Emergency contacts displayed successfully');
    }
}