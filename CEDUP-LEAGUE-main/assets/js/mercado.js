// ============================================
// MERCADO DE FUTSAL - CARTOLA COACH
// ============================================

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let usuarioLogado = null;
let jogadoresDisponiveis = [];
let saldoAtual = 40.00;
let mercadoAberto = true;

// Estrutura da escalação para FUTSAL (1 GOL, 1 FIX, 2 ALA, 1 PIV)
let escalacaoAtual = {
    'GOL': null,
    'FIX': null,
    'ALA': [null, null],
    'PIV': null
};

// Limites de formação FUTSAL
const FORMACAO_LIMITES = {
    'GOL': 1,
    'FIX': 1,
    'ALA': 2,
    'PIV': 1
};

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

// Obter cor do badge da posição
function getCorPosicao(posicao) {
    const cores = {
        'GOL': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'FIX': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'ALA': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'PIV': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    return cores[posicao] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
}

// Obter cor do círculo da posição
function getCorCirculo(posicao) {
    const cores = {
        'GOL': 'bg-yellow-500',
        'FIX': 'bg-blue-500',
        'ALA': 'bg-green-500',
        'PIV': 'bg-red-500'
    };
    return cores[posicao] || 'bg-gray-500';
}

// Obter cor gradiente da posição
function getCorGradiente(posicao) {
    const cores = {
        'GOL': 'from-yellow-400 to-yellow-600',
        'FIX': 'from-blue-400 to-blue-600',
        'ALA': 'from-green-400 to-green-600',
        'PIV': 'from-red-400 to-red-600'
    };
    return cores[posicao] || 'from-gray-400 to-gray-600';
}

// Mostrar mensagem de notificação
function mostrarMensagem(mensagem, tipo = 'info') {
    console.log(`${tipo.toUpperCase()}: ${mensagem}`);
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 ${
        tipo === 'success' ? 'bg-green-500 text-white' :
        tipo === 'error' ? 'bg-red-500 text-white' :
        tipo === 'warning' ? 'bg-yellow-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = mensagem;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Calcular total de jogadores na escalação
function calcularTotalJogadores() {
    let total = 0;
    if (escalacaoAtual.GOL) total++;
    if (escalacaoAtual.FIX) total++;
    if (escalacaoAtual.PIV) total++;
    total += escalacaoAtual.ALA.filter(j => j !== null).length;
    return total;
}

// Calcular custo total da escalação
function calcularCustoEscalacao() {
    let custo = 0;
    if (escalacaoAtual.GOL) custo += escalacaoAtual.GOL.price;
    if (escalacaoAtual.FIX) custo += escalacaoAtual.FIX.price;
    if (escalacaoAtual.PIV) custo += escalacaoAtual.PIV.price;
    escalacaoAtual.ALA.forEach(jogador => {
        if (jogador) custo += jogador.price;
    });
    return custo;
}

// Resetar escalação
function resetarEscalacao() {
    escalacaoAtual = {
        'GOL': null,
        'FIX': null,
        'ALA': [null, null],
        'PIV': null
    };
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando mercado de futsal...');
    
    // Verificar autenticação
    usuarioLogado = await verificarAutenticacao();
    if (!usuarioLogado) {
        window.location.href = 'index.html';
        return;
    }

    await inicializarMercado();
});

// Inicializar o mercado
async function inicializarMercado() {
    try {
        console.log('⚙️ Carregando dados do mercado de futsal...');
        
        // Verificar se há rodada ativa antes de tudo
        await verificarStatusMercado();
        
        if (!mercadoAberto) {
            mostrarMercadoFechado();
            return;
        }
        
        // Carregar dados do usuário e jogadores
        await carregarSaldoUsuario();
        await carregarJogadores();
        await carregarEscalacaoAtual();
        
        // Configurar interface
        preencherFiltroTimes();
        configurarFiltros();
        
        // Atualizar displays
        atualizarDisplaySaldo();
        renderizarJogadores();
        renderizarEscalacao();
        
        console.log('✅ Mercado de futsal inicializado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar mercado:', error);
        mostrarMensagem('Erro ao carregar o mercado', 'error');
    }
}

// ============================================
// STATUS DO MERCADO
// ============================================

// Verificar se o mercado está aberto
async function verificarStatusMercado() {
    try {
        // Versão alternativa que evita o erro 406
        // Busca TODAS as rodadas e filtra no JavaScript
        const { data: todasRodadas, error } = await supabase
            .from('rounds')
            .select('id, name, status');
        
        if (error) {
            console.error('Erro ao buscar rodadas:', error);
            // Se der erro, deixa mercado aberto por padrão
            mercadoAberto = true;
            return true;
        }
        
        // Filtrar rodadas ativas no JavaScript (em vez de no SQL)
        const rodadaAtiva = todasRodadas?.find(r => r.status === 'active');
        
        if (rodadaAtiva) {
            console.log('🔒 Rodada ativa encontrada:', rodadaAtiva.name);
            mercadoAberto = false;
            return false;
        } else {
            console.log('✅ Nenhuma rodada ativa - Mercado aberto');
            mercadoAberto = true;
            return true;
        }
        
    } catch (error) {
        console.error('Erro ao verificar status do mercado:', error);
        mercadoAberto = true;
        return true;
    }
}


// Mostrar mensagem de mercado fechado
function mostrarMercadoFechado() {
    const container = document.querySelector('.max-w-7xl');
    if (!container) return;
    
    container.innerHTML = `
        <div class="min-h-screen flex items-center justify-center">
            <div class="max-w-2xl mx-auto text-center px-4">
                <!-- Ícone de bloqueio -->
                <div class="mb-8">
                    <div class="inline-block p-6 bg-red-100 dark:bg-red-900 rounded-full">
                        <svg class="w-24 h-24 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                    </div>
                </div>
                
                <!-- Título -->
                <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    🔒 Mercado Fechado
                </h1>
                
                <!-- Mensagem -->
                <div class="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-6 mb-8">
                    <p class="text-lg text-gray-700 dark:text-gray-300 mb-2">
                        <strong>Há uma rodada em andamento!</strong>
                    </p>
                    <p class="text-gray-600 dark:text-gray-400">
                        O mercado está temporariamente fechado durante as partidas.<br>
                        Você poderá fazer alterações na sua escalação assim que a rodada for finalizada.
                    </p>
                </div>
                
                <!-- Informações -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div class="text-3xl mb-2">⚽</div>
                        <h3 class="font-semibold text-gray-900 dark:text-white mb-2">Acompanhe os Jogos</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            Veja como seus jogadores estão se saindo em tempo real
                        </p>
                    </div>
                    
                    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div class="text-3xl mb-2">📊</div>
                        <h3 class="font-semibold text-gray-900 dark:text-white mb-2">Pontuação ao Vivo</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            Os pontos são atualizados conforme as estatísticas
                        </p>
                    </div>
                </div>
                
                <!-- Botões de ação -->
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="dashboard.html" class="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                        </svg>
                        Ir para Dashboard
                    </a>
                    
                    <button onclick="location.reload()" class="inline-flex items-center justify-center px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        Atualizar Página
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Atualizar badge de status do mercado
function atualizarBadgeMercado() {
    const badge = document.getElementById('status-mercado');
    if (!badge) return;
    
    if (mercadoAberto) {
        badge.className = 'ml-3 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        badge.innerHTML = '✅ Aberto';
    } else {
        badge.className = 'ml-3 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        badge.innerHTML = '🔒 Fechado';
    }
}

// ============================================
// CARREGAR DADOS
// ============================================

// Carregar saldo do usuário
async function carregarSaldoUsuario() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('cartoletas')
            .eq('id', usuarioLogado.id)
            .single();
        
        if (error) throw error;
        
        saldoAtual = data.cartoletas || 40.00;
        console.log('💰 Saldo carregado:', saldoAtual);
        
    } catch (error) {
        console.error('Erro ao carregar saldo:', error);
        saldoAtual = 40.00;
    }
}

// Carregar jogadores disponíveis
async function carregarJogadores() {
    try {
        const { data, error } = await supabase
            .from('players')
            .select(`
                id,
                name,
                position,
                price,
                photo_url,
                team:teams(name, logo_url)
            `)
            .order('name');
        
        if (error) throw error;
        
        jogadoresDisponiveis = data || [];
        console.log('✅ Jogadores carregados:', jogadoresDisponiveis.length);
        
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        jogadoresDisponiveis = [];
    }
}

// Carregar escalação atual do usuário
async function carregarEscalacaoAtual() {
    try {
        // Buscar rodadas SEM filtro
        const { data: todasRodadas } = await supabase
            .from('rounds')
            .select('id, status');
        
        const rodadaPendente = todasRodadas?.find(r => r.status === 'pending');
        if (!rodadaPendente) return;
        
        // Buscar lineups SEM filtro
        const { data: todasEscalacoes } = await supabase
            .from('lineups')
            .select('id, user_id, round_id');
        
        const minhaEscalacao = todasEscalacoes?.find(
            e => e.user_id === usuarioLogado.id && e.round_id === rodadaPendente.id
        );
        
        if (!minhaEscalacao) return;
        
        // Buscar jogadores (este .eq() pode ficar, é ID)
        const { data: jogadoresEscalacao } = await supabase
            .from('lineup_players')
            .select(`
                player_id,
                players (id, name, position, price, photo_url, team_id, teams(name, logo_url))
            `)
            .eq('lineup_id', minhaEscalacao.id);  // ✅ OK (.eq com ID funciona)
        
        if (errorEscalacao || !escalacao) {
            console.log('ℹ️ Nenhuma escalação anterior encontrada');
            return;
        }
        
        // Preencher escalação atual
        resetarEscalacao();
        
        escalacao.lineup_players.forEach(lp => {
            const jogador = lp.player;
            
            if (jogador.position === 'GOL') {
                escalacaoAtual.GOL = jogador;
            } else if (jogador.position === 'FIX') {
                escalacaoAtual.FIX = jogador;
            } else if (jogador.position === 'PIV') {
                escalacaoAtual.PIV = jogador;
            } else if (jogador.position === 'ALA') {
                const indiceVazio = escalacaoAtual.ALA.findIndex(j => j === null);
                if (indiceVazio !== -1) {
                    escalacaoAtual.ALA[indiceVazio] = jogador;
                }
            }
        });
        
        console.log('✅ Escalação anterior carregada');
        
    } catch (error) {
        console.error('Erro ao carregar escalação:', error);
    }
}

// ============================================
// FILTROS E BUSCA
// ============================================

// Preencher filtro de times
function preencherFiltroTimes() {
    const filtroTime = document.getElementById('filtro-time');
    if (!filtroTime) return;
    
    const times = [...new Set(jogadoresDisponiveis.map(j => j.team?.name).filter(Boolean))];
    times.sort();
    
    filtroTime.innerHTML = '<option value="">Todos os times</option>';
    times.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time;
        filtroTime.appendChild(option);
    });
}

// Configurar filtros
function configurarFiltros() {
    const busca = document.getElementById('busca-jogador');
    const filtroPosicao = document.getElementById('filtro-posicao');
    const filtroTime = document.getElementById('filtro-time');
    const filtroOrdem = document.getElementById('filtro-ordem');
    
    if (busca) busca.addEventListener('input', renderizarJogadores);
    if (filtroPosicao) filtroPosicao.addEventListener('change', renderizarJogadores);
    if (filtroTime) filtroTime.addEventListener('change', renderizarJogadores);
    if (filtroOrdem) filtroOrdem.addEventListener('change', renderizarJogadores);
}

// Filtrar jogadores
function filtrarJogadores() {
    const busca = document.getElementById('busca-jogador')?.value.toLowerCase() || '';
    const posicao = document.getElementById('filtro-posicao')?.value || '';
    const time = document.getElementById('filtro-time')?.value || '';
    const ordem = document.getElementById('filtro-ordem')?.value || 'nome';
    
    let jogadoresFiltrados = jogadoresDisponiveis.filter(jogador => {
        const matchBusca = jogador.name.toLowerCase().includes(busca);
        const matchPosicao = !posicao || jogador.position === posicao;
        const matchTime = !time || jogador.team?.name === time;
        
        return matchBusca && matchPosicao && matchTime;
    });
    
    // Ordenar
    jogadoresFiltrados.sort((a, b) => {
        switch(ordem) {
            case 'preco-asc':
                return a.price - b.price;
            case 'preco-desc':
                return b.price - a.price;
            case 'nome':
            default:
                return a.name.localeCompare(b.name);
        }
    });
    
    return jogadoresFiltrados;
}

// ============================================
// RENDERIZAÇÃO
// ============================================

// Renderizar lista de jogadores
function renderizarJogadores() {
    const container = document.getElementById('lista-jogadores');
    if (!container) return;
    
    const jogadoresFiltrados = filtrarJogadores();
    
    if (jogadoresFiltrados.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
                <p class="mt-4 text-gray-500 dark:text-gray-400">Nenhum jogador encontrado</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = jogadoresFiltrados.map(jogador => {
        const jaEscalado = verificarJogadorEscalado(jogador.id);
        
        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 ${jaEscalado ? 'opacity-50' : ''}">
                <!-- Foto e Info -->
                <div class="flex items-start gap-3 mb-3">
                    <div class="relative">
                        <img src="${jogador.photo_url || 'https://via.placeholder.com/60'}" 
                             alt="${jogador.name}" 
                             class="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700">
                        <div class="absolute -bottom-1 -right-1 ${getCorCirculo(jogador.position)} w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold text-white">
                            ${jogador.position.charAt(0)}
                        </div>
                    </div>
                    
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-gray-900 dark:text-white truncate">${jogador.name}</h3>
                        <div class="flex items-center gap-2 mt-1">
                            ${jogador.team?.logo_url ? `
                                <img src="${jogador.team.logo_url}" alt="${jogador.team.name}" class="w-4 h-4">
                            ` : ''}
                            <span class="text-sm text-gray-600 dark:text-gray-400 truncate">${jogador.team?.name || 'Sem time'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Posição e Preço -->
                <div class="flex items-center justify-between mb-3">
                    <span class="px-2 py-1 rounded text-xs font-semibold ${getCorPosicao(jogador.position)}">
                        ${jogador.position}
                    </span>
                    <span class="text-lg font-bold text-green-600 dark:text-green-400">
                        C$ ${jogador.price.toFixed(2)}
                    </span>
                </div>
                
                <!-- Botão -->
                <button 
                    onclick="adicionarJogador(${jogador.id})" 
                    class="w-full py-2 rounded-lg font-semibold transition-colors ${
                        jaEscalado 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-gradient-to-r ${getCorGradiente(jogador.position)} text-white hover:opacity-90'
                    }"
                    ${jaEscalado ? 'disabled' : ''}>
                    ${jaEscalado ? '✓ Escalado' : '+ Escalar'}
                </button>
            </div>
        `;
    }).join('');
}

