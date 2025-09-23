/**
 * SISTEMA DE CARDS ANIMADOS PARA AGENDA
 * 
 * Sistema otimizado para gerenciar animações dos cards da agenda
 * Baseado no projeto de referência, mas adaptado para performance
 * 
 * @version 1.0.0
 * @author Sistema Barbeiros
 */

class AnimatedCardsManager {
  constructor() {
    this.config = {
      animationDuration: 300,
      staggerDelay: 50,
      maxConcurrentAnimations: 5,
      batchModeThreshold: 10,
      enableHoverEffects: true,
      enableBatchMode: true
    };
    
    this.activeAnimations = new Set();
    this.observer = null;
    this.isInitialized = false;
    
    this.init();
  }

  /**
   * Inicializa o sistema
   */
  init() {
    if (this.isInitialized) return;
    
    this.setupMutationObserver();
    this.processExistingCards();
    this.bindEvents();
    
    this.isInitialized = true;
    console.log('🎨 AnimatedCardsManager inicializado');
  }

  /**
   * Configura observer para novos cards
   */
  setupMutationObserver() {
    if (this.observer) return;
    
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList.contains('agenda-item')) {
            this.processCard(node);
          }
        });
      });
    });

    const agendaContent = document.getElementById('agenda-content');
    if (agendaContent) {
      this.observer.observe(agendaContent, { 
        childList: true, 
        subtree: true 
      });
    }
  }

  /**
   * Processa cards existentes
   */
  processExistingCards() {
    const cards = document.querySelectorAll('.agenda-item');
    cards.forEach((card, index) => {
      this.processCard(card, index);
    });
  }

  /**
   * Processa um card individual
   */
  processCard(card, index = 0) {
    if (card.classList.contains('animated-card')) return;
    
    // Adiciona classe base
    card.classList.add('animated-card');
    
    // Aplica stagger delay se necessário
    if (index > 0 && index <= 5) {
      card.classList.add(`stagger-${index}`);
    }
    
    // Detecta status atual
    const status = this.detectCardStatus(card);
    if (status) {
      this.applyStatusClass(card, status);
    }
    
    // Configura hover effects se habilitado
    if (this.config.enableHoverEffects) {
      this.setupHoverEffects(card);
    }
    
    // Verifica se deve usar batch mode
    this.checkBatchMode();
  }

  /**
   * Detecta o status do card baseado no badge
   */
  detectCardStatus(card) {
    const badge = card.querySelector('.badge');
    if (!badge) return null;
    
    const badgeText = badge.textContent.toLowerCase();
    
    if (badgeText.includes('confirmado')) return 'confirmed';
    if (badgeText.includes('cancelado')) return 'cancelled';
    if (badgeText.includes('pendente')) return 'pending';
    if (badgeText.includes('processando')) return 'processing';
    
    return null;
  }

  /**
   * Aplica classe de status ao card
   */
  applyStatusClass(card, status) {
    // Remove classes de status anteriores
    card.classList.remove('status-confirmed', 'status-cancelled', 'status-pending', 'status-processing');
    
    // Adiciona nova classe
    card.classList.add(`status-${status}`);
  }

  /**
   * Configura efeitos de hover
   */
  setupHoverEffects(card) {
    // Remove listeners existentes para evitar duplicação
    card.removeEventListener('mouseenter', this.handleMouseEnter);
    card.removeEventListener('mouseleave', this.handleMouseLeave);
    
    // Adiciona novos listeners
    card.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
    card.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
  }

  /**
   * Handler para mouse enter
   */
  handleMouseEnter(event) {
    const card = event.currentTarget;
    if (card.classList.contains('batch-mode')) return;
    
    this.animateCard(card, 'hover');
  }

  /**
   * Handler para mouse leave
   */
  handleMouseLeave(event) {
    const card = event.currentTarget;
    if (card.classList.contains('batch-mode')) return;
    
    this.resetCardTransform(card);
  }

  /**
   * Anima um card com tipo específico
   */
  animateCard(card, animationType, callback = null) {
    if (this.activeAnimations.size >= this.config.maxConcurrentAnimations) {
      console.warn('Muitas animações ativas, pulando animação');
      if (callback) callback();
      return;
    }

    const animationId = `${Date.now()}-${Math.random()}`;
    this.activeAnimations.add(animationId);

    // Remove animações anteriores
    card.classList.remove('animating-pulse', 'animating-shake', 'animating-bounce');

    // Adiciona nova animação
    card.classList.add(`animating-${animationType}`);

    // Remove animação após duração
    setTimeout(() => {
      card.classList.remove(`animating-${animationType}`);
      this.activeAnimations.delete(animationId);
      
      if (callback) callback();
    }, this.config.animationDuration);
  }

  /**
   * Reseta transform do card
   */
  resetCardTransform(card) {
    card.style.transform = '';
  }

  /**
   * Verifica se deve usar batch mode
   */
  checkBatchMode() {
    const cards = document.querySelectorAll('.agenda-item.animated-card');
    const shouldUseBatchMode = cards.length >= this.config.batchModeThreshold;
    
    cards.forEach(card => {
      if (shouldUseBatchMode && this.config.enableBatchMode) {
        card.classList.add('batch-mode');
      } else {
        card.classList.remove('batch-mode');
      }
    });
  }

  /**
   * Atualiza status de um card específico
   */
  updateCardStatus(cardId, newStatus, animationType = 'pulse') {
    const card = document.querySelector(`[data-agendamento-id="${cardId}"]`);
    if (!card) return;

    // Aplica nova classe de status
    this.applyStatusClass(card, newStatus);
    
    // Anima a mudança
    this.animateCard(card, animationType);
    
    // Atualiza badge se necessário
    this.updateCardBadge(card, newStatus);
  }

  /**
   * Atualiza badge do card
   */
  updateCardBadge(card, status) {
    const badge = card.querySelector('.badge');
    if (!badge) return;

    const statusConfig = {
      confirmed: { text: '✅ Confirmado', class: 'bg-success' },
      cancelled: { text: '❌ Cancelado', class: 'bg-danger' },
      pending: { text: '⏳ Pendente', class: 'bg-warning' },
      processing: { text: '⚡ Processando', class: 'bg-info' }
    };

    const config = statusConfig[status];
    if (config) {
      badge.textContent = config.text;
      badge.className = `badge ${config.class} fs-6`;
    }
  }

  /**
   * Anima múltiplos cards em sequência
   */
  animateMultipleCards(cards, animationType = 'pulse', stagger = true) {
    cards.forEach((card, index) => {
      const delay = stagger ? index * this.config.staggerDelay : 0;
      
      setTimeout(() => {
        this.animateCard(card, animationType);
      }, delay);
    });
  }

  /**
   * Adiciona estado de loading a um card
   */
  setCardLoading(cardId, isLoading = true) {
    const card = document.querySelector(`[data-agendamento-id="${cardId}"]`);
    if (!card) return;

    if (isLoading) {
      card.classList.add('loading');
    } else {
      card.classList.remove('loading');
    }
  }

  /**
   * Atualiza status de todos os cards
   */
  refreshAllCards() {
    const cards = document.querySelectorAll('.agenda-item.animated-card');
    cards.forEach(card => {
      const status = this.detectCardStatus(card);
      if (status) {
        this.applyStatusClass(card, status);
      }
    });
    
    this.checkBatchMode();
  }

  /**
   * Vincula eventos globais
   */
  bindEvents() {
    // Evento personalizado para mudança de status
    document.addEventListener('agendaStatusChange', (event) => {
      const { cardId, newStatus, animationType } = event.detail;
      this.updateCardStatus(cardId, newStatus, animationType);
    });

    // Evento para refresh de cards
    document.addEventListener('agendaRefresh', () => {
      this.refreshAllCards();
    });

    // Evento para animação em lote
    document.addEventListener('agendaBatchAnimate', (event) => {
      const { animationType, stagger } = event.detail;
      const cards = document.querySelectorAll('.agenda-item.animated-card');
      this.animateMultipleCards(Array.from(cards), animationType, stagger);
    });
  }

  /**
   * Destrói o sistema
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.activeAnimations.clear();
    this.isInitialized = false;
    
    console.log('🎨 AnimatedCardsManager destruído');
  }

  /**
   * Configura opções
   */
  configure(options) {
    this.config = { ...this.config, ...options };
  }

  /**
   * Obtém estatísticas
   */
  getStats() {
    return {
      totalCards: document.querySelectorAll('.agenda-item.animated-card').length,
      activeAnimations: this.activeAnimations.size,
      isBatchMode: document.querySelector('.agenda-item.animated-card.batch-mode') !== null,
      isInitialized: this.isInitialized
    };
  }
}

// Instância global
let animatedCardsManager;

// Inicialização automática
document.addEventListener('DOMContentLoaded', () => {
  animatedCardsManager = new AnimatedCardsManager();
  
  // Expõe globalmente
  window.AnimatedCardsManager = AnimatedCardsManager;
  window.animatedCardsManager = animatedCardsManager;
});

// Funções de conveniência para compatibilidade com código existente
window.animateCardStatus = (cardId, status, animationType = 'pulse') => {
  if (animatedCardsManager) {
    animatedCardsManager.updateCardStatus(cardId, status, animationType);
  }
};

window.setCardLoading = (cardId, isLoading = true) => {
  if (animatedCardsManager) {
    animatedCardsManager.setCardLoading(cardId, isLoading);
  }
};

window.refreshAnimatedCards = () => {
  if (animatedCardsManager) {
    animatedCardsManager.refreshAllCards();
  }
};

// Exporta para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimatedCardsManager;
}
