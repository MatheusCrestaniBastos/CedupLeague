// ============================================
// CARTOLA COACH - CONFIGURAÇÃO DO SUPABASE
// ============================================

/**
 * Configurações da API Supabase
 * Este arquivo inicializa a conexão com o banco de dados
 */

// Credenciais do Supabase
const SUPABASE_URL = 'https://zrmbwikvtemhpzkmmwjq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpybWJ3aWt2dGVtaHB6a21td2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMTkyNjAsImV4cCI6MjA3ODY5NTI2MH0._ZSU-HGhj1W9HwbW7v239Kyp-QvgvGmJKEphdp1Q_sc';

// Verificar se a biblioteca Supabase está carregada
if (typeof window.supabase === 'undefined') {
    console.error('❌ Biblioteca Supabase não encontrada! Verifique se o script está incluído no HTML.');
} else {
    // Inicializar cliente Supabase
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Tornar disponível globalmente
    window.supabase = supabase;
    
    console.log('✅ Supabase inicializado com sucesso');
}

// Constantes do sistema
const SISTEMA = {
    NOME: 'Cartola Coach',
    VERSAO: '1.0.0',
    SALDO_INICIAL: 40.00,
    MAX_JOGADORES: 5
};

// Exportar configurações
window.SISTEMA = SISTEMA;//