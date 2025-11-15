// ============================================
// CARTOLA COACH - SISTEMA DE AUTENTICAÇÃO (ATUALIZADO)
// ============================================

/**
 * Sistema de autenticação com Supabase
 * Gerencia login, cadastro, logout e verificação de sessão
 * 
 * MUDANÇAS PRINCIPAIS:
 * - Removida criação manual de usuário (agora usa trigger do banco)
 * - Simplificado fluxo de cadastro
 * - Melhorado tratamento de erros
 */

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let usuarioAtual = null;

// ============================================
// ALTERNÂNCIA DE FORMULÁRIOS
// ============================================

/**
 * Mostra o formulário de login
 */
function mostrarLogin() {
    const formLogin = document.getElementById('form-login');
    const formCadastro = document.getElementById('form-cadastro');
    const btnLogin = document.getElementById('btn-login');
    const btnCadastro = document.getElementById('btn-cadastro');
    
    if (formLogin) formLogin.classList.remove('hidden');
    if (formCadastro) formCadastro.classList.add('hidden');
    
    if (btnLogin) {
        btnLogin.classList.add('bg-white', 'shadow-sm', 'text-blue-600');
        btnLogin.classList.remove('text-gray-600');
    }
    
    if (btnCadastro) {
        btnCadastro.classList.remove('bg-white', 'shadow-sm', 'text-blue-600');
        btnCadastro.classList.add('text-gray-600');
    }
    
    limparMensagem();
}

/**
 * Mostra o formulário de cadastro
 */
function mostrarCadastro() {
    const formLogin = document.getElementById('form-login');
    const formCadastro = document.getElementById('form-cadastro');
    const btnLogin = document.getElementById('btn-login');
    const btnCadastro = document.getElementById('btn-cadastro');
    
    if (formLogin) formLogin.classList.add('hidden');
    if (formCadastro) formCadastro.classList.remove('hidden');
    
    if (btnCadastro) {
        btnCadastro.classList.add('bg-white', 'shadow-sm', 'text-blue-600');
        btnCadastro.classList.remove('text-gray-600');
    }
    
    if (btnLogin) {
        btnLogin.classList.remove('bg-white', 'shadow-sm', 'text-blue-600');
        btnLogin.classList.add('text-gray-600');
    }
    
    limparMensagem();
}

// ============================================
// MENSAGENS
// ============================================

/**
 * Exibe mensagem no formulário de autenticação
 * @param {string} mensagem - Mensagem a ser exibida
 * @param {string} tipo - Tipo da mensagem (sucesso, erro, info)
 */
