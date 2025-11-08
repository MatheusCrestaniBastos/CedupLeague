/**
 * CEDUP League - Gerenciamento de Tema
 * Alternância entre modo claro e escuro
 */

// ============================================
// CONSTANTES
// ============================================
const THEME_KEY = 'cedup-league-theme';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * Obtém o tema atual salvo no localStorage
 * @returns {string} 'dark' ou 'light'
 */
function getSavedTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    
    // Se não houver tema salvo, detecta preferência do sistema
    if (!savedTheme) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? THEME_DARK : THEME_LIGHT;
    }
    
    return savedTheme;
}

/**
 * Salva o tema no localStorage
 * @param {string} theme - 'dark' ou 'light'
 */
function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

/**
 * Aplica o tema na página
 * @param {string} theme - 'dark' ou 'light'
 */
function applyTheme(theme) {
    const html = document.documentElement;
    
    if (theme === THEME_DARK) {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }
    
    // Atualizar ícone do botão de tema (se existir)
    updateThemeToggleIcon(theme);
}

/**
 * Atualiza o ícone do botão de alternância de tema
 * @param {string} theme - 'dark' ou 'light'
 */
function updateThemeToggleIcon(theme) {
    const toggleButton = document.getElementById('theme-toggle');
    
    if (!toggleButton) return;
    
    if (theme === THEME_DARK) {
        toggleButton.innerHTML = '☀️';
        toggleButton.setAttribute('aria-label', 'Mudar para tema claro');
        toggleButton.title = 'Mudar para tema claro';
    } else {
        toggleButton.innerHTML = '🌙';
        toggleButton.setAttribute('aria-label', 'Mudar para tema escuro');
        toggleButton.title = 'Mudar para tema escuro';
    }
}

/**
 * Alterna entre os temas
 */
function toggleTheme() {
    const currentTheme = getSavedTheme();
    const newTheme = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    
    saveTheme(newTheme);
    applyTheme(newTheme);
    
    // Feedback visual
    console.log(`🎨 Tema alterado para: ${newTheme}`);
}

/**
 * Inicializa o sistema de temas
 */
function initTheme() {
    // Aplicar tema salvo imediatamente (antes do DOMContentLoaded para evitar flash)
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);
    
    console.log('🎨 Tema inicializado:', savedTheme);
}

/**
 * Configura os event listeners para os botões de tema
 */
function setupThemeListeners() {
    // Botão principal de alternância
    const toggleButton = document.getElementById('theme-toggle');
    
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleTheme);
        console.log('✅ Listener do botão de tema configurado');
    }
    
    // Listener para mudanças na preferência do sistema
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addEventListener('change', (e) => {
        // Só atualiza automaticamente se o usuário não tiver definido preferência manual
        const hasManualPreference = localStorage.getItem(THEME_KEY);
        
        if (!hasManualPreference) {
            const newTheme = e.matches ? THEME_DARK : THEME_LIGHT;
            applyTheme(newTheme);
            console.log('🎨 Tema atualizado pela preferência do sistema:', newTheme);
        }
    });
}

/**
 * Cria botão de alternância de tema dinamicamente (se não existir)
 * @param {string} containerId - ID do container onde inserir o botão
 */
function createThemeToggleButton(containerId = 'theme-toggle-container') {
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    const button = document.createElement('button');
    button.id = 'theme-toggle';
    button.className = 'p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200';
    button.setAttribute('aria-label', 'Alternar tema');
    
    const currentTheme = getSavedTheme();
    button.innerHTML = currentTheme === THEME_DARK ? '☀️' : '🌙';
    
    container.appendChild(button);
    
    // Configurar listener
    button.addEventListener('click', toggleTheme);
    
    console.log('✅ Botão de tema criado dinamicamente');
}

// ============================================
// INICIALIZAÇÃO
// ============================================

// Aplicar tema imediatamente (antes do DOM carregar)
initTheme();

// Configurar listeners quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    setupThemeListeners();
});

// ============================================
// EXPORTAR PARA USO GLOBAL
// ============================================
window.theme = {
    getSavedTheme,
    saveTheme,
    applyTheme,
    toggleTheme,
    initTheme,
    createThemeToggleButton,
    THEME_DARK,
    THEME_LIGHT
};
/**
 * Sistema de Tema Dark/Light
 */

// Verificar tema salvo no localStorage
function carregarTema() {
    const temaSalvo = localStorage.getItem('tema') || 'light';
    
    if (temaSalvo === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    console.log('🎨 Tema carregado:', temaSalvo);
}

// Alternar tema
function alternarTema() {
    const isDark = document.documentElement.classList.toggle('dark');
    const novoTema = isDark ? 'dark' : 'light';
    
    localStorage.setItem('tema', novoTema);
    console.log('🎨 Tema alterado para:', novoTema);
}

// Carregar tema ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    carregarTema();
    
    // Adicionar evento no botão de tema
    const btnTema = document.getElementById('theme-toggle');
    if (btnTema) {
        btnTema.addEventListener('click', alternarTema);
    }
});