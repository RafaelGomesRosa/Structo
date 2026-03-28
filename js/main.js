document.addEventListener('DOMContentLoaded', () => {

    // --- 1. LÓGICA DO MENU LATERAL ---
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    toggleBtn.addEventListener('click', () => { sidebar.classList.toggle('minimized'); });

    // --- 2. LÓGICA DO SISTEMA DE ABAS PRINCIPAIS ---
    const appContent = document.getElementById('app-content');
    const menuItems = document.querySelectorAll('.menu-item');

    async function loadSubPage(subPageName) {
        const calcContent = document.getElementById('calc-content');
        if (!calcContent) return; 
        try {
            calcContent.innerHTML = '<p style="color: #64748b; padding: 20px;">Carregando módulo...</p>';
            const response = await fetch(`pages/${subPageName}.html`);
            if (!response.ok) throw new Error('Não encontrado');
            calcContent.innerHTML = await response.text();
            if (window.lucide) lucide.createIcons();
        } catch (error) {
            calcContent.innerHTML = `<p style="color: red;">Módulo ${subPageName} não encontrado.</p>`;
        }
    }

    async function loadPage(pageName) {
        try {
            appContent.innerHTML = '<p style="color: #64748b;">Carregando módulo...</p>';
            const response = await fetch(`pages/${pageName}.html`);
            if (!response.ok) throw new Error('Página não encontrada');
            appContent.innerHTML = await response.text();
            if (pageName === 'structural') loadSubPage('calc-pillars');
            if (window.lucide) lucide.createIcons();
        } catch (error) {
            appContent.innerHTML = `<div style="text-align: center; margin-top: 50px;"><h2>🚧</h2></div>`;
        }
    }

    menuItems.forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault(); 
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            loadPage(item.getAttribute('data-page'));
        });
    });

    // --- DELEGAÇÃO DE EVENTOS (Sub-Abas) ---
    appContent.addEventListener('click', (event) => {
        const subTab = event.target.closest('.sub-tab');
        if (subTab) {
            document.querySelectorAll('.sub-tab').forEach(tab => tab.classList.remove('active'));
            subTab.classList.add('active');
            loadSubPage(subTab.getAttribute('data-calc'));
        }
    });

    // --- 3. LÓGICA DE CÁLCULO (Ligando o Motor à Tela) ---
    appContent.addEventListener('submit', (event) => {
        
        if (event.target && event.target.id === 'calc-pillar-form') {
            event.preventDefault(); 
            
            // Pega os valores da tela
            const L = parseFloat(document.getElementById('pil-L').value);
            const fck = parseFloat(document.getElementById('pil-fck').value);
            const b = parseFloat(document.getElementById('pil-b').value);
            const h = parseFloat(document.getElementById('pil-h').value);
            const Nk = parseFloat(document.getElementById('pil-nk').value);
            const Mk = parseFloat(document.getElementById('pil-mk').value);

            // Chama o Cérebro (no arquivo engine-pillars.js)
            const result = window.CalcularPilarNBR(b, h, L, fck, Nk, Mk);

            // Pega a caixa de resultado
            const resultBox = document.getElementById('pillar-results');
            const resultContent = document.getElementById('pillar-results-content');
            
            resultBox.style.display = 'block'; // Mostra a caixa

            if (result.erro) {
                resultBox.className = 'results-box error';
                resultContent.innerHTML = `<p style="color: #ef4444; font-weight: 600;">⚠️ ERRO: ${result.erro}</p>`;
            } else {
                resultBox.className = 'results-box';
                
                // Monta a tela de resultados
                resultContent.innerHTML = `
                    <div class="result-grid">
                        <div class="result-item">
                            <span class="result-label">Área de Aço (As)</span>
                            <span class="result-value result-highlight">${result.as} cm²</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Taxa Armadura (ω)</span>
                            <span class="result-value">${result.omega}</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Esbeltez (λ)</span>
                            <span class="result-value">${result.lambda}</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Status</span>
                            <span class="result-value" style="color: #10b981;">${result.statusLambda} <br> ${result.statusArmadura}</span>
                        </div>
                    </div>
                `;
            }
        }
    });

    loadPage('structural');
});