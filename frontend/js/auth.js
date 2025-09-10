// Sistema de Autenticação - Sistema Barbeiros

class AuthManager {
    constructor() {
        this.apiUrl = 'http://localhost:3000';
        this.loginForm = document.getElementById('loginForm');
        this.loginBtn = document.getElementById('loginBtn');
        this.togglePasswordBtn = document.getElementById('togglePassword');
        this.alertContainer = document.getElementById('alertContainer');

        this.init();
    }

    init() {
        // Verificar se já está autenticado
        this.checkAuthStatus();

        // Configurar event listeners
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (this.togglePasswordBtn) {
            this.togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility());
        }

        // Enter no campo de senha também faz login
        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin(e);
                }
            });
        }
    }

    // Verificar status de autenticação
    checkAuthStatus() {
        const token = localStorage.getItem('barbeiros-token');
        const user = localStorage.getItem('barbeiros-user');

        if (token && user) {
            // Usuário já autenticado, redirecionar para dashboard
            window.location.href = '../index.html';
        }
    }

    // Manipular login
    async handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Validação básica
        if (!this.validateForm(email, password)) {
            return;
        }

        // Mostrar loading
        this.setLoadingState(true);

        try {
            const response = await this.login(email, password);

            if (response.success) {
                // Login bem-sucedido
                this.handleLoginSuccess(response.data);
            } else {
                // Login falhou
                this.handleLoginError(response.message || 'Credenciais inválidas');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            this.handleLoginError('Erro de conexão. Verifique sua internet.');
        } finally {
            this.setLoadingState(false);
        }
    }

    // Validar formulário
    validateForm(email, password) {
        let isValid = true;

        // Validar email
        const emailField = document.getElementById('email');
        if (!email) {
            this.showFieldError(emailField, 'Email é obrigatório');
            isValid = false;
        } else if (!this.isValidEmail(email)) {
            this.showFieldError(emailField, 'Email inválido');
            isValid = false;
        } else {
            this.clearFieldError(emailField);
        }

        // Validar senha
        const passwordField = document.getElementById('password');
        if (!password) {
            this.showFieldError(passwordField, 'Senha é obrigatória');
            isValid = false;
        } else if (password.length < 4) {
            this.showFieldError(passwordField, 'Senha deve ter pelo menos 4 caracteres');
            isValid = false;
        } else {
            this.clearFieldError(passwordField);
        }

        return isValid;
    }

    // Validar formato de email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Mostrar erro no campo
    showFieldError(field, message) {
        field.classList.add('is-invalid');
        const feedback = field.parentElement.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = message;
        }
    }

    // Limpar erro do campo
    clearFieldError(field) {
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');
    }

    // Estado de loading
    setLoadingState(loading) {
        if (this.loginBtn) {
            const spinner = this.loginBtn.querySelector('.spinner-border');
            const icon = this.loginBtn.querySelector('i');

            if (loading) {
                this.loginBtn.disabled = true;
                if (spinner) spinner.classList.remove('d-none');
                if (icon) icon.classList.add('d-none');
            } else {
                this.loginBtn.disabled = false;
                if (spinner) spinner.classList.add('d-none');
                if (icon) icon.classList.remove('d-none');
            }
        }
    }

    // Fazer login via API
    async login(email, password) {
        const response = await fetch(`${this.apiUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        return await response.json();
    }

    // Manipular login bem-sucedido
    handleLoginSuccess(data) {
        // Normalizar dados do usuário para o frontend (nome/id)
        const normalizedUser = {
            ...data.user,
            nome: data.user?.nome || data.user?.name || data.user?.nome_usuario || 'Usuário',
            id_usuario: data.user?.id_usuario || data.user?.id
        };

        // Salvar token e dados do usuário
        localStorage.setItem('barbeiros-token', data.token);
        localStorage.setItem('barbeiros-user', JSON.stringify(normalizedUser));

        // Mostrar mensagem de sucesso
        this.showAlert('Login realizado com sucesso!', 'success');

        // Redirecionar após um breve delay
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1000);
    }

    // Manipular erro de login
    handleLoginError(message) {
        this.showAlert(message, 'danger');

        // Limpar campo de senha em caso de erro
        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.value = '';
            passwordField.focus();
        }
    }

    // Mostrar alertas
    showAlert(message, type = 'info') {
        if (!this.alertContainer) return;

        const alertClass = `alert-${type}`;
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                <i class="bi bi-${this.getAlertIcon(type)} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        this.alertContainer.innerHTML = alertHtml;

        // Auto-remover após 5 segundos
        setTimeout(() => {
            const alert = this.alertContainer.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    // Ícones para alertas
    getAlertIcon(type) {
        const icons = {
            'success': 'check-circle-fill',
            'danger': 'exclamation-triangle-fill',
            'warning': 'exclamation-triangle-fill',
            'info': 'info-circle-fill'
        };
        return icons[type] || 'info-circle-fill';
    }

    // Toggle visibilidade da senha
    togglePasswordVisibility() {
        const passwordField = document.getElementById('password');
        const toggleBtn = document.getElementById('togglePassword');
        const icon = toggleBtn.querySelector('i');

        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            icon.className = 'bi bi-eye-slash';
            toggleBtn.setAttribute('title', 'Ocultar senha');
        } else {
            passwordField.type = 'password';
            icon.className = 'bi bi-eye';
            toggleBtn.setAttribute('title', 'Mostrar senha');
        }
    }

    // Logout
    static logout() {
        localStorage.removeItem('barbeiros-token');
        localStorage.removeItem('barbeiros-user');
        window.location.href = 'login.html';
    }

    // Verificar se está autenticado
    static isAuthenticated() {
        const token = localStorage.getItem('barbeiros-token');
        const user = localStorage.getItem('barbeiros-user');
        return !!(token && user);
    }

    // Obter dados do usuário atual
    static getCurrentUser() {
        const userData = localStorage.getItem('barbeiros-user');
        return userData ? JSON.parse(userData) : null;
    }

    // Obter token atual
    static getToken() {
        return localStorage.getItem('barbeiros-token');
    }
}

// Função global para logout
function logout() {
    AuthManager.logout();
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar apenas na página de login
    if (document.getElementById('loginForm')) {
        window.authManager = new AuthManager();
    }
});

// CSS adicional para melhor UX
const authStyles = document.createElement('style');
authStyles.textContent = `
    .card {
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }

    .form-control:focus {
        box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.25);
        border-color: #2563eb;
    }

    .btn-primary {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        border: none;
        padding: 12px 24px;
        font-weight: 600;
    }

    .btn-primary:hover {
        background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }

    .input-group .btn {
        border-color: #e2e8f0;
    }

    .input-group .btn:hover {
        border-color: #2563eb;
        background-color: #f8fafc;
    }

    /* Dark mode adjustments */
    body.dark-mode .card {
        background-color: #1e293b;
        border-color: #334155;
    }

    body.dark-mode .form-control {
        background-color: #334155;
        border-color: #475569;
        color: #f1f5f9;
    }

    body.dark-mode .form-control:focus {
        background-color: #334155;
        border-color: #3b82f6;
    }

    body.dark-mode .form-label {
        color: #e2e8f0;
    }

    body.dark-mode .text-muted {
        color: #94a3b8 !important;
    }

    /* Loading animation */
    .spinner-border-sm {
        width: 1rem;
        height: 1rem;
    }

    /* Responsive adjustments */
    @media (max-width: 576px) {
        .card-body {
            padding: 2rem 1.5rem !important;
        }

        .bg-primary {
            width: 60px !important;
            height: 60px !important;
        }

        .bg-primary i {
            font-size: 1.5rem !important;
        }
    }
`;
document.head.appendChild(authStyles);
