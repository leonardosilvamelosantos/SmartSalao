# 🎨 Sistema de Cards Animados para Agenda

Sistema otimizado de cards animados baseado no projeto de referência, adaptado especificamente para a agenda do Sistema Barbeiros.

## ✨ Características

### 🎯 **Funcionalidades Principais**
- **Cores de fundo baseadas no status**: Cards inteiros mudam de cor conforme o status (confirmado/cancelado/pendente/processando)
- **Animações suaves**: Transições fluidas e performáticas
- **Compatibilidade total**: Integra perfeitamente com o sistema existente
- **Performance otimizada**: Não sobrecarrega mesmo com muitos cards

### 🎨 **Estados Visuais**
- **Confirmado**: Fundo verde claro com borda verde
- **Cancelado**: Fundo vermelho claro com borda vermelha  
- **Pendente**: Fundo amarelo claro com borda amarela
- **Processando**: Fundo azul claro com borda azul

### ⚡ **Otimizações de Performance**
- **Batch Mode**: Desabilita hover effects quando há muitos cards (10+)
- **Limite de animações**: Máximo de 5 animações simultâneas
- **Stagger delay**: Animações escalonadas para evitar sobrecarga
- **Reduced motion**: Respeita preferências de acessibilidade

## 📁 **Arquivos Criados**

```
frontend/
├── css/
│   └── animated-cards.css          # Estilos dos cards animados
├── js/
│   └── animated-cards.js           # Sistema de gerenciamento
├── demo-animated-cards.html        # Página de demonstração
└── ANIMATED-CARDS-README.md        # Este arquivo
```

## 🚀 **Como Usar**

### **Integração Automática**
O sistema é carregado automaticamente e funciona com os cards existentes da agenda. Não é necessário fazer alterações no código.

### **Classes CSS Aplicadas**
```html
<!-- Card base com animação -->
<div class="agenda-item animated-card status-confirmed" data-agendamento-id="123">
  <!-- Conteúdo do card -->
</div>
```

### **Estados Disponíveis**
- `status-confirmed` - Card confirmado (verde)
- `status-cancelled` - Card cancelado (vermelho)
- `status-pending` - Card pendente (amarelo)
- `status-processing` - Card processando (azul)

### **Animações Disponíveis**
- `animating-pulse` - Efeito de pulso
- `animating-shake` - Efeito de tremor
- `animating-bounce` - Efeito de salto

## 🛠️ **API JavaScript**

### **Funções Globais**
```javascript
// Animar mudança de status
window.animateCardStatus(cardId, status, animationType);

// Definir estado de loading
window.setCardLoading(cardId, isLoading);

// Atualizar todos os cards
window.refreshAnimatedCards();
```

### **Exemplos de Uso**
```javascript
// Confirmar um agendamento com animação
window.animateCardStatus('123', 'confirmed', 'pulse');

// Cancelar com efeito de tremor
window.animateCardStatus('123', 'cancelled', 'shake');

// Mostrar loading
window.setCardLoading('123', true);

// Atualizar todos os cards
window.refreshAnimatedCards();
```

### **Eventos Personalizados**
```javascript
// Disparar mudança de status
document.dispatchEvent(new CustomEvent('agendaStatusChange', {
  detail: { cardId: '123', newStatus: 'confirmed', animationType: 'pulse' }
}));

// Animar múltiplos cards
document.dispatchEvent(new CustomEvent('agendaBatchAnimate', {
  detail: { animationType: 'pulse', stagger: true }
}));
```

## 🎛️ **Configurações**

### **Opções do Sistema**
```javascript
// Acessar instância global
const manager = window.animatedCardsManager;

// Configurar opções
manager.configure({
  animationDuration: 300,        // Duração das animações (ms)
  staggerDelay: 50,             // Delay entre animações (ms)
  maxConcurrentAnimations: 5,   // Máximo de animações simultâneas
  batchModeThreshold: 10,       // Limite para modo lote
  enableHoverEffects: true,     // Habilitar efeitos de hover
  enableBatchMode: true         // Habilitar modo lote
});

// Obter estatísticas
const stats = manager.getStats();
console.log(stats);
```

## 📱 **Responsividade**

### **Mobile (< 768px)**
- Animações reduzidas para melhor performance
- Hover effects desabilitados
- Cards com padding otimizado

### **Tablet (768px - 1024px)**
- Animações normais
- Hover effects ativos
- Layout adaptado

### **Desktop (> 1024px)**
- Todas as funcionalidades ativas
- Animações completas
- Modo lote quando necessário

## ♿ **Acessibilidade**

### **Reduced Motion**
```css
@media (prefers-reduced-motion: reduce) {
  /* Animações desabilitadas para usuários sensíveis */
}
```

### **Alto Contraste**
```css
@media (prefers-contrast: high) {
  /* Bordas mais espessas para melhor visibilidade */
}
```

## 🎨 **Customização**

### **Cores Personalizadas**
```css
:root {
  --card-success-bg: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  --card-success-border: #22c55e;
  --card-success-text: #14532d;
  --card-success-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
  
  /* Personalize as outras cores conforme necessário */
}
```

### **Temas**
- **Claro**: Cores suaves e gradientes claros
- **Escuro**: Cores escuras com gradientes apropriados
- **Alto Contraste**: Bordas espessas e cores contrastantes

## 🧪 **Demonstração**

Acesse `frontend/demo-animated-cards.html` para ver o sistema em ação com:
- Cards de exemplo em diferentes estados
- Controles para testar animações
- Estatísticas em tempo real
- Modo lote para simular muitos cards

## 🔧 **Manutenção**

### **Debug**
```javascript
// Verificar status do sistema
console.log(window.animatedCardsManager.getStats());

// Verificar cards processados
console.log(document.querySelectorAll('.agenda-item.animated-card').length);
```

### **Performance**
- O sistema monitora automaticamente o número de animações ativas
- Modo lote é ativado automaticamente com 10+ cards
- Animações são limitadas a 5 simultâneas

## 📈 **Benefícios**

1. **Visual**: Cards mais atrativos e informativos
2. **UX**: Feedback visual claro para ações do usuário
3. **Performance**: Otimizado para não impactar a velocidade
4. **Compatibilidade**: Funciona com o sistema existente
5. **Acessibilidade**: Respeita preferências do usuário
6. **Manutenibilidade**: Código limpo e bem documentado

## 🐛 **Solução de Problemas**

### **Cards não animam**
- Verifique se `animated-cards.js` está carregado
- Confirme se as classes CSS estão aplicadas
- Verifique o console para erros

### **Performance lenta**
- Ative o modo lote com `manager.configure({ enableBatchMode: true })`
- Reduza `maxConcurrentAnimations`
- Verifique se há muitos cards na tela

### **Cores não aparecem**
- Verifique se `animated-cards.css` está carregado
- Confirme se as classes de status estão aplicadas
- Verifique conflitos com outros CSS

---

**Desenvolvido com ❤️ para o Sistema Barbeiros**
