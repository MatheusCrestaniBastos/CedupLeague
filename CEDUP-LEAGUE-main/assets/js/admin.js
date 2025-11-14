// ============================================
// CARTOLA COACH - PAINEL ADMINISTRATIVO
// ============================================

let adminUser = null;
let jogadoresCache = [];
let timesCache = [];
let rodadasCache = [];

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔧 Painel Admin carregando...');
    
    adminUser = await verificarAutenticacao();
    if (!adminUser) {
        window.location.href = 'index.html';
        return;
    }
    
    const isAdmin = await verificarPermissaoAdmin();
    if (!isAdmin) return;
    
    await initializeAdmin();
});

async function verificarPermissaoAdmin() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            window.location.href = 'index.html';
            return false;
        }
        
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('is_admin, role')
            .eq('id', user.id)
            .single();
        
        if (userError || !userData || (!userData.is_admin && userData.role !== 'admin')) {
            alert('❌ Acesso negado! Você não é administrador.');
            window.location.href = 'dashboard.html';
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Erro na verificação de permissões:', error);
        window.location.href = 'index.html';
        return false;
    }
}

async function initializeAdmin() {
    try {
        await Promise.all([
            carregarEstatisticas(),
            carregarJogadores(),
            carregarTimes(),
            carregarRodadas()
        ]);
        
        setupEventListeners();
        setupFiltros();
        setupTabs();
        
        console.log('✅ Painel admin inicializado');
    } catch (error) {
        console.error('Erro ao inicializar painel:', error);
    }
}

// ============================================
// ESTATÍSTICAS
// ============================================

async function carregarEstatisticas() {
    try {
        const { count: jogadores } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true });
        document.getElementById('total-jogadores').textContent = jogadores || 0;
        
        const { data: teams } = await supabase.from('teams').select('id');
        document.getElementById('total-times').textContent = teams?.length || 0;
        
        const { count: rodadas } = await supabase
            .from('rounds')
            .select('*', { count: 'exact', head: true });
        document.getElementById('total-rodadas').textContent = rodadas || 0;
        
        const { count: usuarios } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        document.getElementById('total-usuarios').textContent = usuarios || 0;
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// ============================================
// TABS
// ============================================

function setupTabs() {
    const tabs = document.querySelectorAll('[data-tab]');
    const contents = document.querySelectorAll('[data-content]');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active', 'border-blue-600', 'text-blue-600'));
            tabs.forEach(t => t.classList.add('border-transparent', 'text-gray-600'));
            
            tab.classList.add('active', 'border-blue-600', 'text-blue-600');
            tab.classList.remove('border-transparent', 'text-gray-600');
            
            contents.forEach(c => c.classList.add('hidden'));
            document.querySelector(`[data-content="${target}"]`)?.classList.remove('hidden');
        });
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Jogadores
    document.getElementById('btn-adicionar-jogador')?.addEventListener('click', adicionarJogador);
    document.getElementById('btn-salvar-edicao-jogador')?.addEventListener('click', salvarEdicaoJogador);
    document.getElementById('btn-cancelar-edicao-jogador')?.addEventListener('click', () => {
        document.getElementById('modal-editar-jogador')?.classList.add('hidden');
    });
    
    // Times
    document.getElementById('btn-adicionar-time')?.addEventListener('click', adicionarTime);
    
    // Rodadas
    document.getElementById('btn-criar-rodada')?.addEventListener('click', criarRodada);
    document.getElementById('btn-iniciar-rodada')?.addEventListener('click', iniciarRodadaSelecionada);
    document.getElementById('btn-finalizar-rodada')?.addEventListener('click', finalizarRodadaSelecionada);
    
    // Scouts
    document.getElementById('btn-salvar-scout')?.addEventListener('click', salvarScout);
}

