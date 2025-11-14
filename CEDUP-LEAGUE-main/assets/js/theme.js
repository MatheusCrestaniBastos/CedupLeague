// ============================================
// CARTOLA COACH - SISTEMA DE TEMA DARK/LIGHT
// ============================================

/**
 * Gerenciador de temas dark/light
 * Salva preferência do usuário e aplica automaticamente
 */

// ============================================
// CONSTANTES
// ============================================

const THEME_KEY = 'cartola-coach-theme';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';

// ============================================
// FUNÇÕES DE TEMA
// ============================================

/**
 * Obtém tema salvo ou preferência do sistema
 * @returns {string} Tema atual (dark ou light)
 */
function getSavedTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    
    // Se não há tema salvo, usa preferência do sistema
    if (!savedTheme) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? THEME_DARK : THEME_LIGHT;
    }
    
    return savedTheme;
}

/**
 * Salva tema no localStorage
 * @param {string} theme - Tema a ser salvo (dark ou light)
 */
function saveTheme(theme) {
    if (theme !== THEME_DARK && theme !== THEME_LIGHT) {
        console.warn('⚠️ Tema inválido:', theme);
        return;
    }
    
    localStorage.setItem(THEME_KEY, theme);
    console.log('💾 Tema salvo:', theme);
}

/**
 * Aplica tema no documento
 * @param {string} theme - Tema a ser aplicado (dark ou light)
 */
function applyTheme(theme) {
    const html = document.documentElement;
    
    if (theme === THEME_DARK) {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }
    
    updateThemeToggleIcon(theme);
    
    // Disparar evento customizado para outras partes do sistema
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
}

/**
 * Atualiza ícone do botão de alternância de tema
 * @param {string} theme - Tema atual
 */
function updateThemeToggleIcon(theme) {
    const toggleButton = document.getElementById('theme-toggle');
    if (!toggleButton) return;
    
    if (theme === THEME_DARK) {
        // Modo escuro ativo - mostra ícone de sol (para mudar para claro)
        toggleButton.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
        `;
        toggleButton.setAttribute('aria-label', 'Mudar para tema claro');
        toggleButton.setAttribute('title', 'Mudar para tema claro');
    } else {
        // Modo claro ativo - mostra ícone de lua (para mudar para escuro)
        toggleButton.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
        `;
        toggleButton.setAttribute('aria-label', 'Mudar para tema escuro');
        toggleButton.setAttribute('title', 'Mudar para tema escuro');
    }
}

/**
 * Alterna entre tema dark e light
 */
function toggleTheme() {
    const currentTheme = getSavedTheme();
    const newTheme = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    
    saveTheme(newTheme);
    applyTheme(newTheme);
    
    console.log(`🎨 Tema alterado para: ${newTheme}`);
    
    // Feedback visual suave
    const toggleButton = document.getElementById('theme-toggle');
    if (toggleButton) {
        toggleButton.classList.add('scale-90');
        setTimeout(() => toggleButton.classList.remove('scale-90'), 150);
    }
}

/**
 * Define tema específico
 * @param {string} theme - Tema a ser definido (dark ou light)
 */
function setTheme(theme) {
    if (theme !== THEME_DARK && theme !== THEME_LIGHT) {
        console.warn('⚠️ Tema inválido:', theme);
        return;
    }
    
    saveTheme(theme);
    applyTheme(theme);
    console.log(`🎨 Tema definido para: ${theme}`);
}

/**
 * Inicializa o sistema de temas
 */
function initTheme() {
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);
    console.log('🎨 Sistema de temas inicializado:', savedTheme);
}

/**
 * Configura listeners de eventos
 */
function setupThemeListeners() {
    // Botão de alternância de tema
    const toggleButton = document.getElementById('theme-toggle');
    
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleTheme);
        console.log('✅ Listener do botão de tema configurado');
    }
    
    // Listener para mudanças na preferência do sistema
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addEventListener('change', (e) => {
        const hasManualPreference = localStorage.getItem(THEME_KEY);
        
        // Só atualiza se usuário não definiu preferência manual
        if (!hasManualPreference) {
            const newTheme = e.matches ? THEME_DARK : THEME_LIGHT;
            applyTheme(newTheme);
            console.log('🎨 Tema atualizado pela preferência do sistema:', newTheme);
        }
    });
    
    console.log('✅ Listeners de tema configurados');
}

/**
 * Remove preferência manual do usuário
 * Volta a usar preferência do sistema
 */
function resetThemeToSystem() {
    localStorage.removeItem(THEME_KEY);
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? THEME_DARK : THEME_LIGHT;
    applyTheme(systemTheme);
    console.log('🔄 Tema resetado para preferência do sistema:', systemTheme);
}

// ============================================
// INICIALIZAÇÃO
// ============================================

// Inicializar tema imediatamente para evitar flash
initTheme();

// Configurar listeners quando DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    setupThemeListeners();
});

// ============================================
// EXPORTAÇÃO
// ============================================

// Exportar para uso global
window.theme = {
    // Funções
    getSavedTheme,
    saveTheme,
    applyTheme,
    toggleTheme,
    setTheme,
    initTheme,
    resetThemeToSystem,
    
    // Constantes
    THEME_DARK,
    THEME_LIGHT,
    
    // Getter para tema atual
    getCurrentTheme: getSavedTheme
};

// Manter compatibilidade com código antigo
window.toggleTheme = toggleTheme;

console.log('✅ Sistema de temas carregado');