// Renderizar escalação
function renderizarEscalacao() {
    renderizarPosicao('GOL', 'container-gol');
    renderizarPosicao('FIX', 'container-fix');
    renderizarPosicao('PIV', 'container-piv');
    renderizarPosicaoALA();
    atualizarResumoEscalacao();
}

// Renderizar posição específica
function renderizarPosicao(posicao, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const jogador = escalacaoAtual[posicao];
    
    if (jogador) {
        container.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                <div class="flex items-center gap-2 mb-2">
                    <img src="${jogador.photo_url || 'https://via.placeholder.com/40'}" 
                         alt="${jogador.name}" 
                         class="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-sm text-gray-900 dark:text-white truncate">${jogador.name}</h4>
                        <p class="text-xs text-gray-600 dark:text-gray-400">${jogador.team?.name || 'Sem time'}</p>
                    </div>
                </div>
                <div class="flex items-center justify-between text-xs">
                    <span class="font-semibold text-green-600 dark:text-green-400">C$ ${jogador.price.toFixed(2)}</span>
                    <button onclick="removerJogador('${posicao}')" 
                            class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-semibold">
                        Remover
                    </button>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
                <div class="text-gray-400 dark:text-gray-500 text-sm">
                    <div class="font-semibold mb-1">${posicao}</div>
                    <div class="text-xs">Vazio</div>
                </div>
            </div>
        `;
    }
}

// Renderizar posição ALA (2 vagas)
function renderizarPosicaoALA() {
    const container1 = document.getElementById('container-ala-1');
    const container2 = document.getElementById('container-ala-2');
    
    [container1, container2].forEach((container, index) => {
        if (!container) return;
        
        const jogador = escalacaoAtual.ALA[index];
        
        if (jogador) {
            container.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                    <div class="flex items-center gap-2 mb-2">
                        <img src="${jogador.photo_url || 'https://via.placeholder.com/40'}" 
                             alt="${jogador.name}" 
                             class="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700">
                        <div class="flex-1 min-w-0">
                            <h4 class="font-semibold text-sm text-gray-900 dark:text-white truncate">${jogador.name}</h4>
                            <p class="text-xs text-gray-600 dark:text-gray-400">${jogador.team?.name || 'Sem time'}</p>
                        </div>
                    </div>
                    <div class="flex items-center justify-between text-xs">
                        <span class="font-semibold text-green-600 dark:text-green-400">C$ ${jogador.price.toFixed(2)}</span>
                        <button onclick="removerJogador('ALA', ${index})" 
                                class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-semibold">
                            Remover
                        </button>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
                    <div class="text-gray-400 dark:text-gray-500 text-sm">
                        <div class="font-semibold mb-1">ALA ${index + 1}</div>
                        <div class="text-xs">Vazio</div>
                    </div>
                </div>
            `;
        }
    });
}