function mostrarMensagem(mensagem, tipo = 'info') {
    const container = document.getElementById('mensagem-auth');
    if (!container) return;
    
    container.classList.remove('hidden');
    
    const cores = {
        'sucesso': 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900 dark:border-green-600 dark:text-green-200',
        'erro': 'bg-red-100 border-red-400 text-red-800 dark:bg-red-900 dark:border-red-600 dark:text-red-200',
        'info': 'bg-blue-100 border-blue-400 text-blue-800 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-200'
    };
    
    const icones = {
        'sucesso': '✓',
        'erro': '✗',
        'info': 'ℹ'
    };
    
    container.className = `mt-4 p-4 rounded-lg border ${cores[tipo] || cores.info}`;
    container.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="text-xl font-bold">${icones[tipo] || icones.info}</span>
            <span>${mensagem}</span>
        </div>
    `;
}

/**
 * Limpa a mensagem exibida
 */
function limparMensagem() {
    const container = document.getElementById('mensagem-auth');
    if (!container) return;
    
    container.classList.add('hidden');
    container.innerHTML = '';
}

// ============================================
// LOGIN
// ============================================

/**
 * Realiza login do usuário
 * @param {string} email - Email do usuário
 * @param {string} senha - Senha do usuário
 */
async function fazerLogin(email, senha) {
    try {
        console.log('🔐 Tentando fazer login...');
        
        // Validações
        if (!email || !senha) {
            throw new Error('Preencha todos os campos');
        }
        
        mostrarMensagem('Fazendo login...', 'info');
        
        // Autenticar no Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: senha
        });

        if (authError) {
            console.error('❌ Erro de autenticação:', authError);
            
            // Mensagens amigáveis para erros comuns
            if (authError.message.includes('Invalid login credentials')) {
                throw new Error('Email ou senha incorretos');
            }
            
            throw new Error(authError.message);
        }

        console.log('✅ Autenticação bem-sucedida:', authData.user.email);

        // Aguardar um pouco para o trigger criar o usuário automaticamente
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Buscar dados do usuário (o trigger já deve ter criado)
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (userError || !userData) {
            console.error('❌ Erro ao buscar perfil:', userError);
            throw new Error('Perfil não encontrado. Aguarde alguns segundos e tente novamente.');
        }
        
        usuarioAtual = userData;
        console.log('✅ Perfil carregado:', usuarioAtual.team_name);
        
        mostrarMensagem('Login realizado com sucesso!', 'sucesso');
        
        // Redirecionar baseado na role
        setTimeout(() => {
            if (usuarioAtual.role === 'admin' || usuarioAtual.is_admin) {
                console.log('🔑 Redirecionando para painel admin...');
                window.location.href = 'admin.html';
            } else {
                console.log('👤 Redirecionando para dashboard...');
                window.location.href = 'dashboard.html';
            }
        }, 1000);

    } catch (error) {
        console.error('❌ Erro no login:', error);
        mostrarMensagem(error.message, 'erro');
    }
}

// ============================================
// CADASTRO
// ============================================

/**
 * Realiza cadastro de novo usuário
 * @param {string} teamName - Nome do time
 * @param {string} email - Email do usuário
 * @param {string} senha - Senha do usuário
 */
async function fazerCadastro(teamName, email, senha) {
    try {
        console.log('📝 Iniciando cadastro...');

        // Validações
        if (!teamName || teamName.trim().length < 3) {
            throw new Error('Nome do time deve ter pelo menos 3 caracteres');
        }

        if (!email || !email.includes('@')) {
            throw new Error('Email inválido');
        }

        if (!senha || senha.length < 6) {
            throw new Error('Senha deve ter pelo menos 6 caracteres');
        }

        mostrarMensagem('Criando sua conta...', 'info');

        // Criar conta no Supabase Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password: senha
        });

        if (signUpError) {
            console.error('❌ Erro no Auth:', signUpError);
            
            if (signUpError.message.includes('already registered')) {
                throw new Error('Este email já está cadastrado. Faça login.');
            }
            
            throw new Error(signUpError.message);
        }

        if (!signUpData.user) {
            throw new Error('Erro ao criar usuário. Tente novamente.');
        }

        console.log('✅ Usuário criado no Auth:', signUpData.user.id);

        // Aguardar o trigger criar o perfil
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Fazer login automático se sessão não foi criada
        let session = signUpData.session;
        
        if (!session) {
            console.log('🔐 Fazendo login automático...');
            
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: senha
            });

            if (signInError) {
                throw new Error('Conta criada! Faça login para continuar.');
            }

            session = signInData.session;
            console.log('✅ Login automático bem-sucedido');
        }

        // Atualizar o nome do time escolhido pelo usuário
        console.log('📝 Atualizando nome do time...');
        
        const { error: updateError } = await supabase
            .from('users')
            .update({ team_name: teamName.trim() })
            .eq('id', signUpData.user.id);

        if (updateError) {
            console.error('⚠️ Erro ao atualizar nome do time:', updateError);
            // Não é crítico, continua mesmo assim
        } else {
            console.log('✅ Nome do time atualizado:', teamName);
        }

        mostrarMensagem('Conta criada com sucesso! Redirecionando...', 'sucesso');

        setTimeout(() => {
            console.log('🔄 Redirecionando para dashboard...');
            window.location.href = 'dashboard.html';
        }, 2000);

    } catch (error) {
        console.error('❌ ERRO:', error);
        mostrarMensagem(error.message, 'erro');
    }
}

// ============================================
// VERIFICAÇÃO DE AUTENTICAÇÃO
// ============================================

/**
 * Verifica se o usuário está autenticado
 * Redireciona para login se não estiver
 * @returns {Promise<Object|null>} Dados do usuário ou null
 */
async function verificarAutenticacao() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            console.log('⚠️ Usuário não autenticado');
            return null;
        }

        console.log('✅ Usuário autenticado:', user.email);

        // Buscar dados do usuário
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            console.error('❌ Erro ao buscar dados:', userError);
            return null;
        }

        usuarioAtual = userData;
        return usuarioAtual;

    } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        return null;
    }
}

/**
 * Verifica autenticação e redireciona se necessário
 * Para uso em páginas protegidas
 * @returns {Promise<Object|null>} Dados do usuário ou null
 */
async function verificarAutenticacaoOuRedirecionar() {
    const usuario = await verificarAutenticacao();
    
    if (!usuario) {
        window.location.href = 'index.html';
        return null;
    }
    
    return usuario;
}

/**
 * Verifica se usuário é admin
 * @returns {Promise<boolean>} True se é admin
 */
async function verificarAdmin() {
    const usuario = await verificarAutenticacao();
    
    if (!usuario) return false;
    
    return usuario.role === 'admin' || usuario.is_admin === true;
}

// ============================================
// LOGOUT
// ============================================

/**
 * Realiza logout do usuário
 */
async function logout() {
    try {
        console.log('🚪 Fazendo logout...');
        
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        usuarioAtual = null;
        
        console.log('✅ Logout realizado');
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('❌ Erro ao fazer logout:', error);
        alert('Erro ao sair: ' + error.message);
    }
}

// ============================================
// EVENTOS DOS FORMULÁRIOS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ auth.js carregado');

    // Formulário de Login
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email')?.value || '';
            const senha = document.getElementById('login-senha')?.value || '';
            
            await fazerLogin(email, senha);
        });
    }

    // Formulário de Cadastro
    const formCadastro = document.getElementById('form-cadastro');
    if (formCadastro) {
        formCadastro.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const teamName = document.getElementById('cadastro-time')?.value || '';
            const email = document.getElementById('cadastro-email')?.value || '';
            const senha = document.getElementById('cadastro-senha')?.value || '';
            
            await fazerCadastro(teamName, email, senha);
        });
    }
    
    // Verificar se já está logado na página de login
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        verificarAutenticacao().then(usuario => {
            if (usuario) {
                console.log('✅ Usuário já logado, redirecionando...');
                if (usuario.role === 'admin' || usuario.is_admin) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }
        });
    }
});

// ============================================
// EXPORTAÇÃO
// ============================================

// Exportar para uso global
window.auth = {
    mostrarLogin,
    mostrarCadastro,
    fazerLogin,
    fazerCadastro,
    verificarAutenticacao,
    verificarAutenticacaoOuRedirecionar,
    verificarAdmin,
    logout,
    usuarioAtual: () => usuarioAtual
};

// Manter compatibilidade com código antigo
window.mostrarLogin = mostrarLogin;
window.mostrarCadastro = mostrarCadastro;
window.logout = logout;
window.verificarAutenticacao = verificarAutenticacao;

console.log('✅ Sistema de autenticação inicializado');