/**
 * CEDUP League - Utilidades e Configuração
 * Funções auxiliares e configuração do Supabase
 */

// ============================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================
const SUPABASE_URL = 'https://pfgqekfrsfwzmhlkyxem.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmZ3Fla2Zyc2Z3em1obGt5eGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTM1ODEsImV4cCI6MjA3ODA2OTU4MX0.nGsMvQeh0T7hiKfikvHu0PAkXrbD9UUqvQySfOgTKxE';

let supabase;

// Inicializar Supabase
function initSupabase() {
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase inicializado com sucesso');
        return supabase;
    } catch (error) {
        console.error('❌ Erro ao inicializar Supabase:', error);
        return null;
    }
}

// ============================================
// FUNÇÕES DE FORMATAÇÃO
// ============================================

/**
 * Formata valor monetário (Cartoletas)
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado (ex: "C$ 10,50")
 */
function formatCurrency(value) {
    if (value === null || value === undefined) return 'C$ 0,00';
    return `C$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
}

/**
 * Formata pontuação
 * @param {number} points - Pontos a serem formatados
 * @returns {string} Pontos formatados (ex: "15.50")
 */
function formatPoints(points) {
    if (points === null || points === undefined) return '0.00';
    return parseFloat(points).toFixed(2);
}

/**
 * Formata data
 * @param {string} dateString - Data em formato ISO
 * @returns {string} Data formatada (ex: "07/11/2025")
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

/**
 * Formata data e hora
 * @param {string} dateString - Data em formato ISO
 * @returns {string} Data e hora formatadas (ex: "07/11/2025 às 14:30")
 */
function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

// ============================================
// FUNÇÕES DE VALIDAÇÃO
// ============================================

/**
 * Valida e-mail
 * @param {string} email - E-mail a ser validado
 * @returns {boolean} True se válido
 */
function validateEmail(email) {
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
    return teamName && teamName.length >= 3 && teamName.length <= 30;
}

// ============================================
// FUNÇÕES DE ESCALAÇÃO
// ============================================

/**
 * Valida formação do time (5 titulares + 5 reservas)
 * @param {Array} players - Array de jogadores
 * @returns {Object} { valid: boolean, message: string }
 */
function validateLineup(players) {
    if (!players || players.length !== 5) {
        return { valid: false, message: 'Você deve escalar exatamente 5 jogadores titulares' };
    }

    const positions = {
        goleiro: 0,
        fixo: 0,
        ala: 0,
        pivô: 0
    };

    players.forEach(player => {
        if (positions.hasOwnProperty(player.position)) {
            positions[player.position]++;
        }
    });

    // Validar formação mínima: 1 goleiro, pelo menos 1 de cada posição
    if (positions.goleiro !== 1) {
        return { valid: false, message: 'Você deve ter exatamente 1 goleiro' };
    }

    return { valid: true, message: 'Escalação válida' };
}

/**
 * Calcula valor total da escalação
 * @param {Array} players - Array de jogadores
 * @returns {number} Valor total
 */
function calculateTotalValue(players) {
    if (!players || players.length === 0) return 0;
    return players.reduce((total, player) => total + (parseFloat(player.price) || 0), 0);
}

/**
 * Verifica se o usuário tem cartoletas suficientes
 * @param {number} userCartoletas - Cartoletas do usuário
 * @param {number} totalValue - Valor total da escalação
 * @returns {boolean} True se tem saldo suficiente
 */
function hasEnoughBalance(userCartoletas, totalValue) {
    return parseFloat(userCartoletas) >= parseFloat(totalValue);
}

// ============================================
// FUNÇÕES DE PONTUAÇÃO
// ============================================

/**
 * Calcula pontuação de um jogador baseado nos scouts
 * @param {Object} scouts - Objeto com estatísticas do jogador
 * @returns {number} Pontuação calculada
 */
function calculatePlayerPoints(scouts) {
    let points = 0;

    // Pontuações positivas
    points += (scouts.goals || 0) * 8;              // Gol
    points += (scouts.assists || 0) * 5;            // Assistência
    points += (scouts.shots_on_target || 0) * 3;    // Finalização na trave
    points += (scouts.saves || 0) * 7;              // Defesa de pênalti
    points += (scouts.clean_sheet || 0) * 5;        // Jogo sem sofrer gols

    // Pontuações negativas
    points -= (scouts.own_goals || 0) * 3;          // Gol contra
    points -= (scouts.red_cards || 0) * 3;          // Cartão vermelho
    points -= (scouts.fouls || 0) * 0.3;            // Falta cometida

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
// FUNÇÕES DE NOTIFICAÇÃO
// ============================================

/**
 * Exibe mensagem de sucesso
 * @param {string} message - Mensagem a ser exibida
 */
function showSuccess(message) {
    alert(`✅ ${message}`);
    // TODO: Implementar toast notification mais elegante
}

/**
 * Exibe mensagem de erro
 * @param {string} message - Mensagem a ser exibida
 */
function showError(message) {
    alert(`❌ ${message}`);
    // TODO: Implementar toast notification mais elegante
}

/**
 * Exibe mensagem de aviso
 * @param {string} message - Mensagem a ser exibida
 */
function showWarning(message) {
    alert(`⚠️ ${message}`);
    // TODO: Implementar toast notification mais elegante
}

// ============================================
// FUNÇÕES DE NAVEGAÇÃO
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

// ============================================
// FUNÇÕES DE SESSÃO
// ============================================

/**
 * Verifica se o usuário está autenticado
 * @returns {Promise<Object|null>} Dados do usuário ou null
 */
async function checkAuth() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
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

// ============================================
// INICIALIZAÇÃO
// ============================================

// Inicializar Supabase quando o script carregar
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
});

// Exportar para uso global
window.utils = {
    supabase,
    initSupabase,
    formatCurrency,
    formatPoints,
    formatDate,
    formatDateTime,
    validateEmail,
    validatePassword,
    validateTeamName,
    validateLineup,
    calculateTotalValue,
    hasEnoughBalance,
    calculatePlayerPoints,
    getMinPointsForValorization,
    calculateNewPrice,
    showSuccess,
    showError,
    showWarning,
    navigateTo,
    getUrlParameter,
    checkAuth,
    getUserData,
    isAdmin
};