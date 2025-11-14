// ============================================
// CARTOLA COACH - DASHBOARD DO USUÁRIO
// ============================================

/**
 * Dashboard principal do usuário
 * Exibe estatísticas, ranking e histórico de escalações
 */

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let usuarioLogado = null;
let intervaloAtualizacao = null;

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 Dashboard carregando...');
    
    // Verificar autenticação
    usuarioLogado = await verificarAutenticacao();
    
    if (!usuarioLogado) {
        console.log('❌ Usuário não autenticado');
        window.location.href = 'index.html';
        return;
    }
    
    console.log('✅ Usuário logado:', usuarioLogado.email);
    
    // Mostrar link admin se for admin
    verificarPermissoesAdmin();
    
    // Carregar dados iniciais
    await carregarTodosDados();
    
    // Iniciar atualização automática
    iniciarAtualizacaoAutomatica();
});

// ============================================
// PERMISSÕES
// ============================================

/**
 * Verifica e exibe opções de admin se necessário
 */
function verificarPermissoesAdmin() {
    if (usuarioLogado.role === 'admin' || usuarioLogado.is_admin) {
        const linkAdmin = document.getElementById('link-admin');
        if (linkAdmin) {
            linkAdmin.classList.remove('hidden');
        }
        console.log('🔑 Permissões de admin detectadas');
    }
}

// ============================================
// CARREGAMENTO DE DADOS
// ============================================

/**
 * Carrega todos os dados do dashboard
 */
async function carregarTodosDados() {
    try {
        await Promise.all([
            carregarDadosUsuario(),
            carregarRanking(),
            carregarHistorico()
        ]);
        
        console.log('✅ Todos os dados carregados');
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        showError('Erro ao carregar dados do dashboard');
    }
}

/**
 * Carrega dados do usuário atual
 */
async function carregarDadosUsuario() {
    try {
        console.log('📊 Carregando dados do usuário...');
        
        // Atualizar nome do time
        atualizarElementos('#user-team-name', usuarioLogado.team_name);
        
        // Atualizar cartoletas
        const cartoletasFormatado = `C$ ${parseFloat(usuarioLogado.cartoletas).toFixed(2)}`;
        atualizarElementos('#user-cartoletas, #user-cartoletas-card', cartoletasFormatado);
        
        // Atualizar pontos totais
        const elementPoints = document.getElementById('user-points');
        if (elementPoints) {
            elementPoints.textContent = usuarioLogado.total_points || 0;
        }
        
        // Contar rodadas participadas
        const { count, error } = await supabase
            .from('lineups')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', usuarioLogado.id);
        
        if (!error) {
            const elementRounds = document.getElementById('user-rounds');
            if (elementRounds) {
                elementRounds.textContent = count || 0;
            }
        }
        
        console.log('✅ Dados do usuário carregados');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados do usuário:', error);
    }
}

/**
 * Carrega ranking geral
 */