function setupFiltros() {
    const filtroPosicao = document.getElementById('filtro-posicao-jogadores');
    const filtroTime = document.getElementById('filtro-time-jogadores');
    
    if (filtroPosicao) {
        filtroPosicao.addEventListener('change', filtrarJogadores);
    }
    
    if (filtroTime) {
        filtroTime.addEventListener('change', filtrarJogadores);
    }
}

// ============================================
// JOGADORES
// ============================================

async function carregarJogadores() {
    try {
        const { data: jogadores, error } = await supabase
            .from('players')
            .select(`
                id, name, position, price, photo_url,
                team:teams(name, logo_url)
            `)
            .order('name');
        
        if (error) throw error;
        
        jogadoresCache = jogadores || [];
        renderizarTabelaJogadores(jogadoresCache);
        preencherSelectJogadores(jogadoresCache);
        preencherFiltroTimes();
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
    }
}

function renderizarTabelaJogadores(jogadores) {
    const tbody = document.getElementById('lista-jogadores');
    if (!tbody) return;
    
    if (!jogadores || jogadores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8">Nenhum jogador encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = jogadores.map(j => `
        <tr>
            <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                    <img src="${j.photo_url || 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded-full" alt="${j.name}">
                    <div>
                        <div class="font-semibold">${j.name}</div>
                        <div class="text-sm text-gray-500">${j.team?.name || '-'}</div>
                    </div>
                </div>
            </td>
            <td class="px-4 py-3"><span class="px-2 py-1 text-xs rounded ${getCorPosicao(j.position)}">${j.position}</span></td>
            <td class="px-4 py-3">C$ ${j.price.toFixed(2)}</td>
            <td class="px-4 py-3">
                <button onclick="editarJogador(${j.id})" class="px-3 py-1 bg-blue-600 text-white rounded text-sm mr-2">Editar</button>
                <button onclick="excluirJogador(${j.id})" class="px-3 py-1 bg-red-600 text-white rounded text-sm">Excluir</button>
            </td>
        </tr>
    `).join('');
}

function getCorPosicao(posicao) {
    const cores = {
        'GOL': 'bg-yellow-100 text-yellow-800',
        'FIX': 'bg-blue-100 text-blue-800',
        'ALA': 'bg-green-100 text-green-800',
        'PIV': 'bg-red-100 text-red-800'
    };
    return cores[posicao] || 'bg-gray-100 text-gray-800';
}

async function adicionarJogador() {
    try {
        const nome = document.getElementById('nome-jogador')?.value.trim();
        const posicao = document.getElementById('posicao-jogador')?.value;
        const preco = parseFloat(document.getElementById('preco-jogador')?.value);
        const timeId = document.getElementById('time-jogador')?.value;
        const fotoUrl = document.getElementById('foto-jogador')?.value.trim();
        
        if (!nome || !posicao || !preco || !timeId) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }
        
        const { error } = await supabase
            .from('players')
            .insert([{ name: nome, position: posicao, price: preco, team_id: timeId, photo_url: fotoUrl || null }]);
        
        if (error) throw error;
        
        alert('Jogador adicionado com sucesso!');
        document.getElementById('form-adicionar-jogador')?.reset();
        await carregarJogadores();
    } catch (error) {
        console.error('Erro ao adicionar jogador:', error);
        alert('Erro ao adicionar jogador');
    }
}

async function editarJogador(id) {
    try {
        const { data: jogador, error } = await supabase
            .from('players')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        document.getElementById('edit-jogador-id').value = jogador.id;
        document.getElementById('edit-nome-jogador').value = jogador.name;
        document.getElementById('edit-posicao-jogador').value = jogador.position;
        document.getElementById('edit-preco-jogador').value = jogador.price;
        document.getElementById('edit-time-jogador').value = jogador.team_id;
        document.getElementById('edit-foto-jogador').value = jogador.photo_url || '';
        
        document.getElementById('modal-editar-jogador')?.classList.remove('hidden');
    } catch (error) {
        console.error('Erro ao carregar jogador:', error);
    }
}

async function salvarEdicaoJogador() {
    try {
        const id = document.getElementById('edit-jogador-id')?.value;
        const nome = document.getElementById('edit-nome-jogador')?.value.trim();
        const posicao = document.getElementById('edit-posicao-jogador')?.value;
        const preco = parseFloat(document.getElementById('edit-preco-jogador')?.value);
        const timeId = document.getElementById('edit-time-jogador')?.value;
        const fotoUrl = document.getElementById('edit-foto-jogador')?.value.trim();
        
        const { error } = await supabase
            .from('players')
            .update({ name: nome, position: posicao, price: preco, team_id: timeId, photo_url: fotoUrl || null })
            .eq('id', id);
        
        if (error) throw error;
        
        alert('Jogador atualizado!');
        document.getElementById('modal-editar-jogador')?.classList.add('hidden');
        await carregarJogadores();
    } catch (error) {
        console.error('Erro ao atualizar jogador:', error);
    }
}

async function excluirJogador(id) {
    if (!confirm('Excluir este jogador?')) return;
    
    try {
        const { error } = await supabase.from('players').delete().eq('id', id);
        if (error) throw error;
        
        alert('Jogador excluído!');
        await carregarJogadores();
    } catch (error) {
        console.error('Erro ao excluir jogador:', error);
    }
}

function filtrarJogadores() {
    const posicao = document.getElementById('filtro-posicao-jogadores')?.value;
    const time = document.getElementById('filtro-time-jogadores')?.value;
    
    let jogadoresFiltrados = [...jogadoresCache];
    
    if (posicao) {
        jogadoresFiltrados = jogadoresFiltrados.filter(j => j.position === posicao);
    }
    
    if (time) {
        jogadoresFiltrados = jogadoresFiltrados.filter(j => j.team?.name === time);
    }
    
    renderizarTabelaJogadores(jogadoresFiltrados);
}

function preencherSelectJogadores(jogadores) {
    const select = document.getElementById('scout-jogador');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um jogador</option>' +
        jogadores.map(j => `<option value="${j.id}">${j.name} - ${j.position}</option>`).join('');
}

function preencherFiltroTimes() {
    const times = [...new Set(jogadoresCache.map(j => j.team?.name).filter(Boolean))];
    times.sort();
    
    const filtro = document.getElementById('filtro-time-jogadores');
    if (!filtro) return;
    
    filtro.innerHTML = '<option value="">Todos os times</option>' +
        times.map(t => `<option value="${t}">${t}</option>`).join('');
}

// ============================================
// TIMES
// ============================================

async function carregarTimes() {
    try {
        const { data: times, error } = await supabase
            .from('teams')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        timesCache = times || [];
        renderizarTabelaTimes(timesCache);
        preencherSelectTimes(timesCache);
    } catch (error) {
        console.error('Erro ao carregar times:', error);
    }
}

function renderizarTabelaTimes(times) {
    const tbody = document.getElementById('lista-times');
    if (!tbody) return;
    
    if (!times || times.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-8">Nenhum time cadastrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = times.map(t => `
        <tr>
            <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                    <img src="${t.logo_url || 'https://via.placeholder.com/40'}" class="w-10 h-10" alt="${t.name}">
                    <span class="font-semibold">${t.name}</span>
                </div>
            </td>
            <td class="px-4 py-3">
                <button onclick="excluirTime(${t.id})" class="px-3 py-1 bg-red-600 text-white rounded text-sm">Excluir</button>
            </td>
        </tr>
    `).join('');
}

function preencherSelectTimes(times) {
    const selects = document.querySelectorAll('#time-jogador, #edit-time-jogador');
    
    selects.forEach(select => {
        if (!select) return;
        select.innerHTML = '<option value="">Selecione um time</option>' +
            times.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    });
}

async function adicionarTime() {
    try {
        const nome = document.getElementById('nome-time')?.value.trim();
        const logoUrl = document.getElementById('logo-time')?.value.trim();
        
        if (!nome) {
            alert('Digite o nome do time');
            return;
        }
        
        const { error } = await supabase
            .from('teams')
            .insert([{ name: nome, logo_url: logoUrl || null }]);
        
        if (error) throw error;
        
        alert('Time adicionado!');
        document.getElementById('form-adicionar-time')?.reset();
        await carregarTimes();
        await carregarJogadores();
    } catch (error) {
        console.error('Erro ao adicionar time:', error);
    }
}

async function excluirTime(id) {
    if (!confirm('Excluir este time? Isso afetará os jogadores.')) return;
    
    try {
        const { error } = await supabase.from('teams').delete().eq('id', id);
        if (error) throw error;
        
        alert('Time excluído!');
        await carregarTimes();
        await carregarJogadores();
    } catch (error) {
        console.error('Erro ao excluir time:', error);
    }
}

// ============================================
// RODADAS
// ============================================

async function carregarRodadas() {
    try {
        const { data: rodadas, error } = await supabase
            .from('rounds')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        rodadasCache = rodadas || [];
        renderizarTabelaRodadas(rodadasCache);
        preencherSelectRodadas(rodadasCache);
    } catch (error) {
        console.error('Erro ao carregar rodadas:', error);
    }
}

function renderizarTabelaRodadas(rodadas) {
    const tbody = document.getElementById('lista-rodadas');
    if (!tbody) return;
    
    if (!rodadas || rodadas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-8">Nenhuma rodada criada</td></tr>';
        return;
    }
    
    tbody.innerHTML = rodadas.map(r => {
        const statusClass = r.status === 'active' ? 'bg-green-100 text-green-800' :
                           r.status === 'finished' ? 'bg-gray-100 text-gray-800' :
                           'bg-blue-100 text-blue-800';
        
        const statusText = r.status === 'active' ? 'Ativa' :
                          r.status === 'finished' ? 'Finalizada' : 'Pendente';
        
        return `
            <tr>
                <td class="px-4 py-3 font-semibold">${r.name}</td>
                <td class="px-4 py-3"><span class="px-2 py-1 text-xs rounded ${statusClass}">${statusText}</span></td>
                <td class="px-4 py-3">
                    ${r.status === 'pending' ? `<button onclick="iniciarRodada(${r.id})" class="px-3 py-1 bg-green-600 text-white rounded text-sm mr-2">Iniciar</button>` : ''}
                    ${r.status === 'active' ? `<button onclick="finalizarRodada(${r.id})" class="px-3 py-1 bg-blue-600 text-white rounded text-sm mr-2">Finalizar</button>` : ''}
                    <button onclick="excluirRodada(${r.id})" class="px-3 py-1 bg-red-600 text-white rounded text-sm">Excluir</button>
                </td>
            </tr>
        `;
    }).join('');
}

function preencherSelectRodadas(rodadas) {
    const select = document.getElementById('scout-rodada');
    if (!select) return;
    
    const rodadasAtivas = rodadas.filter(r => r.status === 'active');
    select.innerHTML = '<option value="">Selecione uma rodada</option>' +
        rodadasAtivas.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
}

async function criarRodada() {
    try {
        const nome = document.getElementById('nome-rodada')?.value.trim();
        
        if (!nome) {
            alert('Digite o nome da rodada');
            return;
        }
        
        const { error } = await supabase
            .from('rounds')
            .insert([{ name: nome, status: 'pending' }]);
        
        if (error) throw error;
        
        alert('Rodada criada!');
        document.getElementById('form-criar-rodada')?.reset();
        await carregarRodadas();
    } catch (error) {
        console.error('Erro ao criar rodada:', error);
    }
}

async function iniciarRodada(id) {
    if (!confirm('Iniciar esta rodada? O mercado será fechado.')) return;
    
    try {
        const { error } = await supabase
            .from('rounds')
            .update({ status: 'active' })
            .eq('id', id);
        
        if (error) throw error;
        
        alert('Rodada iniciada! Mercado fechado.');
        await carregarRodadas();
    } catch (error) {
        console.error('Erro ao iniciar rodada:', error);
    }
}

async function finalizarRodada(id) {
    if (!confirm('Finalizar esta rodada? O mercado será reaberto.')) return;
    
    try {
        const { error } = await supabase
            .from('rounds')
            .update({ status: 'finished' })
            .eq('id', id);
        
        if (error) throw error;
        
        alert('Rodada finalizada! Mercado reaberto.');
        await carregarRodadas();
    } catch (error) {
        console.error('Erro ao finalizar rodada:', error);
    }
}

async function excluirRodada(id) {
    if (!confirm('Excluir esta rodada? Isso é irreversível.')) return;
    
    try {
        const { error } = await supabase.from('rounds').delete().eq('id', id);
        if (error) throw error;
        
        alert('Rodada excluída!');
        await carregarRodadas();
    } catch (error) {
        console.error('Erro ao excluir rodada:', error);
    }
}

function iniciarRodadaSelecionada() {
    const select = document.getElementById('rodada-gerenciar');
    const rodadaId = select?.value;
    if (rodadaId) iniciarRodada(parseInt(rodadaId));
}

function finalizarRodadaSelecionada() {
    const select = document.getElementById('rodada-gerenciar');
    const rodadaId = select?.value;
    if (rodadaId) finalizarRodada(parseInt(rodadaId));
}

// ============================================
// SCOUTS
// ============================================

async function salvarScout() {
    try {
        const rodadaId = document.getElementById('scout-rodada')?.value;
        const jogadorId = document.getElementById('scout-jogador')?.value;
        
        if (!rodadaId || !jogadorId) {
            alert('Selecione rodada e jogador');
            return;
        }
        
        const scouts = {
            goals: parseInt(document.getElementById('scout-gols')?.value || 0),
            assists: parseInt(document.getElementById('scout-assistencias')?.value || 0),
            shots_on_target: parseInt(document.getElementById('scout-finalizacoes')?.value || 0),
            saves: parseInt(document.getElementById('scout-defesas')?.value || 0),
            clean_sheet: document.getElementById('scout-sem-gols')?.checked ? 1 : 0,
            own_goals: parseInt(document.getElementById('scout-gols-contra')?.value || 0),
            yellow_cards: parseInt(document.getElementById('scout-amarelos')?.value || 0),
            red_cards: parseInt(document.getElementById('scout-vermelhos')?.value || 0),
            fouls: parseInt(document.getElementById('scout-faltas')?.value || 0)
        };
        
        // Calcular pontos
        const pontos = (scouts.goals * 8) +
                      (scouts.assists * 5) +
                      (scouts.shots_on_target * 3) +
                      (scouts.saves * 7) +
                      (scouts.clean_sheet * 5) -
                      (scouts.own_goals * 3) -
                      (scouts.yellow_cards * 1) -
                      (scouts.red_cards * 5) -
                      (scouts.fouls * 0.3);
        
        // Salvar no banco
        const { error } = await supabase
            .from('player_stats')
            .insert([{
                round_id: rodadaId,
                player_id: jogadorId,
                ...scouts,
                points: pontos
            }]);
        
        if (error) throw error;
        
        alert(`Scout salvo! Pontuação: ${pontos.toFixed(2)}`);
        document.getElementById('form-scout')?.reset();
    } catch (error) {
        console.error('Erro ao salvar scout:', error);
        alert('Erro ao salvar scout');
    }
}

// Exportar funções globalmente
window.editarJogador = editarJogador;
window.excluirJogador = excluirJogador;
window.excluirTime = excluirTime;
window.iniciarRodada = iniciarRodada;
window.finalizarRodada = finalizarRodada;
window.excluirRodada = excluirRodada;

console.log('✅ admin.js carregado');