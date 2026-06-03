# PageRank — Rankeamento de Sites por Matriz de Adjacência

Implementação do algoritmo **PageRank** com interface web interativa. Permite montar qualquer rede de páginas, definir os links entre elas e calcular o ranking de importância de cada uma usando álgebra linear.

> Projeto desenvolvido como aplicação prática da disciplina de **Álgebra Linear** — baseado em *Álgebra Linear com Aplicações*, Anton & Rorres (10ª ed.).

---

## Como usar

### Pré-requisito

Python 3 instalado (apenas para subir o servidor local).

### Rodando

```bash
git clone https://github.com/seu-usuario/web-ranking.git
cd web-ranking
python3 -m http.server 3131
```

Abra `http://localhost:3131` no navegador.

> Também funciona abrindo o arquivo `index.html` diretamente no navegador, sem precisar do servidor.

---

## Funcionalidades

- **Matriz de adjacência interativa** — clique em qualquer célula para ligar ou desligar um link entre páginas
- **Nomes editáveis** — nomeie cada página como quiser
- **Exemplos prontos** — botão carrega redes pré-definidas para testar rapidamente
- **Fator de amortecimento ajustável** — slider de 0.50 a 0.99 (padrão: 0.85)
- **Ranking com barras de relevância** — resultado visual com medalhas e percentual de score
- **Grafo SVG** — visualização da rede com setas direcionadas e nós proporcionais ao score
- **Contador de iterações** — mostra quantas iterações o algoritmo precisou para convergir
- Suporta redes de **2 a 12 páginas**

---

## Como funciona a teoria

### O problema

Imagine bilhões de páginas na internet e alguém pesquisa "receita de bolo". Várias páginas falam sobre o assunto — mas qual aparece primeiro? É preciso algum critério de **importância**.

O Google resolveu isso em 1998 com uma ideia simples:

> **Uma página é importante se páginas importantes apontam para ela.**

### Links como votos

Cada link de uma página para outra funciona como um **voto de confiança**. Mas o peso do voto depende de quantos links a página tem no total — se uma página aponta para 100 sites, o voto dela é dividido entre todos. Se aponta só para um, esse site leva o voto inteiro.

### A matriz de adjacência

A rede de páginas é representada como uma matriz de 0s e 1s:

```
         P1  P2  P3
   P1  [  0   1   1  ]   → P1 aponta para P2 e P3
   P2  [  0   0   1  ]   → P2 aponta para P3
   P3  [  1   0   0  ]   → P3 aponta para P1
```

### A equação de ranking

Chamamos de `r_i` a importância da página `i`. A regra é:

```
r_i = Σ ( r_j / grau_saída(j) )   para todo j que aponta para i
```

Escrito na forma matricial:

```
r = M · r
```

Onde `M` é a **matriz estocástica por colunas** — a adjacência com cada coluna normalizada pela quantidade de links de saída da página correspondente. Isso significa que `r` é o **autovetor dominante** de `M` com autovalor 1, conceito central de álgebra linear.

### O problema prático: a Matriz Google

A equação simples tem dois problemas:

1. **Nós pendentes** — páginas sem links de saída acumulam importância sem redistribuir
2. **Grupos isolados** — partes desconectadas da rede travam o cálculo

A solução é o **fator de amortecimento `d`**, que representa a probabilidade de um usuário continuar seguindo links (em vez de digitar uma URL aleatória). A **Matriz Google** é definida como:

```
G = d · M  +  (1 - d)/n · J
```

Onde `J` é a matriz de todos-uns `n×n`. O termo `(1-d)/n` garante que sempre existe uma pequena probabilidade de ir para qualquer página, o que torna a matriz irredutível e resolve os dois problemas. O valor padrão é `d = 0.85`.

### Resolução: Método da Potência

Em vez de calcular o autovetor diretamente (inviável para redes grandes), usa-se **iteração**:

1. Começa com importância igual para todas as páginas: `r = [1/n, 1/n, ..., 1/n]`
2. Aplica a Matriz Google: `r_novo = G · r`
3. Repete até convergir: `‖r_novo − r‖₁ < tolerância`

A convergência é garantida pelo **Teorema de Perron-Frobenius**: uma matriz estocástica positiva sempre possui um único autovetor dominante positivo, e o Método da Potência sempre converge para ele.

### Fluxo completo

```
Rede de links
      ↓
Matriz de adjacência  (0s e 1s, adj[i][j] = 1 → link de i para j)
      ↓
Normalização por colunas → Matriz estocástica M
      ↓
Adiciona amortecimento  → Matriz Google G = d·M + (1−d)/n · J
      ↓
Método da Potência  (r_{k+1} = G · r_k  até convergência)
      ↓
Vetor r  →  ranking de importância de cada página
```

---

## Estrutura do projeto

```
web-ranking/
├── index.html   # Estrutura da interface
├── style.css    # Estilo visual
└── app.js       # Algoritmo PageRank + lógica da interface
```

Não há dependências externas. Todo o código roda no navegador com JavaScript puro.

---

## Referência

> ANTON, Howard; RORRES, Chris. *Álgebra Linear com Aplicações*. 10ª ed. Bookman, 2012.  
> Aplicação: Serviço de Busca na Internet (PageRank).

---

## Licença

Distribuído sob a licença [MIT](LICENSE).
