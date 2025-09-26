/**
 * Sistema de Otimização de Imagens
 * Implementa lazy loading, compressão e cache inteligente
 */

class ImageOptimizer {
    constructor() {
        this.cache = new Map();
        this.observer = null;
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.optimizeExistingImages();
        this.setupPreloadStrategy();
    }

    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        this.observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.1
            });
        }
    }

    optimizeExistingImages() {
        // Otimizar imagens existentes (logo base64 não precisa de otimização)
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => this.optimizeImage(img));
    }

    optimizeImage(img) {
        // Não otimizar logo base64 - ele já está otimizado
        if (img.src.includes('data:image') && img.id === 'brand-logo') {
            return;
        }

        // Adicionar lazy loading se não tiver
        if (!img.hasAttribute('loading')) {
            img.setAttribute('loading', 'lazy');
        }

        // Adicionar decoding async
        if (!img.hasAttribute('decoding')) {
            img.setAttribute('decoding', 'async');
        }

        // Adicionar fetchpriority para imagens críticas (logo base64 já tem fetchpriority="high")
        if (img.src.includes('logo.png') && !img.src.includes('data:image') && !img.hasAttribute('fetchpriority')) {
            img.setAttribute('fetchpriority', 'high');
        }

        // Adicionar placeholder enquanto carrega
        if (!img.hasAttribute('data-src')) {
            this.addPlaceholder(img);
        }

        // Observar para lazy loading
        if (this.observer && img.hasAttribute('data-src')) {
            this.observer.observe(img);
        }
    }

    addPlaceholder(img) {
        const originalSrc = img.src;
        const placeholder = this.createPlaceholder(img.width, img.height);
        
        img.src = placeholder;
        img.style.filter = 'blur(5px)';
        img.style.transition = 'filter 0.3s ease';
        
        img.addEventListener('load', () => {
            img.style.filter = 'none';
        });
    }

    createPlaceholder(width = 100, height = 100) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Criar gradiente sutil
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#f3f4f6');
        gradient.addColorStop(1, '#e5e7eb');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        return canvas.toDataURL();
    }

    loadImage(img) {
        const src = img.getAttribute('data-src') || img.src;
        
        if (this.cache.has(src)) {
            img.src = this.cache.get(src);
            return;
        }

        // Carregar com fetch para melhor controle
        fetch(src, {
            method: 'GET',
            headers: {
                'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8'
            }
        })
        .then(response => {
            if (response.ok) {
                return response.blob();
            }
            throw new Error('Failed to load image');
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            this.cache.set(src, url);
            img.src = url;
        })
        .catch(error => {
            console.warn('Erro ao carregar imagem:', error);
            // Fallback para src original
            img.src = src;
        });
    }

    setupPreloadStrategy() {
        // Preload de imagens críticas (logo agora é base64 inline)
        const criticalImages = [
            // Logo removido - agora é base64 inline
        ];

        criticalImages.forEach(src => {
            if (!this.cache.has(src)) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'image';
                link.href = src;
                link.type = 'image/png';
                document.head.appendChild(link);
            }
        });
    }

    // Método para otimizar imagens dinamicamente
    optimizeNewImage(img) {
        this.optimizeImage(img);
    }

    // Limpar cache quando necessário
    clearCache() {
        this.cache.forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
        this.cache.clear();
    }
}

// Inicializar otimizador
let imageOptimizer;

document.addEventListener('DOMContentLoaded', () => {
    imageOptimizer = new ImageOptimizer();
});

// Exportar para uso global
window.ImageOptimizer = ImageOptimizer;
window.imageOptimizer = imageOptimizer;
