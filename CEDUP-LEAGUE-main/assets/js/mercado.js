// assets/js/mercado.js

let usuarioLogado = null;
let jogadoresDisponiveis = [];
let saldoAtual = 40.00; // Saldo para futsal

// Estrutura da escalação para FUTSAL
let escalacaoAtual = {
    titulares: {
        'GOL': null,
        'FIX': null,
        'ALA': [null, null], // 2 alas
        'PIV': null
    },
    reservas: {
        'GOL': null,
        'FIX': null,
        'ALA': [null, null], // 2 alas reservas
        'PIV': null
    }
};

// Limites de formação FUTSAL
const FORMACAO_LIMITES = {
    'GOL': { titulares: 1, reservas: 1 },
    'FIX': { titulares: 1, reservas: 1 },
    'ALA': { titulares: 2, reservas: 2 },
    'PIV': { titulares: 1, reservas: 1 }
};

// Aguarda o DOM carregar
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
        
        // Carregar saldo atual do usuário
        await carregarSaldoUsuario();
        
        // Carregar jogadores disponíveis
        await carregarJogadores();
        
        // Carregar escalação atual (se existir)
        await carregarEscalacaoAtual();
        
        // Preencher filtro de times
        preencherFiltroTimes();
        
        // Configurar filtros e busca
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

// Carregar saldo atual do usuário
async function carregarSaldoUsuario() {
    const { data, error } = await supabase
        .from('users')
        .select('cartoletas')
        .eq('id', usuarioLogado.id)
        .single();
    
    if (error) {
        console.error('❌ Erro ao carregar saldo:', error);
        return;
    }
    
    saldoAtual = parseFloat(data.cartoletas) || 40.00;
    console.log(`💰 Saldo atual: C$ ${saldoAtual.toFixed(2)}`);
}

// Carregar jogadores disponíveis
async function carregarJogadores() {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('position', { ascending: true })
        .order('price', { ascending: true });
    
    if (error) {
        console.error('❌ Erro ao carregar jogadores:', error);
        return;
    }
    
    jogadoresDisponiveis = data || [];
    console.log(`👥 ${jogadoresDisponiveis.length} jogadores carregados`);
}

// Preencher filtro de times
function preencherFiltroTimes() {
    const selectTime = document.getElementById('filtro-time');
    if (!selectTime) return;
    
    const times = [...new Set(jogadoresDisponiveis.map(j => j.team))].sort();
    
    selectTime.innerHTML = `
        <option value="todos">Todos os times</option>
        ${times.map(time => `<option value="${time}">${time}</option>`).join('')}
    `;
}

// Carregar escalação atual do usuário
async function carregarEscalacaoAtual() {
    try {
        // Buscar a rodada ativa
        const { data: rodadaAtiva } = await supabase
            .from('rounds')
            .select('id')
            .eq('status', 'active')
            .single();
        
        if (!rodadaAtiva) {
            console.log('⚠️ Nenhuma rodada ativa encontrada');
            return;
        }
        
        // Buscar escalação da rodada ativa
        const { data: escalacao } = await supabase
            .from('lineups')
            .select(`
                id,
                lineup_players (
                    player_id,
                    is_starter,
                    players (*)
                )
            `)
            .eq('user_id', usuarioLogado.id)
            .eq('round_id', rodadaAtiva.id)
            .single();
        
        if (escalacao && escalacao.lineup_players) {
            // Reorganizar escalação por posição e tipo (titular/reserva)
            resetarEscalacao();
            
            escalacao.lineup_players.forEach(lp => {
                const jogador = lp.players;
                const posicao = jogador.position;
                const ehTitular = lp.is_starter;
                
                if (ehTitular) {
                    if (posicao === 'ALA') {
                        // Encontrar primeira posição vazia nos alas titulares
                        if (escalacaoAtual.titulares.ALA[0] === null) {
                            escalacaoAtual.titulares.ALA[0] = jogador;
                        } else if (escalacaoAtual.titulares.ALA[1] === null) {
                            escalacaoAtual.titulares.ALA[1] = jogador;
                        }
                    } else {
                        escalacaoAtual.titulares[posicao] = jogador;
                    }
                } else {
                    if (posicao === 'ALA') {
                        // Encontrar primeira posição vazia nos alas reservas
                        if (escalacaoAtual.reservas.ALA[0] === null) {
                            escalacaoAtual.reservas.ALA[0] = jogador;
                        } else if (escalacaoAtual.reservas.ALA[1] === null) {
                            escalacaoAtual.reservas.ALA[1] = jogador;
                        }
                    } else {
                        escalacaoAtual.reservas[posicao] = jogador;
                    }
                }
            });
            
            console.log(`⚽ Escalação carregada com sucesso`);
        }
        
    } catch (error) {
        console.log('⚠️ Nenhuma escalação encontrada para a rodada ativa');
        resetarEscalacao();
    }
}

