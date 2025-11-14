// ============================================
// CARTOLA COACH - FUNÇÕES UTILITÁRIAS
// ============================================

/**
 * Biblioteca de funções auxiliares para o sistema
 * Inclui formatação, validação, cálculos e utilidades gerais
 */

// ============================================
// FORMATAÇÃO
// ============================================

/**
 * Formata valor monetário (Cartoletas)
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado (ex: "C$ 10.50")
 */
function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return 'C$ 0.00';
    return `C$ ${parseFloat(value).toFixed(2)}`;
}

/**
 * Formata pontuação
 * @param {number} points - Pontos a serem formatados
 * @returns {string} Pontos formatados (ex: "15.50")
 */
function formatPoints(points) {
    if (points === null || points === undefined || isNaN(points)) return '0.00';
    return parseFloat(points).toFixed(2);
}

/**
 * Formata data
 * @param {string} dateString - Data em formato ISO
 * @returns {string} Data formatada (ex: "07/11/2025")
 */
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return '';
    }
}

/**
 * Formata data e hora
 * @param {string} dateString - Data em formato ISO
 * @returns {string} Data e hora formatadas (ex: "07/11/2025 às 14:30")
 */
function formatDateTime(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })}`;
    } catch (error) {
        console.error('Erro ao formatar data/hora:', error);
        return '';
    }
}

/**
 * Formata nome (primeira letra maiúscula)
 * @param {string} name - Nome a ser formatado
 * @returns {string} Nome formatado
 */
function formatName(name) {
    if (!name) return '';
    return name.trim().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
}

// ============================================
// VALIDAÇÃO
// ============================================

/**
 * Valida e-mail
 * @param {string} email - E-mail a ser validado
 * @returns {boolean} True se válido
 */
function validateEmail(email) {
    if (!email) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Valida senha (mínimo 6 caracteres)
 * @param {string} password - Senha a ser validada
 * @returns {boolean} True se válida
 */
function validatePassword(password) {
    return password && password.length >= 6;
}

/**
 * Valida nome do time (3-30 caracteres)
 * @param {string} teamName - Nome do time
 * @returns {boolean} True se válido
 */
function validateTeamName(teamName) {
    return teamName && teamName.trim().length >= 3 && teamName.trim().length <= 30;
}

/**
 * Valida número positivo
 * @param {number} value - Valor a ser validado
 * @returns {boolean} True se válido
 */
function validatePositiveNumber(value) {
    return !isNaN(value) && parseFloat(value) >= 0;
}

// ============================================
// CÁLCULOS DE ESCALAÇÃO
// ============================================

/**
 * Valida formação do time (FUTSAL: 1 GOL, 1 FIX, 2 ALA, 1 PIV)
 * @param {Object} lineup - Objeto com escalação
 * @returns {Object} { valid: boolean, message: string }
 */
function validateLineup(lineup) {
    if (!lineup) {
        return { valid: false, message: 'Escalação não fornecida' };
    }

    const contadores = {
        GOL: lineup.GOL ? 1 : 0,
        FIX: lineup.FIX ? 1 : 0,
        ALA: Array.isArray(lineup.ALA) ? lineup.ALA.filter(j => j !== null).length : 0,
        PIV: lineup.PIV ? 1 : 0
    };

    const total = contadores.GOL + contadores.FIX + contadores.ALA + contadores.PIV;

    if (total !== 5) {
        return { valid: false, message: `Você deve escalar exatamente 5 jogadores (atual: ${total})` };
    }

    if (contadores.GOL !== 1) {
        return { valid: false, message: 'Você deve ter exatamente 1 goleiro' };
    }

    if (contadores.FIX !== 1) {
        return { valid: false, message: 'Você deve ter exatamente 1 fixo' };
    }

    if (contadores.ALA !== 2) {
        return { valid: false, message: 'Você deve ter exatamente 2 alas' };
    }

    if (contadores.PIV !== 1) {
        return { valid: false, message: 'Você deve ter exatamente 1 pivô' };
    }

    return { valid: true, message: 'Escalação válida' };
}

/**
 * Calcula valor total da escalação
 * @param {Object} lineup - Objeto com escalação
 * @returns {number} Valor total
 */
function calculateLineupCost(lineup) {
    if (!lineup) return 0;
    
    let total = 0;
    if (lineup.GOL) total += parseFloat(lineup.GOL.price) || 0;
    if (lineup.FIX) total += parseFloat(lineup.FIX.price) || 0;
    if (lineup.PIV) total += parseFloat(lineup.PIV.price) || 0;
    
    if (Array.isArray(lineup.ALA)) {
        lineup.ALA.forEach(jogador => {
            if (jogador) total += parseFloat(jogador.price) || 0;
        });
    }
    
    return parseFloat(total.toFixed(2));
}

/**
 * Verifica se o usuário tem saldo suficiente
 * @param {number} userBalance - Saldo do usuário
 * @param {number} cost - Custo da escalação
 * @returns {boolean} True se tem saldo suficiente
 */
function hasEnoughBalance(userBalance, cost) {
    return parseFloat(userBalance) >= parseFloat(cost);
}

// ============================================
// CÁLCULOS DE PONTUAÇÃO
// ============================================

/**
 * Sistema de pontuação FUTSAL
 * Baseado nas estatísticas (scouts) dos jogadores
 */
const PONTOS_SCOUTS = {
    // Positivos
    goals: 8,                // Gol marcado
    assists: 5,              // Assistência
    shots_on_target: 3,      // Finalização na trave
    saves: 7,                // Defesa difícil
    clean_sheet: 5,          // Jogo sem sofrer gol
    
    // Negativos
    own_goals: -3,           // Gol contra
    red_cards: -5,           // Cartão vermelho
    yellow_cards: -1,        // Cartão amarelo
    fouls: -0.3              // Falta cometida
};

/**
 * Calcula pontuação de um jogador baseado nos scouts
 * @param {Object} scouts - Objeto com estatísticas do jogador
 * @returns {number} Pontuação calculada
 */
function calculatePlayerPoints(scouts) {
    if (!scouts) return 0;
    
    let points = 0;

    // Somar pontos positivos
    points += (scouts.goals || 0) * PONTOS_SCOUTS.goals;
    points += (scouts.assists || 0) * PONTOS_SCOUTS.assists;
    points += (scouts.shots_on_target || 0) * PONTOS_SCOUTS.shots_on_target;
    points += (scouts.saves || 0) * PONTOS_SCOUTS.saves;
    points += (scouts.clean_sheet || 0) * PONTOS_SCOUTS.clean_sheet;

    // Subtrair pontos negativos
    points += (scouts.own_goals || 0) * PONTOS_SCOUTS.own_goals;
    points += (scouts.red_cards || 0) * PONTOS_SCOUTS.red_cards;
    points += (scouts.yellow_cards || 0) * PONTOS_SCOUTS.yellow_cards;
    points += (scouts.fouls || 0) * PONTOS_SCOUTS.fouls;

    return parseFloat(points.toFixed(2));
}

/**
 * Calcula pontuação mínima para valorização
 * @param {number} price - Preço do jogador
 * @returns {number} Pontuação mínima necessária
 */
function getMinPointsForValorization(price) {
    return parseFloat((price * 0.58).toFixed(2));
}

/**
 * Calcula novo valor do jogador baseado na pontuação
 * @param {number} currentPrice - Preço atual
 * @param {number} points - Pontuação obtida
 * @returns {number} Novo preço
 */
function calculateNewPrice(currentPrice, points) {
    const minPoints = getMinPointsForValorization(currentPrice);
    
    if (points >= minPoints) {
        // Valoriza 10%
        return parseFloat((currentPrice * 1.1).toFixed(2));
    } else if (points < minPoints * 0.5) {
        // Desvaloriza 10%
        return parseFloat((currentPrice * 0.9).toFixed(2));
    }
    
    // Mantém o preço
    return currentPrice;
}

// ============================================
// NOTIFICAÇÕES
// ============================================

/**
 * Exibe notificação toast
 * @param {string} message - Mensagem
 * @param {string} type - Tipo (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 flex items-center gap-2`;
    notification.innerHTML = `
        <span class="text-xl font-bold">${icons[type]}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Atalhos para notificações
 */
const showSuccess = (msg) => showNotification(msg, 'success');
const showError = (msg) => showNotification(msg, 'error');
const showWarning = (msg) => showNotification(msg, 'warning');
const showInfo = (msg) => showNotification(msg, 'info');

// ============================================
// NAVEGAÇÃO
// ============================================

/**
 * Redireciona para uma página
 * @param {string} page - Nome da página (ex: 'dashboard', 'mercado')
 */
function navigateTo(page) {
    window.location.href = `${page}.html`;
}

/**
 * Obtém parâmetros da URL
 * @param {string} param - Nome do parâmetro
 * @returns {string|null} Valor do parâmetro
 */
function getUrlParameter(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Adiciona parâmetro à URL atual
 * @param {string} param - Nome do parâmetro
 * @param {string} value - Valor do parâmetro
 */
function addUrlParameter(param, value) {
    const url = new URL(window.location.href);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
}

// ============================================
// AUTENTICAÇÃO E SESSÃO
// ============================================

/**
 * Verifica se o usuário está autenticado
 * @returns {Promise<Object|null>} Dados do usuário ou null
 */
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        return null;
    }
}

/**
 * Obtém dados completos do usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object|null>} Dados do usuário
 */
async function getUserData(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        return null;
    }
}

/**
 * Verifica se o usuário é admin
 * @param {string} userId - ID do usuário
 * @returns {Promise<boolean>} True se é admin
 */
async function isAdmin(userId) {
    try {
        const userData = await getUserData(userId);
        return userData && userData.role === 'admin';
    } catch (error) {
        console.error('Erro ao verificar permissão admin:', error);
        return false;
    }
}

/**
 * Faz logout do usuário
 */
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        navigateTo('index');
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        showError('Erro ao sair');
    }
}

// ============================================
// UTILITÁRIOS GERAIS
// ============================================

/**
 * Debounce - Atrasa execução de função
 * @param {Function} func - Função a ser executada
 * @param {number} wait - Tempo de espera em ms
 * @returns {Function} Função com debounce
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Copia texto para clipboard
 * @param {string} text - Texto a ser copiado
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showSuccess('Copiado para área de transferência');
    } catch (error) {
        console.error('Erro ao copiar:', error);
        showError('Erro ao copiar');
    }
}

/**
 * Aguarda um tempo determinado
 * @param {number} ms - Milissegundos
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gera ID único
 * @returns {string} ID único
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============================================
// EXPORTAÇÃO
// ============================================

// Exportar todas as funções para uso global
window.utils = {
    // Formatação
    formatCurrency,
    formatPoints,
    formatDate,
    formatDateTime,
    formatName,
    
    // Validação
    validateEmail,
    validatePassword,
    validateTeamName,
    validatePositiveNumber,
    validateLineup,
    
    // Cálculos
    calculateLineupCost,
    hasEnoughBalance,
    calculatePlayerPoints,
    getMinPointsForValorization,
    calculateNewPrice,
    
    // Notificações
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    
    // Navegação
    navigateTo,
    getUrlParameter,
    addUrlParameter,
    
    // Autenticação
    checkAuth,
    getUserData,
    isAdmin,
    logout,
    
    // Utilitários
    debounce,
    copyToClipboard,
    sleep,
    generateId,
    
    // Constantes
    PONTOS_SCOUTS
};

console.log('✅ Utils carregado com sucesso');