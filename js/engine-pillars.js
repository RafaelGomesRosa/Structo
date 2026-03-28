/**
 * MOTOR DE CÁLCULO DE PILARES (NBR 6118 + VENTURINI)
 */

const VenturiniA1 = {
    delta: 0.10, // d'/h padrão (podemos tornar dinâmico depois)
    fyd: 43.48, // CA-50 em kN/cm²

    getSigmaS(epsilonS) {
        const Es = 21000; // kN/cm²
        const eps_yd = this.fyd / Es;
        if (Math.abs(epsilonS) >= eps_yd) {
            return Math.sign(epsilonS) * this.fyd;
        }
        return epsilonS * Es;
    },

    calcConcreto(xi) {
        let nu_c = 0; let mu_c = 0;
        if (xi <= 0) return { nu_c: 0, mu_c: 0 };
        if (xi <= 0.448) { 
            nu_c = 0.8 * xi * (1 - (0.8 * xi) / 3);
            mu_c = 0.4 * xi * (1 - 0.4 * xi);
        } else { 
            nu_c = 0.8 * xi - 0.1893;
            mu_c = 0.4 * xi * (1 - 0.4 * xi) + 0.040; 
        }
        if (xi > 1.0) nu_c = 0.85; 
        return { nu_c, mu_c };
    },

    buscarOmega(nu_alvo, mu_alvo) {
        let melhorOmega = 0;
        let menorErro = Infinity;

        for (let w = 0; w <= 1.8; w += 0.02) { 
            for (let xi = 0; xi <= 2.0; xi += 0.05) {
                const conc = this.calcConcreto(xi);
                const eps_s1 = 0.0035 * (xi - (1 - this.delta)) / xi;
                const eps_s2 = 0.0035 * (xi - this.delta) / xi;

                const sig_s1 = this.getSigmaS(eps_s1);
                const sig_s2 = this.getSigmaS(eps_s2);

                const nu_calc = conc.nu_c + (w / 2) * (sig_s1 + sig_s2) / this.fyd;
                const mu_calc = conc.mu_c + (w / 2) * (0.5 - this.delta) * (sig_s2 - sig_s1) / this.fyd;

                const erro = Math.sqrt(Math.pow(nu_calc - nu_alvo, 2) + Math.pow(mu_calc - mu_alvo, 2));

                if (erro < menorErro) {
                    menorErro = erro;
                    melhorOmega = w;
                }
            }
        }
        return melhorOmega;
    }
};

// Função Global que o site vai chamar
window.CalcularPilarNBR = function(b, h, L, fck, Nk, Mk) {
    // 1. Conversões
    const Ac = b * h; // cm²
    const fcd = (fck / 1.4) / 10; // kN/cm²
    const L_cm = L * 100; // cm

    // 2. Esforços de Cálculo (1,4)
    const Nd = Nk * 1.4; // kN
    let Md = Mk * 1.4 * 100; // kN.cm (convertido de kN.m)

    // 3. Momento Mínimo (NBR 6118)
    const Md_min = Nd * (1.5 + 0.03 * h); // kN.cm
    
    // Imperfeições geométricas (ea)
    let ea = L_cm / 400;
    if (ea < 1.5) ea = 1.5;
    const Md_1tot = Math.max(Md + (Nd * ea), Md_min);

    // 4. Esbeltez e 2ª Ordem
    const i = h / Math.sqrt(12);
    const lambda = L_cm / i;
    
    let Md_tot = Md_1tot;
    let statusLambda = "Pilar Curto (Sem 2ª ordem)";

    if (lambda > 35 && lambda <= 90) {
        statusLambda = "Pilar Esbelto (Com 2ª ordem)";
        const nu_temp = Nd / (Ac * fcd);
        const curvatura = 0.005 / (h * (nu_temp + 0.5));
        const e2 = (Math.pow(L_cm, 2) / 10) * curvatura;
        Md_tot = Md_1tot + (Nd * e2);
    } else if (lambda > 90) {
        return { erro: "Esbeltez > 90. O pilar é muito esbelto, redimensione a seção." };
    }

    // 5. Variáveis Adimensionais para o Ábaco
    const nu = Nd / (Ac * fcd);
    const mu = Md_tot / (b * Math.pow(h, 2) * fcd);

    // 6. Chamada do Ábaco Venturini
    let omega = VenturiniA1.buscarOmega(nu, mu);
    
    // Verificação de Limites
    let statusArmadura = "OK";
    if (omega >= 1.78) {
        return { erro: "Seção insuficiente! Esforços ultrapassam a capacidade máxima do concreto." };
    }

    // 7. Área de Aço (As)
    let As_calc = (omega * Ac * fcd) / 43.48;
    
    // Armadura Mínima NBR 6118
    const As_min = Math.max(0.15 * (Nd / 43.48), 0.004 * Ac);
    if (As_calc < As_min) {
        As_calc = As_min;
        omega = (As_calc * 43.48) / (Ac * fcd);
        statusArmadura = "Armadura Mínima Adotada";
    }

    // Retorna os dados para a tela
    return {
        sucesso: true,
        lambda: lambda.toFixed(2),
        statusLambda: statusLambda,
        nu: nu.toFixed(3),
        mu: mu.toFixed(3),
        omega: omega.toFixed(3),
        as: As_calc.toFixed(2),
        statusArmadura: statusArmadura
    };
};