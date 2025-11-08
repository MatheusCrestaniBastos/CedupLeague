let currentUser = null;
let activeRound = null;
let allPlayers = [];
let selectedTeam = {
    GOL: null,
    FIX: null,
    ALA1: null,
    ALA2: null,
    PIV: null,
    RES1: null,
    RES2: null,
    RES3: null
};
let budgetLimit = 40.00;
let currentPosition = null;
let currentIsStarter = true;
let captain = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadBudgetLimit();
    await loadActiveRound();
    await loadPlayers();
    await loadExistingTeam();
});

async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = user;
}

async function loadBudgetLimit() {
    const { data } = await supabase
        .from('game_settings')
        .select('budget_limit')
        .single();
    
    if (data) {
        budgetLimit = parseFloat(data.budget_limit);
        document.getElementById('budgetDisplay').textContent = `C$ ${budgetLimit.toFixed(2)}`;
    }
}

async function loadActiveRound() {
    const { data } = await supabase
        .from('rounds')
        .select('*')
        .eq('status', 'upcoming')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    
    if (!data) {
        alert('⚠️ Nenhuma rodada disponível para escalação!');
        window.location.href = 'dashboard.html';
        return;
    }
    
    activeRound = data;
}

async function loadPlayers() {
    const { data } = await supabase
        .from('players')
        .select('*')
        .eq('active', true)
        .order('position', { ascending: true });
    
    allPlayers = data || [];
}

async function loadExistingTeam() {
    const { data } = await supabase
        .from('fantasy_teams')
        .select(`
            *,
            team_players (
                *,
                players (*)
            )
        `)
        .eq('user_id', currentUser.id)
        .eq('round_id', activeRound.id)
        .single();
    
    if (data && data.team_players) {
        data.team_players.forEach(tp => {
            selectedTeam[tp.position_role] = tp.players;
            if (tp.is_captain) captain = tp.player_id;
        });
        updateUI();
    }
}

function abrirSelecao(position, role, isStarter) {
    currentPosition = role;
    currentIsStarter = isStarter;
    
    const modalTitle = document.getElementById('modalTitle');
    if (isStarter) {
        modalTitle.textContent = `Escolha um ${position === 'ALA' ? 'ALA' : position} (Titular - conta no orçamento)`;
    } else {
        // Identificar qual reserva (1, 2 ou 3) e que posições pode escolher
        const resNum = role.replace('RES', '');
        modalTitle.textContent = `Escolha Reserva ${resNum} (qualquer posição - NÃO conta no orçamento)`;
    }
    
    let filteredPlayers;
    if (position === 'ALL') {
        filteredPlayers = allPlayers;
    } else {
        filteredPlayers = allPlayers.filter(p => p.position === position);
    }
    
    renderPlayerList(filteredPlayers);
    document.getElementById('modalSelecao').style.display = 'block';
}