// Resetar escalação
function resetarEscalacao() {
    escalacaoAtual = {
        titulares: {
            'GOL': null,
            'FIX': null,
            'ALA': [null, null],
            'PIV': null
        },
        reservas: {
            'GOL': null,
            'FIX': null,
            'ALA': [null, null],
            'PIV': null
        }
    };
}

// Configurar filtros e busca
function configurarFiltros() {
    // Filtro por posição
    const selectPosicao = document.getElementById('filtro-posicao');
    selectPosicao?.addEventListener('change', renderizarJogadores);
    
    // Filtro por time
    const selectTime = document.getElementById('filtro-time');
    selectTime?.addEventListener('change', renderizarJogadores);
    
    // Busca por nome
    const inputBusca = document.getElementById('busca-jogador');
    inputBusca?.addEventListener('input', renderizarJogadores);
    
    // Botão limpar escalação
    const btnLimpar = document.getElementById('btn-limpar-escalacao');
    btnLimpar?.addEventListener('click', limparEscalacao);
    
    // Botão salvar escalação
    const btnSalvar = document.getElementById('btn-salvar-escalacao');
    btnSalvar?.addEventListener('click', salvarEscalacao);
}

// Renderizar lista de jogadores
function renderizarJogadores() {
    const container = document.getElementById('lista-jogadores');
    if (!container) return;
    
    const jogadoresFiltrados = filtrarJogadores();
    
    if (jogadoresFiltrados.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Nenhum jogador encontrado</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = jogadoresFiltrados.map(jogador => {
        const statusEscalacao = getStatusJogadorEscalacao(jogador.id);
        const podeAdicionarReserva = podeAdicionarComoReserva(jogador);
        
        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-all duration-200 hover:shadow-lg">
                <div class="flex items-center space-x-3">
                    <img src="${jogador.photo_url || '/assets/images/player-default.png'}" 
                         alt="${jogador.name}" 
                         class="w-12 h-12 rounded-full object-cover"
                         onerror="this.src='/assets/images/player-default.png'">
                    <div class="flex-1">
                        <h4 class="font-semibold text-gray-900 dark:text-white">${jogador.name}</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-300">${jogador.team}</p>
                    </div>
                    <div class="text-right">
                        <span class="inline-block px-2 py-1 text-xs font-medium rounded ${getCorPosicao(jogador.position)}">
                            ${jogador.position}
                        </span>
                        <p class="font-bold text-green-600 dark:text-green-400 mt-1">
                            C$ ${parseFloat(jogador.price).toFixed(2)}
                        </p>
                    </div>
                </div>
                
                <div class="mt-3">
                    ${statusEscalacao ? 
                        `<div class="flex items-center justify-between">
                            <span class="text-sm text-green-600 dark:text-green-400">
                                ✓ ${statusEscalacao}
                            </span>
                            <button onclick="removerJogador('${jogador.id}')"
                                    class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors">
                                Remover
                            </button>
                        </div>` :
                        `<div class="grid grid-cols-2 gap-2">
                            ${podeAdicionarTitular(jogador.position) ? 
                                `<button onclick="adicionarJogador('${jogador.id}', true)"
                                        class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors">
                                    Titular
                                </button>` :
                                `<button disabled class="bg-gray-300 text-gray-500 px-3 py-1 rounded text-sm cursor-not-allowed">
                                    Titular
                                </button>`
                            }
                            ${podeAdicionarReserva ? 
                                `<button onclick="adicionarJogador('${jogador.id}', false)"
                                        class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors">
                                    Reserva
                                </button>` :
                                `<button disabled class="bg-gray-300 text-gray-500 px-3 py-1 rounded text-sm cursor-not-allowed">
                                    Reserva
                                </button>`
                            }
                        </div>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

// Filtrar jogadores
function filtrarJogadores() {
    let jogadoresFiltrados = [...jogadoresDisponiveis];
    
    const posicaoSelecionada = document.getElementById('filtro-posicao')?.value;
    if (posicaoSelecionada && posicaoSelecionada !== 'todas') {
        jogadoresFiltrados = jogadoresFiltrados.filter(j => j.position === posicaoSelecionada);
    }
    
    const timeSelecionado = document.getElementById('filtro-time')?.value;
    if (timeSelecionado && timeSelecionado !== 'todos') {
        jogadoresFiltrados = jogadoresFiltrados.filter(j => j.team === timeSelecionado);
    }
    
    const termoBusca = document.getElementById('busca-jogador')?.value.toLowerCase();
    if (termoBusca) {
        jogadoresFiltrados = jogadoresFiltrados.filter(j => 
            j.name.toLowerCase().includes(termoBusca)
        );
    }
    
    return jogadoresFiltrados;
}

// Renderizar escalação (quadrinha + reservas)
function renderizarEscalacao() {
    const container = document.getElementById('escalacao-atual');
    if (!container) return;
    
    container.innerHTML = `
        <!-- Quadrinha Titulares -->
        <div class="bg-green-100 dark:bg-green-900 rounded-lg p-6 mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                ⚽ TITULARES
            </h3>
            
            <!-- Campo de Futsal -->
            <div class="relative bg-green-200 dark:bg-green-800 rounded-lg p-4 min-h-[300px]">
                
                <!-- Goleiro -->
                <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    ${renderizarPosicaoJogador(escalacaoAtual.titulares.GOL, 'GOL', true)}
                </div>
                
                <!-- Fixo -->
                <div class="absolute bottom-16 left-1/2 transform -translate-x-1/2">
                    ${renderizarPosicaoJogador(escalacaoAtual.titulares.FIX, 'FIX', true)}
                </div>
                
                <!-- Alas -->
                <div class="absolute top-1/2 left-4 transform -translate-y-1/2">
                    ${renderizarPosicaoJogador(escalacaoAtual.titulares.ALA[0], 'ALA', true, 0)}
                </div>
                <div class="absolute top-1/2 right-4 transform -translate-y-1/2">
                    ${renderizarPosicaoJogador(escalacaoAtual.titulares.ALA[1], 'ALA', true, 1)}
                </div>
                
                <!-- Pivô -->
                <div class="absolute top-4 left-1/2 transform -translate-x-1/2">
                    ${renderizarPosicaoJogador(escalacaoAtual.titulares.PIV, 'PIV', true)}
                </div>
                
            </div>
        </div>
        
        <!-- Banco de Reservas -->
        <div class="bg-orange-100 dark:bg-orange-900 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                🪑 RESERVAS
            </h3>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                ${renderizarReservasPorPosicao('GOL')}
                ${renderizarReservasPorPosicao('FIX')}
                ${renderizarReservasPorPosicao('ALA')}
                ${renderizarReservasPorPosicao('PIV')}
            </div>
        </div>
        
        <!-- Resumo da Escalação -->
        <div class="mt-6 bg-white dark:bg-gray-800 rounded-lg p-6">
            <div id="resumo-escalacao"></div>
        </div>
    `;
    
    atualizarResumoEscalacao();
}

// Renderizar jogador em uma posição (para a quadrinha)
function renderizarPosicaoJogador(jogador, posicao, ehTitular, indiceAla = null) {
    if (!jogador) {
        return `
            <div class="w-16 h-16 bg-white dark:bg-gray-700 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center">
                <span class="text-xs text-gray-500 dark:text-gray-400 font-bold">${posicao}</span>
            </div>
        `;
    }
    
    const identificador = indiceAla !== null ? `${posicao}-${indiceAla}` : posicao;
    
    return `
        <div class="relative group">
            <div class="w-16 h-16 bg-white rounded-full border-2 border-blue-500 p-1 cursor-pointer hover:shadow-lg transition-shadow"
                 title="${jogador.name} - ${jogador.team} - C$ ${parseFloat(jogador.price).toFixed(2)}">
                <img src="${jogador.photo_url || '/assets/images/player-default.png'}" 
                     alt="${jogador.name}" 
                     class="w-full h-full rounded-full object-cover"
                     onerror="this.src='/assets/images/player-default.png'">
            </div>
            <div class="absolute -top-2 -right-2">
                <button onclick="removerJogador('${jogador.id}')" 
                        class="w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    ×
                </button>
            </div>
            <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span class="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded shadow text-gray-800 dark:text-gray-200">
                    ${jogador.name.split(' ')[0]}
                </span>
            </div>
        </div>
    `;
}

// Renderizar reservas por posição
function renderizarReservasPorPosicao(posicao) {
    const reservas = posicao === 'ALA' ? escalacaoAtual.reservas[posicao] : [escalacaoAtual.reservas[posicao]];
    
    return `
        <div class="text-center">
            <h4 class="font-medium text-gray-800 dark:text-gray-200 mb-2">${posicao}</h4>
            ${reservas.map((jogador, index) => {
                if (!jogador) {
                    return `
                        <div class="w-12 h-12 bg-white dark:bg-gray-700 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center mx-auto mb-2">
                            <span class="text-xs text-gray-500 font-bold">R</span>
                        </div>
                    `;
                }
                
                return `
                    <div class="relative group mx-auto mb-2">
                        <div class="w-12 h-12 bg-white rounded-full border-2 border-orange-500 p-1 cursor-pointer hover:shadow-lg transition-shadow mx-auto"
                             title="${jogador.name} - ${jogador.team} - C$ ${parseFloat(jogador.price).toFixed(2)}">
                            <img src="${jogador.photo_url || '/assets/images/player-default.png'}" 
                                 alt="${jogador.name}" 
                                 class="w-full h-full rounded-full object-cover"
                                 onerror="this.src='/assets/images/player-default.png'">
                        </div>
                        <button onclick="removerJogador('${jogador.id}')" 
                                class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            ×
                        </button>
                        <div class="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate max-w-16">
                            ${jogador.name.split(' ')[0]}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Verificar se pode adicionar titular
function podeAdicionarTitular(posicao) {
    if (posicao === 'ALA') {
        return escalacaoAtual.titulares.ALA[0] === null || escalacaoAtual.titulares.ALA[1] === null;
    }
    return escalacaoAtual.titulares[posicao] === null;
}

// Verificar se pode adicionar como reserva
function podeAdicionarComoReserva(jogador) {
    const posicao = jogador.position;
    
    // Verificar se há espaço para reserva nesta posição
    let temEspacoReserva = false;
    if (posicao === 'ALA') {
        temEspacoReserva = escalacaoAtual.reservas.ALA[0] === null || escalacaoAtual.reservas.ALA[1] === null;
    } else {
        temEspacoReserva = escalacaoAtual.reservas[posicao] === null;
    }
    
    if (!temEspacoReserva) return false;
    
    // Verificar regra: reserva deve custar igual ou menos que o titular mais barato
    const titularMaisBarato = getTitularMaisBarato();
    if (!titularMaisBarato) return false;
    
    return parseFloat(jogador.price) <= parseFloat(titularMaisBarato.price);
}

// Obter titular mais barato da escalação
function getTitularMaisBarato() {
    const todosTitulares = [];
    
    if (escalacaoAtual.titulares.GOL) todosTitulares.push(escalacaoAtual.titulares.GOL);
    if (escalacaoAtual.titulares.FIX) todosTitulares.push(escalacaoAtual.titulares.FIX);
    if (escalacaoAtual.titulares.ALA[0]) todosTitulares.push(escalacaoAtual.titulares.ALA[0]);
    if (escalacaoAtual.titulares.ALA[1]) todosTitulares.push(escalacaoAtual.titulares.ALA[1]);
    if (escalacaoAtual.titulares.PIV) todosTitulares.push(escalacaoAtual.titulares.PIV);
    
    if (todosTitulares.length === 0) return null;
    
    return todosTitulares.reduce((maisBarato, atual) => {
        return parseFloat(atual.price) < parseFloat(maisBarato.price) ? atual : maisBarato;
    });
}

// Obter status do jogador na escalação
function getStatusJogadorEscalacao(jogadorId) {
    // Verificar titulares
    if (escalacaoAtual.titulares.GOL?.id === jogadorId) return 'Titular GOL';
    if (escalacaoAtual.titulares.FIX?.id === jogadorId) return 'Titular FIX';
    if (escalacaoAtual.titulares.ALA[0]?.id === jogadorId) return 'Titular ALA';
    if (escalacaoAtual.titulares.ALA[1]?.id === jogadorId) return 'Titular ALA';
    if (escalacaoAtual.titulares.PIV?.id === jogadorId) return 'Titular PIV';
    
    // Verificar reservas
    if (escalacaoAtual.reservas.GOL?.id === jogadorId) return 'Reserva GOL';
    if (escalacaoAtual.reservas.FIX?.id === jogadorId) return 'Reserva FIX';
    if (escalacaoAtual.reservas.ALA[0]?.id === jogadorId) return 'Reserva ALA';
    if (escalacaoAtual.reservas.ALA[1]?.id === jogadorId) return 'Reserva ALA';
    if (escalacaoAtual.reservas.PIV?.id === jogadorId) return 'Reserva PIV';
    
    return null;
}

// Adicionar jogador à escalação
function adicionarJogador(jogadorId, ehTitular) {
    const jogador = jogadoresDisponiveis.find(j => j.id === jogadorId);
    if (!jogador) return;
    
    const posicao = jogador.position;
    
    // Verificar saldo
    const custoTotal = calcularCustoEscalacao() + parseFloat(jogador.price);
    if (custoTotal > saldoAtual) {
        mostrarMensagem('Saldo insuficiente', 'error');
        return;
    }
    
    if (ehTitular) {
        // Adicionar como titular
        if (!podeAdicionarTitular(posicao)) {
            mostrarMensagem(`Posição ${posicao} já preenchida nos titulares`, 'error');
            return;
        }
        
        if (posicao === 'ALA') {
            if (escalacaoAtual.titulares.ALA[0] === null) {
                escalacaoAtual.titulares.ALA[0] = jogador;
            } else {
                escalacaoAtual.titulares.ALA[1] = jogador;
            }
        } else {
            escalacaoAtual.titulares[posicao] = jogador;
        }
        
        mostrarMensagem(`${jogador.name} adicionado como titular`, 'success');
        
    } else {
        // Adicionar como reserva
        if (!podeAdicionarComoReserva(jogador)) {
            mostrarMensagem('Não é possível adicionar como reserva (verifique valor e vagas)', 'error');
            return;
        }
        
        if (posicao === 'ALA') {
            if (escalacaoAtual.reservas.ALA[0] === null) {
                escalacaoAtual.reservas.ALA[0] = jogador;
            } else {
                escalacaoAtual.reservas.ALA[1] = jogador;
            }
        } else {
            escalacaoAtual.reservas[posicao] = jogador;
        }
        
        mostrarMensagem(`${jogador.name} adicionado como reserva`, 'success');
    }
    
    // Atualizar displays
    renderizarJogadores();
    renderizarEscalacao();
}

// Remover jogador da escalação
function removerJogador(jogadorId) {
    let jogadorRemovido = null;
    
    // Buscar e remover dos titulares
    Object.keys(escalacaoAtual.titulares).forEach(posicao => {
        if (posicao === 'ALA') {
            escalacaoAtual.titulares.ALA.forEach((jogador, index) => {
                if (jogador?.id === jogadorId) {
                    jogadorRemovido = jogador;
                    escalacaoAtual.titulares.ALA[index] = null;
                }
            });
        } else {
            if (escalacaoAtual.titulares[posicao]?.id === jogadorId) {
                jogadorRemovido = escalacaoAtual.titulares[posicao];
                escalacaoAtual.titulares[posicao] = null;
            }
        }
    });
    
    // Buscar e remover dos reservas
    Object.keys(escalacaoAtual.reservas).forEach(posicao => {
        if (posicao === 'ALA') {
            escalacaoAtual.reservas.ALA.forEach((jogador, index) => {
                if (jogador?.id === jogadorId) {
                    jogadorRemovido = jogador;
                    escalacaoAtual.reservas.ALA[index] = null;
                }
            });
        } else {
            if (escalacaoAtual.reservas[posicao]?.id === jogadorId) {
                jogadorRemovido = escalacaoAtual.reservas[posicao];
                escalacaoAtual.reservas[posicao] = null;
            }
        }
    });
    
    if (jogadorRemovido) {
        mostrarMensagem(`${jogadorRemovido.name} removido da escalação`, 'success');
        renderizarJogadores();
        renderizarEscalacao();
    }
}

// ... (código anterior continua igual até calcularCustoEscalacao)

// Calcular custo total da escalação
function calcularCustoEscalacao() {
    let total = 0;
    
    // Somar titulares
    Object.values(escalacaoAtual.titulares).forEach(jogador => {
        if (Array.isArray(jogador)) {
            jogador.forEach(j => {
                if (j) total += parseFloat(j.price);
            });
        } else if (jogador) {
            total += parseFloat(jogador.price);
        }
    });
    
    // Somar reservas
    Object.values(escalacaoAtual.reservas).forEach(jogador => {
        if (Array.isArray(jogador)) {
            jogador.forEach(j => {
                if (j) total += parseFloat(j.price);
            });
        } else if (jogador) {
            total += parseFloat(jogador.price);
        }
    });
    
    return total;
}

// Atualizar display do saldo
function atualizarDisplaySaldo() {
    const custoAtual = calcularCustoEscalacao();
    const saldoRestante = saldoAtual - custoAtual;
    
    const elementoSaldo = document.getElementById('saldo-atual');
    const elementoCusto = document.getElementById('custo-escalacao');
    const elementoRestante = document.getElementById('saldo-restante');
    
    if (elementoSaldo) {
        elementoSaldo.textContent = `C$ ${saldoAtual.toFixed(2)}`;
    }
    
    if (elementoCusto) {
        elementoCusto.textContent = `C$ ${custoAtual.toFixed(2)}`;
    }
    
    if (elementoRestante) {
        elementoRestante.textContent = `C$ ${saldoRestante.toFixed(2)}`;
        elementoRestante.className = saldoRestante >= 0 ? 
            'text-green-600 dark:text-green-400 font-semibold' : 
            'text-red-600 dark:text-red-400 font-semibold';
    }
}

// Atualizar resumo da escalação
function atualizarResumoEscalacao() {
    const resumo = document.getElementById('resumo-escalacao');
    if (!resumo) return;
    
    // Contar jogadores por posição
    const contadores = {
        titulares: { GOL: 0, FIX: 0, ALA: 0, PIV: 0 },
        reservas: { GOL: 0, FIX: 0, ALA: 0, PIV: 0 }
    };
    
    // Contar titulares
    if (escalacaoAtual.titulares.GOL) contadores.titulares.GOL = 1;
    if (escalacaoAtual.titulares.FIX) contadores.titulares.FIX = 1;
    contadores.titulares.ALA = escalacaoAtual.titulares.ALA.filter(j => j !== null).length;
    if (escalacaoAtual.titulares.PIV) contadores.titulares.PIV = 1;
    
    // Contar reservas
    if (escalacaoAtual.reservas.GOL) contadores.reservas.GOL = 1;
    if (escalacaoAtual.reservas.FIX) contadores.reservas.FIX = 1;
    contadores.reservas.ALA = escalacaoAtual.reservas.ALA.filter(j => j !== null).length;
    if (escalacaoAtual.reservas.PIV) contadores.reservas.PIV = 1;
    
    const totalTitulares = Object.values(contadores.titulares).reduce((a, b) => a + b, 0);
    const totalReservas = Object.values(contadores.reservas).reduce((a, b) => a + b, 0);
    const totalGeral = totalTitulares + totalReservas;
    
    const escalacaoCompleta = totalTitulares === 5 && totalReservas === 5;
    
    resumo.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Titulares -->
            <div>
                <h4 class="font-semibold text-gray-900 dark:text-white mb-3">⚽ Titulares (${totalTitulares}/5)</h4>
                <div class="grid grid-cols-4 gap-2 text-sm">
                    <div class="text-center">
                        <div class="font-bold ${contadores.titulares.GOL === 1 ? 'text-green-600' : 'text-red-600'}">${contadores.titulares.GOL}</div>
                        <div class="text-xs text-gray-500">GOL</div>
                    </div>
                    <div class="text-center">
                        <div class="font-bold ${contadores.titulares.FIX === 1 ? 'text-green-600' : 'text-red-600'}">${contadores.titulares.FIX}</div>
                        <div class="text-xs text-gray-500">FIX</div>
                    </div>
                    <div class="text-center">
                        <div class="font-bold ${contadores.titulares.ALA === 2 ? 'text-green-600' : 'text-red-600'}">${contadores.titulares.ALA}</div>
                        <div class="text-xs text-gray-500">ALA</div>
                    </div>
                    <div class="text-center">
                        <div class="font-bold ${contadores.titulares.PIV === 1 ? 'text-green-600' : 'text-red-600'}">${contadores.titulares.PIV}</div>
                        <div class="text-xs text-gray-500">PIV</div>
                    </div>
                </div>
            </div>
            
            <!-- Reservas -->
            <div>
                <h4 class="font-semibold text-gray-900 dark:text-white mb-3">🪑 Reservas (${totalReservas}/5)</h4>
                <div class="grid grid-cols-4 gap-2 text-sm">
                    <div class="text-center">
                        <div class="font-bold ${contadores.reservas.GOL === 1 ? 'text-green-600' : 'text-orange-600'}">${contadores.reservas.GOL}</div>
                        <div class="text-xs text-gray-500">GOL</div>
                    </div>
                    <div class="text-center">
                        <div class="font-bold ${contadores.reservas.FIX === 1 ? 'text-green-600' : 'text-orange-600'}">${contadores.reservas.FIX}</div>
                        <div class="text-xs text-gray-500">FIX</div>
                    </div>
                    <div class="text-center">
                        <div class="font-bold ${contadores.reservas.ALA === 2 ? 'text-green-600' : 'text-orange-600'}">${contadores.reservas.ALA}</div>
                        <div class="text-xs text-gray-500">ALA</div>
                    </div>
                    <div class="text-center">
                        <div class="font-bold ${contadores.reservas.PIV === 1 ? 'text-green-600' : 'text-orange-600'}">${contadores.reservas.PIV}</div>
                        <div class="text-xs text-gray-500">PIV</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="mt-4 text-center">
            <div class="text-lg font-semibold ${escalacaoCompleta ? 'text-green-600' : 'text-orange-600'}">
                ${totalGeral}/10 jogadores
            </div>
            <div class="text-sm ${escalacaoCompleta ? 'text-green-600' : 'text-red-600'}">
                ${escalacaoCompleta ? '✅ Escalação completa' : '⚠️ Escalação incompleta'}
            </div>
        </div>
    `;
    
    atualizarDisplaySaldo();
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

// Calcular total de jogadores na escalação
function calcularTotalJogadores() {
    let total = 0;
    
    // Contar titulares
    if (escalacaoAtual.titulares.GOL) total++;
    if (escalacaoAtual.titulares.FIX) total++;
    total += escalacaoAtual.titulares.ALA.filter(j => j !== null).length;
    if (escalacaoAtual.titulares.PIV) total++;
    
    // Contar reservas
    if (escalacaoAtual.reservas.GOL) total++;
    if (escalacaoAtual.reservas.FIX) total++;
    total += escalacaoAtual.reservas.ALA.filter(j => j !== null).length;
    if (escalacaoAtual.reservas.PIV) total++;
    
    return total;
}

// Salvar escalação
async function salvarEscalacao() {
    try {
        const totalJogadores = calcularTotalJogadores();
        
        if (totalJogadores !== 10) {
            mostrarMensagem('A escalação deve ter exatamente 10 jogadores (5 titulares + 5 reservas)', 'error');
            return;
        }
        
        // Verificar se tem pelo menos 1 de cada posição nos titulares
        if (!escalacaoAtual.titulares.GOL || !escalacaoAtual.titulares.FIX || 
            !escalacaoAtual.titulares.PIV || escalacaoAtual.titulares.ALA.filter(j => j).length !== 2) {
            mostrarMensagem('Formação inválida nos titulares (1 GOL, 1 FIX, 2 ALA, 1 PIV)', 'error');
            return;
        }
        
        // Verificar se tem pelo menos 1 de cada posição nos reservas
        if (!escalacaoAtual.reservas.GOL || !escalacaoAtual.reservas.FIX || 
            !escalacaoAtual.reservas.PIV || escalacaoAtual.reservas.ALA.filter(j => j).length !== 2) {
            mostrarMensagem('Formação inválida nos reservas (1 GOL, 1 FIX, 2 ALA, 1 PIV)', 'error');
            return;
        }
        
        if (calcularCustoEscalacao() > saldoAtual) {
            mostrarMensagem('Custo da escalação excede o saldo disponível', 'error');
            return;
        }
        
        // Buscar rodada ativa
        const { data: rodadaAtiva, error: errorRodada } = await supabase
            .from('rounds')
            .select('id')
            .eq('status', 'active')
            .single();
        
        if (errorRodada || !rodadaAtiva) {
            mostrarMensagem('Nenhuma rodada ativa encontrada', 'error');
            return;
        }
        
        // Verificar se já existe escalação
        const { data: escalacaoExistente } = await supabase
            .from('lineups')
            .select('id')
            .eq('user_id', usuarioLogado.id)
            .eq('round_id', rodadaAtiva.id)
            .single();
        
        let lineupId;
        
        if (escalacaoExistente) {
            lineupId = escalacaoExistente.id;
            
            // Deletar escalação anterior
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
                    round_id: rodadaAtiva.id,
                    total_points: 0
                })
                .select('id')
                .single();
            
            if (errorEscalacao) throw errorEscalacao;
            lineupId = novaEscalacao.id;
        }
        
        // Preparar dados para inserir
        const jogadoresParaInserir = [];
        
        // Adicionar titulares
        if (escalacaoAtual.titulares.GOL) {
            jogadoresParaInserir.push({
                lineup_id: lineupId,
                player_id: escalacaoAtual.titulares.GOL.id,
                is_starter: true,
                points: 0
            });
        }
        
        if (escalacaoAtual.titulares.FIX) {
            jogadoresParaInserir.push({
                lineup_id: lineupId,
                player_id: escalacaoAtual.titulares.FIX.id,
                is_starter: true,
                points: 0
            });
        }
        
        escalacaoAtual.titulares.ALA.forEach(jogador => {
            if (jogador) {
                jogadoresParaInserir.push({
                    lineup_id: lineupId,
                    player_id: jogador.id,
                    is_starter: true,
                    points: 0
                });
            }
        });
        
        if (escalacaoAtual.titulares.PIV) {
            jogadoresParaInserir.push({
                lineup_id: lineupId,
                player_id: escalacaoAtual.titulares.PIV.id,
                is_starter: true,
                points: 0
            });
        }
        
        // Adicionar reservas
        if (escalacaoAtual.reservas.GOL) {
            jogadoresParaInserir.push({
                lineup_id: lineupId,
                player_id: escalacaoAtual.reservas.GOL.id,
                is_starter: false,
                points: 0
            });
        }
        
        if (escalacaoAtual.reservas.FIX) {
            jogadoresParaInserir.push({
                lineup_id: lineupId,
                player_id: escalacaoAtual.reservas.FIX.id,
                is_starter: false,
                points: 0
            });
        }
        
        escalacaoAtual.reservas.ALA.forEach(jogador => {
            if (jogador) {
                jogadoresParaInserir.push({
                    lineup_id: lineupId,
                    player_id: jogador.id,
                    is_starter: false,
                    points: 0
                });
            }
        });
        
        if (escalacaoAtual.reservas.PIV) {
            jogadoresParaInserir.push({
                lineup_id: lineupId,
                player_id: escalacaoAtual.reservas.PIV.id,
                is_starter: false,
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
        
        console.log('✅ Escalação de futsal salva com sucesso!');
        mostrarMensagem('Escalação salva com sucesso!', 'success');
        
        atualizarDisplaySaldo();
        
    } catch (error) {
        console.error('❌ Erro ao salvar escalação:', error);
        mostrarMensagem('Erro ao salvar escalação', 'error');
    }
}

// Utilitários
function getCorPosicao(posicao) {
    const cores = {
        'GOL': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'FIX': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'ALA': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'PIV': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    return cores[posicao] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
}

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