async function carregarRanking() {
    try {
        console.log('🏆 Carregando ranking...');
        
        const { data: ranking, error } = await supabase
            .from('users')
            .select('id, team_name, total_points, cartoletas')
            .order('total_points', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        const tbody = document.getElementById('ranking-tbody');
        if (!tbody) return;
        
        // Verificar se há dados
        if (!ranking || ranking.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        <div class="flex flex-col items-center gap-2">
                            <svg class="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                            </svg>
                            <p>Nenhum time cadastrado ainda</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Renderizar ranking
        tbody.innerHTML = ranking.map((user, index) => {
            const posicao = index + 1;
            const isUsuarioAtual = user.id === usuarioLogado.id;
            const destaque = isUsuarioAtual ? 'bg-blue-50 dark:bg-blue-900/30' : '';
            
            // Atualizar posição do usuário no card
            if (isUsuarioAtual) {
                const elementPosition = document.getElementById('user-position');
                if (elementPosition) {
                    elementPosition.textContent = `${posicao}º`;
                }
            }
            
            // Ícones de medalha para top 3
            let positionDisplay = `<span class="text-gray-600 dark:text-gray-400">${posicao}º</span>`;
            if (posicao === 1) positionDisplay = '<span class="text-2xl">🥇</span>';
            else if (posicao === 2) positionDisplay = '<span class="text-2xl">🥈</span>';
            else if (posicao === 3) positionDisplay = '<span class="text-2xl">🥉</span>';
            
            return `
                <tr class="${destaque} transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td class="px-4 py-3 whitespace-nowrap text-center">
                        <span class="font-bold">${positionDisplay}</span>
                    </td>
                    <td class="px-4 py-3">
                        <span class="font-semibold ${isUsuarioAtual ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}">
                            ${user.team_name}
                            ${isUsuarioAtual ? '<span class="text-xs ml-1 bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">(Você)</span>' : ''}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <span class="font-bold text-green-600 dark:text-green-400">${user.total_points || 0}</span>
                    </td>
                    <td class="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                        C$ ${parseFloat(user.cartoletas).toFixed(2)}
                    </td>
                </tr>
            `;
        }).join('');
        
        console.log('✅ Ranking carregado:', ranking.length, 'times');
        
    } catch (error) {
        console.error('❌ Erro ao carregar ranking:', error);
        const tbody = document.getElementById('ranking-tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-4 py-8 text-center text-red-500">
                        <div class="flex flex-col items-center gap-2">
                            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <p>Erro ao carregar ranking</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Carrega histórico de escalações
 */
async function carregarHistorico() {
    try {
        console.log('📈 Carregando histórico...');
        
        const { data: escalacoes, error } = await supabase
            .from('lineups')
            .select(`
                id,
                round_id,
                total_points,
                created_at,
                rounds (name, status)
            `)
            .eq('user_id', usuarioLogado.id)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        const container = document.getElementById('historico-lista');
        if (!container) return;
        
        // Verificar se há dados
        if (!escalacoes || escalacoes.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <svg class="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    <p class="text-gray-500 dark:text-gray-400 mb-2">📋 Você ainda não criou nenhuma escalação</p>
                    <a href="mercado.html" class="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold">
                        Crie sua primeira escalação
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                    </a>
                </div>
            `;
            return;
        }
        
        // Renderizar histórico
        container.innerHTML = escalacoes.map(escalacao => {
            const data = new Date(escalacao.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const rodadaNome = escalacao.rounds?.name || 'Rodada';
            const status = escalacao.rounds?.status || 'pending';
            
            // Badge de status
            let statusBadge = '';
            let statusIcon = '';
            
            if (status === 'active') {
                statusBadge = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
                statusIcon = '⚡';
            } else if (status === 'finished') {
                statusBadge = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
                statusIcon = '✓';
            } else if (status === 'pending') {
                statusBadge = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
                statusIcon = '⏳';
            }
            
            const statusTexto = {
                'active': 'Em Andamento',
                'finished': 'Finalizada',
                'pending': 'Aguardando'
            }[status] || 'Desconhecido';
            
            return `
                <div class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <p class="font-semibold text-gray-900 dark:text-white">${rodadaNome}</p>
                            <span class="text-xs ${statusBadge} px-2 py-1 rounded-full">${statusIcon} ${statusTexto}</span>
                        </div>
                        <p class="text-sm text-gray-500 dark:text-gray-400">${data}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-2xl font-bold text-green-600 dark:text-green-400">${escalacao.total_points || 0}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">pontos</p>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('✅ Histórico carregado:', escalacoes.length, 'escalações');
        
    } catch (error) {
        console.error('❌ Erro ao carregar histórico:', error);
        const container = document.getElementById('historico-lista');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12 text-red-500">
                    <svg class="mx-auto h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p>Erro ao carregar histórico</p>
                </div>
            `;
        }
    }
}

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Atualiza conteúdo de múltiplos elementos
 * @param {string} selector - Seletor CSS
 * @param {string} content - Conteúdo a ser inserido
 */
function atualizarElementos(selector, content) {
    const elementos = document.querySelectorAll(selector);
    elementos.forEach(el => {
        el.textContent = content;
    });
}

// ============================================
// ATUALIZAÇÃO AUTOMÁTICA
// ============================================

/**
 * Inicia atualização automática dos dados
 */
function iniciarAtualizacaoAutomatica() {
    // Atualizar a cada 30 segundos
    intervaloAtualizacao = setInterval(() => {
        if (usuarioLogado) {
            console.log('🔄 Atualizando dados automaticamente...');
            carregarRanking();
            carregarDadosUsuario();
        }
    }, 30000); // 30 segundos
    
    console.log('✅ Atualização automática iniciada');
}

/**
 * Para atualização automática
 */
function pararAtualizacaoAutomatica() {
    if (intervaloAtualizacao) {
        clearInterval(intervaloAtualizacao);
        intervaloAtualizacao = null;
        console.log('⏸️ Atualização automática parada');
    }
}

// Limpar intervalo quando sair da página
window.addEventListener('beforeunload', () => {
    pararAtualizacaoAutomatica();
});

// ============================================
// EXPORTAÇÃO
// ============================================

// Exportar funções para uso global
window.dashboard = {
    carregarTodosDados,
    carregarDadosUsuario,
    carregarRanking,
    carregarHistorico,
    iniciarAtualizacaoAutomatica,
    pararAtualizacaoAutomatica
};

console.log('✅ Dashboard inicializado');