function renderPlayerList(players) {
    const lista = document.getElementById('listaJogadores');
    lista.innerHTML = players.map(p => {
        const isFree = !currentIsStarter;
        return `
            <div class="jogador-disponivel" onclick="selecionarJogador('${p.id}')">
                <div>
                    <strong>${p.name}</strong><br>
                    <small>${p.team} - ${p.position}</small>
                </div>
                <div>
                    ${isFree ? 
                        '<span class="free-badge">GRÁTIS</span>' : 
                        `<strong style="color: #2ed573;">C$ ${parseFloat(p.price).toFixed(2)}</strong>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

function selecionarJogador(playerId) {
    const player = allPlayers.find(p => p.id === playerId);
    
    console.log('========================================');
    console.log('SELECIONANDO JOGADOR:', player.name);
    console.log('Posição no time:', currentPosition);
    console.log('É titular?', currentIsStarter);
    console.log('========================================');
    
    // ===== SE FOR RESERVA: Validar que é mais barato que titular da mesma posição =====
    if (!currentIsStarter) {
        console.log('🔄 É RESERVA - Validando preço contra titulares da mesma posição...');
        
        const playerPosition = player.position; // GOL, FIX, ALA, PIV
        console.log('Posição do jogador reserva:', playerPosition);
        
        // Encontrar titulares da mesma posição
        let titularesIguais = [];
        
        if (playerPosition === 'GOL' && selectedTeam.GOL) {
            titularesIguais.push({ nome: selectedTeam.GOL.name, preco: parseFloat(selectedTeam.GOL.price) });
        } else if (playerPosition === 'FIX' && selectedTeam.FIX) {
            titularesIguais.push({ nome: selectedTeam.FIX.name, preco: parseFloat(selectedTeam.FIX.price) });
        } else if (playerPosition === 'ALA') {
            if (selectedTeam.ALA1) titularesIguais.push({ nome: selectedTeam.ALA1.name, preco: parseFloat(selectedTeam.ALA1.price) });
            if (selectedTeam.ALA2) titularesIguais.push({ nome: selectedTeam.ALA2.name, preco: parseFloat(selectedTeam.ALA2.price) });
        } else if (playerPosition === 'PIV' && selectedTeam.PIV) {
            titularesIguais.push({ nome: selectedTeam.PIV.name, preco: parseFloat(selectedTeam.PIV.price) });
        }
        
        console.log('Titulares da mesma posição encontrados:', titularesIguais);
        
        // Se não tem titular da posição ainda, não pode escolher reserva
        if (titularesIguais.length === 0) {
            alert(`❌ Você precisa escolher um titular ${playerPosition} primeiro!
⚠️ Reservas só podem ser escolhidos DEPOIS de ter um titular da mesma posição.`);
            return;
        }
        
        // Verificar se o reserva é mais barato que TODOS os titulares da posição
        const precoReserva = parseFloat(player.price);
        const todosMaisCaros = titularesIguais.every(t => precoReserva < t.preco);
        
        console.log('Preço do reserva:', precoReserva);
        console.log('Todos titulares são mais caros?', todosMaisCaros);
        
        if (!todosMaisCaros) {
            const maisBarato = Math.min(...titularesIguais.map(t => t.preco));
            alert(`❌ Reserva deve ser mais BARATO que os titulares da mesma posição!
` +
                  `🔄 Reserva escolhido (${player.name}): C$ ${precoReserva.toFixed(2)}
` +
                  `👤 Titular(es) ${playerPosition}:
${titularesIguais.map(t => `   - ${t.nome}: C$ ${t.preco.toFixed(2)}`).join('')}
` +
                  `⚠️ Escolha um reserva mais barato que C$ ${maisBarato.toFixed(2)}`);
            return;
        }
        
        console.log('✅ Reserva validado! É mais barato que os titulares da posição.');
    }
    
    // ===== SE FOR TITULAR: Validar orçamento =====
    if (currentIsStarter) {
        console.log('👤 É TITULAR - Validando orçamento...');
        
        // Calcular quanto já foi gasto COM TITULARES (excluindo a posição atual)
        const currentSpent = ['GOL', 'FIX', 'ALA1', 'ALA2', 'PIV']
            .filter(pos => pos !== currentPosition && selectedTeam[pos] !== null)
            .reduce((sum, pos) => sum + parseFloat(selectedTeam[pos].price), 0);
        
        const newTotal = currentSpent + parseFloat(player.price);
        
        console.log('💰 Gasto atual (só titulares, sem a posição atual):', currentSpent.toFixed(2));
        console.log('💵 Preço do novo jogador:', parseFloat(player.price).toFixed(2));
        console.log('💳 Novo total:', newTotal.toFixed(2));
        console.log('🏦 Limite:', budgetLimit.toFixed(2));
        
        if (newTotal > budgetLimit) {
            alert(`💸 Orçamento insuficiente!
` +
                  `Você já gastou: C$ ${currentSpent.toFixed(2)}
` +
                  `Este jogador custa: C$ ${parseFloat(player.price).toFixed(2)}
` +
                  `Total seria: C$ ${newTotal.toFixed(2)}
` +
                  `Limite: C$ ${budgetLimit.toFixed(2)}
` +
                  `⚠️ Lembre-se: APENAS TITULARES contam no orçamento!`);
            return;
        }
        
        console.log('✅ Orçamento OK!');
    }
    
    // Selecionar jogador
    selectedTeam[currentPosition] = player;
    updateUI();
    fecharSelecao();
}

function fecharSelecao() {
    document.getElementById('modalSelecao').style.display = 'none';
}

function updateUI() {
    // Atualizar posições TITULARES no campo
    ['GOL', 'FIX', 'ALA1', 'ALA2', 'PIV'].forEach(pos => {
        const player = selectedTeam[pos];
        const posDiv = document.getElementById(`pos${pos.charAt(0).toUpperCase() + pos.slice(1).toLowerCase()}`);
        
        if (player) {
            posDiv.classList.add('preenchida');
            posDiv.innerHTML = `
                <div>
                    <h3>${getPositionIcon(pos)} ${pos.replace(/[0-9]/g, '')}</h3>
                </div>
                <div class="jogador-card">
                    <div>
                        <strong>${player.name}</strong><br>
                        <small>${player.team}</small>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="captain-star" onclick="toggleCaptain('${player.id}')" title="Fazer capitão">
                            ${captain === player.id ? '⭐' : '☆'}
                        </span>
                        <span style="color: #2ed573; font-weight: bold;">C$ ${parseFloat(player.price).toFixed(2)}</span>
                        <button class="btn" onclick="removerJogador('${pos}')">✖</button>
                    </div>
                </div>
            `;
        } else {
            posDiv.classList.remove('preenchida');
            posDiv.innerHTML = `
                <h3>${getPositionIcon(pos)} ${pos.replace(/[0-9]/g, '')}</h3>
                <button class="btn" onclick="abrirSelecao('${pos.replace(/[0-9]/g, '')}', '${pos}', true)">Escolher</button>
            `;
        }
    });
    
    // Atualizar RESERVAS
    ['RES1', 'RES2', 'RES3'].forEach(pos => {
        const player = selectedTeam[pos];
        const resDiv = document.getElementById(`resSlot${pos.replace('RES', '')}`);
        
        if (player) {
            resDiv.classList.add('preenchida');
            resDiv.innerHTML = `
                <div>
                    <strong>${player.name}</strong><br>
                    <small>${player.team} - ${player.position}</small>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="free-badge">GRÁTIS</span>
                    <button class="btn" onclick="removerJogador('${pos}')">✖</button>
                </div>
            `;
        } else {
            resDiv.classList.remove('preenchida');
            resDiv.innerHTML = `
                <h4>Reserva ${pos.replace('RES', '')}</h4>
                <button class="btn" onclick="abrirSelecao('ALL', '${pos}', false)">Escolher</button>
            `;
        }
    });
    
    // ===== CÁLCULO DE ORÇAMENTO: APENAS TITULARES =====
    const spent = ['GOL', 'FIX', 'ALA1', 'ALA2', 'PIV']
        .filter(pos => selectedTeam[pos] !== null)
        .reduce((sum, pos) => sum + parseFloat(selectedTeam[pos].price), 0);
    
    const remaining = budgetLimit - spent;
    
    console.log('📊 === ATUALIZAÇÃO UI ===');
    console.log('💰 Gasto (APENAS TITULARES):', spent.toFixed(2));
    console.log('💵 Restante:', remaining.toFixed(2));
    console.log('🔄 Reservas não contam no orçamento');
    
    document.getElementById('budgetRemaining').textContent = `C$ ${remaining.toFixed(2)}`;
    
    // Atualizar resumo TITULARES
    document.getElementById('golName').textContent = selectedTeam.GOL ? selectedTeam.GOL.name : '-';
    document.getElementById('fixName').textContent = selectedTeam.FIX ? selectedTeam.FIX.name : '-';
    document.getElementById('ala1Name').textContent = selectedTeam.ALA1 ? selectedTeam.ALA1.name : '-';
    document.getElementById('ala2Name').textContent = selectedTeam.ALA2 ? selectedTeam.ALA2.name : '-';
    document.getElementById('pivName').textContent = selectedTeam.PIV ? selectedTeam.PIV.name : '-';
    
    // Atualizar resumo RESERVAS
    document.getElementById('res1Name').textContent = selectedTeam.RES1 ? selectedTeam.RES1.name : '-';
    document.getElementById('res2Name').textContent = selectedTeam.RES2 ? selectedTeam.RES2.name : '-';
    document.getElementById('res3Name').textContent = selectedTeam.RES3 ? selectedTeam.RES3.name : '-';
    
    // Habilitar botão salvar se time TITULAR completo e capitão escolhido
    const titularesCompletos = ['GOL', 'FIX', 'ALA1', 'ALA2', 'PIV'].every(pos => selectedTeam[pos] !== null);
    const temCapitao = captain !== null;
    document.getElementById('btnSalvarTime').disabled = !(titularesCompletos && temCapitao);
}

function toggleCaptain(playerId) {
    captain = captain === playerId ? null : playerId;
    updateUI();
}

function removerJogador(position) {
    if (selectedTeam[position] && captain === selectedTeam[position].id) {
        captain = null;
    }
    selectedTeam[position] = null;
    updateUI();
}

function getPositionIcon(pos) {
    const icons = { 
        GOL: '🧤', 
        FIX: '🛡️', 
        ALA1: '⚡', 
        ALA2: '⚡', 
        PIV: '🎯',
        RES1: '🔄',
        RES2: '🔄',
        RES3: '🔄'
    };
    return icons[pos] || '⚽';
}

async function salvarEscalacao() {
    if (!confirm('✅ Confirmar escalação para esta rodada?')) return;
    
    try {
        // ===== ORÇAMENTO: APENAS TITULARES (posições fixas do campo) =====
        const posicoesQueContam = ['GOL', 'FIX', 'ALA1', 'ALA2', 'PIV'];
        
        const budgetUsed = posicoesQueContam
            .filter(pos => selectedTeam[pos] !== null)
            .reduce((sum, pos) => {
                const price = parseFloat(selectedTeam[pos].price);
                console.log(`💰 Somando ${pos}: C$ ${price.toFixed(2)}`);
                return sum + price;
            }, 0);
        
        console.log('💾 === SALVANDO ESCALAÇÃO ===');
        console.log('💰 Orçamento usado (APENAS TITULARES):', budgetUsed.toFixed(2));
        console.log('📋 Posições contadas:', posicoesQueContam);
        console.log('🔄 Reservas (RES1, RES2, RES3): NÃO CONTAM');
        
        // Validar que não ultrapassa o limite
        if (budgetUsed > budgetLimit) {
            alert(`❌ ERRO: Orçamento ultrapassado!
Usado: C$ ${budgetUsed.toFixed(2)}
Limite: C$ ${budgetLimit.toFixed(2)}`);
            return;
        }
        
        // Deletar time existente se houver
        const { error: deleteError } = await supabase
            .from('fantasy_teams')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('round_id', activeRound.id);
        
        if (deleteError) {
            console.error('Erro ao deletar time antigo:', deleteError);
        }
        
        // Criar novo time COM O ORÇAMENTO CORRETO
        const { data: team, error: teamError } = await supabase
            .from('fantasy_teams')
            .insert({
                user_id: currentUser.id,
                round_id: activeRound.id,
                team_name: 'Meu Time',
                budget_used: budgetUsed  // <== APENAS TITULARES
            })
            .select()
            .single();
        
        if (teamError) {
            console.error('Erro ao criar time:', teamError);
            throw teamError;
        }
        
        console.log('✅ Time criado com ID:', team.id);
        console.log('💰 Budget_used salvo no banco:', budgetUsed);
        
        // Inserir jogadores (titulares + reservas)
        const teamPlayers = Object.entries(selectedTeam)
            .filter(([pos, player]) => player !== null)
            .map(([pos, player]) => {
                const isStarter = posicoesQueContam.includes(pos);
                console.log(`👤 ${pos}: ${player.name} - É titular? ${isStarter}`);
                
                return {
                    fantasy_team_id: team.id,
                    player_id: player.id,
                    position_role: pos,
                    is_captain: captain === player.id,
                    is_starter: isStarter  // <== RES1, RES2, RES3 = false
                };
            });
        
        console.log('📤 Inserindo jogadores:', teamPlayers);
        
        const { error: playersError } = await supabase
            .from('team_players')
            .insert(teamPlayers);
        
        if (playersError) {
            console.error('Erro ao inserir jogadores:', playersError);
            throw playersError;
        }
        
        // ===== MENSAGEM DE SUCESSO =====
        const reservasEscolhidos = ['RES1', 'RES2', 'RES3']
            .filter(pos => selectedTeam[pos] !== null)
            .map(pos => `   • ${selectedTeam[pos].name} (${selectedTeam[pos].position})`)
            .join('');
        
        alert(
            `✅ ESCALAÇÃO SALVA COM SUCESSO!
` +
            `💰 Orçamento usado (titulares): C$ ${budgetUsed.toFixed(2)}
` +
            `💵 Restante: C$ ${(budgetLimit - budgetUsed).toFixed(2)}
` +
            `🔄 Reservas escolhidos (GRÁTIS):
${reservasEscolhidos || '   Nenhum'}
` +
            `⭐ Capitão: ${selectedTeam[posicoesQueContam.find(p => selectedTeam[p]?.id === captain)]?.name || 'N/A'}`
        );
        
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        alert('❌ Erro ao salvar escalação: ' + error.message);
    }
}

document.getElementById('btnSalvarTime')?.addEventListener('click', salvarEscalacao);

// Busca de jogadores
document.getElementById('searchPlayer')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allPlayers.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.team.toLowerCase().includes(term)
    );
    renderPlayerList(filtered);
});