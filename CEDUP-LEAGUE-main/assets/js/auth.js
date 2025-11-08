/**
 * Sistema de Autenticação
 */

let usuarioAtual = null;

// ============================================
// ALTERNAR ENTRE LOGIN E CADASTRO
// ============================================

function mostrarLogin() {
    document.getElementById('form-login').classList.remove('hidden');
    document.getElementById('form-cadastro').classList.add('hidden');
    
    document.getElementById('btn-login').classList.add('bg-white', 'shadow-sm', 'text-blue-600');
    document.getElementById('btn-login').classList.remove('text-gray-600');
    
    document.getElementById('btn-cadastro').classList.remove('bg-white', 'shadow-sm', 'text-blue-600');
    document.getElementById('btn-cadastro').classList.add('text-gray-600');
    
    limparMensagem();
}

function mostrarCadastro() {
    document.getElementById('form-login').classList.add('hidden');
    document.getElementById('form-cadastro').classList.remove('hidden');
    
    document.getElementById('btn-cadastro').classList.add('bg-white', 'shadow-sm', 'text-blue-600');
    document.getElementById('btn-cadastro').classList.remove('text-gray-600');
    
    document.getElementById('btn-login').classList.remove('bg-white', 'shadow-sm', 'text-blue-600');
    document.getElementById('btn-login').classList.add('text-gray-600');
    
    limparMensagem();
}

// ============================================
// MENSAGENS
// ============================================

function mostrarMensagem(mensagem, tipo = 'info') {
    const container = document.getElementById('mensagem-auth');
    container.classList.remove('hidden');
    
    const cores = {
        'sucesso': 'bg-green-100 border-green-400 text-green-800',
        'erro': 'bg-red-100 border-red-400 text-red-800',
        'info': 'bg-blue-100 border-blue-400 text-blue-800'
    };
    
    container.className = `mt-4 p-4 rounded-lg border ${cores[tipo]}`;
    container.textContent = mensagem;
}

function limparMensagem() {
    const container = document.getElementById('mensagem-auth');
    container.classList.add('hidden');
    container.textContent = '';
}

// ============================================
// LOGIN
// ============================================