// Atualizar resumo da escalação
function atualizarResumoEscalacao() {
    const totalJogadores = calcularTotalJogadores();
    const custoTotal = calcularCustoEscalacao();
    const escalacaoCompleta = totalJogadores === 5;
    
    const contadores = {
        GOL: escalacaoAtual.GOL ? 1 : 0,
        FIX: escalacaoAtual.FIX ? 1 : 0,
        ALA: escalacaoAtual.ALA.filter(j => j !== null).length,
        PIV: escalacaoAtual.PIV ? 1 : 0
    };
    
    const resumoContainer = document.getElementById('resumo-escalacao');
    if (!resumoContainer) return;
    
    resumoContainer.innerHTML = `
        <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6">
            <h3 class="text-lg font-bold mb-4">📋 Resumo da Escalação</h3>
            
            <!-- Contadores por posição -->
            <div class="grid grid-cols-4 gap-2 mb-4">
                <div class="text-center">
                    <div class="text-2xl font-bold ${contadores.GOL === 1 ? 'text-green-300' : 'text-red-300'}">${contadores.GOL}</div>
                    <div class="text-xs">GOL</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold ${contadores.FIX === 1 ? 'text-green-300' : 'text-red-300'}">${contadores.FIX}</div>
                    <div class="text-xs">FIX</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold ${contadores.ALA === 2 ? 'text-green-300' : 'text-red-300'}">${contadores.ALA}</div>
                    <div class="text-xs">ALA</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold ${contadores.PIV === 1 ? 'text-green-300' : 'text-red-300'}">${contadores.PIV}</div>
                    <div class="text-xs">PIV</div>
                </div>
            </div>
            
            <!-- Total de jogadores -->
            <div class="text-xl font-bold mb-2">
                ${totalJogadores}/5 jogadores
            </div>
            
            <!-- Status -->
            <div class="text-sm mb-4">
                ${escalacaoCompleta ? '✅ Escalação completa!' : '⚠️ Complete sua escalação'}
            </div>
            
            <!-- Custo -->
            <div class="border-t border-white/30 pt-4">
                <div class="flex justify-between items-center">
                    <span class="text-sm">Custo Total:</span>
                    <span class="text-2xl font-bold">C$ ${custoTotal.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
}

// Atualizar display de saldo
function atualizarDisplaySaldo() {
    const saldoElement = document.getElementById('saldo-atual');
    if (saldoElement) {
        saldoElement.textContent = `C$ ${saldoAtual.toFixed(2)}`;
    }
    
    const custoElement = document.getElementById('custo-escalacao');
    if (custoElement) {
        custoElement.textContent = `C$ ${calcularCustoEscalacao().toFixed(2)}`;
    }
    
    const saldoRestante = saldoAtual - calcularCustoEscalacao();
    const saldoRestanteElement = document.getElementById('saldo-restante');
    if (saldoRestanteElement) {
        saldoRestanteElement.textContent = `C$ ${saldoRestante.toFixed(2)}`;
        saldoRestanteElement.className = saldoRestante >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    }
}

// ============================================
// MANIPULAÇÃO DA ESCALAÇÃO
// ============================================

// Verificar se jogador já está escalado
function verificarJogadorEscalado(jogadorId) {
    if (escalacaoAtual.GOL?.id === jogadorId) return true;
    if (escalacaoAtual.FIX?.id === jogadorId) return true;
    if (escalacaoAtual.PIV?.id === jogadorId) return true;
    if (escalacaoAtual.ALA.some(j => j?.id === jogadorId)) return true;
    return false;
}

// Adicionar jogador à escalação
function adicionarJogador(jogadorId) {
    const jogador = jogadoresDisponiveis.find(j => j.id === jogadorId);
    if (!jogador) return;
    
    // Verificar se já está escalado
    if (verificarJogadorEscalado(jogadorId)) {
        mostrarMensagem('Jogador já está escalado', 'warning');
        return;
    }
    
    // Verificar saldo
    if (calcularCustoEscalacao() + jogador.price > saldoAtual) {
        mostrarMensagem('Saldo insuficiente', 'error');
        return;
    }
    
    // Adicionar à posição correspondente
    const posicao = jogador.position;
    
    if (posicao === 'GOL') {
        if (escalacaoAtual.GOL) {
            mostrarMensagem('Já há um goleiro escalado', 'warning');
            return;
        }
        escalacaoAtual.GOL = jogador;
    } else if (posicao === 'FIX') {
        if (escalacaoAtual.FIX) {
            mostrarMensagem('Já há um fixo escalado', 'warning');
            return;
        }
        escalacaoAtual.FIX = jogador;
    } else if (posicao === 'PIV') {
        if (escalacaoAtual.PIV) {
            mostrarMensagem('Já há um pivô escalado', 'warning');
            return;
        }
        escalacaoAtual.PIV = jogador;
    } else if (posicao === 'ALA') {
        const indiceVazio = escalacaoAtual.ALA.findIndex(j => j === null);
        if (indiceVazio === -1) {
            mostrarMensagem('Já há 2 alas escalados', 'warning');
            return;
        }
        escalacaoAtual.ALA[indiceVazio] = jogador;
    }
    
    renderizarJogadores();
    renderizarEscalacao();
    mostrarMensagem(`${jogador.name} adicionado à escalação`, 'success');
}

// Remover jogador da escalação
function removerJogador(posicao, indice = null) {
    if (posicao === 'ALA' && indice !== null) {
        if (escalacaoAtual.ALA[indice]) {
            const jogador = escalacaoAtual.ALA[indice];
            escalacaoAtual.ALA[indice] = null;
            mostrarMensagem(`${jogador.name} removido da escalação`, 'info');
        }
    } else {
        if (escalacaoAtual[posicao]) {
            const jogador = escalacaoAtual[posicao];
            escalacaoAtual[posicao] = null;
            mostrarMensagem(`${jogador.name} removido da escalação`, 'info');
        }
    }
    
    renderizarJogadores();
    renderizarEscalacao();
}

// Limpar escalação
function limparEscalacao() {
    const totalJogadores = calcularTotalJogadores();
    if (totalJogadores === 0) {
        mostrarMensagem('Escalação já está vazia', 'info');
        return;
    }
    
    if (confirm('Tem certeza que deseja limpar toda a escalação?')) {
        resetarEscalacao();
        renderizarJogadores();
        renderizarEscalacao();
        mostrarMensagem('Escalação limpa com sucesso', 'success');
    }
}

// ============================================
// SALVAR ESCALAÇÃO
// ============================================

async function salvarEscalacao() {
    // Verificar se mercado ainda está aberto
    const mercadoEstaAberto = await verificarStatusMercado();
    if (!mercadoEstaAberto) {
        alert('⚠️ O mercado foi fechado! Uma rodada foi iniciada.');
        location.reload();
        return;
    }
    
    try {
        const totalJogadores = calcularTotalJogadores();
        
        // Validações
        if (totalJogadores !== 5) {
            mostrarMensagem('A escalação deve ter exatamente 5 jogadores', 'error');
            return;
        }
        
        if (!escalacaoAtual.GOL || !escalacaoAtual.FIX || !escalacaoAtual.PIV || 
            escalacaoAtual.ALA.filter(j => j).length !== 2) {
            mostrarMensagem('Formação inválida (1 GOL, 1 FIX, 2 ALA, 1 PIV)', 'error');
            return;
        }
        
        if (calcularCustoEscalacao() > saldoAtual) {
            mostrarMensagem('Custo da escalação excede o saldo disponível', 'error');
            return;
        }
        
        // Buscar rodada pendente
        const { data: rodadaPendente, error: errorRodada } = await supabase
            .from('rounds')
            .select('id')
            .eq('status', 'pending')
            .single();
        
        if (errorRodada || !rodadaPendente) {
            mostrarMensagem('Nenhuma rodada pendente encontrada', 'error');
            return;
        }
        
        // Verificar se já existe escalação
        const { data: escalacaoExistente } = await supabase
            .from('lineups')
            .select('id')
            .eq('user_id', usuarioLogado.id)
            .eq('round_id', rodadaPendente.id)
            .single();
        
        let lineupId;
        
        if (escalacaoExistente) {
            lineupId = escalacaoExistente.id;
            
            // Deletar jogadores da escalação anterior
            await supabase
                .from('lineup_players')
                .delete()
                .eq('lineup_id', lineupId);
        } else {
            // Criar nova escalação
            const { data: novaEscalacao, error: errorEscalacao } = await supabase
                .from('lineups')
                .insert({
                    user_id: usuarioLogado.id,
                    round_id: rodadaPendente.id,
                    total_points: 0
                })
                .select('id')
                .single();
            
            if (errorEscalacao) throw errorEscalacao;
            lineupId = novaEscalacao.id;
        }
        
        // Preparar dados dos jogadores
        const jogadoresParaInserir = [];
        
        if (escalacaoAtual.GOL) {
            jogadoresParaInserir.push({
                lineup_id: lineupId,
                player_id: escalacaoAtual.GOL.id,
                is_starter: true,
                points: 0
            });
        }
        
        if (escalacaoAtual.FIX) {
            jogadoresParaInserir.push({
                lineup_id: lineupId,
                player_id: escalacaoAtual.FIX.id,
                is_starter: true,
                points: 0
            });
        }
        
        escalacaoAtual.ALA.forEach(jogador => {
            if (jogador) {
                jogadoresParaInserir.push({
                    lineup_id: lineupId,
                    player_id: jogador.id,
                    is_starter: true,
                    points: 0
                });
            }
        });
        
        if (escalacaoAtual.PIV) {
            jogadoresParaInserir.push({
                lineup_id: lineupId,
                player_id: escalacaoAtual.PIV.id,
                is_starter: true,
                points: 0
            });
        }
        
        // Inserir jogadores
        const { error: errorJogadores } = await supabase
            .from('lineup_players')
            .insert(jogadoresParaInserir);
        
        if (errorJogadores) throw errorJogadores;
        
        // Atualizar saldo do usuário
        const novoSaldo = saldoAtual - calcularCustoEscalacao();
        const { error: errorSaldo } = await supabase
            .from('users')
            .update({ cartoletas: novoSaldo })
            .eq('id', usuarioLogado.id);
        
        if (errorSaldo) throw errorSaldo;
        
        saldoAtual = novoSaldo;
        
        console.log('✅ Escalação salva com sucesso!');
        mostrarMensagem('Escalação salva com sucesso!', 'success');
        
        atualizarDisplaySaldo();
        
    } catch (error) {
        console.error('❌ Erro ao salvar escalação:', error);
        mostrarMensagem('Erro ao salvar escalação', 'error');
    }
}

// ============================================
// AUTO-ATUALIZAÇÃO DE STATUS
// ============================================

// Verificar status do mercado a cada 30 segundos
setInterval(async () => {
    if (usuarioLogado) {
        const statusAnterior = mercadoAberto;
        await verificarStatusMercado();
        
        // Se o status mudou, recarregar a página
        if (statusAnterior !== mercadoAberto) {
            console.log('⚠️ Status do mercado mudou! Recarregando...');
            alert(mercadoAberto ? 
                '✅ Mercado reaberto! A rodada foi finalizada.' : 
                '🔒 Mercado fechado! Uma rodada foi iniciada.'
            );
            location.reload();
        }
        
        atualizarBadgeMercado();
    }
}, 30000); // 30 segundos
//