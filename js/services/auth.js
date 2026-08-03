// js/services/auth.js
// Firebase Auth Kezelő Szolgáltatás

import { auth, signInWithEmailAndPassword } from '../firebase-config.js';

export function initAuthListeners() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log("LOGIN PROCESS STARTED");
        
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const btnLogin = document.getElementById('btn-login');
        const loginError = document.getElementById('login-error');

        if (!emailInput || !passwordInput || !btnLogin) return;

        const email = emailInput.value;
        const password = passwordInput.value;

        btnLogin.disabled = true;
        btnLogin.textContent = 'Belépés...';
        if (loginError) loginError.style.display = 'none';

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log("SIKERES BELÉPÉS:", userCredential.user.email);
            
            const loginOverlay = document.getElementById('login-overlay');
            const mainApp = document.getElementById('main-app');
            const userEmailDisplay = document.getElementById('user-email-display');

            if (loginOverlay) loginOverlay.classList.remove('active');
            if (mainApp) mainApp.style.display = 'flex';
            if (userEmailDisplay) userEmailDisplay.textContent = userCredential.user.email;
        } catch (error) {
            console.error("LOGIN ERROR:", error);
            if (loginError) {
                loginError.style.display = 'block';
                loginError.textContent = "Hiba: " + error.message;
            }
        } finally {
            btnLogin.disabled = false;
            btnLogin.textContent = 'Belépés';
        }
    });
}

// Inicilizáljuk az eseménykezelőt a fájl betöltésekor
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthListeners);
} else {
    initAuthListeners();
}