async function fazerLogin(email, senha) {
    try {
        console.log('🔐 Tentando fazer login...');
        
        // 1. Autenticar no Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (authError) {
            console.error('❌ Erro de autenticação:', authError);
            throw new Error('Email ou senha inválidos');
        }

        console.log('✅ Autenticação bem-sucedida:', authData.user.email);

        // 2. Buscar dados do usuário na tabela 'users'
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (userError) {
            console.error('❌ Erro ao buscar dados do usuário:', userError);
            throw new Error('Erro ao carregar dados do usuário');
        }

        console.log('✅ Dados do usuário carregados:', userData);
        usuarioAtual = userData;

        // 3. Redirecionar baseado no role
        mostrarMensagem('Login realizado com sucesso! Redirecionando...', 'sucesso');
        
        setTimeout(() => {
            if (userData.role === 'admin') {
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

async function fazerCadastro(teamName, email, senha) {
    try {
        console.log('📝 Iniciando cadastro...');
        console.log('📧 Email:', email);
        console.log('👤 Time:', teamName);

        // Validações básicas
        if (!teamName || teamName.length < 3) {
            throw new Error('Nome do time deve ter pelo menos 3 caracteres');
        }

        if (!email || !email.includes('@')) {
            throw new Error('Email inválido');
        }

        if (!senha || senha.length < 6) {
            throw new Error('Senha deve ter pelo menos 6 caracteres');
        }

        mostrarMensagem('Criando sua conta...', 'info');

        // 1. Criar usuário no Supabase Auth
        console.log('🔐 Criando usuário no Auth...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: senha,
            options: {
                emailRedirectTo: window.location.origin + '/dashboard.html'
            }
        });

        if (signUpError) {
            console.error('❌ Erro no Auth:', signUpError);
            
            // Traduzir erros comuns
            if (signUpError.message.includes('after')) {
                throw new Error('⏱️ Aguarde um momento antes de tentar novamente');
            }
            if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
                throw new Error('📧 Este email já está cadastrado. Faça login.');
            }
            
            throw new Error(signUpError.message);
        }

        if (!signUpData.user) {
            throw new Error('Erro ao criar usuário. Tente novamente.');
        }

        console.log('✅ Usuário criado no Auth:', signUpData.user.id);
        console.log('🔐 Sessão automática:', signUpData.session ? 'SIM' : 'NÃO');

        // 2. Se NÃO criou sessão automática, fazer login manual
        let session = signUpData.session;
        
        if (!session) {
            console.log('⚠️ Sessão não foi criada automaticamente');
            console.log('🔐 Fazendo login manual...');
            
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: email,
                password: senha
            });

            if (signInError) {
                console.error('❌ Erro ao fazer login:', signInError);
                throw new Error('Conta criada, mas não foi possível fazer login. Tente fazer login manualmente.');
            }

            session = signInData.session;
            console.log('✅ Login manual bem-sucedido:', session.user.id);
        }

        // 3. Aguardar um momento para garantir que tudo está pronto
        await new Promise(resolve => setTimeout(resolve, 500));

        // 4. Criar registro na tabela 'users'
        console.log('📊 Criando perfil na tabela users...');
        
        const { data: userData, error: userError } = await supabase
            .from('users')
            .insert([
                {
                    id: signUpData.user.id,
                    email: email,
                    team_name: teamName,
                    role: 'user',
                    cartoletas: 100.00,
                    total_points: 0
                }
            ])
            .select()
            .single();

        if (userError) {
            console.error('❌ Erro ao criar perfil:', userError);
            console.error('Código do erro:', userError.code);
            console.error('Detalhes:', userError.message);
            
            // Se o erro for de duplicação, significa que o usuário já existe
            if (userError.code === '23505') {
                console.log('⚠️ Perfil já existe, fazendo login...');
                mostrarMensagem('✅ Conta já existe! Redirecionando...', 'sucesso');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                return;
            }
            
            throw new Error(`Erro ao criar perfil: ${userError.message}`);
        }

        console.log('✅ Perfil criado com sucesso:', userData);

        mostrarMensagem('✅ Conta criada com sucesso! Redirecionando...', 'sucesso');

        // 5. Redirecionar para dashboard
        setTimeout(() => {
            console.log('🔄 Redirecionando para dashboard...');
            window.location.href = 'dashboard.html';
        }, 2000);

    } catch (error) {
        console.error('❌ ERRO COMPLETO:', error);
        console.error('Stack trace:', error.stack);
        
        let mensagemErro = error.message;
        
        // Traduzir erros comuns
        if (mensagemErro.includes('violates row-level security')) {
            mensagemErro = '🔒 Erro de permissão. Configure as políticas RLS no Supabase.';
        } else if (mensagemErro.includes('duplicate key')) {
            mensagemErro = '📧 Este email já está cadastrado. Tente fazer login.';
        }
        
        mostrarMensagem('❌ ' + mensagemErro, 'erro');
    }
}

// ============================================
// VERIFICAR AUTENTICAÇÃO (para outras páginas)
// ============================================

async function verificarAutenticacao() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            console.log('⚠️ Usuário não autenticado, redirecionando...');
            window.location.href = 'index.html';
            return null;
        }

        console.log('✅ Usuário autenticado:', user.email);

        // Buscar dados completos do usuário
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (userError) {
            console.error('❌ Erro ao buscar dados:', userError);
            return null;
        }

        usuarioAtual = userData;
        return userData;

    } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        window.location.href = 'index.html';
        return null;
    }
}

// ============================================
// LOGOUT
// ============================================

async function logout() {
    try {
        console.log('🚪 Fazendo logout...');
        
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
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
            
            const email = document.getElementById('login-email').value.trim();
            const senha = document.getElementById('login-senha').value;

            console.log('📧 Tentando login com:', email);
            
            await fazerLogin(email, senha);
        });
    }

    // Formulário de Cadastro
    const formCadastro = document.getElementById('form-cadastro');
    if (formCadastro) {
        formCadastro.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const teamName = document.getElementById('cadastro-time').value.trim();
            const email = document.getElementById('cadastro-email').value.trim();
            const senha = document.getElementById('cadastro-senha').value;

            console.log('📝 Tentando cadastro:', email, teamName);
            
            await fazerCadastro(teamName, email, senha);
        });
    }
});